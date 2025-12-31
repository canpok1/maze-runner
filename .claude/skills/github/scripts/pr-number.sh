#!/bin/bash
# 現在のブランチに対応するPR番号を取得するスクリプト
#
# 使用方法:
#   $0
#
# 例:
#   $0
#   # 出力: 123
#
# 注意事項:
#   - GH_TOKEN 環境変数が必要です
#   - 現在のブランチに対応するPRが存在しない場合はエラー

set -euo pipefail

# GH_TOKEN の存在チェック
if [ -z "${GH_TOKEN:-}" ]; then
  echo "エラー: GH_TOKEN 環境変数が設定されていません" >&2
  exit 1
fi

# 必要なコマンドの存在確認
for cmd in curl git jq; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "エラー: $cmd コマンドが見つかりません" >&2
    exit 1
  fi
done

# リポジトリ情報の取得
REMOTE_URL=$(git remote get-url origin)
if [[ $REMOTE_URL =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
  OWNER="${BASH_REMATCH[1]}"
  REPO="${BASH_REMATCH[2]}"
else
  echo "エラー: GitHub リポジトリの URL を解析できません: $REMOTE_URL" >&2
  exit 1
fi

echo "リポジトリ: $OWNER/$REPO" >&2

# 現在のブランチ名の取得
BRANCH=$(git branch --show-current)
if [ -z "$BRANCH" ]; then
  echo "エラー: 現在のブランチ名を取得できません" >&2
  exit 1
fi

echo "ブランチ: $BRANCH" >&2

# mainブランチのチェック
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "エラー: メインブランチではPR番号を取得できません" >&2
  exit 1
fi

# GitHub REST API でPRを検索
echo "PRを検索中..." >&2
RESPONSE=$(curl -s -H "Authorization: Bearer $GH_TOKEN" \
     -H "Accept: application/vnd.github+json" \
     "https://api.github.com/repos/$OWNER/$REPO/pulls?head=$OWNER:$BRANCH&state=open")

# PR番号を抽出
PR_NUMBER=$(echo "$RESPONSE" | jq -r '.[0].number // empty')

if [ -z "$PR_NUMBER" ]; then
  echo "エラー: ブランチ '$BRANCH' に対応するオープンなPRが見つかりません" >&2
  exit 1
fi

# PR番号を出力（標準出力）
echo "$PR_NUMBER"
