#!/usr/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_DIR="$ROOT_DIR/.tools/node-v22.17.1-linux-x64"
COREPACK="$NODE_DIR/bin/corepack"

if [ ! -x "$COREPACK" ]; then
  echo "没有找到本地 Node/Corepack: $COREPACK" >&2
  echo "请先确认 .tools/node-v22.17.1-linux-x64 已安装。" >&2
  exit 1
fi

export PATH="$ROOT_DIR/.tools/bin:$NODE_DIR/bin:/usr/local/sbin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

cd "$ROOT_DIR"

if [ "$#" -eq 0 ]; then
  exec "$COREPACK" pnpm dev
fi

exec "$COREPACK" pnpm "$@"
