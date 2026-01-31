---
description: ユーザーストーリーのサブIssueにassign-to-claudeラベルを付与してClaudeにアサインします。
argument-hint: [ユーザーストーリーのIssue番号]
---

## 概要

`/breakdown-story` で細分化したサブIssueに `assign-to-claude` ラベルを付与し、Claudeに自動対応させるためのスキルです。

## 手順

1. ユーザーストーリーのIssue番号を確認する。
    - 引数で指定されている場合、この手順はスキップする。
2. `mcp__github__issue_read`（method: 'get_sub_issues'）でサブIssueの一覧を取得する。
3. サブIssueが存在しない場合はエラーを報告し、`/breakdown-story` の実行を案内する。
4. 各サブIssueの状態を確認し、以下の条件に該当するIssueはアサイン対象から除外する:
    - 既に `assign-to-claude` ラベルが付与されている
    - 既に `in-progress-by-claude` ラベルが付与されている
    - 既にクローズされている（state: 'closed'）
5. アサイン可能なサブIssueの一覧をユーザーに提示する。
    - タイトル、Issue番号、URL、現在の状態を表示する。
    - 依存関係があり、依存先がまだ完了していないIssueには警告マークを付ける。
6. アサイン対象を確認する（全件アサイン or 個別選択）。
    - 依存関係のあるタスクについては、依存先の完了後にアサインすることを推奨する。
7. 選択されたIssueに対して以下を実行する:
    - `mcp__github__issue_read`（method: 'get'）で現在のラベル一覧を取得する。
    - 既存のラベルに `assign-to-claude` を追加した配列を作成する。
    - `mcp__github__issue_write`（method: 'update', labels）でラベルを更新する。
8. ラベル付与の結果をユーザーに報告する。
    - 成功したIssue番号とURLの一覧を表示する。
    - エラーが発生した場合は、その詳細を報告する。

## 注意点

- 既に `assign-to-claude` や `in-progress-by-claude` ラベルが付いているIssueはスキップすること。
- クローズ済みのIssueにはラベルを付与しないこと。
- ラベル付与時は既存のラベルを消さないよう、必ず既存ラベルに `assign-to-claude` を追加する形で更新すること。
- 依存関係のあるタスクは依存先の完了後にアサインするようユーザーに案内すること。
- サブIssueが1つも存在しない場合は、`/breakdown-story` を先に実行するようユーザーに案内すること。
