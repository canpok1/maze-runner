---
name: coding
description: GitHub Issueの内容を把握し、実装・テスト・自己レビューを行ってIssueを解決します。GitHub Issueの対応が必要な場合や、`assign-to-claude` ラベルのついたIssueに対応する場合に使用してください。
argument-hint: [GitHub Issueの番号]
---
## 手順
1. GitHub Issueの番号を決定する。
    - 引数で指定されている場合、その番号を使用する。
    - 引数が未指定の場合は「GitHub Issueの番号を指定してください」とユーザーに通知し、処理を終了する。
2. `github` スキルでGitHub Issueの内容を把握する。
3. 対応を行う。
    - Issue内容に基づいて実装計画を策定する。
    - `coding-specialist` エージェントと協力して実装を行う。
    - `checking-quality` スキルで品質チェックを実施し、問題があれば実装の修正に戻る。
    - 修正内容をコミット・プッシュする。
