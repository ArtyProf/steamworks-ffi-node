/**
 * Offline test for steam.overlay.onGameOverlayActivated()
 *
 * Needs no Steam client and is deterministic: nothing waits on Steam or on a
 * timer. A fake steam_api plays Steam's part. It keeps the CCallbackBase
 * object that SteamAPI_RegisterCallback receives, and raises
 * GameOverlayActivated_t by calling through that object's vtable, the same
 * slot the real Steam calls. So this covers the struct layout, the vtable,
 * the event mapping, handler isolation and the register/unregister lifecycle.
 *
 * koffi.register() is replaced with a recorder that hands back a fake
 * trampoline address and remembers the JS function behind it. That keeps the
 * test independent of koffi's native trampolines; `npm run
 * test:overlay-activated:js` exercises those against a real Steam client.
 *
 * Usage:
 *   node tests/js/test-overlay-activated-offline.js
 */

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const koffi = require('koffi');

// Must be in place before onGameOverlayActivated() first registers a callback.
const trampolines = new Map();
let nextAddress = 0x10000n;
koffi.register = (fn) => {
  const address = nextAddress;
  nextAddress += 0x10n;
  trampolines.set(address, fn);
  return address;
};
koffi.unregister = (address) => {
  if (!trampolines.delete(address)) {
    throw new Error('Could not find matching registered callback');
  }
};

const { SteamOverlayManager, SteamLogger } = require('../../dist/index.js');

// From isteamfriends.h, independent of the code under test.
const K_I_GAME_OVERLAY_ACTIVATED = 331; // k_iSteamFriendsCallbacks + 31
const SIZEOF_GAME_OVERLAY_ACTIVATED = 12; // { uint8, bool, pad:2, uint32, uint32 }

// Steam calls Run(void*). GCC/Clang put it in vtable slot 0; MSVC orders
// overloaded virtuals in reverse, which puts it in slot 1.
const RUN_SLOT = process.platform === 'win32' ? 1 : 0;
const POINTER_SIZE = koffi.sizeof('void *');

let logged = [];
SteamLogger.error = (...args) => logged.push(args.map(String).join(' '));
beforeEach(() => {
  logged = [];
});

/** Plays steam_api: the loader and API core the overlay manager talks to. */
class FakeSteam {
  constructor() {
    this.initialized = false;
    this.initListeners = [];
    this.registered = new Set();
    this.registerCalls = 0;
    this.unregisterCalls = 0;
    this.failRegister = false;

    this.apiCore = {
      isInitialized: () => this.initialized,
      onInitialized: (listener) => this.initListeners.push(listener),
    };
    this.loader = {
      SteamAPI_RegisterCallback: (object, callbackId) => {
        this.registerCalls++;
        if (this.failRegister) throw new Error('simulated SteamAPI_RegisterCallback failure');
        assert.equal(callbackId, K_I_GAME_OVERLAY_ACTIVATED);
        this.registered.add(object);
      },
      SteamAPI_UnregisterCallback: (object) => {
        this.unregisterCalls++;
        this.registered.delete(object);
      },
    };
  }

  init() {
    this.initialized = true;
    for (const listener of this.initListeners) listener();
  }

  /** The JS function behind one vtable slot of a registered callback object */
  slot(object, index) {
    assert.equal(koffi.decode(object, POINTER_SIZE, 'uint8'), 0, 'm_nCallbackFlags');
    assert.equal(koffi.decode(object, POINTER_SIZE + 4, 'int32'), K_I_GAME_OVERLAY_ACTIVATED, 'm_iCallback');
    const vtable = koffi.decode(object, 0, 'void *');
    const address = BigInt(koffi.decode(vtable, index * POINTER_SIZE, 'void *'));
    const fn = trampolines.get(address);
    assert.ok(fn, `vtable slot ${index} points at a registered trampoline`);
    return fn;
  }

  /** Raise GameOverlayActivated_t through every registered object, like steam_api */
  raise({ active, userInitiated, appId = 480, slot = RUN_SLOT }) {
    const payload = koffi.alloc('uint8', SIZEOF_GAME_OVERLAY_ACTIVATED);
    try {
      // Junk in the padding bytes: a reader at the wrong offsets would see it.
      koffi.encode(payload, 0, 'uint8', [active ? 1 : 0, userInitiated ? 1 : 0, 0xab, 0xcd], 4);
      koffi.encode(payload, 4, 'uint32', appId);
      koffi.encode(payload, 8, 'uint32', 0xdeadbeef); // m_dwOverlayPID
      for (const object of [...this.registered]) {
        this.slot(object, slot)(object, payload);
      }
    } finally {
      koffi.free(payload);
    }
  }
}

function setup({ initialized = true } = {}) {
  const steam = new FakeSteam();
  steam.initialized = initialized;
  const overlay = new SteamOverlayManager(steam.loader, steam.apiCore);
  return { steam, overlay };
}

test('maps GameOverlayActivated_t onto the event', () => {
  const { steam, overlay } = setup();
  const events = [];
  overlay.onGameOverlayActivated((event) => events.push(event));

  steam.raise({ active: true, userInitiated: true, appId: 480 });
  steam.raise({ active: false, userInitiated: false, appId: 480 });

  assert.deepEqual(events, [
    { active: true, userInitiated: true, appId: 480 },
    { active: false, userInitiated: false, appId: 480 },
  ]);
  overlay.cleanup();
});

