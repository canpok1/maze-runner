---
name: checking-quality
description: ビルド、リント、フォーマット、テストを実行してエラーがないことを確認します。コーディング完了後の品質確認に使用してください。
layer: foundation
---

以下のコマンドを順番に実行する。

## 1. ビルド

```bash
npm run build
```

## 2. リント・フォーマット

```bash
npm run lint:fix
```

## 3. テスト

```bash
npm test
```
