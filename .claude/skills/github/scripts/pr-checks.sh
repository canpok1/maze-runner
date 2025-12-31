#!/bin/bash
# PRのCI状態（チェックラン）を取得するスクリプト
#
# 使用方法:
#   $0 <PR番号>
#
# 例:
#   $0 123
#
# 出力形式:
#   <チェック名>\t<状態>\t<結論>\t<URL>
#
# 注意事項:
#   - GH_TOKEN 環境変数が必要です

set -euo pipefail

# GH_TOKEN の存在チェック
if [[ -z "${GH_TOKEN:-}" ]]; then
    echo "エラー: GH_TOKEN 環境変数が設定されていません。" >&2
    exit 1
fi

# 必要なコマンドの存在確認
for cmd in curl jq git; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "エラー: $cmd コマンドが見つかりません。インストールしてください。" >&2
        exit 1
    fi
done

# 使用方法を表示
usage() {
    echo -e "使用方法: $0 <PR番号>\n例: $0 123" >&2
    exit 1
}

# 引数チェック
if [[ $# -ne 1 ]]; then
    echo "エラー: PR番号を指定してください。" >&2
    usage
fi

PR_NUMBER="$1"

# PR番号が数値かチェック
if ! [[ "$PR_NUMBER" =~ ^[0-9]+$ ]]; then
    echo "エラー: PR番号は数値で指定してください。" >&2
    exit 1
fi

# リポジトリ情報を取得
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [[ -z "$REMOTE_URL" ]]; then
    echo "エラー: git remote が見つかりません。" >&2
    exit 1
fi

# SSH形式: git@github.com:owner/repo.git
# HTTPS形式: https://github.com/owner/repo.git
# ローカルプロキシ形式: http://...@127.0.0.1:.../git/owner/repo
if [[ "$REMOTE_URL" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
    OWNER="${BASH_REMATCH[1]}"
    REPO="${BASH_REMATCH[2]}"
elif [[ "$REMOTE_URL" =~ /git/([^/]+)/([^/]+)$ ]]; then
    OWNER="${BASH_REMATCH[1]}"
    REPO="${BASH_REMATCH[2]}"
else
    echo "エラー: GitHub リポジトリのURLを解析できませんでした。" >&2
    echo "Remote URL: $REMOTE_URL" >&2
    exit 1
fi

# PRの情報を取得（HEADコミットSHAを得るため）
set +e
PR_INFO=$(curl -s -H "Authorization: Bearer $GH_TOKEN" \
               -H "Accept: application/vnd.github+json" \
               "https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER" 2>&1)
CURL_EXIT_CODE=$?
set -e

# curl コマンドがエラーの場合
if [ $CURL_EXIT_CODE -ne 0 ]; then
    echo "エラー: GitHub API へのリクエストに失敗しました。" >&2
    exit 1
fi

# PRが見つからない場合
if echo "$PR_INFO" | jq -e '.message == "Not Found"' &> /dev/null; then
    echo "エラー: PR番号 '$PR_NUMBER' が見つからないか、アクセス権がありません。" >&2
    exit 1
fi

# APIエラーをチェック
if echo "$PR_INFO" | jq -e '.message' &> /dev/null && ! echo "$PR_INFO" | jq -e '.head' &> /dev/null; then
    ERROR_MESSAGE=$(echo "$PR_INFO" | jq -r '.message')
    echo "エラー: GitHub API がエラーを返しました: $ERROR_MESSAGE" >&2
    exit 1
fi

# HEADコミットSHAを取得
SHA=$(echo "$PR_INFO" | jq -r '.head.sha')

if [[ -z "$SHA" ]] || [[ "$SHA" == "null" ]]; then
    echo "エラー: PRのHEADコミットSHAを取得できませんでした。" >&2
    exit 1
fi

# コミットのチェックランを取得
set +e
CHECK_RUNS=$(curl -s -H "Authorization: Bearer $GH_TOKEN" \
                  -H "Accept: application/vnd.github+json" \
                  "https://api.github.com/repos/$OWNER/$REPO/commits/$SHA/check-runs" 2>&1)
CURL_EXIT_CODE=$?
set -e

# curl コマンドがエラーの場合
if [ $CURL_EXIT_CODE -ne 0 ]; then
    echo "エラー: GitHub API へのリクエストに失敗しました。" >&2
    exit 1
fi

# APIエラーをチェック
if echo "$CHECK_RUNS" | jq -e '.message' &> /dev/null && ! echo "$CHECK_RUNS" | jq -e '.check_runs' &> /dev/null; then
    ERROR_MESSAGE=$(echo "$CHECK_RUNS" | jq -r '.message')
    echo "エラー: GitHub API がエラーを返しました: $ERROR_MESSAGE" >&2
    exit 1
fi

# チェックランを整形して出力（タブ区切り）
echo "$CHECK_RUNS" | jq -r '.check_runs[]? | [.name, .status, .conclusion // "", .html_url] | @tsv'
