# コーディング規約

このドキュメントは、プロジェクトで使用するTypeScript、HTML、CSSのコーディング規約を定義します。

> **Note**: コードスタイル（フォーマット）およびany/const/varに関するルールはBiomeにより自動的に強制されます。

## TypeScriptベストプラクティス

- インターフェースと型エイリアスを適切に使い分ける（オブジェクトの型定義には`interface`、ユニオン型やタプル型などには`type`を推奨）
- nullとundefinedを明示的に扱う（strict null checks）
- 関数は単一責任の原則に従い、小さく保つ
- 意味のある変数名・関数名を使用する
- 非同期処理にはasync/awaitを使用する

## HTML/CSSベストプラクティス

- セマンティックなHTML要素を使用する
- アクセシビリティを考慮する（ARIA属性、適切なalt属性など）
- CSSはBEM（Block, Element, Modifier）の命名規則に従う
- レスポンシブデザインを考慮する
- CSSカスタムプロパティ（変数）を活用する
