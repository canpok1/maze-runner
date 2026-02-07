#!/bin/bash
# GitHub Issue の内容を検証し、ラベル漏れや本文フォーマットの不備を自動修正するスクリプト
#
# 使用方法:
#   $0 <Issue番号>
#
# 例:
#   $0 123
#
# 機能:
#   1. Issue内容取得
#   2. ラベル検証（story/taskラベル）
#   3. 本文フォーマット検証
#   4. ラベル修正
#   5. 本文修正
#   6. 修正ログ記録
#
# 注意事項:
#   - GH_TOKEN 環境変数が必要です

set -euo pipefail

# スクリプトディレクトリの取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 使用方法を表示
usage() {
    echo -e "使用方法: $0 <Issue番号>\n例: $0 123" >&2
    exit 1
}

# 引数チェック
if [[ $# -ne 1 ]]; then
    echo "エラー: Issue番号を指定してください。" >&2
    usage
fi

ISSUE_NUMBER="$1"

# Issue番号が数値かチェック
if ! [[ "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
    echo "エラー: Issue番号は数値で指定してください。" >&2
    exit 1
fi

# 修正内容を記録する配列
declare -a FIXES=()

# Issue情報を取得
echo "Issue #${ISSUE_NUMBER} の情報を取得中..." >&2
ISSUE_JSON=$("$SCRIPT_DIR/issue-get.sh" "$ISSUE_NUMBER")

# タイトル、本文、ラベルを抽出
TITLE=$(echo "$ISSUE_JSON" | jq -r '.title')
BODY=$(echo "$ISSUE_JSON" | jq -r '.body // ""')
LABELS=$(echo "$ISSUE_JSON" | jq -r '.labels[].name')

echo "タイトル: $TITLE" >&2
echo "ラベル: $LABELS" >&2

# ラベル検証
HAS_STORY_LABEL=false
HAS_TASK_LABEL=false

while IFS= read -r label; do
    if [[ "$label" == "story" ]]; then
        HAS_STORY_LABEL=true
    elif [[ "$label" == "task" ]]; then
        HAS_TASK_LABEL=true
    fi
done <<< "$LABELS"

# story/taskラベルの検証
if [[ "$HAS_STORY_LABEL" == "false" && "$HAS_TASK_LABEL" == "false" ]]; then
    echo "エラー: story または task ラベルが付与されていません。" >&2
    echo "どちらのラベルを追加すべきか判断できないため、手動で対応してください。" >&2
    exit 1
fi

# 両方のラベルが付いている場合は警告（どちらかで検証を進める）
if [[ "$HAS_STORY_LABEL" == "true" && "$HAS_TASK_LABEL" == "true" ]]; then
    echo "警告: story と task の両方のラベルが付与されています。story として検証を進めます。" >&2
    ISSUE_TYPE="story"
elif [[ "$HAS_STORY_LABEL" == "true" ]]; then
    ISSUE_TYPE="story"
else
    ISSUE_TYPE="task"
fi

echo "Issue タイプ: $ISSUE_TYPE" >&2

# 本文フォーマット検証
MISSING_SECTIONS=()

if [[ "$ISSUE_TYPE" == "story" ]]; then
    # storyの必須セクション
    REQUIRED_SECTIONS=(
        "ユーザーストーリー"
        "背景"
        "現状"
        "期待する結果"
        "受け入れ条件"
        "補足情報"
    )
else
    # taskの必須セクション
    REQUIRED_SECTIONS=(
        "目的"
        "実施内容"
        "完了条件"
        "補足情報"
    )
fi

# 各セクションの存在確認
for section in "${REQUIRED_SECTIONS[@]}"; do
    # セクションヘッダーのパターン: ## セクション名 または # セクション名
    # grep -F を使用してリテラル文字列として検索
    if ! echo "$BODY" | grep -qF "# ${section}"; then
        MISSING_SECTIONS+=("$section")
        echo "不足セクション検出: $section" >&2
    fi
done

# 本文修正が必要な場合
if [[ ${#MISSING_SECTIONS[@]} -gt 0 ]]; then
    echo "本文フォーマットに不備があります。不足セクションを追加します..." >&2

    # 不足セクションを追加
    NEW_BODY="$BODY"

    # 本文の末尾に不足セクションを追加
    if [[ -n "$NEW_BODY" ]]; then
        NEW_BODY="${NEW_BODY}\n\n"
    fi

    NEW_BODY="${NEW_BODY}<!-- 以下のセクションは自動追加されました -->\n"

    for section in "${MISSING_SECTIONS[@]}"; do
        NEW_BODY="${NEW_BODY}\n## ${section}\n\nTODO: このセクションを記入してください\n"
    done

    # 本文を更新
    TEMP_FILE=$(mktemp)
    printf '%b' "$NEW_BODY" > "$TEMP_FILE"

    "$SCRIPT_DIR/issue-update.sh" "$ISSUE_NUMBER" --body-file "$TEMP_FILE" > /dev/null

    rm "$TEMP_FILE"

    # 修正内容を記録
    FIXES+=("本文に不足していたセクションを追加しました: ${MISSING_SECTIONS[*]}")

    echo "本文の修正が完了しました" >&2
fi

# 修正内容をコメントで記録
if [[ ${#FIXES[@]} -gt 0 ]]; then
    COMMENT="## Issue内容の自動修正\n\n以下の修正を実施しました:\n\n"

    for fix in "${FIXES[@]}"; do
        COMMENT="${COMMENT}- ${fix}\n"
    done

    COMMENT="${COMMENT}\n**対応が必要な項目:**\n"
    COMMENT="${COMMENT}- 自動追加されたセクションに適切な内容を記入してください\n"

    # printfで変換してからコメント追加
    COMMENT_TEXT=$(printf '%b' "$COMMENT")
    "$SCRIPT_DIR/issue-add-comment.sh" "$ISSUE_NUMBER" "$COMMENT_TEXT"

    echo "修正内容をコメントで記録しました" >&2
    echo "修正を実施しました:" >&2
    for fix in "${FIXES[@]}"; do
        echo "  - $fix" >&2
    done
else
    echo "Issue #${ISSUE_NUMBER} に問題はありませんでした。" >&2
fi

echo "検証・修正が完了しました" >&2
exit 0
