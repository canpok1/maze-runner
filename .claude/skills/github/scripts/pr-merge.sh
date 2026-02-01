#!/bin/bash
# PRをマージするスクリプト
#
# 使用方法:
#   $0 <PR番号> [マージ方式]
#
# 引数:
#   PR番号: マージするPRの番号（必須、数値）
#   マージ方式: "merge", "squash", "rebase" のいずれか（オプション、デフォルト: "squash"）
#
# 例:
#   $0 123
#   $0 123 squash
#   $0 123 merge
#
# 出力:
#   成功時: {"sha": "...", "message": "..."} をJSON形式で出力
#
# 注意事項:
#   - GH_TOKEN 環境変数が必要です

set -euo pipefail

# スクリプトディレクトリの取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# jq コマンドの存在確認（レスポンスの整形に使用）
if ! command -v jq &> /dev/null; then
    echo "エラー: jq コマンドが見つかりません。インストールしてください。" >&2
    exit 1
fi

# 使用方法を表示
usage() {
    echo -e "使用方法: $0 <PR番号> [マージ方式]\n例: $0 123 squash" >&2
    exit 1
}

# 引数チェック
if [[ $# -lt 1 || $# -gt 2 ]]; then
    echo "エラー: 引数の数が不正です。" >&2
    usage
fi

PR_NUMBER="$1"
MERGE_METHOD="${2:-squash}"

# PR番号が数値かチェック
if ! [[ "$PR_NUMBER" =~ ^[0-9]+$ ]]; then
    echo "エラー: PR番号は数値で指定してください。" >&2
    exit 1
fi

# マージ方式のバリデーション
case "$MERGE_METHOD" in
    merge|squash|rebase)
        ;;
    *)
        echo "エラー: マージ方式は 'merge', 'squash', 'rebase' のいずれかで指定してください。" >&2
        exit 1
        ;;
esac

# リポジトリ情報を取得
read -r OWNER REPO < <("$SCRIPT_DIR/repo-info.sh")

# JSON ペイロードを作成
JSON_PAYLOAD=$(jq -n \
    --arg merge_method "$MERGE_METHOD" \
    '{merge_method: $merge_method}')

# GitHub API を使用してPRをマージ
echo "PR #$PR_NUMBER をマージ中（方式: $MERGE_METHOD）..." >&2
ENDPOINT="/repos/$OWNER/$REPO/pulls/$PR_NUMBER/merge"
RESPONSE=$("$SCRIPT_DIR/github-rest.sh" "$ENDPOINT" "PUT" "$JSON_PAYLOAD")

# レスポンスからsha と message を抽出
SHA=$(echo "$RESPONSE" | jq -r '.sha // empty')
MESSAGE=$(echo "$RESPONSE" | jq -r '.message // empty')

if [[ -z "$SHA" ]]; then
    echo "エラー: マージに失敗しました。" >&2
    echo "レスポンス: $RESPONSE" >&2
    exit 1
fi

echo "PR #$PR_NUMBER をマージしました（方式: $MERGE_METHOD）" >&2

# 結果を JSON で出力
jq -n \
    --arg sha "$SHA" \
    --arg message "$MESSAGE" \
    '{sha: $sha, message: $message}'
