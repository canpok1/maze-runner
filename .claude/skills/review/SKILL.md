---
name: review
description: |
  コードレビュースキル。テスト配置、ファイル構造、co-locationルールの遵守を確認する。
  使用ケース：実装完了後のコードレビュー、PR作成前の最終確認
---

# コードレビュースキル

以下のチェック項目を順番に確認し、プロジェクトルールに従っていることを確認する。

## 参照ドキュメント

このスキルは以下のドキュメントで定義されたルールに基づいてレビューを実施します：

- `docs/testing-rules.md` - テストの配置と粒度に関するルール
- `docs/structure-rules.md` - プロジェクト構造とファイル配置に関するルール
- `docs/coding-rules.md` - コーディング規約

## チェック項目

### 1. テスト粒度と配置の適切性

#### 1.1 ユニットテストのco-location確認

```bash
# ソースファイルと同じディレクトリにテストファイルがあるか確認
find packages -name "*.ts" ! -name "*.test.ts" ! -name "*.d.ts" -type f | while read src; do
  test_file="${src%.ts}.test.ts"
  if [ -f "$test_file" ]; then
    echo "✓ $src has co-located test"
  else
    echo "⚠ $src is missing co-located test"
  fi
done
```

ユニットテストは実装ファイルと同じディレクトリに `<filename>.test.ts` の形式で配置されているべきです。

#### 1.2 インテグレーションテストの配置確認

```bash
# integration テストが適切な場所にあるか確認
find tests/integration -name "*.test.ts" 2>/dev/null | while read test; do
  echo "✓ Integration test: $test"
done
```

インテグレーションテストは `tests/integration/` ディレクトリに配置されているべきです。

#### 1.3 E2Eテストの配置確認

```bash
# E2E テストが適切な場所にあるか確認
find tests/e2e -name "*.test.ts" 2>/dev/null | while read test; do
  echo "✓ E2E test: $test"
done
```

E2Eテストは `tests/e2e/` ディレクトリに配置されているべきです。

### 2. ファイル配置ルールの遵守

#### 2.1 プロジェクト構造の確認

```bash
# ワークスペース構造が正しいか確認
ls -la packages/
```

以下の構造が守られているか確認：
- `packages/` - ワークスペースパッケージ
- `lib/` - 共有ライブラリとユーティリティ
- `tests/` - インテグレーションテストとE2Eテスト

#### 2.2 共有型定義の配置確認

```bash
# lib/ に共有型定義があるか確認
find lib -name "*.ts" -type f | grep -E "(types|interfaces)" | while read type_file; do
  echo "✓ Shared type definition: $type_file"
done
```

複数のワークスペースで使用される型定義は `lib/` に配置されているべきです。

### 3. co-locationメソッドの遵守

#### 3.1 テストファイル命名規則の確認

```bash
# テストファイルが正しい命名パターンになっているか確認
find packages -name "*.test.ts" | while read test; do
  basename=$(basename "$test")
  if [[ $basename =~ ^[a-zA-Z0-9_-]+\.test\.ts$ ]]; then
    echo "✓ $test follows naming convention"
  else
    echo "⚠ $test does not follow <filename>.test.ts pattern"
  fi
done
```

テストファイルは `<filename>.test.ts` のパターンに従っているべきです。

### 4. 追加の確認事項

#### 4.1 テストカバレッジの確認

```bash
# テストカバレッジを確認
npm run test:coverage 2>/dev/null || echo "テストカバレッジコマンドが設定されていません"
```

#### 4.2 型定義の重複確認

```bash
# 複数パッケージで同じ型が定義されていないか確認
find packages -name "*.ts" ! -name "*.test.ts" -type f -exec grep -l "^export (type|interface)" {} \; | while read file; do
  echo "Type definitions in: $file"
done
```

同じ型定義が複数のパッケージに存在する場合は、`lib/` に移動することを検討してください。

## 完了条件

- [ ] すべてのユニットテストがソースファイルと同じ場所に配置されている（co-location）
- [ ] インテグレーションテストが `tests/integration/` に配置されている
- [ ] E2Eテストが `tests/e2e/` に配置されている
- [ ] テストファイルが `<filename>.test.ts` パターンに従っている
- [ ] 共有型定義が `lib/` に適切に配置されている
- [ ] プロジェクト構造ルールに従っている
- [ ] 重複した型定義がない

## 注意事項

- このスキルは静的なチェックです。実際のコード品質チェック（ビルド、リント、テスト実行）は `quality` スキルを使用してください
- 警告が表示された場合は、該当箇所を修正してください
- ルールの詳細については、参照ドキュメントを確認してください
