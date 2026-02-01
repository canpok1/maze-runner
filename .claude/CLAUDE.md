- 常に日本語で回答すること
- 判断が必要な場面では AskUserQuestion ツールを使用してユーザーに確認すること
- 曖昧な要件や複数の対応方法がある場合は、推測せず必ず確認する
- コミットメッセージは日本語かつ簡潔に記載すること
- ソースコードの実装は `coding-specialist` エージェントに依頼すること
    - 可能な限り複数エージェントで並列実行すること
    - 複数エージェントが作業する際は次の作業などで競合するため注意
        - `quality` スキルの実行。
        - 同一ファイルの編集。
- 文章（プルリクエストやタスクの内容など）を考える際は `document-specialist` エージェントに依頼すること
- 適度な粒度でコミットすること。
- 実装完了後、PR作成前に `review` スキルで自己レビューを実施すること
- 会話セッション終了時に `/retro` コマンドで振り返りを実行すること
    - 振り返りで改善点が見つかった場合はGitHub Issueを作成すること
    - 改善不要と判断した場合はIssueを作成しないこと

## draftラベルの運用方針

- `draft` ラベルはストーリー（親Issue）のみに付与する。タスクIssue（サブIssue）には付与しない。
- `draft` ラベルが付いたIssueは準備中であり、自動管理の対象外とする。
- `draft` ラベルが外れたら自動管理の対象になる。

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

## GitHub操作のフォールバック指針

- MCPツールによるGitHub操作が権限エラー等で失敗した場合、`.claude/skills/github/SKILL.md` を参照してスクリプト版での代替手段を確認すること
- 以下の操作はMCPツール版が対応不可のため、最初からスクリプト版を使用すること:
  - スレッド返信（`thread-reply.sh`）
  - スレッド解決（`thread-resolve.sh`）
  - ワークフローログ取得（`workflow-log.sh`）
- スクリプト版での代替も不可能な場合のみ、最終手段としてユーザーに手動介入を依頼すること
