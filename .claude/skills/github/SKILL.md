---
name: github
description: |
  GitHub操作の統合スキル。issue操作、PR操作、レビュースレッド操作を提供。
  使用ケース:（1）リポジトリ情報取得、（2）issue取得/作成/更新、（3）PR作成（事前チェック統合）、
  （4）レビューコメント取得、（5）スレッド返信、（6）スレッド解決（resolve）、
  （7）PRのCI状態取得、（8）ワークフローのログ取得、（9）PR検索、（10）PR詳細取得、（11）PRマージ
---

# GitHub操作スキル

## 前提条件

- 環境変数 `GH_TOKEN` が設定されている必要があります
- 必要なコマンド: `curl`, `jq`, `git`

## 複数行テキストの取り扱いルール

PR・Issueの作成・更新で本文（body）に複数行テキストを含む場合、以下の方法を使用すること。

### `gh` CLI + HEREDOC

`gh` CLI と HEREDOC を使用してテキストを渡すこと。

#### コマンド例: PR作成

```bash
gh pr create --title "タイトル" --body-file - <<'EOF'
## Summary
- 変更内容の説明

## Test plan
- テスト計画
EOF
```

#### コマンド例: PR更新

```bash
gh pr edit <PR番号> --body-file - <<'EOF'
## Summary
- 変更内容の説明

## Test plan
- テスト計画
EOF
```

#### コマンド例: Issue作成

```bash
gh issue create --title "タイトル" --body-file - <<'EOF'
## 概要
Issueの詳細な説明

## 受け入れ条件
- 条件1
- 条件2
EOF
```

#### コマンド例: Issue更新

```bash
gh issue edit <Issue番号> --body-file - <<'EOF'
## 概要
Issueの詳細な説明

## 受け入れ条件
- 条件1
- 条件2
EOF
```

## 操作タイプの選択

