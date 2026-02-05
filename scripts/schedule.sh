#!/bin/bash
# 定期実行スクリプト
#
# 以下の処理を統合して定期的に実行します：
#   1. ラベル最適化（story/taskラベルのないIssueに構造的特徴で判定してラベル付与）
#   2. ストーリー細分化（storyラベル付きでサブIssueのないストーリーを分解）
#   3. タスクアサイン（taskラベル付きで未アサインのタスクにassign-to-claudeラベル付与）
#   4. running-dev呼び出し（assign-to-claudeラベル付きタスクの自動処理）
#   5. PR自動マージ（マージ可能なPRの検出・自動マージ）
#
# 使用方法:
#   ./scripts/schedule.sh
#
# 前提条件:
#   - gh コマンドがインストール・認証済みであること
#   - claude コマンドがインストール・設定済みであること
set -euo pipefail

cd "$(dirname "$0")/.."

# リポジトリ情報の動的取得
if ! repo_info=$(.claude/skills/managing-github/scripts/repo-info.sh 2>&1); then
  echo "エラー: リポジトリ情報の取得に失敗しました: $repo_info" >&2
  exit 1
fi
read -r REPO_OWNER REPO_NAME <<< "$repo_info"

IN_PROGRESS_LABEL="in-progress-by-claude"
ASSIGN_LABEL="assign-to-claude"
POLL_INTERVAL=30
MERGE_DELAY_SECONDS=300

# 依存コマンド確認
for cmd in gh claude jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] エラー: $cmd コマンドが見つかりません" >&2
    exit 1
  fi
done

# タイムスタンプ付きログ出力関数
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# ロック付き処理関数
# 引数1: issue_number
# 引数2: claudeコマンド名
# 引数3: 処理の説明
process_issue_with_lock() {
  local issue_number="$1"
  local command="$2"
  local description="$3"

  if gh issue edit "$issue_number" --add-label "$IN_PROGRESS_LABEL"; then
    log "issue #${issue_number} に $IN_PROGRESS_LABEL ラベルを付与しました"

    if claude --remote "/${command} ${issue_number}"; then
      log "issue #${issue_number} の${description}が完了しました"

      if gh issue edit "$issue_number" --remove-label "$IN_PROGRESS_LABEL"; then
        log "issue #${issue_number} から $IN_PROGRESS_LABEL ラベルを除去しました"
      else
        log "警告: issue #${issue_number} からのラベル除去に失敗しました" >&2
      fi
    else
      log "エラー: issue #${issue_number} の${description}に失敗しました。$IN_PROGRESS_LABEL ラベルは除去されません。" >&2
    fi
  else
    log "エラー: issue #${issue_number} へのラベル付与に失敗しました。スキップします。" >&2
  fi
}

# ラベル最適化関数
optimize_labels() {
  log "ラベル最適化を開始します..."

  # story/taskラベルのないopen Issueを取得
  if ! issues_json=$(gh issue list --state open --limit 100 --json number,labels 2>&1); then
    log "Issue一覧の取得に失敗しました: $issues_json" >&2
    return 1
  fi

  # story/taskラベルがないIssueを抽出
  local processed=0
  while read -r issue_number; do
    if [ -z "$issue_number" ] || [ "$issue_number" = "null" ]; then
      continue
    fi

    # サブIssueの件数を取得して構造的特徴を判定
    if sub_issue_count=$(gh api "/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issue_number}/sub_issues" --jq 'length' 2>/dev/null); then
      if [ "$sub_issue_count" -gt 0 ]; then
        # サブIssueがある場合はstoryラベルを付与
        log "issue #${issue_number} にstoryラベルを付与します（サブIssue ${sub_issue_count}件）"
        if gh issue edit "$issue_number" --add-label "story" 2>/dev/null; then
          processed=$((processed + 1))
        else
          log "警告: issue #${issue_number} へのラベル付与に失敗しました" >&2
        fi
      else
        # サブIssueがない場合はtaskラベルを付与
        log "issue #${issue_number} にtaskラベルを付与します（サブIssueなし）"
        if gh issue edit "$issue_number" --add-label "task" 2>/dev/null; then
          processed=$((processed + 1))
        else
          log "警告: issue #${issue_number} へのラベル付与に失敗しました" >&2
        fi
      fi
    else
      log "警告: issue #${issue_number} のサブIssue確認に失敗しました。スキップします。" >&2
    fi
  done < <(echo "$issues_json" | jq -r '.[] | select((.labels // []) | map(.name) | any(. == "story" or . == "task") | not) | .number' 2>/dev/null || echo "")

  log "ラベル最適化が完了しました（${processed}件処理）"
}

