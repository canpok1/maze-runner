---
name: github
description: |
  GitHub操作の統合スキル。issue操作、PR操作、レビュースレッド操作を提供。
  使用ケース:（1）リポジトリ情報取得、（2）issue取得/作成/更新、（3）PR作成（事前チェック統合）、
  （4）レビューコメント取得、（5）スレッド返信、（6）スレッド解決、
  （7）PRのCI状態取得、（8）ワークフローのログ取得
---

# GitHub操作スキル

## 前提条件

- 環境変数 `GH_TOKEN` が設定されている必要があります
- 必要なコマンド: `curl`, `jq`, `git`

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

### Issue更新

MCPツール `mcp__github__issue_write` を使用（method: 'update'）

## PR操作

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
