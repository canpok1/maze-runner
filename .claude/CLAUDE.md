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
    - 改善不要と判断した場合はIssue作成は不要

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
