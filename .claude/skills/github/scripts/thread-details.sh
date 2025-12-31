#!/bin/bash
# PRレビュースレッドの詳細情報を取得するスクリプト
#
# 使用方法:
#   $0 <スレッドID> [スレッドID...]
#
# 例:
#   # 単一スレッドの詳細を取得
#   $0 "xxxxxxxxxxxxxxxxxxxx"
#
#   # 複数スレッドの詳細を取得
#   $0 "xxxxxxxxxxxxxxxxxxxx" "xxxxxxxxxxxxxxxxxxxx"
#
# 出力情報:
#   - スレッドID
#   - 解決状態（未解決/解決済み）
#   - ファイルパス
#   - 行番号
#   - 各コメント（作成者、本文、作成日時）を時系列順で表示
#
# 注意事項:
#   - スレッドIDはGitHub GraphQL APIのNode ID形式で指定してください
#   - 各スレッドの最大100件のコメントを取得します

set -euo pipefail

# GH_TOKEN 環境変数のチェック
if [[ -z "${GH_TOKEN:-}" ]]; then
    echo "エラー: GH_TOKEN 環境変数が設定されていません。" >&2
    exit 1
fi

# 必要なコマンドの存在確認
for cmd in curl jq; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "エラー: $cmd コマンドが見つかりません。インストールしてください。" >&2
        exit 1
    fi
done

# 使用方法を表示
usage() {
    echo "使用方法: $0 <スレッドID> [スレッドID...]" >&2
    echo "例: $0 \"xxxxxxxxxxxxxxxxxxxx\"" >&2
    exit 1
}

# 引数チェック
if [[ $# -lt 1 ]]; then
    echo "エラー: スレッドIDを1つ以上指定してください。" >&2
    usage
fi

# 単一のスレッド情報を取得する関数
fetch_thread_details() {
    local thread_id="$1"

    read -r -d '' query <<'GRAPHQL' || true
query($threadId: ID!) {
  node(id: $threadId) {
    ... on PullRequestReviewThread {
      id
      isResolved
      path
      line
      startLine
      diffSide
      comments(first: 100) {
        nodes {
          id
          body
          createdAt
          author {
            login
          }
        }
      }
    }
  }
}
GRAPHQL

    # GraphQL クエリをJSON形式で構築
    local graphql_payload
    graphql_payload=$(jq -n \
        --arg query "$query" \
        --arg threadId "$thread_id" \
        '{query: $query, variables: {threadId: $threadId}}')

    set +e
    local response
    response=$(curl -s -H "Authorization: Bearer $GH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$graphql_payload" \
        https://api.github.com/graphql 2>&1)
    local exit_code=$?
    set -e

    # curl コマンドがエラーの場合
    if [ $exit_code -ne 0 ]; then
        echo "エラー: スレッドID '$thread_id' の取得に失敗しました。" >&2
        echo "$response" >&2
        return 1
    fi

    # GitHub API がエラーを返した場合（errors フィールドが存在する場合）
    if echo "$response" | jq -e '.errors' > /dev/null 2>&1; then
        echo "エラー: スレッドID '$thread_id' の取得に失敗しました。" >&2
        echo "$response" | jq -r '.errors[] | .message' >&2
        return 1
    fi

    # スレッドが存在しない場合（nullの場合）
    if echo "$response" | jq -e '.data.node == null' > /dev/null 2>&1; then
        echo "エラー: スレッドID '$thread_id' が見つからないか、アクセス権がありません。" >&2
        return 1
    fi

    # 詳細情報を整形して出力
    echo "$response" | jq -r '
        .data.node |
        "───────────────────────────────────────",
        "スレッドID: \(.id)",
        "解決状態: \(if .isResolved then "✓ 解決済み" else "✗ 未解決" end)",
        "ファイル: \(.path // "N/A")",
        "行番号: \(if .startLine and .startLine != .line then "\(.startLine)-\(.line)" elif .line then "\(.line)" else "N/A" end)",
        "コメント:",
        (.comments.nodes | to_entries[] |
            "  [\(.key + 1)] \(.value.author.login // "unknown") - \(.value.createdAt)",
            (if .value.body != "" then (.value.body | split("\n") | map("      " + .) | join("\n")) else empty end),
            ""
        )
    '
}

# メイン処理
errors=0
for thread_id in "$@"; do
    if [[ -z "$thread_id" ]]; then
        echo "警告: 空のスレッドIDはスキップします。" >&2
        continue
    fi

    if ! fetch_thread_details "$thread_id"; then
        ((errors++)) || true
    fi
done

if [[ $errors -gt 0 ]]; then
    echo "警告: $errors 件のスレッド取得に失敗しました。" >&2
    exit 1
fi
