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

PR・Issueの作成・更新で本文（body）に複数行テキストを含む場合、以下のいずれかの方法を使用すること。

### 推奨: `gh` CLI + HEREDOC

`gh` CLI が利用可能な環境では、`gh` コマンドと HEREDOC を使用する方法を推奨。

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

### 代替: MCPツールの `body` パラメータ

`gh` CLI が利用できない環境では、MCPツール（`mcp__github__create_pull_request`、`mcp__github__issue_write` 等）の `body` パラメータに直接テキストを渡す。

**注意**: `body` パラメータには実際の改行（リテラル改行）を含めること。`\n` というエスケープシーケンスを使用すると、改行として解釈されずリテラル文字列 `\n` としてそのまま登録されてしまう。

#### 正しい例: PR作成（MCPツール）

`mcp__github__create_pull_request` を呼び出す際、`body` パラメータにはリテラル改行を含む文字列を渡す:

```text
// bodyパラメータの値
## Summary
- 変更内容の説明

## Test plan
- テスト計画
```

#### 正しい例: Issue作成（MCPツール）

`mcp__github__issue_write` を呼び出す際、`body` パラメータにはリテラル改行を含む文字列を渡す:

```text
// bodyパラメータの値
## 概要
Issueの詳細な説明

## 受け入れ条件
- 条件1
- 条件2
```

#### 誤った例

`body` パラメータに `\n` エスケープシーケンスを含む文字列を渡してはいけない:

```text
// bodyパラメータの値（誤り: \n は改行として解釈されない）
## Summary\n- 変更内容の説明\n\n## Test plan\n- テスト計画
```

上記のように `\n` を含む文字列を渡すと、改行されずにリテラル文字列として登録される。

## 操作タイプの選択

