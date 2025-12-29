# maze-runner

3D一人称視点で迷路を探索するWebベースのゲームです。Cloudflare Workers上で動作します。

## ゲーム概要

- **3D描画**: レイキャスティング技術による一人称視点の3D迷路
- **難易度選択**:
  - 初級（11×11）
  - 中級（17×17）
  - 上級（23×23）
- **ゲーム要素**: ミニマップ、タイマー、スコア表示

## 操作方法

### キーボード
- `W` / `↑`: 前進
- `S` / `↓`: 後進
- `A` / `←`: 左旋回
- `D` / `→`: 右旋回

### タッチ / マウス
画面上のボタンで操作可能

## セットアップ

```bash
npm install
```

## 開発

```bash
npm run dev
```

ローカル開発サーバーが起動し、`http://localhost:5173/` でアクセスできます。

## npmスクリプト

| スクリプト | 説明 |
|-----------|------|
| `npm run dev` | フロントエンドビルド + バックエンド開発サーバー起動 |
| `npm run build` | TypeScriptコンパイル + Viteビルド |
| `npm run preview` | ビルド結果をプレビュー |
| `npm run test` | Vitestでユニットテスト実行 |
| `npm run test:watch` | Vitestウォッチモード |
| `npm run test:e2e` | E2Eテスト全実行（vitest + playwright） |
| `npm run test:e2e:vitest` | E2Eテスト（APIテスト・vitest） |
| `npm run test:e2e:playwright` | E2Eテスト（ブラウザテスト・playwright） |
| `npm run test:e2e:setup` | Playwright環境セットアップ |
| `npm run test:e2e:reset-db` | テスト用DBリセット |
| `npm run test:e2e:report` | Playwrightレポート閲覧 |
| `npm run lint` | コードの静的解析・フォーマットチェック |
| `npm run lint:fix` | 静的解析とフォーマットを自動修正 |
| `npm run format` | コードフォーマットのみ実行 |
| `npm run deploy` | Cloudflare Workersへ手動デプロイ |

## テスト

### ユニットテスト

```bash
# 全テスト実行
npm run test

# ウォッチモード
npm run test:watch
```

### E2Eテスト

```bash
# Playwright環境セットアップ（初回のみ）
npm run test:e2e:setup

# E2Eテスト全実行
npm run test:e2e

# Playwrightレポート確認
npm run test:e2e:report
```

## 技術スタック

- **TypeScript**: 型安全な開発環境
- **Vite**: 高速ビルドツール
- **Vitest**: ユニットテストフレームワーク
- **Playwright**: E2Eテストフレームワーク
- **Biome**: リンター・フォーマッター
- **Canvas 2D API**: グラフィックス描画
- **Cloudflare Workers**: 本番環境デプロイ先

## ディレクトリ構成

```
├── src/
│   ├── main.ts              # エントリーポイント
│   ├── types.ts             # 型定義
│   ├── config.ts            # ゲーム設定
│   ├── game/
│   │   └── state.ts         # ゲーム状態管理
│   ├── maze/
│   │   └── generator.ts     # 迷路生成ロジック
│   ├── input/
│   │   └── controls.ts      # 入力処理
│   ├── renderer/
│   │   ├── index.ts         # メインレンダラー
│   │   ├── raycasting.ts    # 3D描画
│   │   └── minimap.ts       # ミニマップ描画
│   └── styles/
│       └── style.css        # スタイルシート
├── .github/
│   └── workflows/
│       └── deploy.yml       # 自動デプロイ
├── wrangler.jsonc           # Cloudflare Workers設定
├── tsconfig.json            # TypeScript設定
├── vite.config.ts           # Vite設定
├── vitest.config.ts         # Vitest設定
└── package.json             # プロジェクト設定
```

## 自動デプロイ

mainブランチへのpush時に、GitHub Actionsにより自動的にCloudflare Workersへデプロイされます。

### 必要な設定

GitHubリポジトリのSettings > Secrets and variablesで以下のシークレットを設定してください：

- `CLOUDFLARE_API_TOKEN`: Cloudflare APIトークン
