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

# 依存コマンド確認
for cmd in gh claude; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "エラー: $cmd コマンドが見つかりません" >&2
    exit 1
  fi
done

echo "ユーザーストーリー監視を開始します (間隔: ${POLL_INTERVAL}秒)"

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

  sleep "$POLL_INTERVAL"
done
