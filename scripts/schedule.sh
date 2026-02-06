#!/bin/bash
# 定期実行スクリプト
#
# 以下の処理を統合して定期的に実行します：
#   1. ラベル最適化（story/taskラベルのないIssueにclaudeコマンドでチケット内容を分析してラベル付与）
#   2. 受け入れ確認（サブタスク完了済みストーリーの受け入れ確認）
#   3. タスクアサイン（進行中ストーリー・未着手ストーリー・親なしタスクの優先順制御）
#      ※アサイン時に対象タスクへin-progress-by-claudeラベルを付与し、重複実行を防止する
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

# タスクにin-progress-by-claudeラベルを付与する関数（重複実行防止のため）
# 成功したら0、失敗したら1を返す
lock_task() {
  local task_number=$1
  if ! ./.claude/skills/managing-github/scripts/issue-update.sh "${task_number}" --add-label "$IN_PROGRESS_LABEL" >/dev/null 2>&1; then
    log "エラー: タスク #${task_number} へのラベル付与に失敗しました" >&2
    return 1
  fi
  log "タスク #${task_number} にin-progress-by-claudeラベルを付与しました"
  return 0
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
          if claude -p "/breaking-down-story ${issue_number}"; then
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
# アサイン時に対象タスクへin-progress-by-claudeラベルを付与し、重複実行を防止する
# アサインが発生したら0を返し、発生しなかったら1を返す
assign_tasks() {
  log "タスクアサインをチェックします..."

  # assigneesが設定されていないopenストーリーを取得（作成日の古い順）
  local stories_json
  if ! stories_json=$(gh issue list --label story --state open --search "no:assignee" --limit 100 --json number,createdAt 2>&1); then
    log "ストーリー一覧の取得に失敗しました: $stories_json" >&2
    return 1
  fi

  # 1パスで全ストーリーを分類し、子タスク番号も収集する
  local in_progress_story=""
  local in_progress_sub_issues=""
  local first_unstarted_story=""
  local first_unstarted_created=""
  local first_unstarted_sub_issues=""
  local all_child_numbers=""

  while IFS=$'\t' read -r story_number created_at; do
    [ -z "$story_number" ] || [ "$story_number" = "null" ] && continue

    # 子タスクを取得
    local sub_issues_json
    if ! sub_issues_json=$(.claude/skills/managing-github/scripts/issue-sub-issues.sh "$story_number" 2>/dev/null); then
      log "警告: ストーリー #${story_number} の子タスク取得に失敗しました" >&2
      continue
    fi

    # 子タスク番号を収集（改行区切りの文字列に追加）
    local child_nums
    child_nums=$(echo "$sub_issues_json" | jq -r '.number' 2>/dev/null || echo "")
    if [ -n "$child_nums" ]; then
      if [ -n "$all_child_numbers" ]; then
        all_child_numbers="${all_child_numbers}"$'\n'"${child_nums}"
      else
        all_child_numbers="$child_nums"
      fi
    fi

    # 子タスク件数を確認
    local child_count
    child_count=$(echo "$sub_issues_json" | jq -s 'length' 2>/dev/null || echo "0")
    [ "$child_count" -eq 0 ] && continue

    # 子タスクのいずれかがアサイン済みか確認
    local has_assigned
    has_assigned=$(echo "$sub_issues_json" | jq -r --arg assign "$ASSIGN_LABEL" --arg progress "$IN_PROGRESS_LABEL" \
      'select(.labels != null) | select(.labels | map(. == $assign or . == $progress) | any) | .number' | head -n 1)

    if [ -n "$has_assigned" ]; then
      # 進行中ストーリー（最初に見つかったもの = 最も古いもの）
      if [ -z "$in_progress_story" ]; then
        in_progress_story="$story_number"
        in_progress_sub_issues="$sub_issues_json"
      fi
    else
      # 未着手ストーリー（最初に見つかったもの = 最も古いもの）
      if [ -z "$first_unstarted_story" ]; then
        first_unstarted_story="$story_number"
        first_unstarted_created="$created_at"
        first_unstarted_sub_issues="$sub_issues_json"
      fi
    fi
  done < <(echo "$stories_json" | jq -r 'sort_by(.createdAt) | .[] | "\(.number)\t\(.createdAt)"' 2>/dev/null)

  # 優先順位1: 進行中ストーリーの子タスクから着手可能なものを探す
  if [ -n "$in_progress_story" ]; then
    log "進行中ストーリー #${in_progress_story} から着手可能なタスクを探します"

    local available_task
    available_task=$(echo "$in_progress_sub_issues" | jq -r --arg assign "$ASSIGN_LABEL" --arg progress "$IN_PROGRESS_LABEL" \
      'select(.state == "OPEN") | select((.labels // []) | map(. == $assign or . == $progress) | any | not) | .number' | head -n 1)

    if [ -n "$available_task" ] && [ "$available_task" != "null" ]; then
      log "タスク #${available_task} にアサインします（進行中ストーリー #${in_progress_story} の子タスク）"

      # タスクにin-progress-by-claudeラベルを付与（重複実行防止のため）
      if ! lock_task "${available_task}"; then
        return 1
      fi

      claude --remote "/running-dev ${available_task}"
      log "タスク #${available_task} のアサインが完了しました"
      return 0
    fi

    log "進行中ストーリー #${in_progress_story} に着手可能な子タスクがありません"
    return 1
  fi

  # 優先順位2: 未着手ストーリーと親なしタスク
  log "未着手ストーリーと親なしタスクを探します"

  # 全openタスク（taskラベル、assign-to-claudeとin-progress-by-claudeのどちらもなし）を取得
  local all_tasks_json
  if ! all_tasks_json=$(gh issue list --label task --search "-label:$ASSIGN_LABEL -label:$IN_PROGRESS_LABEL" --state open --limit 100 --json number,createdAt 2>&1); then
    log "タスク一覧の取得に失敗しました: $all_tasks_json" >&2
    return 1
  fi

  # 親なしタスクの中で最も古いものを探す
  local oldest_orphan_number=""
  local oldest_orphan_created=""
  while IFS=$'\t' read -r task_number created_at; do
    [ -z "$task_number" ] || [ "$task_number" = "null" ] && continue

    # 子タスク番号リストに含まれていなければ親なしタスク
    if [ -z "$all_child_numbers" ] || ! echo "$all_child_numbers" | grep -qx "$task_number"; then
      oldest_orphan_number="$task_number"
      oldest_orphan_created="$created_at"
      break
    fi
  done < <(echo "$all_tasks_json" | jq -r 'sort_by(.createdAt) | .[] | "\(.number)\t\(.createdAt)"' 2>/dev/null)

  # 未着手ストーリーと親なしタスクを比較して最も古いものを選択
  local target_type=""
  local target_number=""

  if [ -n "$first_unstarted_story" ] && [ -n "$oldest_orphan_number" ]; then
    if [[ "$first_unstarted_created" < "$oldest_orphan_created" ]]; then
      target_type="story"
      target_number="$first_unstarted_story"
    else
      target_type="task"
      target_number="$oldest_orphan_number"
    fi
  elif [ -n "$first_unstarted_story" ]; then
    target_type="story"
    target_number="$first_unstarted_story"
  elif [ -n "$oldest_orphan_number" ]; then
    target_type="task"
    target_number="$oldest_orphan_number"
  else
    log "アサイン可能なタスクはありません"
    return 1
  fi

  if [ "$target_type" = "story" ]; then
    log "未着手ストーリー #${target_number} から着手可能なタスクを探します"

    local available_task
    available_task=$(echo "$first_unstarted_sub_issues" | jq -r 'select(.state == "OPEN") | .number' | head -n 1)

    if [ -n "$available_task" ] && [ "$available_task" != "null" ]; then
      log "タスク #${available_task} にアサインします（未着手ストーリー #${target_number} の子タスク）"

      # タスクにin-progress-by-claudeラベルを付与（重複実行防止のため）
      if ! lock_task "${available_task}"; then
        return 1
      fi

      claude --remote "/running-dev ${available_task}"
      log "タスク #${available_task} のアサインが完了しました"
      return 0
    fi

    log "未着手ストーリー #${target_number} に着手可能な子タスクがありません"
    return 1
  else
    log "親なしタスク #${target_number} にアサインします"

    # タスクにin-progress-by-claudeラベルを付与
    if ! lock_task "${target_number}"; then
      return 1
    fi

    claude --remote "/running-dev ${target_number}"
    log "タスク #${target_number} のアサインが完了しました"
    return 0
  fi
}

# 受け入れ確認関数
# サブタスクが100%完了しているストーリーを対象に受け入れ確認を実施する
# 対象条件: storyラベル、open状態、assigneesが空、サブタスク完了率100%
# 最も古いストーリーから順に処理し、1件見つかったら確認スキルを実行する
# 受け入れ確認が実行された場合、または対象がなかった場合は0、エラーの場合は1を返す
verify_acceptance() {
  log "受け入れ確認をチェックします..."

  # storyラベル、open状態、assigneeなし、作成日昇順でIssueとサブタスク完了率を1回のAPIコールで取得
  local query
  query=$(cat <<'EOF'
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    issues(
      first: 100,
      filterBy: {labels: ["story"], states: [OPEN], assignee: null},
      orderBy: {field: CREATED_AT, direction: ASC}
    ) {
      nodes {
        number
        subIssuesSummary {
          percentCompleted
        }
      }
    }
  }
}
EOF
)

  local response_json
  if ! response_json=$(gh api graphql -f query="$query" -f owner="$REPO_OWNER" -f name="$REPO_NAME" 2>&1); then
    log "ストーリー一覧の取得に失敗しました: $response_json" >&2
    return 1
  fi

  # 100%完了している最も古いストーリーを1件見つける
  local target_story
  target_story=$(echo "$response_json" | jq -r '.data.repository.issues.nodes[] | select(.subIssuesSummary.percentCompleted == 100) | .number' | head -n 1)

  # 対象ストーリーが見つからない場合
  if [ -z "$target_story" ]; then
    log "受け入れ確認対象のストーリーはありません"
    return 0
  fi

  # 受け入れ確認スキルを実行
  log "ストーリー #${target_story} の受け入れ確認を実行します"
  if claude -p "/verifying-acceptance ${target_story}"; then
    log "ストーリー #${target_story} の受け入れ確認が完了しました"
  else
    log "エラー: 受け入れ確認に失敗しました: #${target_story}" >&2
    return 1
  fi
}

# メインループ
log "定期実行スクリプトを開始します (リポジトリ: ${REPO_OWNER}/${REPO_NAME}, 間隔: ${POLL_INTERVAL}秒)"

while true; do
  log "$POLL_INTERVAL 秒待機します..."
  sleep "$POLL_INTERVAL"

  # 1. ラベル最適化
  optimize_labels || true

  # 2. 受け入れ確認
  verify_acceptance || true

  # 3. タスクアサイン
  if assign_tasks; then
    # アサインが発生したらループ1回分の処理を終了（ストーリー細分化をスキップ）
    continue
  fi

  # 4. ストーリー細分化
  breakdown_stories || true
done
