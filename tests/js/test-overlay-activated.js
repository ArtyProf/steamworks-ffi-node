/**
 * Test GameOverlayActivated_t against a real Steam client
 *
 * Subscribes to the Steam overlay opening and closing, asks Steam to open the
 * Friends overlay, and prints every event that arrives.
 *
 * WHAT THIS CAN AND CANNOT SHOW
 *   Steam only raises GameOverlayActivated_t in a process it has injected its
 *   overlay renderer into. A plain Node.js console process has no renderer, so
 *   run from a terminal it receives no events. To see real events, subscribe
 *   the same way from an Electron main process after
 *   `steam.addElectronSteamOverlay(win)`, then press Shift+Tab.
 *
 *   So nothing here waits for, or requires, an event. It fails only on things
 *   that hold however many events arrive:
 *     - a subscription made before init() is registered with Steam once
 *       init() succeeds, and is unregistered by shutdown()
 *     - nothing but the deliberately throwing handler logged an error
 *     - every event that does arrive is well-formed and for this app, and
 *       still reached the handler registered after the throwing one
 *
 *   The full behaviour, including events, is covered deterministically
 *   without Steam by test-overlay-activated-offline.js.
 */

const { SteamworksSDK, SteamLogger, EOverlayDialog } = require('../../dist/index.js');

const APP_ID = Number(process.env.STEAM_APP_ID || 480);
const WAIT_MS = Number(process.env.WAIT_MS || 15 * 1000);
const DELIBERATE_FAILURE = 'deliberate handler failure';

const failures = [];
function check(condition, message) {
  if (condition) {
    console.log(`   ✅ ${message}`);
  } else {
    console.log(`   ❌ ${message}`);
    failures.push(message);
  }
}

// Collect every error the library logs, while still printing it.
const unexpectedErrors = [];
const logError = SteamLogger.error;
SteamLogger.error = (...args) => {
  const line = args.map(String).join(' ');
  if (!line.includes(DELIBERATE_FAILURE)) unexpectedErrors.push(line);
  logError(...args);
};

// Steam has no query for whether a callback is registered, so this reads the
// overlay manager's own registration state.
const isRegistered = (steam) => steam.overlay.overlayActivatedCallback.isRegistered;

function testGameOverlayActivated() {
  console.log('🧪 Testing GameOverlayActivated_t\n');
  console.log('='.repeat(60));

  const steam = SteamworksSDK.getInstance();

  console.log('\n1️⃣  Subscribing before init()...');
  // Subscribed first, so if a throw escaped it would stop the handler below.
  const unsubscribeThrowing = steam.overlay.onGameOverlayActivated(() => {
    throw new Error(`${DELIBERATE_FAILURE} (should be logged, not thrown)`);
  });
  let received = 0;
  const unsubscribe = steam.overlay.onGameOverlayActivated((event) => {
    received++;
    console.log(`\n🔔 GameOverlayActivated: ${event.active ? 'opened' : 'closed'}`);
    console.log(`   active:        ${event.active}`);
    console.log(`   userInitiated: ${event.userInitiated}`);
    console.log(`   appId:         ${event.appId}`);
    check(typeof event.active === 'boolean' && typeof event.userInitiated === 'boolean',
      'active and userInitiated are booleans');
    // Any other value means the struct was read at the wrong offsets.
    check(event.appId === APP_ID, `appId is the initialized app (${APP_ID})`);
  });
  check(!isRegistered(steam), 'nothing registered with Steam before init()');

  console.log(`\n2️⃣  Initializing Steam (App ID: ${APP_ID})...`);
  if (!steam.init({ appId: APP_ID })) {
    console.error('\n❌ Steam failed to initialize. Is the Steam client running?');
    process.exit(1);
  }
  console.log(`   Initialized as ${steam.getStatus().steamId}`);
  check(isRegistered(steam), 'the early subscription registered once init() succeeded');

  console.log('\n3️⃣  Asking Steam to open the Friends overlay...');
  steam.overlay.activateGameOverlay(EOverlayDialog.FRIENDS);
  console.log(`   Waiting ${WAIT_MS / 1000}s for events. Ctrl+C to stop early.`);

  // Callbacks only arrive while the queue is being drained.
  const pump = setInterval(() => steam.runCallbacks(), 50);

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearInterval(pump);

    console.log('\n4️⃣  Unsubscribing and shutting down...');
    unsubscribeThrowing();
    unsubscribe();
    steam.shutdown();
    check(!isRegistered(steam), 'shutdown() unregistered the callback');
    check(unexpectedErrors.length === 0,
      `no unexpected errors logged${unexpectedErrors.length ? `: ${unexpectedErrors.join(' | ')}` : ''}`);

    console.log('\n' + '='.repeat(60));
    if (received === 0) {
      console.log('ℹ️  No events received. That is expected in a plain Node process,');
      console.log('   which has no overlay renderer for Steam to inject into.');
    } else {
      console.log(`ℹ️  Received ${received} event(s).`);
    }
    if (failures.length > 0) {
      console.log(`❌ ${failures.length} check(s) failed.`);
      process.exit(1);
    }
    console.log('✅ All checks passed.');
    process.exit(0);
  };

  setTimeout(finish, WAIT_MS);
  process.on('SIGINT', finish);
}

testGameOverlayActivated();
