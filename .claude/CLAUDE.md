- 常に日本語で回答すること
- 判断が必要な場面では AskUserQuestion ツールを使用してユーザーに確認すること
- 曖昧な要件や複数の対応方法がある場合は、推測せず必ず確認する
- コミットメッセージは日本語かつ簡潔に記載すること
- 適度な粒度でコミットすること
- ワークフロースキル実行中に発見した改善点はIssue化のみ行い、ワークフロー終了後に対応すること

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

## スキル層構造

スキルおよび自動化スクリプトは以下の4層に分類される。各スキルのSKILL.mdの `layer` フィールドで層を定義している。

| 層 | 説明 | 対象 |
|---|---|---|
| 呼び出し層（invocation） | 外部からスキルを起動する自動化スクリプト | `scripts/schedule.sh` |
| ワークフロー層（workflow） | 他スキルを組み合わせて実行する統合スキル | `running-dev`, `running-refinement`, `solving-issue` |
| 機能層（feature） | 独立した単機能スキル | `breaking-down-story`, `coding`, `creating-pr`, `fixing-pr`, `optimizing-issue-labels`, `requesting`, `reviewing`, `running-retro`, `verifying-acceptance` |
| 基盤層（foundation） | 他スキルから共通利用されるインフラスキル | `managing-github` |

### 依存ルール

- 呼び出し層はワークフロー層と機能層に依存可能
- ワークフロー層はワークフロー層、機能層、基盤層に依存可能（循環依存は禁止）
- 機能層は基盤層にのみ依存可能（機能層同士の依存は禁止）
- 基盤層は他の層に依存しない
