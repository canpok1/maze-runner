#!/bin/bash
# PRのCI状態（コミットステータス + チェックラン）を取得するスクリプト
#
# 使用方法:
#   $0 <PR番号>
#
# 例:
#   $0 123
#
# 出力形式:
#   JSON形式でコミットステータスとチェックランを出力
#
# 注意事項:
#   - GH_TOKEN 環境変数が必要です
#   - jq コマンドが必要です

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

echo "PR #$PR_NUMBER のCI状態を取得中..." >&2

# PRの情報を取得（HEADコミットSHAを得るため）
PR_INFO=$("$SCRIPT_DIR/github-rest.sh" "/repos/$OWNER/$REPO/pulls/$PR_NUMBER")

# HEADコミットSHAを取得
SHA=$(echo "$PR_INFO" | jq -r '.head.sha')

if [[ -z "$SHA" ]] || [[ "$SHA" == "null" ]]; then
    echo "エラー: PRのHEADコミットSHAを取得できませんでした。" >&2
    exit 1
fi

echo "コミットSHA: $SHA" >&2

# コミットステータスを取得
echo "コミットステータスを取得中..." >&2
COMMIT_STATUS=$("$SCRIPT_DIR/github-rest.sh" "/repos/$OWNER/$REPO/commits/$SHA/status")

# チェックランを取得
echo "チェックランを取得中..." >&2
CHECK_RUNS=$("$SCRIPT_DIR/github-rest.sh" "/repos/$OWNER/$REPO/commits/$SHA/check-runs")

# 結果をJSON形式で出力
jq -n \
    --arg sha "$SHA" \
    --argjson commit_status "$COMMIT_STATUS" \
    --argjson check_runs "$CHECK_RUNS" \
    '{
        sha: $sha,
        overall_state: $commit_status.state,
        statuses: ($commit_status.statuses // [] | map({
            context: .context,
            state: .state,
            target_url: .target_url
        })),
        check_runs: ($check_runs.check_runs // [] | map({
            name: .name,
            status: .status,
            conclusion: .conclusion,
            html_url: .html_url
        }))
    }'
