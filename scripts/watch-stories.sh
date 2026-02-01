#!/bin/bash
# ユーザーストーリーを監視し、サブIssueがないissueに対して自動的にストーリー分解を実行するスクリプト
#
# 使用方法:
#   ./scripts/watch-stories.sh
#
# 前提条件:
#   - gh コマンドがインストール・認証済みであること
#   - claude コマンドがインストール・設定済みであること
set -euo pipefail

cd "$(dirname "$0")/.."

REPO_OWNER="canpok1"
REPO_NAME="maze-runner"
IN_PROGRESS_LABEL="in-progress-by-claude"
POLL_INTERVAL=30
MERGE_DELAY_SECONDS=300

# 依存コマンド確認
for cmd in gh claude; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "エラー: $cmd コマンドが見つかりません" >&2
    exit 1
  fi
done

echo "ユーザーストーリー監視を開始します (間隔: ${POLL_INTERVAL}秒)"

# マージ可能なPRを検出・自動マージする関数
merge_eligible_prs() {
  echo "マージ可能なPRをチェックします..."

  # 全open PRを取得
  if ! prs_json=$(gh pr list --state open --json number,createdAt,statusCheckRollup,mergeable --limit 100 2>&1); then
    echo "PR一覧の取得に失敗しました: $prs_json" >&2
    return 1
  fi

  # PRが存在するか確認
  pr_count=$(echo "$prs_json" | jq '. | length' 2>/dev/null || echo "0")
  if [ "$pr_count" -eq 0 ]; then
    echo "open状態のPRがありません"
    return 0
  fi

  echo "${pr_count}件のPRを確認します"

  # 各PRをチェック
  while IFS=$'\t' read -r pr_number created_at mergeable status_check_rollup; do
    echo "PR #${pr_number} をチェック中..."

    # PR作成から5分以上経過しているかチェック
    if [ -z "$created_at" ] || [ "$created_at" = "null" ]; then
      echo "  スキップ: 作成日時が取得できません"
      continue
    fi

    created_timestamp=$(date -d "$created_at" +%s 2>/dev/null || echo "0")
    current_timestamp=$(date +%s)
    elapsed_seconds=$((current_timestamp - created_timestamp))

    if [ "$elapsed_seconds" -lt "$MERGE_DELAY_SECONDS" ]; then
      echo "  スキップ: PR作成から5分未満（${elapsed_seconds}秒経過）"
      continue
    fi

    # mergeableチェック
    if [ "$mergeable" != "MERGEABLE" ]; then
      echo "  スキップ: マージ可能な状態ではありません（mergeable: $mergeable）"
      continue
    fi

    # statusCheckRollupチェックと、すべてのチェックがSUCCESSかどうかの確認
    read -r all_checks_passed check_count < <(echo "$status_check_rollup" | jq -r 'if . == null or . == [] then "false 0" else [(all(.[]; (.state // .conclusion) == "SUCCESS")), length] | @tsv end')

    if [ "$check_count" -eq 0 ]; then
      echo "  スキップ: CIチェックが設定されていないか、結果を取得できません"
      continue
    fi

    if [ "$all_checks_passed" != "true" ]; then
      echo "  スキップ: CIチェックがpassしていません"
      continue
    fi

    # すべての条件を満たしたのでマージ実行
    echo "  ✓ すべての条件を満たしました（${elapsed_seconds}秒経過、${check_count}件のチェックpass）"
    echo "  マージを実行します..."
    if ! output=$(gh pr merge "$pr_number" --squash 2>&1); then
      echo "  ✗ PR #${pr_number} のマージに失敗しました: $output" >&2
    else
      echo "  ✓ PR #${pr_number} を正常にマージしました"
    fi
  done < <(echo "$prs_json" | jq -r '.[] | "\(.number)\t\(.createdAt)\t\(.mergeable)\t\(.statusCheckRollup | tostring)"' 2>/dev/null || echo "")

  echo "PRチェック完了"
}

while true; do
  # draftラベルなし・in-progress-by-claudeラベルなし・open状態のissueを1件取得
  # 競合状態を防ぐため、1件ずつ取得してアトミックにロックする
  if issue_number=$(gh issue list --search "-label:draft -label:$IN_PROGRESS_LABEL" --state open --limit 1 --json number --jq '.[0].number'); then
    if [ -n "$issue_number" ] && [ "$issue_number" != "null" ]; then
      # サブIssueの件数を取得
      if sub_issue_count=$(gh api "/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issue_number}/sub_issues" --jq 'length' 2>/dev/null); then
        # サブIssueがない場合のみ処理
        if [ "$sub_issue_count" = "0" ]; then
          echo "対象issue #${issue_number} を処理します（サブIssueなし）"

          # 処理開始：in-progress-by-claudeラベルをアトミックに付与してロック
          if gh issue edit "$issue_number" --add-label "$IN_PROGRESS_LABEL"; then
            echo "issue #${issue_number} に $IN_PROGRESS_LABEL ラベルを付与しました"

            # ストーリー分解を実行
            if claude --remote "/breakdown-story ${issue_number}"; then
              echo "issue #${issue_number} のストーリー分解が完了しました"

              # 処理成功時のみラベルを除去
              if gh issue edit "$issue_number" --remove-label "$IN_PROGRESS_LABEL"; then
                echo "issue #${issue_number} から $IN_PROGRESS_LABEL ラベルを除去しました"
              else
                echo "警告: issue #${issue_number} からのラベル除去に失敗しました" >&2
              fi
            else
              echo "エラー: issue #${issue_number} のストーリー分解に失敗しました。無限ループを防ぐため、$IN_PROGRESS_LABEL ラベルは除去されません。" >&2
            fi
          else
            echo "エラー: issue #${issue_number} へのラベル付与に失敗しました。スキップします。" >&2
          fi
        fi
      else
        echo "警告: issue #${issue_number} のサブIssue確認に失敗しました。スキップします。" >&2
      fi
      # 処理対象の有無に関わらず、次のissueを即座に確認
      continue
    fi
  else
    echo "issue一覧の取得に失敗しました。次のポーリングで再試行します。" >&2
  fi

  # マージ可能なPRの検出・自動マージを実行
  merge_eligible_prs || true

  sleep "$POLL_INTERVAL"
done
