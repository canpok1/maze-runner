#!/bin/bash
# GitHub Issue を更新するスクリプト
#
# 使用方法:
#   $0 <issue_number> [options]
#
# 引数:
#   <issue_number>              Issue番号（必須）
#
# オプション:
#   --title <タイトル>          タイトル更新
#   --body <本文>               本文更新（--body-fileと排他）
#   --body-file <ファイルパス>  本文をファイルから読み込み（--bodyと排他）。'-'でstdin対応
#   --state <open|closed>       状態更新
#   --state-reason <completed|not_planned|reopened>  状態理由
#   --add-label <ラベル>        ラベル追加（複数回指定可）
#   --remove-label <ラベル>     ラベル削除（複数回指定可）
#   --add-assignee <ユーザー名> Assignee追加（複数回指定可）
#   --remove-assignee <ユーザー名> Assignee削除（複数回指定可）
#
# 例:
#   $0 123 --title "新しいタイトル" --state closed --state-reason completed
#   $0 123 --body-file body.txt --add-label bug --add-label priority-high
#   echo "Issue本文" | $0 123 --body-file - --remove-label story
#
# 注意事項:
#   - GH_TOKEN 環境変数が必要です
#   - git, curl, jq コマンドが必要です

set -euo pipefail

# スクリプトディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 使用方法の表示
usage() {
    cat >&2 <<EOF
使用方法: $0 <issue_number> [options]

引数:
  <issue_number>              Issue番号（必須）

オプション:
  --title <タイトル>          タイトル更新
  --body <本文>               本文更新（--body-fileと排他）
  --body-file <ファイルパス>  本文をファイルから読み込み（--bodyと排他）。'-'でstdin対応
  --state <open|closed>       状態更新
  --state-reason <completed|not_planned|reopened>  状態理由
  --add-label <ラベル>        ラベル追加（複数回指定可）
  --remove-label <ラベル>     ラベル削除（複数回指定可）
  --add-assignee <ユーザー名> Assignee追加（複数回指定可）
  --remove-assignee <ユーザー名> Assignee削除（複数回指定可）

例:
  $0 123 --title "新しいタイトル" --state closed --state-reason completed
  $0 123 --body-file body.txt --add-label bug --add-label priority-high
  echo "Issue本文" | $0 123 --body-file - --remove-label story
EOF
    exit 1
}

# 必要なコマンドの存在確認（ラベル削除でcurlを直接使用するため）
for cmd in curl jq; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "エラー: ${cmd}コマンドが見つかりません。インストールしてください。" >&2
        exit 1
    fi
done

# GH_TOKEN環境変数のチェック（ラベル削除でcurlを直接使用するため）
if [[ -z "${GH_TOKEN:-}" ]]; then
    echo "エラー: GH_TOKEN環境変数が設定されていません。" >&2
    exit 1
fi

