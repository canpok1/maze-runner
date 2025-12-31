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

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 必要なコマンドの存在確認（git のみ、他は共通スクリプトが処理）
if ! command -v git &> /dev/null; then
  echo "エラー: git コマンドが見つかりません" >&2
  exit 1
fi

# リポジトリ情報の取得（共通スクリプトを使用）
read -r OWNER REPO < <("$SCRIPT_DIR/repo-info.sh")

echo "リポジトリ: $OWNER/$REPO" >&2

# 現在のブランチ名の取得
BRANCH=$(git branch --show-current)
if [[ -z "$BRANCH" ]]; then
  echo "エラー: 現在のブランチ名を取得できません" >&2
  exit 1
fi

echo "ブランチ: $BRANCH" >&2

# mainブランチのチェック
if [[ "$BRANCH" == "main" ]] || [[ "$BRANCH" == "master" ]]; then
  echo "エラー: メインブランチではPR番号を取得できません" >&2
  exit 1
fi

# GitHub REST API でPRを検索（共通スクリプトを使用）
echo "PRを検索中..." >&2
ENDPOINT="/repos/$OWNER/$REPO/pulls?head=$OWNER:$BRANCH&state=open"
RESPONSE=$("$SCRIPT_DIR/github-rest.sh" "$ENDPOINT")

# PR番号を抽出
PR_NUMBER=$(echo "$RESPONSE" | jq -r '.[0].number // empty')

if [[ -z "$PR_NUMBER" ]]; then
  echo "エラー: ブランチ '$BRANCH' に対応するオープンなPRが見つかりません" >&2
  exit 1
fi

# PR番号を出力（標準出力）
echo "$PR_NUMBER"