test('both Run slots and GetCallbackSizeBytes behave', () => {
  const { steam, overlay } = setup();
  const events = [];
  overlay.onGameOverlayActivated((event) => events.push(event));
  const [object] = steam.registered;

  steam.raise({ active: true, userInitiated: false, slot: 0 });
  steam.raise({ active: true, userInitiated: false, slot: 1 });
  assert.equal(events.length, 2);
  assert.deepEqual(events[0], events[1]);
  assert.equal(steam.slot(object, 2)(object), SIZEOF_GAME_OVERLAY_ACTIVATED);
  overlay.cleanup();
});

test('a subscription made before init() registers once init() succeeds', () => {
  const { steam, overlay } = setup({ initialized: false });
  const events = [];
  overlay.onGameOverlayActivated((event) => events.push(event));
  assert.equal(steam.registerCalls, 0, 'nothing reaches Steam before init');

  steam.init();
  assert.equal(steam.registerCalls, 1);
  steam.raise({ active: true, userInitiated: true });
  assert.equal(events.length, 1);
  overlay.cleanup();
});

test('several subscribers share one Steam registration', () => {
  const { steam, overlay } = setup();
  const seen = [];
  overlay.onGameOverlayActivated(() => seen.push('a'));
  overlay.onGameOverlayActivated(() => seen.push('b'));

  assert.equal(steam.registerCalls, 1);
  steam.raise({ active: true, userInitiated: true });
  assert.deepEqual(seen, ['a', 'b']);
  overlay.cleanup();
});

test('a handler that throws is logged and does not stop later handlers', () => {
  const { steam, overlay } = setup();
  let reached = 0;
  overlay.onGameOverlayActivated(() => {
    throw new Error('deliberate sync failure');
  });
  overlay.onGameOverlayActivated(() => reached++);

  assert.doesNotThrow(() => steam.raise({ active: true, userInitiated: true }));
  assert.equal(reached, 1);
  assert.ok(logged.some((line) => line.includes('deliberate sync failure')), 'error was logged');
  overlay.cleanup();
});

test('an async handler that rejects is logged, not an unhandled rejection', async () => {
  const { steam, overlay } = setup();
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    let reached = 0;
    overlay.onGameOverlayActivated(async () => {
      throw new Error('deliberate async failure');
    });
    overlay.onGameOverlayActivated(() => reached++);

    steam.raise({ active: true, userInitiated: true });
    // Unhandled rejections are reported once the microtask queue drains,
    // which has happened by the time a setImmediate callback runs.
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(reached, 1);
    assert.deepEqual(unhandled, []);
    assert.ok(logged.some((line) => line.includes('deliberate async failure')), 'rejection was logged');
  } finally {
    process.off('unhandledRejection', onUnhandled);
    overlay.cleanup();
  }
});

test('unsubscribe stops delivery to that handler only', () => {
  const { steam, overlay } = setup();
  const seen = [];
  const unsubscribeA = overlay.onGameOverlayActivated(() => seen.push('a'));
  overlay.onGameOverlayActivated(() => seen.push('b'));

  unsubscribeA();
  steam.raise({ active: true, userInitiated: true });
  assert.deepEqual(seen, ['b']);
  overlay.cleanup();
});

test('cleanup() unregisters once, frees every trampoline, and is safe to repeat', () => {
  const { steam, overlay } = setup();
  const before = trampolines.size;
  overlay.onGameOverlayActivated(() => {});
  assert.equal(trampolines.size, before + 3);

  overlay.cleanup();
  assert.doesNotThrow(() => overlay.cleanup());
  assert.equal(steam.unregisterCalls, 1);
  assert.equal(steam.registered.size, 0);
  assert.equal(trampolines.size, before);
  assert.deepEqual(logged, []);
});

test('subscribing again after cleanup() registers afresh', () => {
  const { steam, overlay } = setup();
  overlay.onGameOverlayActivated(() => {});
  overlay.cleanup();

  const events = [];
  overlay.onGameOverlayActivated((event) => events.push(event));
  assert.equal(steam.registerCalls, 2);
  steam.raise({ active: false, userInitiated: true });
  assert.equal(events.length, 1);
  overlay.cleanup();
});

test('cleanup() before init() drops a pending registration', () => {
  const { steam, overlay } = setup({ initialized: false });
  overlay.onGameOverlayActivated(() => {});
  overlay.cleanup();

  steam.init();
  assert.equal(steam.registerCalls, 0);
});

test('a failed registration releases its trampolines and can be retried', () => {
  const { steam, overlay } = setup();
  const before = trampolines.size;
  const seen = [];
  steam.failRegister = true;

  assert.doesNotThrow(() => overlay.onGameOverlayActivated(() => seen.push('first')));
  assert.equal(trampolines.size, before, 'no trampolines leaked');
  assert.ok(logged.some((line) => line.includes('Failed to register GameOverlayActivated')));

  steam.failRegister = false;
  overlay.onGameOverlayActivated(() => seen.push('second'));
  assert.equal(steam.registered.size, 1);
  steam.raise({ active: true, userInitiated: false });
  // The handler subscribed during the failure was kept, so it fires too.
  assert.deepEqual(seen, ['first', 'second']);
  overlay.cleanup();
});

test('a bad payload pointer is logged, not thrown into Steam', () => {
  const { steam, overlay } = setup();
  overlay.onGameOverlayActivated(() => assert.fail('handler must not run'));
  const [object] = steam.registered;

  assert.doesNotThrow(() => steam.slot(object, RUN_SLOT)(object, null));
  assert.ok(logged.some((line) => line.includes('Error in GameOverlayActivated callback')));
  overlay.cleanup();
});