# ストーリー細分化関数
breakdown_stories() {
  log "ストーリー細分化をチェックします..."

  # storyラベルあり・in-progress-by-claudeラベルなし・open状態のissueを1件取得
  if issue_number=$(gh issue list --search "label:story -label:$IN_PROGRESS_LABEL" --state open --limit 1 --json number --jq '.[0].number' 2>/dev/null); then
    if [ -n "$issue_number" ] && [ "$issue_number" != "null" ]; then
      # サブIssueの件数を取得
      if sub_issue_count=$(gh api "/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issue_number}/sub_issues" --jq 'length' 2>/dev/null); then
        if [ "$sub_issue_count" = "0" ]; then
          log "対象issue #${issue_number} を処理します（サブIssueなし）"
          process_issue_with_lock "$issue_number" "breaking-down-story" "ストーリー分解"
          return 0
        fi
      else
        log "警告: issue #${issue_number} のサブIssue確認に失敗しました。スキップします。" >&2
      fi
    fi
  fi
}

# タスクアサイン関数
assign_tasks() {
  log "タスクアサインをチェックします..."

  # taskラベルあり・assign-to-claude/in-progress-by-claudeラベルなし・open状態のissueを取得
  if issues_json=$(gh issue list --search "label:task -label:$ASSIGN_LABEL -label:$IN_PROGRESS_LABEL" --state open --limit 100 --json number 2>&1); then
    local assigned=0
    while read -r issue_number; do
      if [ -n "$issue_number" ] && [ "$issue_number" != "null" ]; then
        log "issue #${issue_number} に assign-to-claude ラベルを付与します"
        if gh issue edit "$issue_number" --add-label "$ASSIGN_LABEL" 2>/dev/null; then
          assigned=$((assigned + 1))
        else
          log "警告: issue #${issue_number} へのラベル付与に失敗しました" >&2
        fi
      fi
    done < <(echo "$issues_json" | jq -r '.[].number' 2>/dev/null || echo "")

    if [ "$assigned" -gt 0 ]; then
      log "タスクアサインが完了しました（${assigned}件処理）"
    fi
  else
    log "タスクアサイン対象の取得に失敗しました" >&2
  fi
}

# running-dev呼び出し関数
run_dev() {
  log "running-dev呼び出しをチェックします..."

  # assign-to-claudeラベルあり・in-progress-by-claudeラベルなし・open状態のissueを1件取得
  if issue_number=$(gh issue list --label "$ASSIGN_LABEL" --search "-label:$IN_PROGRESS_LABEL" --state open --limit 1 --json number --jq '.[0].number' 2>/dev/null); then
    if [ -n "$issue_number" ] && [ "$issue_number" != "null" ]; then
      log "対象issue #${issue_number} を処理します"
      if gh issue edit "$issue_number" --add-label "$IN_PROGRESS_LABEL"; then
        log "issue #${issue_number} に $IN_PROGRESS_LABEL ラベルを付与しました"
        claude --remote "/running-dev ${issue_number}"
      else
        log "エラー: issue #${issue_number} へのラベル付与に失敗しました。スキップします。" >&2
      fi
      return 0
    fi
  fi
}