1. **Issue操作** → [Issue操作](#issue操作)
2. **PR作成** → [PR操作](#pr操作)
3. **レビュースレッド操作** → [Thread操作](#thread操作)

## リポジトリ情報の取得

以下のコマンドで取得できます。

```bash
./.claude/skills/github/scripts/repo-info.sh
```

**出力形式**: スペース区切り（owner repo）。例: `canpok1 maze-runner`

## Issue操作

### Issue取得

```bash
./.claude/skills/github/scripts/issue-get.sh <Issue番号>
```

**出力**: Issue詳細のJSON

### Issue作成

```bash
# 本文を直接指定
./.claude/skills/github/scripts/issue-create.sh --title "タイトル" --body "本文"

# 本文をファイルから読み込み
./.claude/skills/github/scripts/issue-create.sh --title "タイトル" --body-file body.txt

# 本文をstdinから読み込み（HEREDOC方式）
./.claude/skills/github/scripts/issue-create.sh --title "タイトル" --body-file - <<'EOF'
## 概要
Issueの詳細な説明
EOF

# ラベル付き
./.claude/skills/github/scripts/issue-create.sh --title "タイトル" --body "本文" --label bug --label priority-high
```

**出力**: 作成されたIssueのJSON

**推奨**: document-specialistエージェントで説明文を生成してから使用

**注意**: 本文に複数行テキストを含む場合は[複数行テキストの取り扱いルール](#複数行テキストの取り扱いルール)を参照

### Issue更新

```bash
# タイトルと状態を更新
./.claude/skills/github/scripts/issue-update.sh <Issue番号> --title "新タイトル" --state closed --state-reason completed

# 本文をファイルから更新
./.claude/skills/github/scripts/issue-update.sh <Issue番号> --body-file body.txt

# ラベルの追加・削除
./.claude/skills/github/scripts/issue-update.sh <Issue番号> --add-label bug --remove-label enhancement
```

**注意**: 本文に複数行テキストを含む場合は[複数行テキストの取り扱いルール](#複数行テキストの取り扱いルール)を参照

### サブIssue一覧取得

```bash
./.claude/skills/github/scripts/issue-sub-issues.sh <Issue番号>
```

**出力形式** (NDJSON):
```json
{"id": "...", "number": 123, "title": "...", "state": "OPEN", "url": "...", "labels": ["label1"]}
```

### サブIssue追加

```bash
# 基本的な使用法
./.claude/skills/github/scripts/sub-issue-add.sh <親Issue番号> <サブIssue番号>

# 既存の親Issueを置換する場合
./.claude/skills/github/scripts/sub-issue-add.sh <親Issue番号> <サブIssue番号> --replace-parent
```

## PR操作

### PR検索

```bash
./.claude/skills/github/scripts/pr-search.sh <検索クエリ>
```

**出力形式**: NDJSON（各行がJSON）。例: `{"number":123,"title":"Add feature","state":"open","author":"canpok1","url":"..."}`

**備考**: クエリに `is:pr repo:OWNER/REPO` は自動付加されるため不要

### PR詳細取得

```bash
./.claude/skills/github/scripts/pr-get.sh <PR番号>
```

**出力形式**: JSON（number, title, state, merged, author, head_branch, base_branch, body, html_url, created_at, updated_at）

### PR作成

```bash
./.claude/skills/github/scripts/pr-create.sh <タイトル> <本文>
```

**注意事項**:
- mainブランチからは実行不可
- PRタイトルにissue番号を含めない
- 本文には `fixed #<issue番号>` を含める
- 本文に複数行テキストを含む場合は[複数行テキストの取り扱いルール](#複数行テキストの取り扱いルール)を参照

### 現在のブランチのPR番号取得

```bash
./.claude/skills/github/scripts/pr-number.sh
```

**出力**: PR番号のみ（例: `123`）

### CI状態取得

```bash
./.claude/skills/github/scripts/pr-checks.sh <PR番号>
```

**出力形式**: タブ区切り（チェック名、状態、結論、URL）

### CI状態取得（詳細版）

```bash
./.claude/skills/github/scripts/pr-status.sh <PR番号>
```

**出力形式**: JSON（sha, overall_state, statuses配列, check_runs配列）。`pr-checks.sh` との違いはコミットステータスも含む点と、JSON形式で出力する点

### PRマージ

```bash
./.claude/skills/github/scripts/pr-merge.sh <PR番号> [マージ方式]
```

**引数**: マージ方式は `merge`, `squash`, `rebase` のいずれか（デフォルト: `squash`）

**出力形式**: JSON（sha, message）

## Thread操作

### スレッド一覧取得

```bash
./.claude/skills/github/scripts/thread-list.sh <PR番号>
```

**出力形式** (NDJSON):
```json
{"thread_id": "...", "author": "...", "comment": "..."}
```

### スレッド詳細取得

```bash
./.claude/skills/github/scripts/thread-details.sh <スレッドID> [スレッドID...]
```

**出力情報**:
- スレッドID、解決状態、ファイルパス、行番号
- 各コメント（作成者、本文、作成日時）を時系列順で表示

### スレッド返信

```bash
./.claude/skills/github/scripts/thread-reply.sh <スレッドID> "コメント内容"
```

**注意**: 返信先の対象者には `@ユーザー名` 形式でメンションを付与すること

### スレッド解決

```bash
./.claude/skills/github/scripts/thread-resolve.sh <スレッドID>
```

## ワークフロー操作

### ログ取得

```bash
./.claude/skills/github/scripts/workflow-log.sh <run-id>
```

`pr-checks.sh` で表示されるURLから `<run-id>` を取得して使用します。

## 内部用スクリプト

以下のスクリプトは他のスクリプトから内部的に使用される共通処理です。
直接実行することは想定していません。

| スクリプト | 機能 |
|-----------|------|
| `repo-info.sh` | gitリモートURLからowner/repo情報を抽出（詳細: [リポジトリ情報の取得](#リポジトリ情報の取得)） |
| `github-rest.sh` | GitHub REST API呼び出しの共通処理 |
| `github-graphql.sh` | GitHub GraphQL API呼び出しの共通処理 |
