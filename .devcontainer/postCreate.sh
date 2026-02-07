#!/bin/sh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Set up Claude Code
echo "CLAUDE_CONFIG_DIR=${CLAUDE_CONFIG_DIR}"
ln -s ${SCRIPT_DIR}/.claude ${CLAUDE_CONFIG_DIR}
curl -fsSL https://claude.ai/install.sh -o /tmp/claude_install.sh && bash /tmp/claude_install.sh

# Set up Maze Runner
npm run setup
