#!/bin/bash
# レビュースレッドをresolveするスクリプト
#
# 使用方法:
#   $0 <スレッドID>
#
# 例:
#   $0 "xxxxxxxxxxxxxxxxxxxx"

set -euo pipefail

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 使用方法を表示
usage() {
    echo "使用方法: $0 <スレッドID>" >&2
    echo "" >&2
    echo "例:" >&2
    echo "  $0 \"xxxxxxxxxxxxxxxxxxxx\"" >&2
    exit 1
}

# 引数チェック
if [[ $# -ne 1 ]]; then
    echo "エラー: スレッドIDを指定してください。" >&2
    usage
fi

THREAD_ID="$1"

# スレッドIDが空でないかチェック
if [[ -z "$THREAD_ID" ]]; then
    echo "エラー: スレッドIDが空です。" >&2
    exit 1
fi

echo "レビュースレッドをresolve中..." >&2
echo "スレッドID: $THREAD_ID" >&2

# GraphQL mutation を定義
GRAPHQL_MUTATION='mutation($threadId: ID!) {
  resolveReviewThread(input: {threadId: $threadId}) {
    thread {
      id
      isResolved
    }
  }
}'

# 変数を JSON 形式で構築
VARIABLES=$(jq -n --arg threadId "$THREAD_ID" '{threadId: $threadId}')

# github-graphql.sh を呼び出してレビュースレッドをresolve
set +e
RESULT=$("$SCRIPT_DIR/github-graphql.sh" "$GRAPHQL_MUTATION" "$VARIABLES")
EXIT_CODE=$?
set -e

if [[ $EXIT_CODE -ne 0 ]]; then
    echo "エラー: GitHub API へのリクエストに失敗しました。" >&2
    exit 1
fi

# 結果を確認
IS_RESOLVED=$(echo "$RESULT" | jq -r '.data.resolveReviewThread.thread.isResolved')

if [[ "$IS_RESOLVED" == "true" ]]; then
    echo "" >&2
    echo "✓ レビュースレッドをresolveしました。" >&2
    echo "スレッドID: $(echo "$RESULT" | jq -r '.data.resolveReviewThread.thread.id')" >&2
    exit 0
else
    echo "" >&2
    echo "✗ レビュースレッドのresolveに失敗しました。" >&2
    echo "エラー詳細:" >&2
    echo "$RESULT" | jq >&2
    exit 1
fi
