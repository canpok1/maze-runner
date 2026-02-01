#!/bin/bash
# PRを検索するスクリプト
#
# 使用方法:
#   $0 <検索クエリ>
#
# 引数:
#   検索クエリ - GitHub search syntax に準拠した検索条件
#                例: "is:open author:username"
#                内部で "is:pr repo:OWNER/REPO" が自動的に付加されます
#
# 出力形式:
#   NDJSON形式（各行がJSON）
#   {"number": <PR番号>, "title": "<タイトル>", "state": "<状態>", "author": "<作者>", "url": "<HTML URL>"}
#
# 例:
#   $0 "is:open author:canpok1"
#   # 出力例:
#   # {"number":123,"title":"Add feature","state":"open","author":"canpok1","url":"https://github.com/owner/repo/pull/123"}
#   # {"number":124,"title":"Fix bug","state":"open","author":"canpok1","url":"https://github.com/owner/repo/pull/124"}
#
# 注意事項:
#   - GH_TOKEN 環境変数が必要です
#   - 検索結果が0件の場合は何も出力しません

set -euo pipefail

# スクリプトディレクトリの取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 必要なコマンドの存在確認
if ! command -v curl &> /dev/null; then
    echo "エラー: curl コマンドが見つかりません。インストールしてください。" >&2
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "エラー: jq コマンドが見つかりません。インストールしてください。" >&2
    exit 1
fi

# GH_TOKEN環境変数のチェック
if [[ -z "${GH_TOKEN:-}" ]]; then
    echo "エラー: GH_TOKEN環境変数が設定されていません。" >&2
    exit 1
fi

# 使用方法を表示
usage() {
    echo "使用方法: $0 <検索クエリ>" >&2
    echo "例: $0 \"is:open author:username\"" >&2
    exit 1
}

# 引数チェック
if [[ $# -ne 1 ]]; then
    echo "エラー: 検索クエリを指定してください。" >&2
    usage
fi

QUERY="$1"

# リポジトリ情報を取得
read -r OWNER REPO < <("$SCRIPT_DIR/repo-info.sh")

echo "リポジトリ: $OWNER/$REPO" >&2
echo "検索クエリ: $QUERY" >&2

# 検索クエリの構築（is:pr repo:OWNER/REPO を自動付加）
FULL_QUERY="is:pr repo:$OWNER/$REPO $QUERY"

# URLエンコード用の関数
urlencode() {
    local string="$1"
    local strlen=${#string}
    local encoded=""
    local pos c o

    for (( pos=0 ; pos<strlen ; pos++ )); do
        c=${string:$pos:1}
        case "$c" in
            [-_.~a-zA-Z0-9] ) o="${c}" ;;
            * ) printf -v o '%%%02x' "'$c"
        esac
        encoded+="${o}"
    done
    echo "${encoded}"
}

# クエリをURLエンコード
ENCODED_QUERY=$(urlencode "$FULL_QUERY")

# GitHub Search API を呼び出し
API_URL="https://api.github.com/search/issues?q=${ENCODED_QUERY}"

echo "PRを検索中..." >&2

# curl実行（github-rest.shはエンドポイントパスのみ受け付けるため、
# クエリパラメータ付きURLが必要な Search API では直接curlを使用）
set +e
response=$(curl -s \
    -H "Authorization: Bearer $GH_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "$API_URL")
curl_exit_code=$?
set -e

# curlのエラーチェック
if [[ $curl_exit_code -ne 0 ]]; then
    echo "エラー: curl コマンドが終了コード $curl_exit_code で失敗しました。" >&2
    exit 1
fi

# APIエラーレスポンスのチェック
if echo "$response" | jq -e '.message' &> /dev/null; then
    echo "エラー: GitHub APIがエラーを返しました:" >&2
    echo "$response" | jq -r '.message' >&2
    exit 1
fi

# 検索結果の件数を取得
total_count=$(echo "$response" | jq -r '.total_count // 0')

echo "検索結果: ${total_count}件" >&2

# 検索結果が0件の場合は何も出力しない
if [[ "$total_count" -eq 0 ]]; then
    exit 0
fi

# 結果をNDJSON形式で出力
echo "$response" | jq -c '.items[] | {
    number: .number,
    title: .title,
    state: .state,
    author: .user.login,
    url: .html_url
}'
