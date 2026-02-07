#!/usr/bin/env bats
# requesting スキルの Issue 作成→検証・修正フローの統合テスト

# テスト前準備
setup() {
    # スクリプトディレクトリの取得
    SCRIPT_DIR="$(cd "${BATS_TEST_DIRNAME}/../../../.claude/skills/managing-github/scripts" && pwd)"
    ISSUE_CREATE_SCRIPT="$SCRIPT_DIR/issue-create.sh"
    VERIFY_SCRIPT="$SCRIPT_DIR/issue-verify-and-fix.sh"

    # モックディレクトリの作成（元のスクリプトディレクトリをバックアップ）
    MOCK_DIR="$(mktemp -d)"
    export MOCK_DIR

    # 元のスクリプトをバックアップ
    cp "$SCRIPT_DIR/issue-create.sh" "$MOCK_DIR/issue-create.sh.backup" 2>/dev/null || true
    cp "$SCRIPT_DIR/issue-get.sh" "$MOCK_DIR/issue-get.sh.backup" 2>/dev/null || true
    cp "$SCRIPT_DIR/issue-update.sh" "$MOCK_DIR/issue-update.sh.backup" 2>/dev/null || true
    cp "$SCRIPT_DIR/issue-add-comment.sh" "$MOCK_DIR/issue-add-comment.sh.backup" 2>/dev/null || true
}

# テスト後クリーンアップ
teardown() {
    # バックアップを復元
    if [[ -f "$MOCK_DIR/issue-create.sh.backup" ]]; then
        mv "$MOCK_DIR/issue-create.sh.backup" "$SCRIPT_DIR/issue-create.sh"
    fi
    if [[ -f "$MOCK_DIR/issue-get.sh.backup" ]]; then
        mv "$MOCK_DIR/issue-get.sh.backup" "$SCRIPT_DIR/issue-get.sh"
    fi
    if [[ -f "$MOCK_DIR/issue-update.sh.backup" ]]; then
        mv "$MOCK_DIR/issue-update.sh.backup" "$SCRIPT_DIR/issue-update.sh"
    fi
    if [[ -f "$MOCK_DIR/issue-add-comment.sh.backup" ]]; then
        mv "$MOCK_DIR/issue-add-comment.sh.backup" "$SCRIPT_DIR/issue-add-comment.sh"
    fi

    if [[ -d "$MOCK_DIR" ]]; then
        rm -rf "$MOCK_DIR"
    fi
}

# モック: issue-create.sh
# 指定した番号・タイトル・ラベルのJSONを返すモックを作成
create_mock_issue_create() {
    local issue_number="$1"
    local title="$2"
    local labels="$3"

    # ラベルのJSON配列を生成
    local labels_json="[]"
    if [[ -n "$labels" ]]; then
        labels_json=$(printf '%s' "$labels" | tr ',' '\n' | jq -R . | jq -s '[.[] | {name: .}]')
    fi

    # jqで正しいJSONを生成しファイルに保存
    jq -n \
        --argjson number "$issue_number" \
        --arg title "$title" \
        --arg url "https://github.com/owner/repo/issues/$issue_number" \
        --argjson labels "$labels_json" \
        '{number: $number, title: $title, html_url: $url, body: "Issue本文", labels: $labels}' \
        > "$MOCK_DIR/issue-create-response.json"

    # モックスクリプトはファイルの内容を出力する
    cat > "$SCRIPT_DIR/issue-create.sh" <<SCRIPT_EOF
#!/bin/bash
cat "$MOCK_DIR/issue-create-response.json"
SCRIPT_EOF

    chmod +x "$SCRIPT_DIR/issue-create.sh"
}

# モック: issue-get.sh
create_mock_issue_get() {
    local issue_number="$1"
    local title="$2"
    local body="$3"
    local labels="$4"

    # ラベルのJSON配列を生成
    local labels_json="[]"
    if [[ -n "$labels" ]]; then
        labels_json=$(printf '%s' "$labels" | tr ',' '\n' | jq -R . | jq -s '[.[] | {name: .}]')
    fi

    # jqで正しいJSONを生成しファイルに保存
    jq -n \
        --arg title "$title" \
        --arg body "$body" \
        --argjson labels "$labels_json" \
        '{title: $title, body: $body, labels: $labels}' \
        > "$MOCK_DIR/issue-get-response.json"

    # モックスクリプトはファイルの内容を出力する
    cat > "$SCRIPT_DIR/issue-get.sh" <<SCRIPT_EOF
#!/bin/bash
cat "$MOCK_DIR/issue-get-response.json"
SCRIPT_EOF

    chmod +x "$SCRIPT_DIR/issue-get.sh"
}

