- 常に日本語で回答すること
- 判断が必要な場面では AskUserQuestion ツールを使用してユーザーに確認すること
- 曖昧な要件や複数の対応方法がある場合は、推測せず必ず確認する
- コミットメッセージは日本語かつ簡潔に記載すること
- ソースコードの実装は `coding-specialist` エージェントに依頼すること
    - 可能な限り複数エージェントで並列実行すること
    - 複数エージェントが作業する際は次の作業などで競合するため注意
        - `checking-quality` スキルの実行。
        - 同一ファイルの編集。
- 文章（プルリクエストやタスクの内容など）を考える際は `document-specialist` エージェントに依頼すること
- スキル（`.claude/skills/` 配下の定義）の作成・レビュー・改善は `skill-specialist` エージェントに依頼すること
    - スキルの新規作成時
    - 既存スキルのレビュー時
    - スキルの改善提案時
- 適度な粒度でコミットすること。
- 実装完了後、PR作成前に `reviewing` スキルで自己レビューを実施すること
- 会話セッション終了時に `/running-retro` コマンドで振り返りを実行すること
    - 振り返りで改善点が見つかった場合はGitHub Issueを作成すること
    - 改善不要と判断した場合はIssueを作成しないこと

## ラベルの運用方針

- `story` ラベルは、ストーリー（親Issue）にのみ付与します。
- `task` ラベルは、タスクIssue（サブIssue）にのみ付与します。
- `assign-to-claude` ラベルは、原則 `assigning-tasks` スキル経由で付与します。
    - タスク細分化時に一括付与しない。順序依存があるタスクには、先行タスク完了後に付与する。
    - 他のスキルやワークフロー内で直接付与しない。

### 判断基準

- `story`: 親Issueで使い、ユーザーの要望やユーザーに提供する価値が記載されているIssue（WHYが中心）
- `task`: サブIssueで使い、作業者に依頼できるくらいに実装方法が具体化されているIssue（HOWが中心）

## npmスクリプト

### テスト関連
- `npm run test` - ユニットテスト実行
- `npm run test:e2e` - E2Eテスト全実行（vitest + playwright）
- `npm run test:e2e:vitest` - E2Eテスト（APIテスト）
- `npm run test:e2e:playwright` - E2Eテスト（ブラウザテスト）
- `npm run test:e2e:reset-db` - テスト用DBリセット

### 開発
- `npm run dev` - フロントエンド開発サーバー起動（Vite HMR）
- `npm run dev:server` - フロントエンドビルド + バックエンド開発サーバー起動
- `npm run build` - TypeScriptコンパイル + Viteビルド

## GitHub操作

- GitHub操作は `.claude/skills/managing-github/SKILL.md` を参照して `gh` コマンド/スクリプトを使用すること
- スクリプトでの操作が不可能な場合のみ、最終手段としてユーザーに手動介入を依頼すること
