#!/bin/bash
# ワークフローの実行ログを取得するスクリプト
#
# 使用方法:
#   $0 <run-id>
#
# 例:
#   $0 12345678901
#
# 注意事項:
#   - GH_TOKEN 環境変数が必要です
#   - run-id は gh pr checks の出力URLなどから取得できます

set -euo pipefail

# GH_TOKEN の存在チェック
if [ -z "${GH_TOKEN:-}" ]; then
  echo "エラー: GH_TOKEN 環境変数が設定されていません" >&2
  echo "GitHub Personal Access Token を GH_TOKEN 環境変数に設定してください" >&2
  exit 1
fi

# 必要なコマンドの存在確認
for cmd in curl git jq; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "エラー: $cmd コマンドが見つかりません" >&2
    exit 1
  fi
done

# 引数チェック
if [ $# -ne 1 ]; then
  echo "使用方法: $0 <run-id>" >&2
  exit 1
fi

RUN_ID="$1"

# run-id が数値であることをチェック
if ! [[ "$RUN_ID" =~ ^[0-9]+$ ]]; then
  echo "エラー: run-id は数値である必要があります" >&2
  exit 1
fi

# リポジトリ情報の取得
REMOTE_URL=$(git remote get-url origin)

# リポジトリのオーナーと名前を抽出
if [[ "$REMOTE_URL" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
  OWNER="${BASH_REMATCH[1]}"
  REPO="${BASH_REMATCH[2]}"
else
  echo "エラー: リポジトリ情報を取得できませんでした" >&2
  exit 1
fi

# ワークフロー実行情報を取得
RUN_INFO=$(curl -s -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$OWNER/$REPO/actions/runs/$RUN_ID")

# エラーチェック
if echo "$RUN_INFO" | jq -e '.message' > /dev/null 2>&1; then
  ERROR_MSG=$(echo "$RUN_INFO" | jq -r '.message')
  echo "エラー: $ERROR_MSG" >&2
  exit 1
fi

# ワークフロー実行のジョブ一覧を取得
JOBS_INFO=$(curl -s -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$OWNER/$REPO/actions/runs/$RUN_ID/jobs")

# ワークフロー情報の抽出
WORKFLOW_NAME=$(echo "$RUN_INFO" | jq -r '.name')
STATUS=$(echo "$RUN_INFO" | jq -r '.status')
CONCLUSION=$(echo "$RUN_INFO" | jq -r '.conclusion // "実行中"')
BRANCH=$(echo "$RUN_INFO" | jq -r '.head_branch')
COMMIT=$(echo "$RUN_INFO" | jq -r '.head_sha' | cut -c1-7)
URL=$(echo "$RUN_INFO" | jq -r '.html_url')

# 結果を整形して出力
echo "ワークフロー: $WORKFLOW_NAME"
echo "ステータス: $STATUS"
echo "結論: $CONCLUSION"
echo "ブランチ: $BRANCH"
echo "コミット: $COMMIT"
echo "URL: $URL"
echo ""
echo "ジョブ一覧:"

# ジョブ一覧の整形出力
echo "$JOBS_INFO" | jq -r '.jobs[] | "  \(.name) (\(.status), \(.conclusion // "実行中"))"'