# モック: issue-update.sh
create_mock_issue_update() {
    cat > "$SCRIPT_DIR/issue-update.sh" <<'SCRIPT_EOF'
#!/bin/bash
# 引数を記録
echo "issue-update.sh called with: $@" >> "__MOCK_DIR__/issue-update.log"

# body-fileの内容を記録
if [[ "$2" == "--body-file" ]]; then
    cp "$3" "__MOCK_DIR__/updated-body.txt"
fi
SCRIPT_EOF
    sed -i "s|__MOCK_DIR__|$MOCK_DIR|g" "$SCRIPT_DIR/issue-update.sh"
    chmod +x "$SCRIPT_DIR/issue-update.sh"
}

# モック: issue-add-comment.sh
create_mock_issue_add_comment() {
    cat > "$SCRIPT_DIR/issue-add-comment.sh" <<'SCRIPT_EOF'
#!/bin/bash
# 引数を記録
echo "Issue: $1" > "__MOCK_DIR__/comment.log"
echo "Comment: $2" >> "__MOCK_DIR__/comment.log"
SCRIPT_EOF
    sed -i "s|__MOCK_DIR__|$MOCK_DIR|g" "$SCRIPT_DIR/issue-add-comment.sh"
    chmod +x "$SCRIPT_DIR/issue-add-comment.sh"
}

@test "Issue作成レスポンスからの番号抽出と検証成功（taskラベル、全セクションあり）" {
    # モック作成
    create_mock_issue_create 123 "テストタスク" "task"
    create_mock_issue_get "123" "テストタスク" "$(cat <<'BODY'
# 目的
タスクの目的

# 実施内容
実施する内容

# 完了条件
- 条件1

# 補足情報
補足
BODY
)" "task"

    create_mock_issue_update
    create_mock_issue_add_comment

    # テスト前にログファイルを削除
    rm -f "$MOCK_DIR/issue-update.log"

    # Issue作成をシミュレート
    RESPONSE=$(bash "$ISSUE_CREATE_SCRIPT" --title "テストタスク" --body "..." --label task)

    # レスポンスからIssue番号を抽出
    ISSUE_NUMBER=$(echo "$RESPONSE" | jq -r '.number')

    # 番号が正しく抽出されたことを確認
    [ "$ISSUE_NUMBER" = "123" ]

    # 検証・修正を実行
    run bash "$VERIFY_SCRIPT" "$ISSUE_NUMBER"

    # 結果を検証
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "問題はありませんでした"

    # issue-update.shが呼ばれていないことを確認
    [ ! -f "$MOCK_DIR/issue-update.log" ]
}

@test "Issue作成レスポンスからの番号抽出と検証・修正（taskラベル、一部セクション欠落）" {
    # モック作成
    create_mock_issue_create 124 "テストタスク" "task"
    create_mock_issue_get "124" "テストタスク" "$(cat <<'BODY'
# 目的
タスクの目的

# 完了条件
- 条件1

# 補足情報
補足
BODY
)" "task"

    create_mock_issue_update
    create_mock_issue_add_comment

    # テスト前にログファイルを削除
    rm -f "$MOCK_DIR/issue-update.log" "$MOCK_DIR/updated-body.txt"

    # Issue作成をシミュレート
    RESPONSE=$(bash "$ISSUE_CREATE_SCRIPT" --title "テストタスク" --body "..." --label task)

    # レスポンスからIssue番号を抽出
    ISSUE_NUMBER=$(echo "$RESPONSE" | jq -r '.number')

    # 番号が正しく抽出されたことを確認
    [ "$ISSUE_NUMBER" = "124" ]

    # 検証・修正を実行
    run bash "$VERIFY_SCRIPT" "$ISSUE_NUMBER"

    # 結果を検証
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "不足セクション検出: 実施内容"

    # issue-update.shが呼ばれたことを確認
    [ -f "$MOCK_DIR/issue-update.log" ]

    # 更新された本文に不足セクションが追加されていることを確認
    [ -f "$MOCK_DIR/updated-body.txt" ]
    grep -q "## 実施内容" "$MOCK_DIR/updated-body.txt"
}

