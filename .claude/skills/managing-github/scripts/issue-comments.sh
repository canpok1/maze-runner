#!/bin/bash
# GitHub Issue のコメント一覧を取得するスクリプト
#
# 使用方法:
#   $0 <Issue番号>
#
# 例:
#   $0 123
#
# 出力形式:
#   コメント一覧のJSON配列
#   各コメントに author_login, author_association, created_at, body を含む
#
# 注意事項:
#   - GH_TOKEN 環境変数が必要です

set -euo pipefail

# スクリプトディレクトリの取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# Issueのコメント一覧を取得して、必要なフィールドだけを抽出
"$SCRIPT_DIR/github-rest.sh" "/repos/$OWNER/$REPO/issues/$ISSUE_NUMBER/comments?per_page=100" | \
  jq 'map({
    author_login: .user.login,
    author_association: .author_association,
    created_at: .created_at,
    body: .body
  })'
