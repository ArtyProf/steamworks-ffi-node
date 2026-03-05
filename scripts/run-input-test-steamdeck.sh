#!/bin/bash
# =============================================================================
# Steam Deck Input Test Launcher
#
# Run this script as a Non-Steam Game to give the process a Steam context,
# which is required for Steam Input API to detect the Steam Deck controller.
#
# Setup (one-time):
#   chmod +x scripts/run-input-test-steamdeck.sh
#
# Add to Steam:
#   Steam → Add a Game → Add a Non-Steam Game → Browse → select this script
#   (or point to the full path in the launch options)
#
# Usage:
#   ./scripts/run-input-test-steamdeck.sh           # JS test, no virtual controller
#   ./scripts/run-input-test-steamdeck.sh --ts       # TypeScript test
#   ./scripts/run-input-test-steamdeck.sh --virtual  # JS test + virtual Xbox controller
#   ./scripts/run-input-test-steamdeck.sh --ts --virtual --type=ps4
# =============================================================================

set -e

# ── Resolve the repo root (directory containing this script's parent) ─────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

echo ""
echo "========================================================"
echo "  Steam Deck Input Test Launcher"
echo "  Repo: $REPO_ROOT"
echo "========================================================"
echo ""

# ── Parse arguments ───────────────────────────────────────────────────────────
USE_TS=false
EXTRA_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --ts)       USE_TS=true ;;
    *)          EXTRA_ARGS+=("$arg") ;;
  esac
done

# ── Verify Steamworks SDK library ─────────────────────────────────────────────
LIB_PATH="$REPO_ROOT/steamworks_sdk/redistributable_bin/linux64/libsteam_api.so"
if [ ! -f "$LIB_PATH" ]; then
  echo ""
  echo "❌ libsteam_api.so not found at:"
  echo "   $LIB_PATH"
  echo ""
  echo "   Download the Steamworks SDK from https://partner.steamgames.com/"
  echo "   and place redistributable_bin/ inside steamworks_sdk/"
  exit 1
fi
echo "✅ libsteam_api.so found"

# ── Ensure LD_LIBRARY_PATH includes the Steam runtime libs ───────────────────
# Steam Deck ships Steam runtime libs under ~/.steam/root/ubuntu12_32/steam-runtime
STEAM_RUNTIME_LIBS="$HOME/.steam/root/ubuntu12_32/steam-runtime/lib/i386-linux-gnu"
STEAM_RUNTIME_LIBS64="$HOME/.steam/root/ubuntu12_32/steam-runtime/amd64/lib/x86_64-linux-gnu"

export LD_LIBRARY_PATH="$REPO_ROOT/steamworks_sdk/redistributable_bin/linux64:${LD_LIBRARY_PATH:-}"

if [ -d "$STEAM_RUNTIME_LIBS64" ]; then
  export LD_LIBRARY_PATH="$STEAM_RUNTIME_LIBS64:$LD_LIBRARY_PATH"
fi

echo "✅ LD_LIBRARY_PATH set"

# ── Locate Node.js ────────────────────────────────────────────────────────────
# fnm / nvm may not be on PATH when launched via Steam — source their init if needed
if ! command -v node &>/dev/null; then
  # Try fnm
  if [ -f "$HOME/.local/share/fnm/fnm" ]; then
    export PATH="$HOME/.local/share/fnm:$PATH"
    eval "$(fnm env --use-on-cd 2>/dev/null)"
  # Try nvm
  elif [ -f "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
  # Try common system paths
  else
    export PATH="/usr/local/bin:/usr/bin:$PATH"
  fi
fi

if ! command -v node &>/dev/null; then
  echo ""
  echo "❌ node not found. Install Node.js 18+ via fnm or nvm:"
  echo "   curl -fsSL https://fnm.vercel.app/install | bash"
  echo "   fnm install 22"
  exit 1
fi

NODE_VER=$(node --version)
echo "✅ Node.js: $NODE_VER"

# ── Ensure dependencies are installed ────────────────────────────────────────
if [ ! -d "$REPO_ROOT/node_modules" ]; then
  echo ""
  echo "📦 node_modules not found — running npm install..."
  npm install
fi

# ── Run the test ──────────────────────────────────────────────────────────────
echo ""
if $USE_TS; then
  echo "▶  Running TypeScript input test..."
  echo "   Command: npx ts-node tests/ts/test-input.ts ${EXTRA_ARGS[*]}"
  echo ""
  npx ts-node tests/ts/test-input.ts "${EXTRA_ARGS[@]}"
else
  echo "▶  Running JavaScript input test..."
  echo "   Command: node tests/js/test-input.js ${EXTRA_ARGS[*]}"
  echo ""
  node tests/js/test-input.js "${EXTRA_ARGS[@]}"
fi
