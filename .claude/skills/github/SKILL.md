---
name: github
description: |
  GitHub操作の統合スキル。issue操作、PR操作、レビュースレッド操作を提供。
  使用ケース:（1）issue取得/作成/更新、（2）PR作成（事前チェック統合）、
  （3）レビューコメント取得、（4）スレッド返信、（5）スレッド解決、
  （6）PRのCI状態取得、（7）ワークフローのログ取得
---

# GitHub操作スキル

## 操作タイプの選択

1. **Issue操作** → [Issue操作](#issue操作)
2. **PR作成** → [PR操作](#pr操作)
3. **レビュースレッド操作** → [Thread操作](#thread操作)

## Issue操作

### Issue取得

#### gh版

`gh issue view`コマンドを使用:

```bash
gh issue view <Issue番号>
```

#### GitHub MCP版

`mcp__github__issue_read`ツール（method: 'get'）を使用

### Issue作成

#### gh版

`gh issue create`コマンドを使用:

```bash
gh issue create --title "タイトル" --body "本文"
```

**推奨**: document-specialistエージェントで説明文を生成してから使用

#### GitHub MCP版

`mcp__github__issue_write`ツール（method: 'create'）を使用

### Issue更新

#### gh版

`gh issue edit`コマンドを使用:

```bash
gh issue edit <Issue番号> --title "新タイトル" --body "新本文"
```

#### GitHub MCP版

`mcp__github__issue_write`ツール（method: 'update'）を使用

## PR操作

### PR作成

#### gh版

PRを作成:

```bash
./.claude/skills/github/scripts/pr-create.sh <タイトル> <本文>
```

**注意事項**:
- mainブランチからは実行不可
- PRタイトルにissue番号を含めない
- 本文には `fixed #<issue番号>` を含める

#### GitHub MCP版

`mcp__github__create_pull_request`ツールを使用

**注意事項**:
- mainブランチからは実行不可
- PRタイトルにissue番号を含めない
- 本文には `fixed #<issue番号>` を含める

### 現在のブランチのPR番号取得

#### gh版

現在の作業ブランチに対応するPRの番号を取得:

```bash
gh pr view --json number --jq '.number'
```

**補足**: `gh pr view`は引数なしで現在のブランチのPRを参照する

#### GitHub MCP版

`mcp__github__list_pull_requests`または`mcp__github__search_pull_requests`ツールを使用

### CI状態取得

#### gh版

PRのCI状態を取得:

```bash
gh pr checks <PR番号>
```

#### GitHub MCP版（部分対応）

`mcp__github__pull_request_read`ツール（method: 'get_status'）を使用

**制限事項**: コミットステータスのみ取得可能。詳細なチェックリストが必要な場合はgh版を使用

## Thread操作

### スレッド一覧取得

#### gh版

PRの未解決レビューコメントを取得:

```bash
./.claude/skills/github/scripts/thread-list.sh <PR番号>
```

**出力形式** (NDJSON):
```json
{"thread_id": "...", "author": "...", "comment": "..."}
```

#### GitHub MCP版

`mcp__github__pull_request_read`ツール（method: 'get_review_comments'）を使用

### スレッド詳細取得

#### gh版

レビュースレッドの詳細情報を取得:

```bash
./.claude/skills/github/scripts/thread-details.sh <スレッドID> [スレッドID...]
```

**出力情報**:
- スレッドID、解決状態、ファイルパス、行番号
- 各コメント（作成者、本文、作成日時）を時系列順で表示

#### GitHub MCP版

`mcp__github__pull_request_read`ツール（method: 'get_review_comments'）を使用

**補足**: スレッド一覧取得と同じツール。返されるスレッド配列から対象を抽出

### スレッド返信

#### gh版

レビュースレッドに返信を投稿:

```bash
./.claude/skills/github/scripts/thread-reply.sh <スレッドID> "コメント内容"
```

**注意**: 返信先の対象者には `@ユーザー名` 形式でメンションを付与すること

#### GitHub MCP版

**対応不可** - gh版を使用すること

### スレッド解決

#### gh版

レビュースレッドを解決済みに変更:

```bash
./.claude/skills/github/scripts/thread-resolve.sh <スレッドID>
```

#### GitHub MCP版

**対応不可** - gh版を使用すること

## ワークフロー操作

### ログ取得

#### gh版

ワークフローの実行ログを取得:
`gh pr checks` で表示されるURLから `<run-id>` を取得して使用します。

```bash
gh run view <run-id>
```

#### GitHub MCP版

**対応不可** - gh版を使用すること
