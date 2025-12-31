#!/bin/bash
# Gitリポジトリのオーナーとリポジトリ名を取得するスクリプト
#
# 使用方法:
#   $0
#
# 出力形式:
#   OWNER REPO
#
# 例:
#   $0
#   # 出力: canpok1 maze-runner
#
# サポートするURL形式:
#   - SSH: git@github.com:owner/repo.git
#   - HTTPS: https://github.com/owner/repo.git
#   - ローカルプロキシ: http://...@127.0.0.1:.../git/owner/repo
#
# 注意事項:
#   - git コマンドが必要です
#   - リポジトリのリモートURLが設定されている必要があります

set -euo pipefail

# 必要なコマンドの存在確認
if ! command -v git &> /dev/null; then
  echo "エラー: git コマンドが見つかりません" >&2
  exit 1
fi

# リモートURLの取得
if ! REMOTE_URL=$(git remote get-url origin 2>&1); then
  echo "エラー: リモートURLを取得できません" >&2
  exit 1
fi

# リポジトリ情報の解析
# SSH形式: git@github.com:owner/repo.git
# HTTPS形式: https://github.com/owner/repo.git
if [[ $REMOTE_URL =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
  OWNER="${BASH_REMATCH[1]}"
  REPO="${BASH_REMATCH[2]}"
# ローカルプロキシ形式: http://...@127.0.0.1:.../git/owner/repo
elif [[ $REMOTE_URL =~ /git/([^/]+)/([^/]+)$ ]]; then
  OWNER="${BASH_REMATCH[1]}"
  REPO="${BASH_REMATCH[2]}"
else
  echo "エラー: GitHub リポジトリの URL を解析できません: $REMOTE_URL" >&2
  exit 1
fi

# オーナーとリポジトリ名を標準出力に出力
echo "$OWNER $REPO"
