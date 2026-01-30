#!/bin/bash
# GitHub issueを監視し、assign-to-claudeラベルが付いたissueをClaudeで自動処理するスクリプト
#
# 使用方法:
#   ./scripts/watch-issue.sh
#
# 前提条件:
#   - gh コマンドがインストール・認証済みであること
#   - claude コマンドがインストール・設定済みであること
set -euo pipefail

cd "$(dirname "$0")/.."

LABEL="assign-to-claude"
IN_PROGRESS_LABEL="in-progress-by-claude"
POLL_INTERVAL=30

# 依存コマンド確認
for cmd in gh claude; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "エラー: $cmd コマンドが見つかりません" >&2
    exit 1
  fi
done

echo "issue監視を開始します (ラベル: $LABEL, 間隔: ${POLL_INTERVAL}秒)"

while true; do
  if issue_number=$(gh issue list --label "$LABEL" --search "-label:$IN_PROGRESS_LABEL" --state open --limit 1 --json number --jq '.[0].number'); then
    if [ -n "$issue_number" ] && [ "$issue_number" != "null" ]; then
      echo "対象issue #${issue_number} を処理します"
      if gh issue edit "$issue_number" --add-label "$IN_PROGRESS_LABEL"; then
        echo "issue #${issue_number} に $IN_PROGRESS_LABEL ラベルを付与しました"
        claude --remote "/solve-issue ${issue_number}"
      else
        echo "エラー: issue #${issue_number} へのラベル付与に失敗しました。スキップします。" >&2
      fi
      continue
    fi
  else
    echo "issue一覧の取得に失敗しました。次のポーリングで再試行します。" >&2
  fi

  sleep "$POLL_INTERVAL"
done
