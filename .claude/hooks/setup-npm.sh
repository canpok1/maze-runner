#!/bin/bash

set -euo pipefail

# npm コマンドの存在確認
if ! command -v npm &> /dev/null; then
  echo "Error: npm command not found" >&2
  exit 1
fi

# package-lock.json の存在確認
if [[ ! -f "package-lock.json" ]]; then
  echo "Error: package-lock.json not found in current directory" >&2
  exit 1
fi

# マーカーファイルのパス
HASH_FILE="node_modules/.npm-ci-hash"

# 現在の package-lock.json のハッシュを計算
CURRENT_HASH=$(md5sum package-lock.json | awk '{print $1}')

# スキップ判定: ハッシュが一致する場合
if [[ -f "${HASH_FILE}" ]] && [[ "$(cat "${HASH_FILE}")" == "${CURRENT_HASH}" ]]; then
  echo "npm ci is already completed (package-lock.json hash matches)"
  exit 0
fi

echo "Running npm ci to install dependencies..."

if ! npm ci --ignore-scripts; then
  echo "Error: npm ci failed" >&2
  exit 1
fi

# ハッシュをマーカーファイルに保存
echo "${CURRENT_HASH}" > "${HASH_FILE}"

echo "npm ci completed successfully!"
