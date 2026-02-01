#!/bin/bash
# GitHub Issue の詳細を取得するスクリプト
#
# 使用方法:
#   $0 <Issue番号>
#
# 例:
#   $0 123
#
# 出力形式:
#   Issue詳細のJSON（GitHub REST API レスポンス）
#
# 注意事項:
#   - GH_TOKEN 環境変数が必要です

set -euo pipefail

# スクリプトディレクトリの取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# jq コマンドの存在確認（レスポンスの検証に使用）
if ! command -v jq &> /dev/null; then
    echo "エラー: jq コマンドが見つかりません。インストールしてください。" >&2
    exit 1
fi

# 使用方法を表示
usage() {
    echo -e "使用方法: $0 <Issue番号>\n例: $0 123" >&2
    exit 1
}

# 引数チェック
if [[ $# -ne 1 ]]; then
    echo "エラー: Issue番号を指定してください。" >&2
    usage
fi

ISSUE_NUMBER="$1"

# Issue番号が数値かチェック
if ! [[ "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
    echo "エラー: Issue番号は数値で指定してください。" >&2
    exit 1
fi

# リポジトリ情報を取得
read -r OWNER REPO < <("$SCRIPT_DIR/repo-info.sh")

# Issueの詳細を取得して出力
"$SCRIPT_DIR/github-rest.sh" "/repos/$OWNER/$REPO/issues/$ISSUE_NUMBER"
