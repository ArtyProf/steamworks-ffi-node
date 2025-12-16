# 🎮 Steam Input Test Walkthrough - Where Configuration Happens

This document shows **exactly where** in the test files button configuration and action management is demonstrated.

## 📍 Test File Locations

### TypeScript: `tests/ts/test-input.ts`
### JavaScript: `tests/js/test-input.js`

---

## 🗺️ Configuration Flow in Tests

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TEST STRUCTURE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Test 0: Virtual Gamepad Setup                                       │
│  ├─ Creates virtual Xbox/PS4 controller                             │
│  └─ No configuration here, just hardware simulation                 │
│                                                                       │
│  Test 1-4: Initialization & Controller Detection                    │
│  ├─ Init Steam API and Steam Input                                  │
│  ├─ Detect controllers                                              │
│  └─ Get controller information                                      │
│                                                                       │
│  ╔═══════════════════════════════════════════════════════════════╗ │
│  ║ Test 5: ACTION SET MANAGEMENT (Lines 203-251)                 ║ │
│  ║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║ │
│  ║ THIS IS WHERE CONTROL SCHEMES ARE CONFIGURED!                 ║ │
│  ╚═══════════════════════════════════════════════════════════════╝ │
│      │                                                                │
│      ├─ getActionSetHandle('MenuControls')                          │
│      │  • Get handle for "menu" control scheme                      │
│      │                                                                │
│      ├─ getActionSetHandle('GameplayControls')                      │
│      │  • Get handle for "gameplay" control scheme                  │
│      │                                                                │
│      ├─ activateActionSet(handle, menuSetHandle)                    │
│      │  • SWITCH TO MENU CONTROLS                                   │
│      │  • Only menu actions are now active                          │
│      │                                                                │
│      ├─ getCurrentActionSet(handle)                                 │
│      │  • Check which control scheme is active                      │
│      │                                                                │
│      ├─ activateActionSetLayer(handle, layerHandle)                 │
│      │  • ADD EXTRA CONTROLS on top (like "hold LB for skills")    │
│      │                                                                │
│      ├─ getActiveActionSetLayers(handle)                            │
│      │  • See all active layers                                     │
│      │                                                                │
│      └─ deactivateActionSetLayer() / deactivateAllActionSetLayers()│
│         • REMOVE LAYERS                                              │
│                                                                       │
│  ╔═══════════════════════════════════════════════════════════════╗ │
│  ║ Test 6: DIGITAL ACTION INPUT (Lines 254-293)                  ║ │
│  ║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║ │
│  ║ THIS IS WHERE BUTTON MAPPING IS DEMONSTRATED!                 ║ │
│  ╚═══════════════════════════════════════════════════════════════╝ │
│      │                                                                │
│      ├─ virtualGamepad.pressButton('A', 500)                        │
│      │  • Press PHYSICAL button on controller                       │
│      │                                                                │
│      ├─ getDigitalActionHandle('Jump')                              │
│      │  • Get handle for LOGICAL "Jump" action                      │
│      │  • Not tied to specific button!                              │
│      │                                                                │
│      ├─ getDigitalActionData(handle, jumpActionHandle)              │
│      │  • Read if "Jump" action is pressed                          │
│      │  • Returns: { state: true/false, active: true/false }        │
│      │  • Works regardless of which button user mapped to Jump!     │
│      │                                                                │
│      └─ getStringForDigitalActionName(jumpActionHandle)             │
│         • Get human-readable name: "Jump"                            │
│                                                                       │
│  ╔═══════════════════════════════════════════════════════════════╗ │
│  ║ Test 7: ANALOG ACTION INPUT (Lines 295-337)                   ║ │
│  ║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║ │
│  ║ THIS IS WHERE STICK/TRIGGER MAPPING IS DEMONSTRATED!          ║ │
│  ╚═══════════════════════════════════════════════════════════════╝ │
│      │                                                                │
│      ├─ virtualGamepad.setLeftStick(0.7, 0.5)                       │
│      │  • Move PHYSICAL left stick                                  │
│      │                                                                │
│      ├─ getAnalogActionHandle('Move')                               │
│      │  • Get handle for LOGICAL "Move" action                      │
│      │                                                                │
│      ├─ getAnalogActionData(handle, moveActionHandle)               │
│      │  • Read "Move" action values                                 │
│      │  • Returns: { mode, x, y, active }                           │
│      │  • x, y range from -1.0 to 1.0                               │
│      │  • Works with stick, trackpad, gyro - whatever user mapped!  │
│      │                                                                │
│      └─ getStringForAnalogActionName(moveActionHandle)              │
│         • Get human-readable name: "Move"                            │
│                                                                       │
│  Test 8-11: Glyphs, Motion, Haptics, LED                            │
│  └─ Visual feedback features, not configuration                     │
│                                                                       │
│  ╔═══════════════════════════════════════════════════════════════╗ │
│  ║ Test 12: BINDING UI & SESSION INFO (Lines 500-530)            ║ │
│  ║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║ │
│  ║ THIS IS WHERE USERS CONFIGURE THEIR CONTROLS!                 ║ │
│  ╚═══════════════════════════════════════════════════════════════╝ │
│      │                                                                │
│      ├─ showBindingPanel(handle)                                    │
│      │  • 🎨 OPENS STEAM'S CONFIGURATION UI                         │
│      │  • User can remap EVERYTHING here                            │
│      │  • Adjust sensitivity, dead zones, curves                    │
│      │  • Create mode shifts and layers                             │
│      │  • Enable accessibility features                             │
│      │  • NO CODE NEEDED - Steam does it all!                       │
│      │                                                                │
│      ├─ getDeviceBindingRevision(handle)                            │
│      │  • Get version of current configuration                      │
│      │  • Returns: { major, minor }                                 │
│      │                                                                │
│      ├─ getRemotePlaySessionID(handle)                              │
│      │  • Check if this is Remote Play session                      │
│      │                                                                │
│      └─ getSessionInputConfigurationSettings()                      │
│         • Get current session config                                 │
│                                                                       │
│  Test 13-15: XInput emulation, utility methods, validation          │
│  └─ Technical features, not user-facing configuration               │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Detailed Code Examples from Tests

