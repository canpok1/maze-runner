- 常に日本語で回答すること
- 判断が必要な場面では AskUserQuestion ツールを使用してユーザーに確認すること
- 曖昧な要件や複数の対応方法がある場合は、推測せず必ず確認する
- コミットメッセージは日本語かつ簡潔に記載すること
- 適度な粒度でコミットすること
- ワークフロースキル（layer: workflow）実行中に改善点や問題点を発見した場合は、その場で対応せずGitHub Issueとして記録し、ワークフロー完了後に対応すること

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

## 品質チェック手順

コーディング完了後、以下のコマンドを順番に実行すること。

1. ビルド: `npm run build`
2. リント・フォーマット: `npm run lint:fix`
3. テスト: `npm test`

## GitHub操作

- GitHub操作は `.claude/skills/managing-github/SKILL.md` を参照して `gh` コマンド/スクリプトを使用すること
- スクリプトでの操作が不可能な場合のみ、最終手段としてユーザーに手動介入を依頼すること
