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

# 必要なコマンドの存在確認
for cmd in git curl jq; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "エラー: $cmd コマンドが見つかりません。インストールしてください。" >&2
        exit 1
    fi
done

# GH_TOKEN の存在確認
if [[ -z "${GH_TOKEN:-}" ]]; then
    echo "エラー: GH_TOKEN 環境変数が設定されていません。" >&2
    echo "GitHub Personal Access Token を設定してください。" >&2
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
REMOTE_URL=$(git remote get-url origin)

if [[ "$REMOTE_URL" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
    OWNER="${BASH_REMATCH[1]}"
    REPO="${BASH_REMATCH[2]}"
else
    echo "エラー: GitHub リポジトリのURLを解析できません。" >&2
    echo "Remote URL: $REMOTE_URL" >&2
    exit 1
fi

echo "Owner: $OWNER, Repo: $REPO" >&2

# PR作成
echo "PR作成中..." >&2

# JSON ペイロードを作成（jq を使用して安全にJSONを構築）
JSON_PAYLOAD=$(jq -n \
    --arg title "$PR_TITLE" \
    --arg body "$PR_BODY" \
    --arg head "$CURRENT_BRANCH" \
    --arg base "main" \
    '{title: $title, body: $body, head: $head, base: $base}')

# GitHub API を使用してPRを作成
API_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Authorization: Bearer $GH_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    -d "$JSON_PAYLOAD" \
    "https://api.github.com/repos/$OWNER/$REPO/pulls")

# HTTPステータスコードとレスポンスボディを分離
HTTP_STATUS=$(echo "$API_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$API_RESPONSE" | head -n-1)

if [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 300 ]]; then
    # 成功: html_url を抽出
    PR_URL=$(echo "$RESPONSE_BODY" | jq -r '.html_url')

    if [[ -z "$PR_URL" || "$PR_URL" == "null" ]]; then
        echo "エラー: PR URLを取得できませんでした。" >&2
        echo "レスポンス: $RESPONSE_BODY" >&2
        exit 1
    fi

    echo "PR URL: $PR_URL" >&2
    exit 0
else
    # エラー
    echo "エラー: プルリクエストの作成に失敗しました。" >&2
    echo "HTTPステータス: $HTTP_STATUS" >&2
    echo "レスポンス: $RESPONSE_BODY" >&2
    exit 1
fi
