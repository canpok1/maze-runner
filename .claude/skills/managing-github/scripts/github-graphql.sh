#!/bin/bash
# GitHub GraphQL API を呼び出すための汎用スクリプト
#
# 使用方法:
#   $0 <GraphQLクエリ> [変数JSON]
#
# 例:
#   # 単純なクエリ
#   $0 'query { viewer { login } }'
#
#   # 変数付きクエリ
#   $0 'query($owner: String!) { repository(owner: $owner, name: "repo") { name } }' '{"owner": "canpok1"}'
#
# 注意事項:
#   - GH_TOKEN 環境変数が必要です
#   - クエリは第1引数として必須です
#   - 変数は第2引数としてJSON形式で指定します（省略可、デフォルトは "{}"）

set -euo pipefail

# GH_TOKEN の存在チェック
if [[ -z "${GH_TOKEN:-}" ]]; then
    echo "エラー: GH_TOKEN 環境変数が設定されていません。" >&2
    exit 1
fi

# 必要なコマンドの存在確認
for cmd in curl jq; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "エラー: $cmd コマンドが見つかりません。インストールしてください。" >&2
        exit 1
    fi
done

# 使用方法を表示
usage() {
    echo "使用方法: $0 <GraphQLクエリ> [変数JSON]" >&2
    echo "例: $0 'query { viewer { login } }'" >&2
    echo "例: $0 'query(\$owner: String!) { repository(owner: \$owner, name: \"repo\") { name } }' '{\"owner\": \"canpok1\"}'" >&2
    exit 1
}

# 引数チェック
if [[ $# -lt 1 ]]; then
    echo "エラー: GraphQLクエリを指定してください。" >&2
    usage
fi

QUERY="$1"

# 第2引数（変数）が指定されていない場合は空のJSONオブジェクトをデフォルト値とする
if [[ $# -lt 2 ]]; then
    VARIABLES="{}"
else
    VARIABLES="$2"
fi

# 変数が有効なJSONかチェック
if ! echo "$VARIABLES" | jq empty > /dev/null 2>&1; then
    echo "エラー: 変数が有効なJSON形式ではありません。" >&2
    echo "指定された変数: $VARIABLES" >&2
    exit 1
fi

# GraphQL API 呼び出し用の JSON ペイロードを構築
# jqを使用して適切にエスケープする
PAYLOAD=$(jq -n \
    --arg query "$QUERY" \
    --argjson variables "$VARIABLES" \
    '{query: $query, variables: $variables}')

# set +e で一時的にエラーでの終了を無効化
set +e
RESPONSE=$(curl -s \
    -H "Authorization: Bearer $GH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    https://api.github.com/graphql 2>&1)
CURL_EXIT_CODE=$?
set -e

# curl コマンドがエラーの場合
if [[ $CURL_EXIT_CODE -ne 0 ]]; then
    echo "エラー: GitHub API へのリクエストに失敗しました。" >&2
    exit 1
fi

# GraphQL APIエラーをチェック
if echo "$RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
    echo "エラー: GitHub GraphQL API がエラーを返しました。" >&2
    echo "$RESPONSE" | jq -r '.errors[].message' >&2
    exit 1
fi

# 成功: レスポンスボディを標準出力に出力
echo "$RESPONSE"
