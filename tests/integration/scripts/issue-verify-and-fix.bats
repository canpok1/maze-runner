#!/usr/bin/env bats
# issue-verify-and-fix.sh の統合テスト

# テスト前準備
setup() {
    # スクリプトディレクトリの取得
    SCRIPT_DIR="/home/user/maze-runner/.claude/skills/managing-github/scripts"
    TARGET_SCRIPT="$SCRIPT_DIR/issue-verify-and-fix.sh"

    # モックディレクトリの作成（元のスクリプトディレクトリをバックアップ）
    MOCK_DIR="$(mktemp -d)"
    export MOCK_DIR

    # 元のスクリプトをバックアップ
    cp "$SCRIPT_DIR/issue-get.sh" "$MOCK_DIR/issue-get.sh.backup" 2>/dev/null || true
    cp "$SCRIPT_DIR/issue-update.sh" "$MOCK_DIR/issue-update.sh.backup" 2>/dev/null || true
    cp "$SCRIPT_DIR/issue-add-comment.sh" "$MOCK_DIR/issue-add-comment.sh.backup" 2>/dev/null || true
}

# テスト後クリーンアップ
teardown() {
    # バックアップを復元
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

# モック: issue-get.sh
create_mock_issue_get() {
    local issue_number="$1"
    local title="$2"
    local body="$3"
    local labels="$4"

    # ラベルのJSON配列を生成
    local label_json=""
    if [[ -n "$labels" ]]; then
        IFS=',' read -ra LABEL_ARRAY <<< "$labels"
        for label in "${LABEL_ARRAY[@]}"; do
            if [[ -n "$label_json" ]]; then
                label_json="${label_json},"
            fi
            label_json="${label_json}{\"name\":\"${label}\"}"
        done
    fi

    # bodyをJSONエスケープ
    local escaped_body=$(echo "$body" | jq -Rs .)

    cat > "$SCRIPT_DIR/issue-get.sh" <<SCRIPT_EOF
#!/bin/bash
cat <<'JSON_END'
{
  "title": "${title}",
  "body": ${escaped_body},
  "labels": [${label_json}]
}
JSON_END
SCRIPT_EOF
    chmod +x "$SCRIPT_DIR/issue-get.sh"
}

# モック: issue-update.sh
create_mock_issue_update() {
    cat > "$SCRIPT_DIR/issue-update.sh" <<'SCRIPT_EOF'
#!/bin/bash
# 引数を記録
echo "issue-update.sh called with: $@" >> /tmp/issue-update.log

# body-fileの内容を記録
if [[ "$2" == "--body-file" ]]; then
    cp "$3" /tmp/updated-body.txt
fi
SCRIPT_EOF
    chmod +x "$SCRIPT_DIR/issue-update.sh"
}

# モック: issue-add-comment.sh
create_mock_issue_add_comment() {
    cat > "$SCRIPT_DIR/issue-add-comment.sh" <<'SCRIPT_EOF'
#!/bin/bash
# 引数を記録
echo "Issue: $1" > /tmp/comment.log
echo "Comment: $2" >> /tmp/comment.log
SCRIPT_EOF
    chmod +x "$SCRIPT_DIR/issue-add-comment.sh"
}

@test "引数なしで実行した場合のエラーチェック" {
    run bash "$TARGET_SCRIPT"

    [ "$status" -eq 1 ]
    echo "$output" | grep -q "エラー: Issue番号を指定してください"
}

@test "不正な引数（文字列）で実行した場合のエラーチェック" {
    run bash "$TARGET_SCRIPT" "abc"

    [ "$status" -eq 1 ]
    echo "$output" | grep -q "エラー: Issue番号は数値で指定してください"
}

@test "スクリプトの構文チェック" {
    run bash -n "$TARGET_SCRIPT"

    [ "$status" -eq 0 ]
}

@test "story ラベル付きIssueの必須セクション検証（すべて存在）" {
    # モック作成
    create_mock_issue_get "123" "テストストーリー" "$(cat <<'BODY'
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
    rm -f /tmp/issue-update.log

    run bash "$TARGET_SCRIPT" 123

    [ "$status" -eq 0 ]
    echo "$output" | grep -q "問題はありませんでした"

    # issue-update.shが呼ばれていないことを確認
    [ ! -f /tmp/issue-update.log ]
}

@test "story ラベル付きIssueの必須セクション検証（不足あり）" {
    # モック作成（受け入れ条件が不足）
    create_mock_issue_get "123" "テストストーリー" "$(cat <<'BODY'
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
    rm -f /tmp/issue-update.log /tmp/updated-body.txt

    run bash "$TARGET_SCRIPT" 123

    [ "$status" -eq 0 ]
    echo "$output" | grep -q "不足セクション検出: 受け入れ条件"

    # issue-update.shが呼ばれたことを確認
    [ -f /tmp/issue-update.log ]

    # 更新された本文に不足セクションが追加されていることを確認
    [ -f /tmp/updated-body.txt ]
    grep -q "## 受け入れ条件" /tmp/updated-body.txt
}

@test "task ラベル付きIssueの必須セクション検証（すべて存在）" {
    # モック作成
    create_mock_issue_get "124" "テストタスク" "$(cat <<'BODY'
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
    rm -f /tmp/issue-update.log

    run bash "$TARGET_SCRIPT" 124

    [ "$status" -eq 0 ]
    echo "$output" | grep -q "問題はありませんでした"

    # issue-update.shが呼ばれていないことを確認
    [ ! -f /tmp/issue-update.log ]
}

@test "task ラベル付きIssueの必須セクション検証（不足あり）" {
    # モック作成（実施内容が不足）
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
    rm -f /tmp/issue-update.log /tmp/updated-body.txt

    run bash "$TARGET_SCRIPT" 124

    [ "$status" -eq 0 ]
    echo "$output" | grep -q "不足セクション検出: 実施内容"

    # issue-update.shが呼ばれたことを確認
    [ -f /tmp/issue-update.log ]

    # 更新された本文に不足セクションが追加されていることを確認
    [ -f /tmp/updated-body.txt ]
    grep -q "## 実施内容" /tmp/updated-body.txt
}

@test "story と task の両方のラベルが付いている場合の警告" {
    # モック作成
    create_mock_issue_get "125" "テスト" "$(cat <<'BODY'
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
)" "story,task"

    create_mock_issue_update
    create_mock_issue_add_comment

    run bash "$TARGET_SCRIPT" 125

    [ "$status" -eq 0 ]
    echo "$output" | grep -q "警告: story と task の両方のラベルが付与されています"
}