1. **Issue操作** → [Issue操作](#issue操作)
2. **PR作成** → [PR操作](#pr操作)
3. **レビュースレッド操作** → [Thread操作](#thread操作)

## リポジトリ情報の取得

MCPツールの多くは `owner` と `repo` パラメータを必要とします。以下の方法で取得できます。

**スクリプト版**:

```bash
./.claude/skills/github/scripts/repo-info.sh
```

**出力形式**: スペース区切り（owner repo）。例: `canpok1 maze-runner`

**MCPツール版**:

`mcp__github__get_me` でユーザー情報を取得し、`mcp__github__get_file_contents` 等の `owner` / `repo` パラメータに直接指定

## Issue操作

### Issue取得

MCPツール `mcp__github__issue_read` を使用（method: 'get'）

### Issue作成

MCPツール `mcp__github__issue_write` を使用（method: 'create'）

**推奨**: document-specialistエージェントで説明文を生成してから使用

**注意**: 本文に複数行テキストを含む場合は[複数行テキストの取り扱いルール](#複数行テキストの取り扱いルール)を参照

### Issue更新

MCPツール `mcp__github__issue_write` を使用（method: 'update'）

**注意**: 本文に複数行テキストを含む場合は[複数行テキストの取り扱いルール](#複数行テキストの取り扱いルール)を参照

## PR操作

### PR検索

**スクリプト版**:

```bash
./.claude/skills/github/scripts/pr-search.sh <検索クエリ>
```

**出力形式**: NDJSON（各行がJSON）。例: `{"number":123,"title":"Add feature","state":"open","author":"canpok1","url":"..."}`

**備考**: クエリに `is:pr repo:OWNER/REPO` は自動付加されるため不要

**MCPツール版**:

`mcp__github__search_pull_requests` を使用

### PR詳細取得

**スクリプト版**:

```bash
./.claude/skills/github/scripts/pr-get.sh <PR番号>
```

**出力形式**: JSON（number, title, state, merged, author, head_branch, base_branch, body, html_url, created_at, updated_at）

**MCPツール版**:

`mcp__github__pull_request_read`（method: 'get'）を使用

### PR作成

**スクリプト版**:

```bash
./.claude/skills/github/scripts/pr-create.sh <タイトル> <本文>
```

**MCPツール版**:

`mcp__github__create_pull_request` を使用

**注意事項**:
- mainブランチからは実行不可
- PRタイトルにissue番号を含めない
- 本文には `fixed #<issue番号>` を含める
- 本文に複数行テキストを含む場合は[複数行テキストの取り扱いルール](#複数行テキストの取り扱いルール)を参照

### 現在のブランチのPR番号取得

**スクリプト版**:

```bash
./.claude/skills/github/scripts/pr-number.sh
```

**出力**: PR番号のみ（例: `123`）

**MCPツール版**:

`mcp__github__list_pull_requests` または `mcp__github__search_pull_requests` を使用

### CI状態取得

**スクリプト版**:

```bash
./.claude/skills/github/scripts/pr-checks.sh <PR番号>
```

**出力形式**: タブ区切り（チェック名、状態、結論、URL）

**MCPツール版（部分対応）**:

`mcp__github__pull_request_read`（method: 'get_status'）を使用

**制限事項**: コミットステータスのみ取得可能。詳細なチェックリストが必要な場合はスクリプト版を使用

### CI状態取得（詳細版）

**スクリプト版**:

```bash
./.claude/skills/github/scripts/pr-status.sh <PR番号>
```

**出力形式**: JSON（sha, overall_state, statuses配列, check_runs配列）。`pr-checks.sh` との違いはコミットステータスも含む点と、JSON形式で出力する点

**MCPツール版**:

CI状態取得と同じ `mcp__github__pull_request_read`（method: 'get_status'）を使用。スクリプト版はコミットステータスも含む詳細情報を返す

### PRマージ

**スクリプト版**:

```bash
./.claude/skills/github/scripts/pr-merge.sh <PR番号> [マージ方式]
```

**引数**: マージ方式は `merge`, `squash`, `rebase` のいずれか（デフォルト: `squash`）

**出力形式**: JSON（sha, message）

**MCPツール版**:

`mcp__github__merge_pull_request` を使用

## Thread操作

### スレッド一覧取得

**スクリプト版**:

```bash
./.claude/skills/github/scripts/thread-list.sh <PR番号>
```

**出力形式** (NDJSON):
```json
{"thread_id": "...", "author": "...", "comment": "..."}
```

**MCPツール版**:

`mcp__github__pull_request_read`（method: 'get_review_comments'）を使用

### スレッド詳細取得

**スクリプト版**:

```bash
./.claude/skills/github/scripts/thread-details.sh <スレッドID> [スレッドID...]
```

**出力情報**:
- スレッドID、解決状態、ファイルパス、行番号
- 各コメント（作成者、本文、作成日時）を時系列順で表示

**MCPツール版**:

`mcp__github__pull_request_read`（method: 'get_review_comments'）を使用

**補足**: スレッド一覧取得と同じツール。返されるスレッド配列から対象を抽出

### スレッド返信

**スクリプト版**:

```bash
./.claude/skills/github/scripts/thread-reply.sh <スレッドID> "コメント内容"
```

**注意**: 返信先の対象者には `@ユーザー名` 形式でメンションを付与すること

**MCPツール版**:

**対応不可** - スクリプト版を使用すること

### スレッド解決

**スクリプト版**:

```bash
./.claude/skills/github/scripts/thread-resolve.sh <スレッドID>
```

**MCPツール版**:

**対応不可** - スクリプト版を使用すること

## ワークフロー操作

### ログ取得

**スクリプト版**:

```bash
./.claude/skills/github/scripts/workflow-log.sh <run-id>
```

`pr-checks.sh` で表示されるURLから `<run-id>` を取得して使用します。

**MCPツール版**:

**対応不可** - スクリプト版を使用すること

## 内部用スクリプト

以下のスクリプトは他のスクリプトから内部的に使用される共通処理です。
直接実行することは想定していません。

| スクリプト | 機能 |
|-----------|------|
| `repo-info.sh` | gitリモートURLからowner/repo情報を抽出（詳細: [リポジトリ情報の取得](#リポジトリ情報の取得)） |
| `github-rest.sh` | GitHub REST API呼び出しの共通処理 |
| `github-graphql.sh` | GitHub GraphQL API呼び出しの共通処理 |
