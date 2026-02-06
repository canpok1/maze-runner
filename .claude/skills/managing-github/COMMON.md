# 共通処理・参考情報

## 目次
- 複数行テキストの取り扱いルール
- リポジトリ情報の取得
- 内部用スクリプト
- 制限事項

## 複数行テキストの取り扱いルール

PR・Issueの作成・更新で本文（body）に複数行テキストを含む場合、以下の方法を使用すること。

### 推奨: `pr-create.sh` / `issue-create.sh` を使用

通常のPR・Issue作成では、managing-githubスキルが提供するスクリプトを使用すること。
これらのスクリプトは引数として複数行テキストを受け取ることができます。

詳細は以下を参照:
- PR作成: [PR-OPERATIONS.md](PR-OPERATIONS.md#pr作成)
- Issue作成: [ISSUE-OPERATIONS.md](ISSUE-OPERATIONS.md#issue作成)

### 参考: `gh` CLI + HEREDOC の直接使用

スクリプトが対応していない特殊な操作（例: PR本文の直接更新）が必要な場合は、
`gh` CLI と HEREDOC を組み合わせて使用できます。

#### コマンド例: PR更新

```bash
gh pr edit <PR番号> --body-file - <<'EOF'
## Summary
- 変更内容の説明

## Test plan
- テスト計画
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

**注意**: PR・Issue作成には上記の推奨スクリプトを使用してください。
`gh pr create` / `gh issue create` の直接使用は、プッシュ処理やエラーハンドリングを
自前で実装する必要があるため推奨しません。

## リポジトリ情報の取得

```bash
./.claude/skills/managing-github/scripts/repo-info.sh
```

**出力形式**: スペース区切り（owner repo）。例: `canpok1 maze-runner`

## 内部用スクリプト

以下のスクリプトは他のスクリプトから内部的に使用される共通処理です。
直接実行することは想定していません。

| スクリプト | 機能 |
|-----------|------|
| `repo-info.sh` | gitリモートURLからowner/repo情報を抽出（詳細: [リポジトリ情報の取得](#リポジトリ情報の取得)） |
| `github-rest.sh` | GitHub REST API呼び出しの共通処理 |
| `github-graphql.sh` | GitHub GraphQL API呼び出しの共通処理 |

## 制限事項

### MCPツール `issue_write` のラベル操作制限

MCP GitHubの `issue_write` ツールには、ラベルの除去（クリア）ができない制限があります。

**症状**: `labels: []` を指定してもラベルが除去されない（サイレント失敗）

**回避策**: REST APIを直接使用してラベルを削除してください。

```bash
read OWNER REPO < <(./.claude/skills/managing-github/scripts/repo-info.sh)

# 特定のラベルを削除（例: Issue #123 から "bug" ラベルを削除）
./.claude/skills/managing-github/scripts/github-rest.sh "/repos/${OWNER}/${REPO}/issues/123/labels/bug" "DELETE"

# すべてのラベルを削除（例: Issue #123 からすべてのラベルを削除）
./.claude/skills/managing-github/scripts/github-rest.sh "/repos/${OWNER}/${REPO}/issues/123/labels" "DELETE"
```
