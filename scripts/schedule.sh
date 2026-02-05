#!/bin/bash
# 定期実行スクリプト
#
# 以下の処理を統合して定期的に実行します：
#   1. PR自動マージ（マージ可能なPRの検出・自動マージ）
#   2. ラベル最適化（story/taskラベルのないIssueにclaudeコマンドでチケット内容を分析してラベル付与）
#   3. タスクアサイン（進行中ストーリー・未着手ストーリー・親なしタスクの優先順制御）
#   4. ストーリー細分化（storyラベル付きでサブIssueのないストーリーを分解）
#
# 使用方法:
#   ./scripts/schedule.sh
#
# 前提条件:
#   - gh コマンドがインストール・認証済みであること
#   - claude コマンドがインストール・設定済みであること
#   - jq コマンドがインストールされていること
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

# ラベル最適化関数
optimize_labels() {
  log "ラベル最適化を開始します..."

  # story/taskラベルのないopen Issueを取得
  if ! issues_json=$(gh issue list --state open --limit 100 --json number,labels 2>&1); then
    log "Issue一覧の取得に失敗しました: $issues_json" >&2
    return 1
  fi

  # story/taskラベルがないIssueの番号を抽出
  local issue_numbers
  issue_numbers=$(echo "$issues_json" | jq -r '.[] | select((.labels // []) | map(.name) | any(. == "story" or . == "task") | not) | .number' 2>/dev/null || echo "")

  if [ -z "$issue_numbers" ]; then
    log "ラベル最適化対象のIssueはありません"
    return 0
  fi

  # Issue番号をスペース区切りで結合
  local numbers_arg
  numbers_arg=$(echo "$issue_numbers" | xargs)

  log "対象Issue: ${numbers_arg}"

  # claudeコマンドでチケット内容を分析してラベルを判定・付与
  if claude -p "/optimizing-issue-labels ${numbers_arg}"; then
    log "ラベル最適化が完了しました"
  else
    log "ラベル最適化中にエラーが発生しました" >&2
    return 1
  fi
}

# ストーリー細分化関数
breakdown_stories() {
  log "ストーリー細分化をチェックします..."

  # storyラベルあり・open状態のissueを1件取得
  if issue_number=$(gh issue list --search "label:story" --state open --limit 1 --json number --jq '.[0].number' 2>/dev/null); then
    if [ -n "$issue_number" ] && [ "$issue_number" != "null" ]; then
      # サブIssueの件数を取得
      if sub_issue_count=$(gh api "/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issue_number}/sub_issues" --jq 'length' 2>/dev/null); then
        if [ "$sub_issue_count" = "0" ]; then
          log "対象issue #${issue_number} を処理します（サブIssueなし）"
          if claude "/breaking-down-story ${issue_number}"; then
            log "ストーリー分解が完了しました: #${issue_number}"
          else
            log "エラー: ストーリー分解に失敗しました: #${issue_number}" >&2
          fi
          return 0
        fi
      else
        log "警告: issue #${issue_number} のサブIssue確認に失敗しました。スキップします。" >&2
      fi
    fi
  fi
}

