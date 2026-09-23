/**
 * Test MicroTxnAuthorizationResponse_t
 *
 * Subscribes to the in-game purchase dialog result and waits for it.
 *
 * This one cannot drive itself: the callback only fires when a real
 * microtransaction is started server-side and a real person answers the
 * overlay dialog. So this script subscribes and waits, and you make the
 * purchase happen from elsewhere.
 *
 * HOW TO PRODUCE AN EVENT
 *   1. Run this script (it stays up for 5 minutes).
 *   2. From your backend, call the Steam Web API:
 *        ISteamMicroTxnSandbox/InitTxn/v3   (sandbox)
 *        ISteamMicroTxn/InitTxn/v3          (production)
 *      with this user's steamid, your appid, an orderid you choose, and at
 *      least one line item.
 *   3. Steam shows the purchase dialog in the overlay. Approve or decline it.
 *   4. This script prints the event.
 *
 * The overlay has to be working for the dialog to appear at all -- if you see
 * nothing, check that first rather than assuming the callback is broken.
 *
 * IMPORTANT: `authorized: true` is the user's consent, not a completed
 * purchase, and it comes from the client. Settle it with QueryTxn/FinalizeTxn
 * server-side before granting anything.
 */

const { SteamworksSDK } = require('../../dist/index.js');

const APP_ID = Number(process.env.STEAM_APP_ID || 480);
const WAIT_MS = 5 * 60 * 1000;

function testMicroTxnAuthorizationResponse() {
  console.log('🧪 Testing MicroTxnAuthorizationResponse_t\n');
  console.log('='.repeat(60));

  const steam = SteamworksSDK.getInstance();

  console.log(`\n1️⃣  Initializing Steam (App ID: ${APP_ID})...`);
  if (!steam.init({ appId: APP_ID })) {
    console.error('\n❌ Steam failed to initialize. Is the Steam client running?');
    process.exit(1);
  }

  const status = steam.getStatus();
  console.log(`   ✅ Initialized as ${status.steamId}`);

  console.log('\n2️⃣  Subscribing to MicroTxnAuthorizationResponse...');
  let received = 0;
  const unsubscribe = steam.user.onMicroTxnAuthorizationResponse((event) => {
    received++;
    console.log('\n🔔 MicroTxnAuthorizationResponse received:');
    console.log(`   appId:      ${event.appId}`);
    console.log(`   orderId:    ${event.orderId}`);
    console.log(`   authorized: ${event.authorized}`);

    if (event.appId !== APP_ID) {
      console.log(`   ⚠️  appId does not match the app we initialized (${APP_ID}).`);
    }
    // A plausible order id is the clearest signal the struct was read at the
    // right offsets -- a packing mistake shows up here as 0 or nonsense.
    if (event.orderId === '0') {
      console.log('   ⚠️  orderId is 0, which usually means the struct was misread.');
    }

    console.log(
      event.authorized
        ? '\n   Next step for real code: QueryTxn then FinalizeTxn, server-side.'
        : '\n   User declined. Nothing to settle.',
    );
  });

  console.log('   ✅ Subscribed.');
  console.log('\n3️⃣  Waiting for a purchase dialog to be answered...');
  console.log('   Start a transaction with ISteamMicroTxn[Sandbox]/InitTxn now.');
  console.log(`   Giving up after ${WAIT_MS / 60000} minutes. Ctrl+C to stop early.\n`);

  // Callbacks only arrive while the queue is being drained.
  const pump = setInterval(() => steam.runCallbacks(), 50);

  const finish = () => {
    clearInterval(pump);
    unsubscribe();
    console.log('\n' + '='.repeat(60));
    console.log(
      received > 0
        ? `✅ Received ${received} event(s).`
        : '⚠️  No events received. Either no transaction was started, or the ' +
            'overlay dialog was never answered.',
    );
    steam.shutdown();
    process.exit(received > 0 ? 0 : 1);
  };

  const timer = setTimeout(finish, WAIT_MS);
  process.on('SIGINT', () => {
    clearTimeout(timer);
    finish();
  });
}

testMicroTxnAuthorizationResponse();
