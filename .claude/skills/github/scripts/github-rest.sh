#!/usr/bin/env bash
set -euo pipefail

# GitHub REST API呼び出しスクリプト
#
# 使用例:
#   ./github-rest.sh "/repos/owner/repo/pulls"
#   ./github-rest.sh "/repos/owner/repo/pulls" "POST" '{"title":"..."}'

# 必要なコマンドのチェック
if ! command -v curl &> /dev/null; then
    echo "エラー: curlコマンドが見つかりません。インストールしてください。" >&2
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "エラー: jqコマンドが見つかりません。インストールしてください。" >&2
    exit 1
fi

# GH_TOKEN環境変数のチェック
if [[ -z "${GH_TOKEN:-}" ]]; then
    echo "エラー: GH_TOKEN環境変数が設定されていません。" >&2
    exit 1
fi

# 引数の取得
endpoint="${1:-}"
method="${2:-GET}"
body="${3:-}"

# エンドポイントが指定されているかチェック
if [[ -z "$endpoint" ]]; then
    echo "使用方法: $0 <endpoint> [method] [body]" >&2
    echo "例: $0 /repos/owner/repo/pulls" >&2
    echo "例: $0 /repos/owner/repo/pulls POST '{\"title\":\"test\"}'" >&2
    exit 1
fi

# API URLの構築
api_url="https://api.github.com${endpoint}"

# curlコマンドの引数を構築
curl_args=(
    -s
    -X "$method"
    -H "Authorization: Bearer $GH_TOKEN"
    -H "Accept: application/vnd.github+json"
    -H "X-GitHub-Api-Version: 2022-11-28"
)

# ボディが指定されている場合は追加
if [[ -n "$body" ]]; then
    curl_args+=(-H "Content-Type: application/json" -d "$body")
fi

# エラーハンドリング付きでcurl実行
set +e
response=$(curl "${curl_args[@]}" "$api_url")
curl_exit_code=$?
set -e

# curlのエラーチェック
if [[ $curl_exit_code -ne 0 ]]; then
    echo "エラー: curlコマンドが終了コード $curl_exit_code で失敗しました。" >&2
    exit 1
fi

# APIエラーレスポンスのチェック (.messageフィールドの有無)
if echo "$response" | jq -e '.message' &> /dev/null; then
    echo "エラー: GitHub APIがエラーを返しました:" >&2
    echo "$response" | jq -r '.message' >&2
    exit 1
fi

# 成功時はレスポンスをstdoutに出力
echo "$response"
