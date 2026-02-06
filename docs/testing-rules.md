# テストルール

このドキュメントは、プロジェクトで使用するテストの粒度と配置ルールを定義します。

> **Note**: テストコードも[コーディング規約](./coding-rules.md)に従う必要があります。

## テストの粒度

### ユニットテスト

**目的**: 個々の関数やクラスの単一責任を検証する

- **対象**: 関数レベル、クラスレベルの個別ロジック
- **依存関係**: モック化またはスタブ化する
- **配置場所**: ソースファイルと同じディレクトリ（co-location）
- **命名パターン**: `<filename>.test.ts`

#### Co-locationアプローチの利点

1. **保守性の向上**: テストと実装コードが同じ場所にあるため、変更時に見つけやすい
2. **可読性の向上**: ファイル構造がシンプルになり、関連ファイルをすぐに特定できる
3. **リファクタリングの容易さ**: ファイル移動時にテストも一緒に移動できる
4. **削除漏れの防止**: 実装コード削除時にテストの削除も忘れにくい

#### 例

```
src/
  utils/
    math.ts
    math.test.ts          # ← ユニットテスト
  components/
    Player.ts
    Player.test.ts        # ← ユニットテスト
```

### インテグレーションテスト

**目的**: 複数のコンポーネントやモジュール間の連携を検証する

- **対象**: 複数のクラスや関数の統合動作
- **依存関係**: 実際のコンポーネントを使用（一部モック化も許容）
- **配置場所**: `tests/integration/`
- **命名パターン**: `<feature>.test.ts`

#### 例

```
tests/
  integration/
    maze-navigation.test.ts     # ← Maze + Player の統合テスト
    game-state.test.ts          # ← ゲーム全体の状態管理テスト
```

### E2Eテスト（End-to-End）

**目的**: アプリケーション全体の動作をエンドユーザーの視点で検証する

- **対象**: フルスタックの動作（UI操作からバックエンド処理まで）
- **依存関係**: 実際のシステム全体を使用
- **配置場所**:
  - Vitest: `tests/e2e/`
  - Playwright: `tests/e2e-playwright/`
- **命名パターン**:
  - Vitest: `<scenario>.test.ts`
  - Playwright: `<scenario>.spec.ts`

#### 例

```
tests/
  e2e/
    api/
      health.test.ts                   # ← Vitest API E2Eテスト
      rankings.test.ts                 # ← Vitest API E2Eテスト
  e2e-playwright/
    game-flow.spec.ts                  # ← Playwright ブラウザE2Eテスト
```

## テスト実装の指針

### ユニットテストの指針

- 1つの関数/メソッドにつき、1つのテストファイル
- テストケースは「正常系」「異常系」「境界値」を網羅する
- 外部依存（API、DB、ファイルシステムなど）は必ずモック化する
- テストは独立して実行可能であること（他のテストに依存しない）

### インテグレーションテストの指針

- 機能単位でテストファイルを作成する
- コンポーネント間のインターフェースを重点的に検証する
- 実際のデータフローを確認する
- モックは最小限に抑え、実際の統合を検証する

### E2Eテストの指針

- ユーザーストーリーやシナリオ単位でテストを作成する
- 実際のユーザー操作を再現する
- パフォーマンスや応答時間も考慮する
- 重要なユースケースに絞り込む（全機能を網羅する必要はない）

## bashスクリプトのテスト

### 目的

bashスクリプトの品質と信頼性を確保し、自動化処理の安定性を維持する。

### テスト対象範囲

以下のbashスクリプトはテスト対象とする：

- **重要な自動化処理**: CI/CD、デプロイ、バックアップなどの重要な処理を実行するスクリプト
- **複雑なロジック**: 条件分岐やループが多い、複雑な文字列処理を含むスクリプト
- **外部API連携**: GitHub API、外部サービスとの連携を行うスクリプト
- **データ変換・加工**: ファイル操作、データ変換、バッチ処理などを行うスクリプト

以下のbashスクリプトはテスト対象外とする：

- **シンプルなラッパースクリプト**: 単一のコマンドを実行するだけのスクリプト
- **使い捨てスクリプト**: 一時的な用途で作成されたスクリプト

### テスト方法

#### 1. 静的解析（必須）

すべてのbashスクリプトに対してShellCheckによる静的解析を実施する：

```bash
# 単一ファイルのチェック
shellcheck script.sh

# 複数ファイルのチェック
find .claude/skills -name "*.sh" -exec shellcheck {} \;
```

#### 2. 構文チェック（必須）

すべてのbashスクリプトに対して構文チェックを実施する：

```bash
# 単一ファイルのチェック
bash -n script.sh

# 複数ファイルのチェック
find .claude/skills -name "*.sh" -exec bash -n {} \;
```

#### 3. 自動テスト（推奨）

重要な自動化処理や複雑なロジックを含むスクリプトに対しては、Bats（Bash Automated Testing System）などのテストフレームワークを使用した自動テストを推奨する。

- **テストフレームワーク**: [Bats](https://github.com/bats-core/bats-core)
- **配置場所**: `tests/integration/scripts/`
- **命名パターン**: `<script-name>.bats`

#### 4. 手動テスト（補完的）

自動テストが困難な場合や、外部環境に依存する処理については手動テストで補完する。

### テストファイルの配置

```
tests/
  integration/
    scripts/
      schedule.bats          # ← scripts/schedule.sh のテスト
      github-rest.bats       # ← .claude/skills/managing-github/scripts/github-rest.sh のテスト
```

### bashスクリプトテストの指針

- 静的解析と構文チェックは必須とする
- 重要な処理や複雑なロジックには自動テストを追加する
- テストは独立して実行可能であること（他のテストに依存しない）
- 外部依存（API、ファイルシステムなど）はモック化またはスタブ化する
- エラーハンドリングの動作を検証する
- 境界値や異常系のケースもカバーする

## テスト実行

```bash
# すべてのテストを実行
npm test

# ユニットテストのみ実行
npm test -- --exclude "tests/**"

# インテグレーションテストのみ実行
npm test -- tests/integration

# E2Eテストのみ実行（Vitest）
npm run test:e2e

# E2Eテストのみ実行（Playwright）
npm run test:e2e:playwright

# カバレッジレポート生成
npm test -- --coverage
```

## 参考資料

- [コーディング規約](./coding-rules.md) - テストコードも本規約に従います
- [Testing Library Documentation](https://testing-library.com/) - フロントエンドテストのベストプラクティス
- [Vitest Documentation](https://vitest.dev/) - 使用しているテストフレームワーク