@test "storyラベルのIssue作成後の検証成功（全必須セクションあり）" {
    # モック作成
    create_mock_issue_create 125 "テストストーリー" "story"
    create_mock_issue_get "125" "テストストーリー" "$(cat <<'BODY'
# ユーザーストーリー
As a user...

# 背景
背景情報

# 現状
現状の説明

# 期待する結果
期待される結果

# 受け入れ条件
- 条件1

# 補足情報
補足
BODY
)" "story"

    create_mock_issue_update
    create_mock_issue_add_comment

    # テスト前にログファイルを削除
    rm -f "$MOCK_DIR/issue-update.log"

    # Issue作成をシミュレート
    RESPONSE=$(bash "$ISSUE_CREATE_SCRIPT" --title "テストストーリー" --body "..." --label story)

    # レスポンスからIssue番号を抽出
    ISSUE_NUMBER=$(echo "$RESPONSE" | jq -r '.number')

    # 番号が正しく抽出されたことを確認
    [ "$ISSUE_NUMBER" = "125" ]

    # 検証・修正を実行
    run bash "$VERIFY_SCRIPT" "$ISSUE_NUMBER"

    # 結果を検証
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "問題はありませんでした"

    # issue-update.shが呼ばれていないことを確認
    [ ! -f "$MOCK_DIR/issue-update.log" ]
}

@test "storyラベルのIssue作成後の検証・修正（一部セクション欠落）" {
    # モック作成
    create_mock_issue_create 126 "テストストーリー" "story"
    create_mock_issue_get "126" "テストストーリー" "$(cat <<'BODY'
# ユーザーストーリー
As a user...

# 背景
背景情報

# 現状
現状の説明

# 期待する結果
期待される結果

# 補足情報
補足
BODY
)" "story"

    create_mock_issue_update
    create_mock_issue_add_comment

    # テスト前にログファイルを削除
    rm -f "$MOCK_DIR/issue-update.log" "$MOCK_DIR/updated-body.txt"

    # Issue作成をシミュレート
    RESPONSE=$(bash "$ISSUE_CREATE_SCRIPT" --title "テストストーリー" --body "..." --label story)

    # レスポンスからIssue番号を抽出
    ISSUE_NUMBER=$(echo "$RESPONSE" | jq -r '.number')

    # 番号が正しく抽出されたことを確認
    [ "$ISSUE_NUMBER" = "126" ]

    # 検証・修正を実行
    run bash "$VERIFY_SCRIPT" "$ISSUE_NUMBER"

    # 結果を検証
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "不足セクション検出: 受け入れ条件"

    # issue-update.shが呼ばれたことを確認
    [ -f "$MOCK_DIR/issue-update.log" ]

    # 更新された本文に不足セクションが追加されていることを確認
    [ -f "$MOCK_DIR/updated-body.txt" ]
    grep -q "## 受け入れ条件" "$MOCK_DIR/updated-body.txt"
}

@test "issue-verify-and-fix.sh がエラーを返した場合の処理確認（ラベルなし）" {
    # モック作成（ラベルなし）
    create_mock_issue_create 127 "テストIssue" ""
    create_mock_issue_get "127" "テストIssue" "本文" "bug"

    create_mock_issue_update
    create_mock_issue_add_comment

    # Issue作成をシミュレート
    RESPONSE=$(bash "$ISSUE_CREATE_SCRIPT" --title "テストIssue" --body "..." --label "")

    # レスポンスからIssue番号を抽出
    ISSUE_NUMBER=$(echo "$RESPONSE" | jq -r '.number')

    # 番号が正しく抽出されたことを確認
    [ "$ISSUE_NUMBER" = "127" ]

    # 検証・修正を実行（エラーが返ることを期待）
    run bash "$VERIFY_SCRIPT" "$ISSUE_NUMBER"

    # エラーで終了することを確認
    [ "$status" -eq 1 ]
    echo "$output" | grep -q "エラー: story または task ラベルが付与されていません"
}
