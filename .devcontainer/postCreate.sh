#!/bin/sh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Set up Claude Code
echo "CLAUDE_CONFIG_DIR=${CLAUDE_CONFIG_DIR}"
ln -s ${SCRIPT_DIR}/.claude ${CLAUDE_CONFIG_DIR}
npm install -g @anthropic-ai/claude-code
