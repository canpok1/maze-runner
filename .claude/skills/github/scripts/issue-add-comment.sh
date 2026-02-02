#!/bin/bash
# GitHub Issue にコメントを追加するスクリプト
#
# 使用方法:
#   $0 <Issue番号> <コメント本文>
#
# 例:
#   $0 123 "Merged via PR #456"
#
# 出力形式:
#   作成されたコメントのJSON（GitHub REST API レスポンス）
#
# 注意事項:
#   - GH_TOKEN 環境変数が必要です

set -euo pipefail

# スクリプトディレクトリの取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 使用方法を表示
usage() {
    echo -e "使用方法: $0 <Issue番号> <コメント本文>\n例: $0 123 \"Merged via PR #456\"" >&2
    exit 1
}

# 引数チェック
if [[ $# -ne 2 ]]; then
    echo "エラー: Issue番号とコメント本文を指定してください。" >&2
    usage
fi

ISSUE_NUMBER="$1"
COMMENT_BODY="$2"

# Issue番号が数値かチェック
if ! [[ "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
    echo "エラー: Issue番号は数値で指定してください。" >&2
    exit 1
fi

# コメント本文が空でないかチェック
if [[ -z "$COMMENT_BODY" ]]; then
    echo "エラー: コメント本文が空です。" >&2
    exit 1
fi

# リポジトリ情報を取得
read -r OWNER REPO < <("$SCRIPT_DIR/repo-info.sh")

# リクエストボディをJSONで構築
REQUEST_BODY=$(jq -n --arg body "$COMMENT_BODY" '{body: $body}')

# Issueにコメントを追加して出力
"$SCRIPT_DIR/github-rest.sh" "/repos/$OWNER/$REPO/issues/$ISSUE_NUMBER/comments" "POST" "$REQUEST_BODY"