# 引数チェック
if [[ $# -lt 1 ]]; then
    usage
fi

# Issue番号の取得
ISSUE_NUMBER="$1"
shift

if [[ ! "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
    echo "エラー: Issue番号は数値である必要があります: $ISSUE_NUMBER" >&2
    exit 1
fi

# オプション引数の初期化
TITLE=""
BODY=""
BODY_FILE=""
STATE=""
STATE_REASON=""
ADD_LABELS=()
REMOVE_LABELS=()
ADD_ASSIGNEES=()
REMOVE_ASSIGNEES=()

# オプション引数の解析
while [[ $# -gt 0 ]]; do
    case "$1" in
        --title)
            if [[ $# -lt 2 ]]; then
                echo "エラー: --title にはタイトルが必要です" >&2
                usage
            fi
            TITLE="$2"
            shift 2
            ;;
        --body)
            if [[ $# -lt 2 ]]; then
                echo "エラー: --body には本文が必要です" >&2
                usage
            fi
            if [[ -n "$BODY_FILE" ]]; then
                echo "エラー: --body と --body-file は同時に指定できません" >&2
                usage
            fi
            BODY="$2"
            shift 2
            ;;
        --body-file)
            if [[ $# -lt 2 ]]; then
                echo "エラー: --body-file にはファイルパスが必要です" >&2
                usage
            fi
            if [[ -n "$BODY" ]]; then
                echo "エラー: --body と --body-file は同時に指定できません" >&2
                usage
            fi
            BODY_FILE="$2"
            shift 2
            ;;
        --state)
            if [[ $# -lt 2 ]]; then
                echo "エラー: --state には状態が必要です" >&2
                usage
            fi
            if [[ ! "$2" =~ ^(open|closed)$ ]]; then
                echo "エラー: --state は open または closed である必要があります: $2" >&2
                usage
            fi
            STATE="$2"
            shift 2
            ;;
        --state-reason)
            if [[ $# -lt 2 ]]; then
                echo "エラー: --state-reason には理由が必要です" >&2
                usage
            fi
            if [[ ! "$2" =~ ^(completed|not_planned|reopened)$ ]]; then
                echo "エラー: --state-reason は completed, not_planned, reopened のいずれかである必要があります: $2" >&2
                usage
            fi
            STATE_REASON="$2"
            shift 2
            ;;
        --add-label)
            if [[ $# -lt 2 ]]; then
                echo "エラー: --add-label にはラベル名が必要です" >&2
                usage
            fi
            ADD_LABELS+=("$2")
            shift 2
            ;;
        --remove-label)
            if [[ $# -lt 2 ]]; then
                echo "エラー: --remove-label にはラベル名が必要です" >&2
                usage
            fi
            REMOVE_LABELS+=("$2")
            shift 2
            ;;
        --add-assignee)
            if [[ $# -lt 2 ]]; then
                echo "エラー: --add-assignee にはユーザー名が必要です" >&2
                usage
            fi
            ADD_ASSIGNEES+=("$2")
            shift 2
            ;;
        --remove-assignee)
            if [[ $# -lt 2 ]]; then
                echo "エラー: --remove-assignee にはユーザー名が必要です" >&2
                usage
            fi
            REMOVE_ASSIGNEES+=("$2")
            shift 2
            ;;
        *)
            echo "エラー: 不明なオプション: $1" >&2
            usage
            ;;
    esac
done

# body-fileが指定されている場合、内容を読み込む
if [[ -n "$BODY_FILE" ]]; then
    if [[ "$BODY_FILE" == "-" ]]; then
        # stdinから読み込み
        BODY=$(cat)
    else
        # ファイルから読み込み
        if [[ ! -f "$BODY_FILE" ]]; then
            echo "エラー: ファイルが見つかりません: $BODY_FILE" >&2
            exit 1
        fi
        BODY=$(cat "$BODY_FILE")
    fi
fi

# リポジトリ情報を取得
echo "リポジトリ情報を取得中..." >&2
read -r OWNER REPO < <("$SCRIPT_DIR/repo-info.sh")
echo "Owner: $OWNER, Repo: $REPO" >&2

# Issue本体の更新（title, body, state, state_reasonのいずれかが指定された場合）
if [[ -n "$TITLE" || -n "$BODY" || -n "$STATE" || -n "$STATE_REASON" ]]; then
    echo "Issue #${ISSUE_NUMBER} を更新中..." >&2

    # JSONペイロードを構築
    JSON_PAYLOAD='{}'

    if [[ -n "$TITLE" ]]; then
        JSON_PAYLOAD=$(echo "$JSON_PAYLOAD" | jq --arg title "$TITLE" '. + {title: $title}')
    fi

    if [[ -n "$BODY" ]]; then
        JSON_PAYLOAD=$(echo "$JSON_PAYLOAD" | jq --arg body "$BODY" '. + {body: $body}')
    fi

    if [[ -n "$STATE" ]]; then
        JSON_PAYLOAD=$(echo "$JSON_PAYLOAD" | jq --arg state "$STATE" '. + {state: $state}')
    fi

    if [[ -n "$STATE_REASON" ]]; then
        JSON_PAYLOAD=$(echo "$JSON_PAYLOAD" | jq --arg state_reason "$STATE_REASON" '. + {state_reason: $state_reason}')
    fi

    # GitHub API を使用してIssueを更新
    ENDPOINT="/repos/$OWNER/$REPO/issues/$ISSUE_NUMBER"
    RESPONSE=$("$SCRIPT_DIR/github-rest.sh" "$ENDPOINT" "PATCH" "$JSON_PAYLOAD")

    echo "Issue本体の更新が完了しました" >&2

    # レスポンスを標準出力に出力
    echo "$RESPONSE"
fi

# ラベル追加（--add-labelが指定された場合）
if [[ ${#ADD_LABELS[@]} -gt 0 ]]; then
    echo "ラベルを追加中: ${ADD_LABELS[*]}" >&2

    # JSONペイロードを構築（ラベルの配列）
    LABELS_JSON=$(printf '%s\n' "${ADD_LABELS[@]}" | jq -R . | jq -s '{labels: .}')

    # GitHub API を使用してラベルを追加
    ENDPOINT="/repos/$OWNER/$REPO/issues/$ISSUE_NUMBER/labels"
    "$SCRIPT_DIR/github-rest.sh" "$ENDPOINT" "POST" "$LABELS_JSON" > /dev/null

    echo "ラベルの追加が完了しました" >&2
fi

# ラベル削除（--remove-labelが指定された場合）
if [[ ${#REMOVE_LABELS[@]} -gt 0 ]]; then
    echo "ラベルを削除中: ${REMOVE_LABELS[*]}" >&2

    # 各ラベルごとに削除（github-rest.shはDELETEレスポンスに.messageがないため直接curlを使用）
    for label in "${REMOVE_LABELS[@]}"; do
        # ラベル名をURLエンコード（スペースや特殊文字に対応）
        encoded_label=$(printf '%s' "$label" | jq -sRr @uri)

        ENDPOINT="https://api.github.com/repos/$OWNER/$REPO/issues/$ISSUE_NUMBER/labels/$encoded_label"

        # curlで直接DELETE
        response=$(curl -s -X DELETE \
            -H "Authorization: Bearer $GH_TOKEN" \
            -H "Accept: application/vnd.github+json" \
            -H "X-GitHub-Api-Version: 2022-11-28" \
            -w "\n%{http_code}" \
            "$ENDPOINT")

        # ステータスコードを取得
        http_code=$(echo "$response" | tail -n1)
        response_body=$(echo "$response" | sed '$d')

        # ステータスコードのチェック（200番台または404ならOK）
        if [[ ! "$http_code" =~ ^(200|204|404)$ ]]; then
            echo "エラー: ラベル削除に失敗しました (HTTP $http_code): $label" >&2
            if [[ -n "$response_body" ]]; then
                echo "$response_body" >&2
            fi
            exit 1
        fi

        if [[ "$http_code" == "404" ]]; then
            echo "警告: ラベルが見つかりませんでした: $label" >&2
        else
            echo "ラベルを削除しました: $label" >&2
        fi
    done

    echo "ラベルの削除が完了しました" >&2
fi

# Assignee追加（--add-assigneeが指定された場合）
if [[ ${#ADD_ASSIGNEES[@]} -gt 0 ]]; then
    echo "Assigneeを追加中: ${ADD_ASSIGNEES[*]}" >&2

    # JSONペイロードを構築（assigneeの配列）
    ASSIGNEES_JSON=$(printf '%s\n' "${ADD_ASSIGNEES[@]}" | jq -R . | jq -s '{assignees: .}')

    # GitHub API を使用してAssigneeを追加
    ENDPOINT="/repos/$OWNER/$REPO/issues/$ISSUE_NUMBER/assignees"
    "$SCRIPT_DIR/github-rest.sh" "$ENDPOINT" "POST" "$ASSIGNEES_JSON" > /dev/null

    echo "Assigneeの追加が完了しました" >&2
fi

# Assignee削除（--remove-assigneeが指定された場合）
if [[ ${#REMOVE_ASSIGNEES[@]} -gt 0 ]]; then
    echo "Assigneeを削除中: ${REMOVE_ASSIGNEES[*]}" >&2

    # JSONペイロードを構築（assigneeの配列）
    ASSIGNEES_JSON=$(printf '%s\n' "${REMOVE_ASSIGNEES[@]}" | jq -R . | jq -s '{assignees: .}')

    # GitHub API を使用してAssigneeを削除
    ENDPOINT="/repos/$OWNER/$REPO/issues/$ISSUE_NUMBER/assignees"
    "$SCRIPT_DIR/github-rest.sh" "$ENDPOINT" "DELETE" "$ASSIGNEES_JSON" > /dev/null

    echo "Assigneeの削除が完了しました" >&2
fi

echo "すべての更新が完了しました" >&2
