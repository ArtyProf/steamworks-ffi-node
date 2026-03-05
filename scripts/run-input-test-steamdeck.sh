#!/bin/bash
# =============================================================================
# Steam Deck Input Test Launcher
#
# Run this script as a Non-Steam Game to give the process a Steam context,
# which is required for Steam Input API to detect the Steam Deck controller.
#
# ⚠️  IMPORTANT — How to run this correctly on Steam Deck Desktop Mode:
#
#   Root cause: Steam Input maps controllers by the *foreground window's* App ID.
#   Launching as a Non-Steam game gives the process a random App ID; steam.init()
#   then registers as App ID 480, causing Steam to destroy the virtual controller
#   slot due to the conflict.
#
#   Fix: This script uses steam://forceinputappid/480 to lock Steam's Input IPC
#   to App ID 480 before the node process starts. This is the official Valve
#   mechanism for exactly this debugging scenario.
#
#   Just add as a Non-Steam Game — no special launch options required.
#   Steps:
#   1. Steam → Add a Game → Add a Non-Steam Game → Browse → select this script
#   2. Right-click the new entry → Properties → set a name (e.g. "Input Test")
#   3. Launch it — the script handles everything else automatically.
#
# Usage (command line):
#   ./scripts/run-input-test-steamdeck.sh           # JS test
#   ./scripts/run-input-test-steamdeck.sh --ts       # TypeScript test
#   ./scripts/run-input-test-steamdeck.sh --virtual  # JS + virtual Xbox controller
#   ./scripts/run-input-test-steamdeck.sh --ts --virtual --type=ps4
# =============================================================================

set -e

# ── App ID — must match what's set in Steam launch options ────────────────────
# Override with APP_ID=<id> environment variable if needed.
APP_ID="${APP_ID:-480}"

# Export early so libsteam_api.so picks it up before SteamAPI_Init is called
export SteamAppId="$APP_ID"
export steam_appid="$APP_ID"   # some Steam runtime versions check this spelling too

# ── Resolve the repo root (directory containing this script's parent) ─────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

echo ""
echo "========================================================"
echo "  Steam Deck Input Test Launcher"
echo "  Repo:   $REPO_ROOT"
echo "  App ID: $APP_ID (SteamAppId env exported)"
echo "========================================================"
echo ""

# ── Force Steam Input to use our App ID ──────────────────────────────────────
# Root cause: Steam Input maps controllers by the *foreground window's* App ID,
# not the process environment. When launched as a Non-Steam game, Steam assigns
# a random App ID to the launcher, then steam.init({ appId: 480 }) creates a
# second process identity — Steam resolves the conflict by destroying the virtual
# controller slot.
#
# Fix: steam://forceinputappid/<appId> locks Steam's Input IPC to App ID 480
# for ALL processes until reset, bypassing the foreground-window tracking.
# See: https://partner.steamgames.com/doc/features/steam_controller/getting_started_for_devs#3
#
# Reset to normal operation on exit with steam://forceinputappid/0
echo "🔒 Locking Steam Input to App ID $APP_ID via steam://forceinputappid/$APP_ID ..."
if command -v xdg-open &>/dev/null; then
  xdg-open "steam://forceinputappid/$APP_ID" 2>/dev/null || true
elif command -v steam &>/dev/null; then
  steam "steam://forceinputappid/$APP_ID" 2>/dev/null || true
fi
# Give Steam a moment to process the URL
sleep 1
echo "✅ Steam Input App ID locked to $APP_ID"

# Reset Steam Input App ID lock on exit (0 = return to normal operation)
trap 'echo "🔓 Resetting Steam Input App ID lock..."; xdg-open "steam://forceinputappid/0" 2>/dev/null || steam "steam://forceinputappid/0" 2>/dev/null || true' EXIT

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
