# maze-runner

Cloudflare Workers上で動作するHonoベースのWebアプリケーションです。

## セットアップ

```bash
npm install
```

## 開発

```bash
npm run dev
```

ローカル開発サーバーが起動し、`http://localhost:8787/` でアクセスできます。

## npmスクリプト

| スクリプト | 説明 |
|-----------|------|
| `npm run dev` | ローカル開発サーバーを起動 |
| `npm run deploy` | Cloudflare Workersへ手動デプロイ |
| `npm run cf-typegen` | Cloudflareバインディングの型定義を生成 |

## 型定義の生成

Workerの設定に基づいて型を生成・同期するには、以下を実行します：

```bash
npm run cf-typegen
```

生成された`CloudflareBindings`型をHonoのジェネリクスとして渡します：

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## 自動デプロイ

mainブランチへのpush時に、GitHub Actionsにより自動的にCloudflare Workersへデプロイされます。

### 必要な設定

GitHubリポジトリのSettings > Secrets and variablesで以下のシークレットを設定してください：

- `CLOUDFLARE_API_TOKEN`: Cloudflare APIトークン

## ディレクトリ構成

```
├── src/
│   └── index.ts          # アプリケーションエントリーポイント
├── .github/
│   └── workflows/
│       └── deploy.yml    # 自動デプロイワークフロー
├── wrangler.jsonc        # Cloudflare Workers設定
├── tsconfig.json         # TypeScript設定
└── package.json          # プロジェクト設定
```
