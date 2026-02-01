#!/bin/bash
# GitHub Issue にサブIssueを追加するスクリプト
#
# 使用方法:
#   $0 <親Issue番号> <サブIssue番号> [--replace-parent]
#
# 例:
#   $0 100 101
#   $0 100 101 --replace-parent

set -euo pipefail

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 使用方法を表示
usage() {
    echo "使用方法: $0 <親Issue番号> <サブIssue番号> [--replace-parent]" >&2
    echo "" >&2
    echo "例:" >&2
    echo "  $0 100 101" >&2
    echo "  $0 100 101 --replace-parent" >&2
    exit 1
}

# 引数チェック
if [[ $# -lt 2 ]]; then
    echo "エラー: 親Issue番号とサブIssue番号を指定してください。" >&2
    usage
fi

PARENT_NUMBER="$1"
SUB_NUMBER="$2"
REPLACE_PARENT=false

# オプション引数の処理
if [[ $# -ge 3 && "$3" == "--replace-parent" ]]; then
    REPLACE_PARENT=true
fi

# Issue番号が数値かチェック
if ! [[ "$PARENT_NUMBER" =~ ^[0-9]+$ ]]; then
    echo "エラー: 親Issue番号は数値で指定してください。" >&2
    exit 1
fi

if ! [[ "$SUB_NUMBER" =~ ^[0-9]+$ ]]; then
    echo "エラー: サブIssue番号は数値で指定してください。" >&2
    exit 1
fi

# リポジトリ情報を取得
read -r OWNER REPO < <("$SCRIPT_DIR/repo-info.sh")

echo "サブIssueを追加中..." >&2
echo "親Issue: #$PARENT_NUMBER" >&2
echo "サブIssue: #$SUB_NUMBER" >&2
echo "既存の親Issueを置換: $REPLACE_PARENT" >&2

# Step 1: 親IssueとサブIssueのNode IDを取得
GRAPHQL_QUERY='query($owner: String!, $name: String!, $parentNumber: Int!, $subNumber: Int!) {
  repository(owner: $owner, name: $name) {
    parent: issue(number: $parentNumber) {
      id
      number
      title
    }
    sub: issue(number: $subNumber) {
      id
      number
      title
    }
  }
}'

QUERY_VARIABLES=$(jq -n \
    --arg owner "$OWNER" \
    --arg name "$REPO" \
    --argjson parentNumber "$PARENT_NUMBER" \
    --argjson subNumber "$SUB_NUMBER" \
    '{owner: $owner, name: $name, parentNumber: $parentNumber, subNumber: $subNumber}')

set +e
QUERY_RESULT=$("$SCRIPT_DIR/github-graphql.sh" "$GRAPHQL_QUERY" "$QUERY_VARIABLES")
QUERY_EXIT_CODE=$?
set -e

if [[ $QUERY_EXIT_CODE -ne 0 ]]; then
    echo "エラー: Issue情報の取得に失敗しました。" >&2
    exit 1
fi

# Node IDを抽出
PARENT_ID=$(echo "$QUERY_RESULT" | jq -r '.data.repository.parent.id')
SUB_ID=$(echo "$QUERY_RESULT" | jq -r '.data.repository.sub.id')

if [[ "$PARENT_ID" == "null" || -z "$PARENT_ID" ]]; then
    echo "エラー: 親Issue #$PARENT_NUMBER が見つかりません。" >&2
    exit 1
fi

if [[ "$SUB_ID" == "null" || -z "$SUB_ID" ]]; then
    echo "エラー: サブIssue #$SUB_NUMBER が見つかりません。" >&2
    exit 1
fi

echo "親IssueのNode ID: $PARENT_ID" >&2
echo "サブIssueのNode ID: $SUB_ID" >&2

# Step 2: サブIssue追加のmutationを実行
GRAPHQL_MUTATION='mutation($parentId: ID!, $subIssueId: ID!, $replaceParent: Boolean!) {
  addSubIssue(input: {issueId: $parentId, subIssueId: $subIssueId, replaceParentIssue: $replaceParent}) {
    issue {
      id
      number
      title
    }
    subIssue {
      id
      number
      title
    }
  }
}'

MUTATION_VARIABLES=$(jq -n \
    --arg parentId "$PARENT_ID" \
    --arg subIssueId "$SUB_ID" \
    --argjson replaceParent "$REPLACE_PARENT" \
    '{parentId: $parentId, subIssueId: $subIssueId, replaceParent: $replaceParent}')

set +e
MUTATION_RESULT=$("$SCRIPT_DIR/github-graphql.sh" "$GRAPHQL_MUTATION" "$MUTATION_VARIABLES")
MUTATION_EXIT_CODE=$?
set -e

if [[ $MUTATION_EXIT_CODE -ne 0 ]]; then
    echo "エラー: サブIssueの追加に失敗しました。" >&2
    exit 1
fi

# 結果を確認
RESULT_PARENT_NUMBER=$(echo "$MUTATION_RESULT" | jq -r '.data.addSubIssue.issue.number')
RESULT_SUB_NUMBER=$(echo "$MUTATION_RESULT" | jq -r '.data.addSubIssue.subIssue.number')

if [[ "$RESULT_PARENT_NUMBER" == "null" || "$RESULT_SUB_NUMBER" == "null" ]]; then
    echo "" >&2
    echo "✗ サブIssueの追加に失敗しました。" >&2
    echo "エラー詳細:" >&2
    echo "$MUTATION_RESULT" | jq >&2
    exit 1
fi

echo "" >&2
echo "✓ サブIssueを追加しました。" >&2
echo "親Issue: #$RESULT_PARENT_NUMBER ($(echo "$MUTATION_RESULT" | jq -r '.data.addSubIssue.issue.title'))" >&2
echo "サブIssue: #$RESULT_SUB_NUMBER ($(echo "$MUTATION_RESULT" | jq -r '.data.addSubIssue.subIssue.title'))" >&2

# レスポンスJSONを標準出力に出力
echo "$MUTATION_RESULT"