### Example 1: Switching Control Schemes (Action Sets)

**Location: `tests/ts/test-input.ts` lines 203-251**

```typescript
// Get handles for different control schemes
const menuSetHandle = steam.input.getActionSetHandle('MenuControls');
const gameplaySetHandle = steam.input.getActionSetHandle('GameplayControls');

// Switch to menu controls
steam.input.activateActionSet(testHandle, menuSetHandle);
// Now only menu-related actions are active
// "Move" might control menu navigation
// "Jump" might be "Select"

// Later, switch to gameplay
steam.input.activateActionSet(testHandle, gameplaySetHandle);
// Now gameplay actions are active
// "Move" controls character movement
// "Jump" makes character jump
```

**Why this matters:**
- Same physical buttons do different things in different contexts
- No need to manually track game state
- Steam handles the switching automatically

---

### Example 2: Reading Button Input (Physical → Logical)

**Location: `tests/ts/test-input.ts` lines 254-293**

```typescript
// 1. Press PHYSICAL button (A on Xbox, X on PlayStation, etc.)
await virtualGamepad.pressButton('A', 500);
steam.input.runFrame();

// 2. Get LOGICAL action handle
const jumpActionHandle = steam.input.getDigitalActionHandle('Jump');

// 3. Read LOGICAL action state (not physical button!)
const actionData = steam.input.getDigitalActionData(testHandle, jumpActionHandle);

console.log(`Jump pressed: ${actionData.state}`);  // true or false
console.log(`Jump active: ${actionData.active}`);   // Is action available?

// 4. Use in game
if (actionData.state && actionData.active) {
  player.jump();  // Works regardless of which button was pressed!
}
```

**The Magic:**
```
User presses physical button → Steam Input translates → Your game sees logical action

Xbox user presses "A"           ┐
PlayStation user presses "X"    ├─→ Steam Input ─→ "Jump" action is active
Switch user presses "B"         ┘
Custom mapping user presses "Y" ┘

Your game code NEVER changes!
```

---

### Example 3: Reading Stick Input

**Location: `tests/ts/test-input.ts` lines 295-337**

```typescript
// 1. Move PHYSICAL left stick
virtualGamepad.setLeftStick(0.7, 0.5);  // X=0.7 right, Y=0.5 up
steam.input.runFrame();

// 2. Get LOGICAL move action handle
const moveActionHandle = steam.input.getAnalogActionHandle('Move');

// 3. Read LOGICAL move values
const actionData = steam.input.getAnalogActionData(testHandle, moveActionHandle);

console.log(`Move X: ${actionData.x.toFixed(3)}`);  // 0.700
console.log(`Move Y: ${actionData.y.toFixed(3)}`);  // 0.500
console.log(`Mode: ${actionData.mode}`);            // Joystick mode

// 4. Use in game
if (actionData.active) {
  player.move(actionData.x, actionData.y);
}
```

**User Flexibility:**
- One user maps "Move" to left stick
- Another maps it to WASD keys (with controller emulation)
- Another maps it to gyro (tilt to move)
- Another maps it to right trackpad
- **Your code stays the same!**

