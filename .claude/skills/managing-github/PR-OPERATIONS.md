# PR操作

## PR検索

```bash
./.claude/skills/managing-github/scripts/pr-search.sh <検索クエリ>
```

**出力形式**: NDJSON（各行がJSON）。例: `{"number":123,"title":"Add feature","state":"open","author":"canpok1","url":"..."}`

**備考**: クエリに `is:pr repo:OWNER/REPO` は自動付加されるため不要

## PR詳細取得

```bash
./.claude/skills/managing-github/scripts/pr-get.sh <PR番号>
```

**出力形式**: JSON（number, title, state, merged, author, head_branch, base_branch, body, html_url, created_at, updated_at）

## PR作成

```bash
./.claude/skills/managing-github/scripts/pr-create.sh <タイトル> <本文>
```

**注意事項**:
- mainブランチからは実行不可
- PRタイトルにissue番号を含めない
- 本文には `fixed #<issue番号>` を含める
- 本文に複数行を含む場合はシェルの文字列として渡すこと（改行は`\n`または実際の改行でOK）

**使用例**:

```bash
# 単一行の本文
./.claude/skills/managing-github/scripts/pr-create.sh "機能Aを追加" "fixed #123"

# 複数行の本文（方法1: 実際の改行を含む）
./.claude/skills/managing-github/scripts/pr-create.sh "機能Aを追加" "## Summary
- 機能Aを実装しました

fixed #123"

# 複数行の本文（方法2: ヒアドキュメントを使用）
TITLE="機能Aを追加"
BODY=$(cat <<'EOF'
## Summary
- 機能Aを実装しました

fixed #123
EOF
)
./.claude/skills/managing-github/scripts/pr-create.sh "$TITLE" "$BODY"
```

**備考**: `pr-create.sh`は内部でプッシュ処理とリポジトリ情報取得を自動実行します。

## 現在のブランチのPR番号取得

```bash
./.claude/skills/managing-github/scripts/pr-number.sh
```

**出力**: PR番号のみ（例: `123`）

## CI状態取得

```bash
./.claude/skills/managing-github/scripts/pr-checks.sh <PR番号>
```

**出力形式**: タブ区切り（チェック名、状態、結論、URL）

## CI待機（watchモード）

```bash
./.claude/skills/managing-github/scripts/pr-checks-watch.sh <PR番号>
```

**備考**: `gh pr checks --watch` のラッパー。リポジトリ情報を自動付与してプロキシ環境でも動作する。

## CI状態取得（詳細版）

```bash
./.claude/skills/managing-github/scripts/pr-status.sh <PR番号>
```

**出力形式**: JSON（sha, overall_state, statuses配列, check_runs配列）。`pr-checks.sh` との違いはコミットステータスも含む点と、JSON形式で出力する点

## PRマージ

```bash
./.claude/skills/managing-github/scripts/pr-merge.sh <PR番号> [マージ方式]
```

**引数**: マージ方式は `merge`, `squash`, `rebase` のいずれか（デフォルト: `squash`）

**出力形式**: JSON（sha, message）
