#!/bin/bash
# Issue のサブIssue一覧を取得するスクリプト
#
# 使用方法:
#   $0 <Issue番号>
#
# 例:
#   $0 123
#
# 出力形式:
#   NDJSON形式（1行1Issue）
#   {"id": "...", "number": 123, "title": "...", "state": "...", "url": "...", "labels": ["label1", ...]}
#
# 注意事項:
#   - 最大50件のサブIssueを取得します
#   - GH_TOKEN 環境変数が必要です

set -euo pipefail

# スクリプトディレクトリを取得
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

# GraphQL クエリを構築
QUERY=$(cat <<'EOF'
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      subIssues(first: 50) {
        nodes {
          id
          number
          title
          state
          url
          labels(first: 10) {
            nodes {
              name
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
    --argjson number "$ISSUE_NUMBER" \
    '{owner: $owner, name: $name, number: $number}')

# ステータスメッセージを出力
echo "Issue #$ISSUE_NUMBER のサブIssueを取得中..." >&2

# GitHub GraphQL API を呼び出す
RESPONSE=$("$SCRIPT_DIR/github-graphql.sh" "$QUERY" "$VARIABLES")

# Issueが存在しない場合（nullの場合）
if echo "$RESPONSE" | jq -e '.data.repository.issue == null' > /dev/null 2>&1; then
    echo "エラー: Issue番号 '$ISSUE_NUMBER' が見つからないか、アクセス権がありません。" >&2
    exit 1
fi

# サブIssueをNDJSON形式で出力
echo "$RESPONSE" | jq -c '.data.repository.issue.subIssues.nodes[] | {
    id: .id,
    number: .number,
    title: .title,
    state: .state,
    url: .url,
    labels: [.labels.nodes[].name]
}'