---

### Example 4: Opening Configuration UI

**Location: `tests/ts/test-input.ts` lines 500-530**

```typescript
// This single line opens Steam's full configuration interface!
steam.input.showBindingPanel(testHandle);

// User can now:
// ✓ Remap any button to any action
// ✓ Adjust stick sensitivity and dead zones
// ✓ Create "mode shifts" (hold LB to change all buttons)
// ✓ Add action layers (press RB to activate skill menu)
// ✓ Configure gyro aim
// ✓ Set up accessibility features
// ✓ Copy community configurations
// ✓ Share their own configurations

// Get configuration metadata
const revision = steam.input.getDeviceBindingRevision(testHandle);
console.log(`User's config version: v${revision.major}.${revision.minor}`);
```

**What Steam's UI looks like** (user sees this):
```
╔══════════════════════════════════════════════════════════════╗
║              Controller Configuration                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  [Visual Controller Diagram]                                ║
║                                                              ║
║  Actions:                    Current Binding:               ║
║  ├─ Jump                     A Button                      ║
║  ├─ Fire                     Right Trigger                  ║
║  ├─ Reload                   X Button                      ║
║  ├─ Interact                 B Button                      ║
║  ├─ Move                     Left Stick                     ║
║  └─ Camera                   Right Stick                    ║
║                                                              ║
║  [Remap]  [Sensitivity]  [Add Layer]  [Community Configs] ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 🎯 Real Game Flow Example

Here's how it all connects in a real game:

```typescript
// ==========================================
// INITIALIZATION (Once at startup)
// ==========================================
init() {
  steam.input.init();
  
  // Get action handles (cache these!)
  this.jumpAction = steam.input.getDigitalActionHandle('Jump');
  this.fireAction = steam.input.getDigitalActionHandle('Fire');
  this.moveAction = steam.input.getAnalogActionHandle('Move');
  
  // Get action set handles
  this.gameplaySet = steam.input.getActionSetHandle('GameplayControls');
  this.menuSet = steam.input.getActionSetHandle('MenuControls');
  
  // Get controller
  const controllers = steam.input.getConnectedControllers();
  this.controller = controllers[0];
  
  // Start with gameplay controls
  steam.input.activateActionSet(this.controller, this.gameplaySet);
}

// ==========================================
// GAME LOOP (Every frame)
// ==========================================
update() {
  // Update input state every frame
  steam.input.runFrame();
  
  // Read button actions
  const jump = steam.input.getDigitalActionData(this.controller, this.jumpAction);
  if (jump.state) this.player.jump();
  
  const fire = steam.input.getDigitalActionData(this.controller, this.fireAction);
  if (fire.state) this.player.fire();
  
  // Read analog actions
  const move = steam.input.getAnalogActionData(this.controller, this.moveAction);
  if (move.active) {
    this.player.move(move.x, move.y);
  }
}

// ==========================================
// CONTEXT SWITCHING
// ==========================================
openMenu() {
  // Switch to menu controls
  steam.input.activateActionSet(this.controller, this.menuSet);
  // Now "Move" navigates menu, "Jump" selects items
}

closeMenu() {
  // Switch back to gameplay
  steam.input.activateActionSet(this.controller, this.gameplaySet);
  // Now "Move" moves player, "Jump" makes player jump
}

// ==========================================
// SETTINGS MENU
// ==========================================
openControllerSettings() {
  // Let user configure their controls
  steam.input.showBindingPanel(this.controller);
  // Steam handles everything - you don't write any UI code!
}
```

---

## 📊 Summary: Where Configuration Happens

| **What**                     | **Where in Test**  | **Line #**   | **What It Does**                                    |
|------------------------------|--------------------|--------------|----------------------------------------------------|
| **Action Sets**              | Test 5             | 203-251      | Switch between control schemes (menu, gameplay)    |
| **Digital Actions (Buttons)**| Test 6             | 254-293      | Read button state via logical actions              |
| **Analog Actions (Sticks)**  | Test 7             | 295-337      | Read stick/trigger values via logical actions      |
| **User Configuration UI**    | Test 12            | 500-530      | Open Steam's config interface with `showBindingPanel()` |

---

## 🎮 Key Takeaway

**YOU define actions** → **STEAM handles button mapping** → **USERS customize everything**

Your game code NEVER hardcodes physical buttons. You only read logical actions. This makes your game:
- ✅ Work with ANY controller
- ✅ Fully customizable by users
- ✅ Accessible to players with disabilities
- ✅ Future-proof for new controllers
- ✅ Community-friendly (shareable configs)

The tests demonstrate all of this without needing an actual game or action manifest - they show the API calls you'd make in a real game!
