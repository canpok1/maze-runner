# Claude Code on the Web セットアップガイド

## 目的

このドキュメントは、Claude Code on the Web環境で `gh` コマンド（GitHub CLI）を使用するために必要な環境設定手順を説明します。

## 前提条件

- Claude Code on the Webアカウント
- GitHubアカウント
- GitHubへのアクセス権限（Personal Access Tokenを作成できること）

## セットアップ手順

### 1. カスタム環境の作成

Claude Code on the Webでは、デフォルト環境にはGitHub CLIがインストールされていません。カスタム環境を作成して `gh` コマンドを使用可能にします。

1. Claude Code on the Webにログイン
2. 画面左下の **Settings** アイコンをクリック
3. **Custom environments** を選択
4. **Create custom environment** ボタンをクリック
5. 環境名を入力（例: `github-cli-env`）
6. 環境の設定を行う（次のセクションで説明）

### 2. GITHUB_TOKEN環境変数の設定

GitHub APIを使用するために、Personal Access Token（PAT）を作成し、環境変数として設定します。

#### 2.1 Personal Access Token の作成

GitHubのPersonal Access Tokenには「Fine-grained tokens」と「Tokens (classic)」の2種類があります。セキュリティの観点から、リポジトリ単位で権限を細かく設定できる **Fine-grained tokens** の利用を推奨します。

> **参考**: [Fine-grained personal access tokensについて](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#about-fine-grained-personal-access-tokens)

##### Fine-grained tokens（推奨）

1. GitHubにログイン
2. 画面右上のプロフィールアイコンをクリックし、**Settings** を選択
3. 左サイドバーの **Developer settings** をクリック
4. **Personal access tokens** → **Fine-grained tokens** を選択
5. **Generate new token** をクリック
6. トークンの設定を行う:
   - **Token name**: トークンの用途を記入（例: `Claude Code on the Web - gh CLI`）
   - **Expiration**: 有効期限を設定（セキュリティのため、適切な期間を設定）
   - **Repository access**: 対象リポジトリを選択
   - **Permissions**: 必要な権限のみを付与（例: Contents - Read and write、Pull requests - Read and write）
7. **Generate token** ボタンをクリック
8. 生成されたトークンをコピーして安全な場所に保存（この画面を離れると再表示できません）

##### Tokens (classic)（代替手段）

Fine-grained tokensが利用できない場合は、classicトークンを使用します。

1. **Personal access tokens** → **Tokens (classic)** を選択
2. **Generate new token** → **Generate new token (classic)** をクリック
3. トークンの設定を行う:
   - **Note**: トークンの用途を記入（例: `Claude Code on the Web - gh CLI`）
   - **Expiration**: 有効期限を設定
   - **Select scopes**: **最小権限の原則**に従い、必要なスコープのみを選択
     - **注意**: `repo` スコープはリポジトリへのフルアクセスを許可する強力な権限です。セキュリティリスクを考慮し、慎重に利用してください
     - プライベートリポジトリへのフルアクセスが必要な場合に `repo` を選択します。それ以外の場合は、より限定的なスコープ（例: `public_repo`）を検討してください
4. **Generate token** ボタンをクリック
5. 生成されたトークンをコピーして安全な場所に保存（この画面を離れると再表示できません）

#### 2.2 環境変数の設定

1. Claude Code on the Webのカスタム環境設定画面で、**Environment Variables** セクションを開く
2. **Add variable** をクリック
3. 以下の情報を入力:
   - **Name**: `GITHUB_TOKEN`
   - **Value**: 先ほど作成したPersonal Access Token
4. **Save** をクリック

### 3. ネットワークアクセス設定

GitHub CLIが正常に動作するために、GitHub関連のドメインへのネットワークアクセスを許可します。

#### 3.1 ネットワークアクセスモードの選択

1. カスタム環境設定画面で、**Network Access** セクションを開く
2. 以下のいずれかを選択:
   - **Full network access**: すべてのネットワークアクセスを許可（最も簡単）
   - **Custom network access**: 特定のドメインのみ許可（セキュリティ重視）

#### 3.2 Custom設定時の許可ドメイン

**Custom network access** を選択した場合、最低限以下のドメインを許可する必要があります:

1. **Add allowed domain** をクリック
2. 以下のドメインを追加:
   - `github.com` - Web認証フローなどへのアクセス
   - `api.github.com` - GitHub API (REST/GraphQL) へのアクセス
   - `release-assets.githubusercontent.com` - GitHub CLIのインストールとアップデート
3. 各ドメインを追加後、**Save** をクリック

> **Note**: プロジェクトの要件に応じて、他のGitHub関連ドメイン（例: `raw.githubusercontent.com`）の追加が必要になる場合があります。

### 4. 環境の有効化

1. すべての設定が完了したら、**Create environment** または **Save changes** をクリック
2. 新しいClaude Codeセッションを開始する際に、作成したカスタム環境を選択
3. セッション内で `gh --version` コマンドを実行し、GitHub CLIが利用可能か確認

```bash
gh --version
```

期待される出力:
```
gh version X.X.X (YYYY-MM-DD)
```

## トラブルシューティング

### `gh: command not found` エラーが発生する

**原因**: カスタム環境が正しく選択されていない、またはGitHub CLIがインストールされていない。

**解決方法**:
1. 現在のセッションで使用している環境を確認
2. 作成したカスタム環境を選択してセッションを再起動
3. それでも解決しない場合は、カスタム環境の設定を見直す

### `gh` コマンド実行時に認証エラーが発生する

**原因**: `GITHUB_TOKEN` 環境変数が正しく設定されていない、またはトークンの権限が不足している。

**解決方法**:
1. 環境変数 `GITHUB_TOKEN` が設定されているか確認:
   ```bash
   if [ -n "$GITHUB_TOKEN" ]; then echo "GITHUB_TOKEN is set."; else echo "GITHUB_TOKEN is not set."; fi
   ```
2. 設定されていない場合、カスタム環境設定で `GITHUB_TOKEN` を再設定
3. トークンに `repo` スコープが含まれているか確認
4. トークンの有効期限が切れていないか確認

### ネットワークアクセスエラーが発生する

**原因**: 必要なドメインへのネットワークアクセスが許可されていない。

**解決方法**:
1. Network Access設定を **Full network access** に変更して動作確認
2. 動作する場合は、Custom設定で必要なドメインを段階的に追加
3. エラーメッセージに表示されるドメインを許可リストに追加

### `gh` コマンドが古いバージョンのまま

**原因**: `release-assets.githubusercontent.com` へのアクセスが許可されていない。

**解決方法**:
1. Network Access設定で `release-assets.githubusercontent.com` が許可されているか確認
2. 許可されていない場合は、ドメインを追加して環境を再起動

## 参考リンク

- [GitHub CLI公式ドキュメント](https://cli.github.com/manual/)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Claude Code on the Web公式ドキュメント](https://docs.anthropic.com/claude/docs/claude-code)
