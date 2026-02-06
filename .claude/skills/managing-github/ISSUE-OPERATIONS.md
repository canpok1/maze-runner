# Issue操作

## Issue取得

```bash
./.claude/skills/managing-github/scripts/issue-get.sh <Issue番号>
```

**出力**: Issue詳細のJSON

## Issue作成

```bash
# 本文を直接指定
./.claude/skills/managing-github/scripts/issue-create.sh --title "タイトル" --body "本文"

# 本文をファイルから読み込み
./.claude/skills/managing-github/scripts/issue-create.sh --title "タイトル" --body-file body.txt

# 本文をstdinから読み込み（HEREDOC方式）
./.claude/skills/managing-github/scripts/issue-create.sh --title "タイトル" --body-file - <<'EOF'
## 概要
Issueの詳細な説明
EOF

# ラベル付き
./.claude/skills/managing-github/scripts/issue-create.sh --title "タイトル" --body "本文" --label bug --label priority-high
```

**出力**: 作成されたIssueのJSON

**注意**: Issue本文の末尾に「このIssueはClaude Codeにより自動作成されました」という文言が自動的に追加されます。

**推奨**: document-specialistエージェントで説明文を生成してから使用

## Issue更新

```bash
# タイトルと状態を更新
./.claude/skills/managing-github/scripts/issue-update.sh <Issue番号> --title "新タイトル" --state closed --state-reason completed

# 本文をファイルから更新
./.claude/skills/managing-github/scripts/issue-update.sh <Issue番号> --body-file body.txt

# 本文をstdinから更新（HEREDOC方式）
./.claude/skills/managing-github/scripts/issue-update.sh <Issue番号> --body-file - <<'EOF'
## 概要
更新されたIssueの詳細な説明
EOF

# ラベルの追加・削除
./.claude/skills/managing-github/scripts/issue-update.sh <Issue番号> --add-label bug --remove-label enhancement
```

## Issueコメント取得

```bash
./.claude/skills/managing-github/scripts/issue-comments.sh <Issue番号>
```

**出力**: コメント一覧のJSON配列（各コメントに `author_login`, `author_association`, `created_at`, `body` を含む）

## Issueコメント追加

```bash
./.claude/skills/managing-github/scripts/issue-add-comment.sh <Issue番号> "コメント内容"
```

**出力**: 作成されたコメントのJSON

## サブIssue一覧取得

```bash
./.claude/skills/managing-github/scripts/issue-sub-issues.sh <Issue番号>
```

**出力形式** (NDJSON):
```json
{"id": "...", "number": 123, "title": "...", "state": "OPEN", "url": "...", "labels": ["label1"]}
```

## サブIssue追加

```bash
./.claude/skills/managing-github/scripts/sub-issue-add.sh <親Issue番号> <サブIssue番号>
```
