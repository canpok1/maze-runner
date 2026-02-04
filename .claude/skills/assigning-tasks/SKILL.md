---
name: assigning-tasks
description: ユーザーストーリーのサブIssueに `assign-to-claude` ラベルを付与し、Claudeに自動対応させます。タスクの細分化後にタスクをClaudeに割り当てる場合に使用してください。
layer: feature
argument-hint: "[ユーザーストーリーのIssue番号]"
---

## 手順

1. ユーザーストーリーのIssue番号を確認する。
2. `github` スキル（`issue-sub-issues.sh`）でサブIssueの一覧を取得する。
3. サブIssueが存在しない場合はエラーを報告し、タスクの細分化が必要な可能性があることを伝える。
4. 各サブIssueの状態を確認し、以下の条件に該当するIssueはアサイン対象から除外する:
    - 既に `assign-to-claude` ラベルが付与されている
    - 既に `in-progress-by-claude` ラベルが付与されている
    - 既にクローズされている（state: 'closed'）
5. アサイン可能なサブIssueの一覧をユーザーに提示する。
    - タイトル、Issue番号、URL、現在の状態を表示する。
    - 依存関係があり、依存先が未完了のIssueには警告マークを付ける。
6. アサイン対象を確認する。依存関係のあるタスクは依存先完了後のアサインを推奨する。
7. 選択されたIssueに対して以下を実行する:
    - `github` スキル（`issue-get.sh`）で現在のラベル一覧を取得する。
    - 既存のラベルに `assign-to-claude` を追加した配列を作成する。
    - `github` スキル（`issue-update.sh`）でラベルを更新する。
8. ラベル付与の結果をユーザーに報告する。
