#!/usr/bin/env bash
set -euo pipefail

# GitHub REST API呼び出しスクリプト
#
# 使用例:
#   ./github-rest.sh "/repos/owner/repo/pulls"
#   ./github-rest.sh "/repos/owner/repo/pulls" "POST" '{"title":"..."}'
#   ./github-rest.sh --paginate "/repos/owner/repo/pulls"

# 必要なコマンドのチェック
if ! command -v curl &> /dev/null; then
    echo "エラー: curlコマンドが見つかりません。インストールしてください。" >&2
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "エラー: jqコマンドが見つかりません。インストールしてください。" >&2
    exit 1
fi

# GH_TOKEN環境変数のチェック
if [[ -z "${GH_TOKEN:-}" ]]; then
    echo "エラー: GH_TOKEN環境変数が設定されていません。" >&2
    exit 1
fi

# ページネーションフラグの解析
paginate=false
if [[ "${1:-}" == "--paginate" ]]; then
    paginate=true
    shift
fi

# 引数の取得
endpoint="${1:-}"
method="${2:-GET}"
body="${3:-}"

# エンドポイントが指定されているかチェック
if [[ -z "$endpoint" ]]; then
    echo "使用方法: $0 [--paginate] <endpoint> [method] [body]" >&2
    echo "例: $0 /repos/owner/repo/pulls" >&2
    echo "例: $0 /repos/owner/repo/pulls POST '{\"title\":\"test\"}'" >&2
    echo "例: $0 --paginate /repos/owner/repo/pulls" >&2
    exit 1
fi

# per_page=100を自動付与（ページネーション時のみ）
if [[ "$paginate" == "true" ]]; then
    if [[ ! "$endpoint" =~ per_page= ]]; then
        if [[ "$endpoint" =~ \? ]]; then
            endpoint="${endpoint}&per_page=100"
        else
            endpoint="${endpoint}?per_page=100"
        fi
    fi
fi

# API URLの構築
api_url="https://api.github.com${endpoint}"

# curlコマンドの引数を構築
curl_args=(
    -s
    -X "$method"
    -H "Authorization: Bearer $GH_TOKEN"
    -H "Accept: application/vnd.github+json"
    -H "X-GitHub-Api-Version: 2022-11-28"
)

# ボディが指定されている場合は追加
if [[ -n "$body" ]]; then
    curl_args+=(-H "Content-Type: application/json" -d "$body")
fi

# ページネーション処理
if [[ "$paginate" == "true" ]]; then
    # 一時ファイルの準備
    temp_dir=$(mktemp -d)
    trap 'rm -rf "$temp_dir"' EXIT

    page=1
    next_url="$api_url"
    all_results="$temp_dir/all_results.json"
    : > "$all_results"

    while [[ -n "$next_url" ]]; do
        # ヘッダーとボディを分離して取得
        temp_headers="$temp_dir/headers.txt"
        temp_body="$temp_dir/body.json"

        set +e
        http_code=$(curl "${curl_args[@]}" -D "$temp_headers" -o "$temp_body" -w '%{http_code}' "$next_url")
        curl_exit_code=$?
        set -e

        # curlのエラーチェック
        if [[ $curl_exit_code -ne 0 ]]; then
            echo "エラー: curlコマンドが終了コード $curl_exit_code で失敗しました。" >&2
            exit 1
        fi

        # HTTPステータスコードに基づくエラー判定
        if [[ ! "$http_code" =~ ^2[0-9]{2}$ ]]; then
            echo "エラー: GitHub APIがエラーを返しました (HTTP $http_code):" >&2
            message=$(jq -r '.message' "$temp_body" 2>/dev/null)
            if [[ -n "$message" && "$message" != "null" ]]; then
                echo "$message" >&2
            else
                cat "$temp_body" >&2
            fi
            exit 1
        fi

        # ページのレスポンスを結果ファイルに追加
        cat "$temp_body" >> "$all_results"
        echo "" >> "$all_results"

        # Link headerから次のページURLを抽出
        next_url=$(grep -i '^link:' "$temp_headers" | sed -n 's/.*<\([^>]*\)>; rel="next".*/\1/p' || true)

        page=$((page + 1))
    done

    # 全ページのJSONをマージ
    jq -s 'add' "$all_results"
else
    # 通常のリクエスト（ページネーションなし）
    # エラーハンドリング付きでcurl実行
    set +e
    response=$(curl "${curl_args[@]}" -w '\n%{http_code}' "$api_url")
    curl_exit_code=$?
    set -e

    # curlのエラーチェック
    if [[ $curl_exit_code -ne 0 ]]; then
        echo "エラー: curlコマンドが終了コード $curl_exit_code で失敗しました。" >&2
        exit 1
    fi

    # レスポンスからHTTPステータスコードとボディを分離
    http_code="${response##*$'\n'}"
    response_body="${response%$'\n'*}"

    # HTTPステータスコードに基づくエラー判定
    if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
        # 2xx系: 成功
        echo "$response_body"
    else
        # 4xx/5xx系: エラー
        echo "エラー: GitHub APIがエラーを返しました (HTTP $http_code):" >&2
        message=$(echo "$response_body" | jq -r '.message' 2>/dev/null)
        if [[ -n "$message" && "$message" != "null" ]]; then
            echo "$message" >&2
        else
            echo "$response_body" >&2
        fi
        exit 1
    fi
fi