# タスクアサイン関数
# 優先順位1: 進行中ストーリーの子タスク
# 優先順位2: 未着手ストーリーの子タスク、または親なしタスク
# アサインが発生したら0を返し、発生しなかったら1を返す
assign_tasks() {
  log "タスクアサインをチェックします..."

  # 全openストーリーを取得（作成日の古い順）
  local stories_json
  if ! stories_json=$(gh issue list --label story --state open --sort created --limit 100 --json number,createdAt 2>&1); then
    log "ストーリー一覧の取得に失敗しました: $stories_json" >&2
    return 1
  fi

  # 優先順位1: 進行中ストーリーを探す
  local in_progress_stories=()
  while IFS=$'\t' read -r story_number created_at; do
    if [ -z "$story_number" ] || [ "$story_number" = "null" ]; then
      continue
    fi

    # 子タスクを取得
    local sub_issues_json
    if ! sub_issues_json=$(.claude/skills/managing-github/scripts/issue-sub-issues.sh "$story_number" 2>/dev/null); then
      log "警告: ストーリー #${story_number} の子タスク取得に失敗しました" >&2
      continue
    fi

    # 子タスクのいずれかがassign-to-claudeまたはin-progress-by-claudeラベル付きか確認
    local has_in_progress
    has_in_progress=$(echo "$sub_issues_json" | jq -r --arg assign "$ASSIGN_LABEL" --arg progress "$IN_PROGRESS_LABEL" \
      'select(.labels != null) | select(.labels | map(. == $assign or . == $progress) | any) | .number' | head -n 1)

    if [ -n "$has_in_progress" ]; then
      in_progress_stories+=("$story_number"$'\t'"$created_at")
    fi
  done < <(echo "$stories_json" | jq -r '.[] | "\(.number)\t\(.createdAt)"' 2>/dev/null || echo "")

  # 進行中ストーリーがあれば、最も古いものの子タスクから着手可能なものを探す
  if [ "${#in_progress_stories[@]}" -gt 0 ]; then
    # 作成日が最も早いもの（配列の先頭）を選択
    local target_story_line="${in_progress_stories[0]}"
    local target_story_number
    target_story_number=$(echo "$target_story_line" | cut -f1)

    log "進行中ストーリー #${target_story_number} から着手可能なタスクを探します"

    # 子タスクを取得
    local sub_issues_json
    if ! sub_issues_json=$(.claude/skills/managing-github/scripts/issue-sub-issues.sh "$target_story_number" 2>/dev/null); then
      log "エラー: ストーリー #${target_story_number} の子タスク取得に失敗しました" >&2
      return 1
    fi

    # 着手可能なタスク（open状態で、assign-to-claudeとin-progress-by-claudeのどちらのラベルもないもの）を探す
    local available_task
    available_task=$(echo "$sub_issues_json" | jq -r --arg assign "$ASSIGN_LABEL" --arg progress "$IN_PROGRESS_LABEL" \
      'select(.state == "OPEN") | select(.labels != null) | select(.labels | map(. == $assign or . == $progress) | any | not) | .number' | head -n 1)

    if [ -n "$available_task" ] && [ "$available_task" != "null" ]; then
      log "タスク #${available_task} にアサインします（進行中ストーリー #${target_story_number} の子タスク）"
      if claude --remote "/running-dev ${available_task}"; then
        log "タスク #${available_task} のアサインが完了しました"
        return 0
      else
        log "エラー: タスク #${available_task} のアサインに失敗しました" >&2
        return 1
      fi
    else
      log "進行中ストーリー #${target_story_number} に着手可能な子タスクがありません"
      return 1
    fi
  fi

  # 優先順位2: 未着手ストーリーと親なしタスク
  log "未着手ストーリーと親なしタスクを探します"

  # 全openストーリーの子タスク番号を収集
  local all_child_numbers=()
  while IFS= read -r story_number; do
    if [ -z "$story_number" ] || [ "$story_number" = "null" ]; then
      continue
    fi

    local sub_issues_json
    if ! sub_issues_json=$(.claude/skills/managing-github/scripts/issue-sub-issues.sh "$story_number" 2>/dev/null); then
      continue
    fi

    while IFS= read -r child_number; do
      if [ -n "$child_number" ] && [ "$child_number" != "null" ]; then
        all_child_numbers+=("$child_number")
      fi
    done < <(echo "$sub_issues_json" | jq -r '.number' 2>/dev/null || echo "")
  done < <(echo "$stories_json" | jq -r '.[].number' 2>/dev/null || echo "")

  # 全openタスク（taskラベル、assign-to-claudeとin-progress-by-claudeのどちらもなし）を取得
  local all_tasks_json
  if ! all_tasks_json=$(gh issue list --label task --search "-label:$ASSIGN_LABEL -label:$IN_PROGRESS_LABEL" --state open --sort created --limit 100 --json number,createdAt 2>&1); then
    log "タスク一覧の取得に失敗しました: $all_tasks_json" >&2
    return 1
  fi

  # 親なしタスクを抽出
  local orphan_tasks=()
  while IFS=$'\t' read -r task_number created_at; do
    if [ -z "$task_number" ] || [ "$task_number" = "null" ]; then
      continue
    fi

    # 子タスク番号セットに含まれないものが親なしタスク
    local is_child=false
    for child_num in "${all_child_numbers[@]}"; do
      if [ "$child_num" = "$task_number" ]; then
        is_child=true
        break
      fi
    done

    if [ "$is_child" = false ]; then
      orphan_tasks+=("$task_number"$'\t'"$created_at")
    fi
  done < <(echo "$all_tasks_json" | jq -r '.[] | "\(.number)\t\(.createdAt)"' 2>/dev/null || echo "")

  # 未着手ストーリーを探す（子タスクの全てが未アサイン）
  local unstarted_stories=()
  while IFS=$'\t' read -r story_number created_at; do
    if [ -z "$story_number" ] || [ "$story_number" = "null" ]; then
      continue
    fi

    # 子タスクを取得
    local sub_issues_json
    if ! sub_issues_json=$(.claude/skills/managing-github/scripts/issue-sub-issues.sh "$story_number" 2>/dev/null); then
      continue
    fi

    # 子タスクがあるか確認
    local child_count
    child_count=$(echo "$sub_issues_json" | jq -s 'length' 2>/dev/null || echo "0")
    if [ "$child_count" -eq 0 ]; then
      continue
    fi

    # 子タスクのいずれかがassign-to-claudeまたはin-progress-by-claudeラベル付きか確認
    local has_assigned
    has_assigned=$(echo "$sub_issues_json" | jq -r --arg assign "$ASSIGN_LABEL" --arg progress "$IN_PROGRESS_LABEL" \
      'select(.labels != null) | select(.labels | map(. == $assign or . == $progress) | any) | .number' | head -n 1)

    if [ -z "$has_assigned" ]; then
      unstarted_stories+=("$story_number"$'\t'"$created_at")
    fi
  done < <(echo "$stories_json" | jq -r '.[] | "\(.number)\t\(.createdAt)"' 2>/dev/null || echo "")

  # 未着手ストーリーと親なしタスクの中から最も古いものを選択
  local candidates=("${unstarted_stories[@]}" "${orphan_tasks[@]}")
  if [ "${#candidates[@]}" -eq 0 ]; then
    log "アサイン可能なタスクはありません"
    return 1
  fi

  # 作成日でソートして最も古いものを選択
  local oldest_candidate
  oldest_candidate=$(printf '%s\n' "${candidates[@]}" | sort -t$'\t' -k2 | head -n 1)
  local target_number
  target_number=$(echo "$oldest_candidate" | cut -f1)

  # 未着手ストーリーか親なしタスクか判定
  local is_story=false
  for story_line in "${unstarted_stories[@]}"; do
    local story_num
    story_num=$(echo "$story_line" | cut -f1)
    if [ "$story_num" = "$target_number" ]; then
      is_story=true
      break
    fi
  done

  if [ "$is_story" = true ]; then
    log "未着手ストーリー #${target_number} から着手可能なタスクを探します"

    # 子タスクを取得
    local sub_issues_json
    if ! sub_issues_json=$(.claude/skills/managing-github/scripts/issue-sub-issues.sh "$target_number" 2>/dev/null); then
      log "エラー: ストーリー #${target_number} の子タスク取得に失敗しました" >&2
      return 1
    fi

    # open状態の子タスクの中から最も古いものを選択
    local available_task
    available_task=$(echo "$sub_issues_json" | jq -r 'select(.state == "OPEN") | .number' | head -n 1)

    if [ -n "$available_task" ] && [ "$available_task" != "null" ]; then
      log "タスク #${available_task} にアサインします（未着手ストーリー #${target_number} の子タスク）"
      if claude --remote "/running-dev ${available_task}"; then
        log "タスク #${available_task} のアサインが完了しました"
        return 0
      else
        log "エラー: タスク #${available_task} のアサインに失敗しました" >&2
        return 1
      fi
    else
      log "未着手ストーリー #${target_number} に着手可能な子タスクがありません"
      return 1
    fi
  else
    log "親なしタスク #${target_number} にアサインします"
    if claude --remote "/running-dev ${target_number}"; then
      log "タスク #${target_number} のアサインが完了しました"
      return 0
    else
      log "エラー: タスク #${target_number} のアサインに失敗しました" >&2
      return 1
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
  # 1. PR自動マージ
  merge_eligible_prs || true

  # 2. ラベル最適化
  optimize_labels || true

  # 3. タスクアサイン
  if assign_tasks; then
    # アサインが発生したらループ1回分の処理を終了（ストーリー細分化をスキップ）
    sleep "$POLL_INTERVAL"
    continue
  fi

  # 4. ストーリー細分化
  breakdown_stories || true

  sleep "$POLL_INTERVAL"
done
