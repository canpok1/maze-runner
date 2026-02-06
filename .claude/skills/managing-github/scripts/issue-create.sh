#!/bin/bash
# GitHub Issue を作成するスクリプト
#
# 使用方法:
#   $0 --title "<タイトル>" --body "<本文>"
#   $0 --title "<タイトル>" --body-file <ファイルパス>
#   $0 --title "<タイトル>" --body-file - <<EOF
#   複数行の
#   本文
#   EOF
#   $0 --title "<タイトル>" --body "<本文>" --label bug --label enhancement
#
# 例:
#   $0 --title "バグ修正" --body "バグを修正しました" --label bug
#   echo "本文" | $0 --title "新機能" --body-file -
#
# 注意事項:
#   - --title は必須です
#   - --body と --body-file は排他的です
#   - --body-file - で標準入力から読み取ります
#   - --label は複数回指定可能です

set -euo pipefail

# スクリプトディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 使用方法を表示
usage() {
    echo "使用方法:" >&2
    echo "  $0 --title \"<タイトル>\" --body \"<本文>\"" >&2
    echo "  $0 --title \"<タイトル>\" --body-file <ファイルパス>" >&2
    echo "  $0 --title \"<タイトル>\" --body-file - <<EOF" >&2
    echo "  複数行の本文" >&2
    echo "  EOF" >&2
    echo "" >&2
    echo "オプション:" >&2
    echo "  --title <タイトル>        Issue タイトル（必須）" >&2
    echo "  --body <本文>             Issue 本文（--body-file と排他）" >&2
    echo "  --body-file <ファイル>    Issue 本文をファイルから読み込み（- で stdin）" >&2
    echo "  --label <ラベル>          ラベル（複数回指定可）" >&2
    exit 1
}

# 変数初期化
TITLE=""
BODY=""
BODY_FILE=""
LABELS=()
FOOTER_TEXT="---
*このIssueは [Claude Code](https://claude.ai/code) により自動作成されました*"

# 引数パース
while [[ $# -gt 0 ]]; do
    case "$1" in
        --title)
            if [[ $# -lt 2 ]]; then
                echo "エラー: --title にはタイトルを指定してください。" >&2
                usage
            fi
            TITLE="$2"
            shift 2
            ;;
        --body)
            if [[ $# -lt 2 ]]; then
                echo "エラー: --body には本文を指定してください。" >&2
                usage
            fi
            BODY="$2"
            shift 2
            ;;
        --body-file)
            if [[ $# -lt 2 ]]; then
                echo "エラー: --body-file にはファイルパスを指定してください。" >&2
                usage
            fi
            BODY_FILE="$2"
            shift 2
            ;;
        --label)
            if [[ $# -lt 2 ]]; then
                echo "エラー: --label にはラベル名を指定してください。" >&2
                usage
            fi
            LABELS+=("$2")
            shift 2
            ;;
        *)
            echo "エラー: 不明なオプション: $1" >&2
            usage
            ;;
    esac
done

# 必須パラメータチェック
if [[ -z "$TITLE" ]]; then
    echo "エラー: --title は必須です。" >&2
    usage
fi

# --body と --body-file の排他チェック
if [[ -n "$BODY" && -n "$BODY_FILE" ]]; then
    echo "エラー: --body と --body-file は同時に指定できません。" >&2
    usage
fi

# 本文の取得
if [[ -n "$BODY_FILE" ]]; then
    if [[ "$BODY_FILE" == "-" ]]; then
        # 標準入力から読み込み
        BODY=$(cat)
    else
        # ファイルから読み込み
        if [[ ! -f "$BODY_FILE" ]]; then
            echo "エラー: ファイルが見つかりません: $BODY_FILE" >&2
            exit 1
        fi
        BODY=$(cat "$BODY_FILE")
    fi
fi

# 本文の末尾に自動作成文言を追加
if [[ -n "$BODY" ]]; then
    BODY="${BODY}

${FOOTER_TEXT}"
else
    BODY="$FOOTER_TEXT"
fi

# リポジトリ情報を取得
read -r OWNER REPO < <("$SCRIPT_DIR/repo-info.sh")

if [[ -z "$OWNER" || -z "$REPO" ]]; then
    echo "エラー: リポジトリ情報を取得できませんでした。" >&2
    exit 1
fi

echo "リポジトリ: $OWNER/$REPO" >&2
echo "Issue を作成中..." >&2

# JSON ペイロードを作成
JSON_PAYLOAD=$(jq -n --arg title "$TITLE" --arg body "$BODY" '{title: $title, body: $body}')
if [[ ${#LABELS[@]} -gt 0 ]]; then
    LABELS_JSON=$(printf '%s\n' "${LABELS[@]}" | jq -R . | jq -s .)
    JSON_PAYLOAD=$(echo "$JSON_PAYLOAD" | jq --argjson labels "$LABELS_JSON" '. + {labels: $labels}')
fi

# GitHub API を使用して Issue を作成
ENDPOINT="/repos/$OWNER/$REPO/issues"
RESPONSE=$("$SCRIPT_DIR/github-rest.sh" "$ENDPOINT" "POST" "$JSON_PAYLOAD")

# 成功: html_url を抽出
ISSUE_URL=$(echo "$RESPONSE" | jq -r '.html_url')

if [[ -z "$ISSUE_URL" || "$ISSUE_URL" == "null" ]]; then
    echo "エラー: Issue URL を取得できませんでした。" >&2
    echo "レスポンス: $RESPONSE" >&2
    exit 1
fi

echo "Issue URL: $ISSUE_URL" >&2

# レスポンス JSON を stdout に出力
echo "$RESPONSE"
exit 0
