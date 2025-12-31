#!/bin/bash
# レビュースレッドをresolveするスクリプト
#
# 使用方法:
#   $0 <スレッドID>
#
# 例:
#   $0 "xxxxxxxxxxxxxxxxxxxx"

set -euo pipefail

# 必要なコマンドの存在確認
for cmd in curl jq; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "エラー: $cmd コマンドが見つかりません。インストールしてください。" >&2
        exit 1
    fi
done

# GH_TOKEN の存在チェック
if [[ -z "${GH_TOKEN:-}" ]]; then
    echo "エラー: GH_TOKEN 環境変数が設定されていません。" >&2
    exit 1
fi

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

# GraphQL クエリを JSON 形式で構築
GRAPHQL_QUERY=$(jq -n \
  --arg threadId "$THREAD_ID" \
  '{
    query: "mutation($threadId: ID!) { resolveReviewThread(input: {threadId: $threadId}) { thread { id isResolved } } }",
    variables: {threadId: $threadId}
  }')

# レビュースレッドをresolve
RESULT=$(curl -s -H "Authorization: Bearer $GH_TOKEN" \
     -H "Content-Type: application/json" \
     -d "$GRAPHQL_QUERY" \
     https://api.github.com/graphql)

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
