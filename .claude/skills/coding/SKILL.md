---
name: coding
description: GitHub Issueの内容を把握し、実装と品質チェックを行います。GitHub Issueの対応が必要な場合や、`assign-to-claude` ラベルのついたIssueに対応する場合に使用してください。
layer: feature
argument-hint: [GitHub Issueの番号]
---
## 手順
1. GitHub Issueの番号を決定する。
    - 引数で指定されている場合、その番号を使用する。
    - 引数が未指定の場合は「GitHub Issueの番号を指定してください」とユーザーに通知し、処理を終了する。
2. `managing-github` スキルでGitHub Issueの内容を把握する。
3. 対応を行う。
    - Issue内容に基づいて実装計画を策定する。
    - タスク内容に応じて適切なエージェントを選択して実装を行う。
      - **ソースコード実装**: `coding-specialist`を使用
        - TypeScript/JavaScript/CSS/HTMLファイルの作成・修正
        - ロジックの実装
        - テストコードの作成
      - **ドキュメント作成**: `document-specialist`を使用
        - Markdownファイル（README、ドキュメント、Issue、PR説明文など）の作成・修正
        - 技術文書の作成
        - API仕様書の作成
      - **スキル作成・レビュー**: `skill-specialist`を使用
        - `.claude/skills/` 配下のファイルの作成・修正
      - **複合タスク**: 主要な作業内容に基づいて判断
        - ドキュメント作成が主: `document-specialist`
        - コード実装が主: `coding-specialist`
    - CLAUDE.mdに定義された品質チェック手順を実行し、問題があれば実装の修正に戻る。
