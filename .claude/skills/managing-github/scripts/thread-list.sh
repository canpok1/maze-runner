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

# スクリプトディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# 変数を JSON 形式で構築
VARIABLES=$(jq -n \
    --arg owner "$OWNER" \
    --arg name "$REPO" \
    --argjson number "$PR_NUMBER" \
    '{owner: $owner, name: $name, number: $number}')

# GitHub GraphQL API を呼び出す
RESPONSE=$("$SCRIPT_DIR/github-graphql.sh" "$QUERY" "$VARIABLES")

# PRが存在しない場合（nullの場合）
if echo "$RESPONSE" | jq -e '.data.repository.pullRequest == null' > /dev/null 2>&1; then
    echo "エラー: PR番号 '$PR_NUMBER' が見つからないか、アクセス権がありません。" >&2
    exit 1
fi

echo "$RESPONSE" | jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | {thread_id: .id, author: .comments.nodes[-1].author.login, comment: .comments.nodes[-1].body}'
