# スレッド・ワークフロー操作

## スレッド一覧取得

```bash
./.claude/skills/managing-github/scripts/thread-list.sh <PR番号>
```

**出力形式** (NDJSON):
```json
{"thread_id": "...", "author": "...", "comment": "..."}
```

## スレッド詳細取得

```bash
./.claude/skills/managing-github/scripts/thread-details.sh <スレッドID> [スレッドID...]
```

**出力情報**:
- スレッドID、解決状態、ファイルパス、行番号
- 各コメント（作成者、本文、作成日時）を時系列順で表示

## スレッド返信

```bash
./.claude/skills/managing-github/scripts/thread-reply.sh <スレッドID> "コメント内容"
```

**出力**: 作成されたコメントのJSON

**注意**:
- 返信先の対象者には `@ユーザー名` 形式でメンションを付与すること
- コメント本文の末尾に、区切り線と「*このコメントは [Claude Code](https://claude.ai/code) により自動作成されました*」が自動的に追加されます

## スレッド解決

```bash
./.claude/skills/managing-github/scripts/thread-resolve.sh <スレッドID>
```

## ワークフローログ取得

```bash
./.claude/skills/managing-github/scripts/workflow-log.sh <run-id>
```

`pr-checks.sh` で表示されるURLから `<run-id>` を取得して使用します。
