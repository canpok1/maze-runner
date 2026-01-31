#!/bin/bash

# 標準入力からJSON形式でセッション情報を受け取る
input=$(cat)

# モデル名を取得
model_name=$(echo "$input" | jq -r '.model.display_name // "Unknown"')

# コンテキスト使用率を算出
current_usage=$(echo "$input" | jq -r '.context_window.current_usage // 0')
context_window_size=$(echo "$input" | jq -r '.context_window.context_window_size // 1')

if [ "$context_window_size" -gt 0 ] 2>/dev/null; then
  context_percent=$(echo "$input" | jq -r "($current_usage / $context_window_size * 100) | floor")
else
  context_percent="0"
fi

# コストを取得
cost=$(echo "$input" | jq -r '.cost.total_cost_usd // empty')

# ステータスラインを出力
if [ -n "$cost" ]; then
  printf "Model: %s | Context: %s%% | Cost: \$%.2f" "$model_name" "$context_percent" "$cost"
else
  printf "Model: %s | Context: %s%%" "$model_name" "$context_percent"
fi
