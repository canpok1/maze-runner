#!/bin/bash
# PRのCIをwatchモードで監視するスクリプト
#
# 使用方法:
#   $0 <PR番号>
#
# 例:
#   $0 123
#
# 注意事項:
#   - GH_TOKEN 環境変数が必要です

set -euo pipefail

# スクリプトディレクトリの取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# gh コマンドの存在確認
if ! command -v gh &> /dev/null; then
    echo "エラー: gh コマンドが見つかりません。インストールしてください。" >&2
    exit 1
fi

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

if [[ -z "$OWNER" || -z "$REPO" ]]; then
    echo "エラー: リポジトリ情報の取得に失敗しました。" >&2
    exit 1
fi

# PRのチェックをwatchモードで監視
gh pr checks "$PR_NUMBER" --watch --repo "$OWNER/$REPO"
