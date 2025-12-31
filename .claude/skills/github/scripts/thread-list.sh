#!/bin/bash
# PRの未解決レビューコメントを取得するスクリプト
#
# 使用方法:
#   $0 <PR番号>
#
# 例:
#   $0 123
#
# 注意事項:
#   - 最大30件のレビュースレッドを取得します
#   - 各スレッドの最後の10件のコメントを取得します
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

# GraphQL クエリを構築
QUERY=$(cat <<'EOF'
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 30) {
        nodes {
          id
          isResolved
          comments(last: 10) {
            nodes {
              id
              body
              author {
                login
              }
            }
          }
        }
      }
    }
  }
}
EOF
)

# GraphQL API 呼び出し用の JSON ペイロードを構築
PAYLOAD=$(jq -n \
    --arg query "$QUERY" \
    --arg owner "$OWNER" \
    --arg name "$REPO" \
    --argjson number "$PR_NUMBER" \
    '{query: $query, variables: {owner: $owner, name: $name, number: $number}}')

# set +e で一時的にエラーでの終了を無効化
set +e
RESPONSE=$(curl -s -H "Authorization: Bearer $GH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    https://api.github.com/graphql 2>&1)
CURL_EXIT_CODE=$?
set -e

# curl コマンドがエラーの場合
if [ $CURL_EXIT_CODE -ne 0 ]; then
    echo "エラー: GitHub API へのリクエストに失敗しました。" >&2
    exit 1
fi

# APIエラーをチェック
if echo "$RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
    echo "エラー: GitHub API がエラーを返しました。" >&2
    echo "$RESPONSE" | jq -r '.errors[].message' >&2
    exit 1
fi

# PRが存在しない場合（nullの場合）
if echo "$RESPONSE" | jq -e '.data.repository.pullRequest == null' > /dev/null 2>&1; then
    echo "エラー: PR番号 '$PR_NUMBER' が見つからないか、アクセス権がありません。" >&2
    exit 1
fi

echo "$RESPONSE" | jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | {thread_id: .id, author: .comments.nodes[-1].author.login, comment: .comments.nodes[-1].body}'
