#!/bin/bash
# プルリクエストを作成するスクリプト
#
# 使用方法: ./create-pr.sh <PR_TITLE> <PR_BODY>
#
# 注意事項:
#   - タイトルと本文は必須です
#   - PRタイトルにはissue番号を含めないでください
#   - 本文には fixed #<issue番号> を含めてください

set -euo pipefail

# スクリプトディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# gitコマンドの存在確認
if ! command -v git &> /dev/null; then
    echo "エラー: git コマンドが見つかりません。インストールしてください。" >&2
    exit 1
fi

# 引数チェック
if [[ $# -lt 2 ]]; then
    echo "使用方法: $0 <PR_TITLE> <PR_BODY>" >&2
    exit 1
fi

PR_TITLE="$1"
shift
PR_BODY="$*"

if [[ -z "$PR_TITLE" ]]; then
    echo "エラー: PRタイトルが空です。" >&2
    exit 1
fi

if [[ -z "$PR_BODY" ]]; then
    echo "エラー: PR本文が空です。" >&2
    exit 1
fi

# 現在のブランチを取得
CURRENT_BRANCH=$(git branch --show-current)

if [[ "$CURRENT_BRANCH" == "main" ]]; then
    echo "エラー: mainブランチから直接PRを作成することはできません。" >&2
    exit 1
fi

echo "ブランチ: $CURRENT_BRANCH" >&2

# プッシュ処理
echo "リモートの状態を取得中..." >&2
if ! git fetch origin; then
    echo "エラー: git fetchに失敗しました。" >&2
    exit 1
fi

do_push() {
    echo "プッシュ中..." >&2
    if ! git push "$@"; then
        echo "エラー: プッシュに失敗しました。" >&2
        exit 1
    fi
}

if git rev-parse --verify "origin/$CURRENT_BRANCH" &>/dev/null; then
    if [[ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/$CURRENT_BRANCH")" ]]; then
        do_push origin "$CURRENT_BRANCH"
    fi
else
    do_push -u origin "$CURRENT_BRANCH"
fi

# リポジトリ情報を取得
echo "リポジトリ情報を取得中..." >&2
read -r OWNER REPO < <("$SCRIPT_DIR/repo-info.sh")
echo "Owner: $OWNER, Repo: $REPO" >&2

# PR作成
echo "PR作成中..." >&2

# JSON ペイロードを作成
JSON_PAYLOAD=$(jq -n \
    --arg title "$PR_TITLE" \
    --arg body "$PR_BODY" \
    --arg head "$CURRENT_BRANCH" \
    --arg base "main" \
    '{title: $title, body: $body, head: $head, base: $base}')

# GitHub API を使用してPRを作成
ENDPOINT="/repos/$OWNER/$REPO/pulls"
RESPONSE=$("$SCRIPT_DIR/github-rest.sh" "$ENDPOINT" "POST" "$JSON_PAYLOAD")

# 成功: html_url を抽出
PR_URL=$(echo "$RESPONSE" | jq -r '.html_url')

if [[ -z "$PR_URL" || "$PR_URL" == "null" ]]; then
    echo "エラー: PR URLを取得できませんでした。" >&2
    echo "レスポンス: $RESPONSE" >&2
    exit 1
fi

echo "PR URL: $PR_URL" >&2
exit 0
