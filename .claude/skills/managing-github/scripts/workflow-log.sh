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

# スクリプトディレクトリの取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 引数チェック
if [[ $# -ne 1 ]]; then
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
read -r OWNER REPO < <("$SCRIPT_DIR/repo-info.sh")

# ワークフロー実行情報を取得
RUN_INFO=$("$SCRIPT_DIR/github-rest.sh" "/repos/$OWNER/$REPO/actions/runs/$RUN_ID")

# ワークフロー実行のジョブ一覧を取得
JOBS_INFO=$("$SCRIPT_DIR/github-rest.sh" "/repos/$OWNER/$REPO/actions/runs/$RUN_ID/jobs")

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
