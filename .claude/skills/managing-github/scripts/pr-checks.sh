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

# スクリプトディレクトリの取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# jq コマンドの存在確認（レスポンスの整形に使用）
if ! command -v jq &> /dev/null; then
    echo "エラー: jq コマンドが見つかりません。インストールしてください。" >&2
    exit 1
fi

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
read -r OWNER REPO < <("$SCRIPT_DIR/repo-info.sh")

# PRの情報を取得（HEADコミットSHAを得るため）
PR_INFO=$("$SCRIPT_DIR/github-rest.sh" "/repos/$OWNER/$REPO/pulls/$PR_NUMBER")

# HEADコミットSHAを取得
SHA=$(echo "$PR_INFO" | jq -r '.head.sha')

if [[ -z "$SHA" ]] || [[ "$SHA" == "null" ]]; then
    echo "エラー: PRのHEADコミットSHAを取得できませんでした。" >&2
    exit 1
fi

# コミットのチェックランを取得
CHECK_RUNS=$("$SCRIPT_DIR/github-rest.sh" "/repos/$OWNER/$REPO/commits/$SHA/check-runs")

# チェックランを整形して出力（タブ区切り）
echo "$CHECK_RUNS" | jq -r '.check_runs[]? | [.name, .status, .conclusion // "", .html_url] | @tsv'
