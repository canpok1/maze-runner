#!/bin/bash
# PRレビュースレッドに返信を投稿するスクリプト
#
# 使用方法:
#   $0 <スレッドID> "<コメント内容>"        # 引数で指定（推奨）
#   echo "コメント内容" | $0 <スレッドID>   # パイプで指定
#   $0 <スレッドID> <<EOF                    # ヒアドキュメントで指定
#   複数行の
#   コメント内容
#   EOF
#
# 例:
#   $0 "xxxxxxxxxxxxxxxxxxxx" "ご指摘ありがとうございます。修正しました。"
#   echo "ご指摘ありがとうございます。" | $0 "xxxxxxxxxxxxxxxxxxxx"
#
# 注意事項:
#   - スレッドIDはGitHub GraphQL APIのNode ID形式で指定してください
#   - コメント本文は引数または標準入力から読み取ります

set -euo pipefail

# 必要なコマンドの存在確認
for cmd in gh jq; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "エラー: $cmd コマンドが見つかりません。インストールしてください。" >&2
        exit 1
    fi
done

# 使用方法を表示
usage() {
    echo "使用方法:" >&2
    echo "  $0 <スレッドID> \"<コメント内容>\"  # 引数で指定（推奨）" >&2
    echo "  echo \"コメント内容\" | $0 <スレッドID>  # パイプで指定" >&2
    echo "" >&2
    echo "例:" >&2
    echo "  $0 \"xxxxxxxxxxxxxxxxxxxx\" \"ご指摘ありがとうございます。\"" >&2
    echo "  echo \"ご指摘ありがとうございます。\" | $0 \"xxxxxxxxxxxxxxxxxxxx\"" >&2
    exit 1
}

# 引数チェック（スレッドIDは必須）
if [[ $# -lt 1 ]]; then
    echo "エラー: スレッドIDを指定してください。" >&2
    usage
fi

THREAD_ID="$1"

# スレッドIDが空でないかチェック
if [[ -z "$THREAD_ID" ]]; then
    echo "エラー: スレッドIDが空です。" >&2
    exit 1
fi

# コメント本文の取得（引数優先、なければ標準入力）
if [[ $# -ge 2 ]]; then
    # 第2引数以降をすべてコメント本文として結合
    shift
    COMMENT_BODY="$*"
elif [[ ! -t 0 ]]; then
    # 標準入力がパイプまたはリダイレクトの場合
    COMMENT_BODY=""
    while IFS= read -r line || [[ -n "$line" ]]; do
        if [[ -n "$COMMENT_BODY" ]]; then
            COMMENT_BODY="${COMMENT_BODY}"$'\n'"${line}"
        else
            COMMENT_BODY="${line}"
        fi
    done
else
    echo "エラー: コメント本文を指定してください。" >&2
    echo "引数として指定するか、標準入力から入力してください。" >&2
    usage
fi

# コメント本文が空でないかチェック
if [[ -z "$COMMENT_BODY" ]]; then
    echo "エラー: コメント本文が空です。" >&2
    exit 1
fi

# リポジトリ情報を取得
OWNER_REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
OWNER="${OWNER_REPO%/*}"
REPO="${OWNER_REPO#*/}"

echo "リポジトリ: $OWNER/$REPO, スレッドID: $THREAD_ID" >&2
echo "返信を投稿中..." >&2

# 返信を投稿
set +e
RESULT=$(gh api graphql \
  -f pullRequestReviewThreadId="$THREAD_ID" \
  -f body="$COMMENT_BODY" \
  -f query='
mutation($pullRequestReviewThreadId: ID!, $body: String!) {
  addPullRequestReviewThreadReply(input: {pullRequestReviewThreadId: $pullRequestReviewThreadId, body: $body}) {
    comment {
      id
      body
      createdAt
      author {
        login
      }
    }
  }
}' 2>&1)
GH_POST_EXIT_CODE=$?
set -e

# 結果を確認
if [ "$GH_POST_EXIT_CODE" -ne 0 ]; then
    echo "エラー: 返信の投稿に失敗しました。" >&2
    echo "$RESULT" | jq >&2
    exit 1
fi

COMMENT_ID=$(echo "$RESULT" | jq -r '.data.addPullRequestReviewThreadReply.comment.id // empty')

if [[ -n "$COMMENT_ID" ]]; then
    echo "返信を投稿しました。" >&2
    echo "$RESULT" | jq -r '.data.addPullRequestReviewThreadReply.comment | "コメントID: \(.id), 投稿者: @\(.author.login), 作成日時: \(.createdAt)"' >&2
    exit 0
else
    echo "エラー: 返信の投稿は成功しましたが、レスポンスからコメントIDを取得できませんでした。" >&2
    echo "$RESULT" | jq >&2
    exit 1
fi
