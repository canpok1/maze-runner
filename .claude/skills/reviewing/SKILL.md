---
name: reviewing
description: コーディング規約、テスト配置、ファイル構造、ドキュメント品質の観点からコードレビューを実行します。実装完了後のコードレビューやPR作成前の最終確認で使用してください。
layer: feature
---

実装完了後、以下のエージェントにレビューを依頼してください。

## コーディング規約

`coding-specialist` エージェント
**参照:** `docs/coding-rules.md`

## テストルール

`testing-specialist` エージェント
**参照:** `docs/testing-rules.md`

## 構造ルール

`structure-specialist` エージェント
**参照:** `docs/structure-rules.md`

## ドキュメント品質

`document-specialist` エージェント
**参照:** `docs/document-rules.md`

## 注意事項

実際のコード品質チェック（ビルド、リント、テスト実行）は `checking-quality` スキルを使用してください。
