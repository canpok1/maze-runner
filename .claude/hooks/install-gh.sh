#!/bin/bash

set -euo pipefail

# Cleanup function
cleanup() {
  if [[ -n "${TEMP_DIR:-}" ]] && [[ -d "${TEMP_DIR}" ]]; then
    rm -rf "${TEMP_DIR}"
  fi
}

trap cleanup EXIT

# Check if gh is already installed
if command -v gh &> /dev/null; then
  echo "gh is already installed: $(gh --version)"
  exit 0
fi

# Set version
VERSION="${GH_SETUP_VERSION:-2.83.2}"

# Detect architecture
ARCH=$(uname -m)
case "${ARCH}" in
  x86_64)
    ARCH="amd64"
    ;;
  aarch64|arm64)
    ARCH="arm64"
    ;;
  *)
    echo "Error: Unsupported architecture: ${ARCH}" >&2
    exit 1
    ;;
esac

# Detect OS
OS=$(uname -s | tr '[:upper:]' '[:lower:]')

# Construct download URL
URL="https://github.com/cli/cli/releases/download/v${VERSION}/gh_${VERSION}_${OS}_${ARCH}.tar.gz"

echo "Downloading gh ${VERSION} for ${OS}/${ARCH}..."

# Create temporary directory
TEMP_DIR=$(mktemp -d)

# Download and extract
cd "${TEMP_DIR}"
if ! curl -fsSL "${URL}" -o gh.tar.gz; then
  echo "Error: Failed to download from ${URL}" >&2
  exit 1
fi

tar -xzf gh.tar.gz

# Find the gh binary
GH_BINARY=$(find . -type f -name gh -path "*/bin/gh" | head -n 1)
if [[ -z "${GH_BINARY}" ]]; then
  echo "Error: gh binary not found in downloaded archive" >&2
  exit 1
fi

# Install to ~/.local/bin
INSTALL_DIR="${HOME}/.local/bin"
mkdir -p "${INSTALL_DIR}"

cp "${GH_BINARY}" "${INSTALL_DIR}/gh"
chmod 755 "${INSTALL_DIR}/gh"

echo "gh installed to ${INSTALL_DIR}/gh"

# Add to PATH
export PATH="${INSTALL_DIR}:${PATH}"

# Persist PATH setting if CLAUDE_ENV_FILE is set
if [[ -n "${CLAUDE_ENV_FILE:-}" ]]; then
  if ! grep -q "${INSTALL_DIR}" "${CLAUDE_ENV_FILE}" 2>/dev/null; then
    echo "export PATH=\"${INSTALL_DIR}:\${PATH}\"" >> "${CLAUDE_ENV_FILE}"
    echo "PATH setting persisted to ${CLAUDE_ENV_FILE}"
  fi
fi

# Setup authentication if token is available
if [[ -n "${GH_TOKEN:-}" ]] || [[ -n "${GITHUB_TOKEN:-}" ]]; then
  echo "Setting up Git authentication..."
  gh auth setup-git
fi

echo "gh installation completed successfully!"
gh --version