# PR自動マージ関数
merge_eligible_prs() {
  log "マージ可能なPRをチェックします..."

  if ! prs_json=$(gh pr list --state open --json number,createdAt,statusCheckRollup,mergeable --limit 100 2>&1); then
    log "PR一覧の取得に失敗しました: $prs_json" >&2
    return 1
  fi

  pr_count=$(echo "$prs_json" | jq '. | length' 2>/dev/null || echo "0")
  if [ "$pr_count" -eq 0 ]; then
    return 0
  fi

  log "${pr_count}件のPRを確認します"

  while IFS=$'\t' read -r pr_number created_at mergeable status_check_rollup; do
    log "PR #${pr_number} をチェック中..."

    if [ -z "$created_at" ] || [ "$created_at" = "null" ]; then
      log "  スキップ: 作成日時が取得できません"
      continue
    fi

    created_timestamp=$(date -d "$created_at" +%s 2>/dev/null || echo "0")
    current_timestamp=$(date +%s)
    elapsed_seconds=$((current_timestamp - created_timestamp))

    if [ "$elapsed_seconds" -lt "$MERGE_DELAY_SECONDS" ]; then
      log "  スキップ: PR作成から5分未満（${elapsed_seconds}秒経過）"
      continue
    fi

    if [ "$mergeable" != "MERGEABLE" ]; then
      log "  スキップ: マージ可能な状態ではありません（mergeable: $mergeable）"
      continue
    fi

    read -r all_checks_passed check_count < <(echo "$status_check_rollup" | jq -r 'if . == null or . == [] then "false 0" else [(all(.[]; (.state // .conclusion) == "SUCCESS")), length] | @tsv end')

    if [ "$check_count" -eq 0 ]; then
      log "  スキップ: CIチェックが設定されていないか、結果を取得できません"
      continue
    fi

    if [ "$all_checks_passed" != "true" ]; then
      log "  スキップ: CIチェックがpassしていません"
      continue
    fi

    if ! review_threads_json=$(gh api graphql -f query='
      query($owner: String!, $name: String!, $number: Int!) {
        repository(owner: $owner, name: $name) {
          pullRequest(number: $number) {
            reviewThreads(first: 100) {
              nodes {
                isResolved
              }
            }
          }
        }
      }
    ' -f owner="$REPO_OWNER" -f name="$REPO_NAME" -F number="$pr_number" 2>&1); then
      log "  スキップ: レビューコメントの取得に失敗しました"
      continue
    fi

    unresolved_count=$(echo "$review_threads_json" | jq -r '.data.repository.pullRequest.reviewThreads.nodes | map(select(.isResolved == false)) | length' 2>/dev/null)

    if ! [[ "$unresolved_count" =~ ^[0-9]+$ ]]; then
      log "  スキップ: レビューコメントの解析に失敗しました"
      continue
    fi

    if [ "$unresolved_count" -gt 0 ]; then
      log "  スキップ: 未解決レビューコメントあり（${unresolved_count}件）"
      continue
    fi

    log "  すべての条件を満たしました（${elapsed_seconds}秒経過、${check_count}件のチェックpass）"
    log "  マージを実行します..."
    if ! output=$(gh pr merge "$pr_number" --squash 2>&1); then
      log "  PR #${pr_number} のマージに失敗しました: $output" >&2
    else
      log "  PR #${pr_number} を正常にマージしました"
    fi
  done < <(echo "$prs_json" | jq -r '.[] | "\(.number)\t\(.createdAt)\t\(.mergeable)\t\(.statusCheckRollup | tostring)"' 2>/dev/null || echo "")

  log "PRチェック完了"
}

# メインループ
log "定期実行スクリプトを開始します (リポジトリ: ${REPO_OWNER}/${REPO_NAME}, 間隔: ${POLL_INTERVAL}秒)"

while true; do
  # 1. ラベル最適化
  optimize_labels || true

  # 2. ストーリー細分化
  breakdown_stories || true

  # 3. タスクアサイン
  assign_tasks || true

  # 4. running-dev呼び出し
  run_dev || true

  # 5. PR自動マージ
  merge_eligible_prs || true

  sleep "$POLL_INTERVAL"
done