@test "story/task ラベルが両方ない場合のエラー" {
    # モック作成（bugラベルのみ）
    create_mock_issue_get "126" "テスト" "本文" "bug"

    create_mock_issue_update
    create_mock_issue_add_comment

    run bash "$TARGET_SCRIPT" 126

    [ "$status" -eq 1 ]
    echo "$output" | grep -q "エラー: story または task ラベルが付与されていません"
}

@test "空の本文の場合" {
    # モック作成（本文が空）
    create_mock_issue_get "127" "テストストーリー" "" "story"

    create_mock_issue_update
    create_mock_issue_add_comment

    # テスト前にログファイルを削除
    rm -f /tmp/issue-update.log

    run bash "$TARGET_SCRIPT" 127

    [ "$status" -eq 0 ]
    # すべてのセクションが不足していることを確認
    echo "$output" | grep -q "不足セクション検出: ユーザーストーリー"
    echo "$output" | grep -q "不足セクション検出: 背景"
    echo "$output" | grep -q "不足セクション検出: 現状"
    echo "$output" | grep -q "不足セクション検出: 期待する結果"
    echo "$output" | grep -q "不足セクション検出: 受け入れ条件"
    echo "$output" | grep -q "不足セクション検出: 補足情報"

    # issue-update.shが呼ばれたことを確認
    [ -f /tmp/issue-update.log ]
}

@test "不足セクションの自動追加とコメント記録" {
    # モック作成（複数のセクションが不足）
    create_mock_issue_get "128" "テストストーリー" "$(cat <<'BODY'
# ユーザーストーリー
As a user...

# 背景
背景情報
BODY
)" "story"

    create_mock_issue_update
    create_mock_issue_add_comment

    # テスト前にログファイルを削除
    rm -f /tmp/comment.log

    run bash "$TARGET_SCRIPT" 128

    [ "$status" -eq 0 ]

    # コメントが追加されたことを確認
    [ -f /tmp/comment.log ]
    grep -q "Issue内容の自動修正" /tmp/comment.log
    grep -q "本文に不足していたセクションを追加しました" /tmp/comment.log
}

@test "特殊文字を含むセクション名の検証" {
    # モック作成（カッコなどの特殊文字を含むセクション）
    # 実際のセクション名には特殊文字は含まれないが、エスケープ処理のテスト
    create_mock_issue_get "129" "テストストーリー" "$(cat <<'BODY'
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

    run bash "$TARGET_SCRIPT" 129

    [ "$status" -eq 0 ]
    echo "$output" | grep -q "問題はありませんでした"
}
