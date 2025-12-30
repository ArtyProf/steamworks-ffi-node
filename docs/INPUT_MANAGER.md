# Steam Input Manager API Documentation

Complete reference for all Steam Input functionality in Steamworks FFI.

## Overview

The `SteamInputManager` provides **100% coverage** of the Steamworks Input API with 35+ functions organized into logical categories. Steam Input provides a unified API for controller support across 300+ devices including Xbox, PlayStation, Nintendo Switch, Steam Controller, Steam Deck, and generic gamepads.

## Quick Reference

| Category | Functions | Description |
|----------|-----------|-------------|
| [Initialization](#initialization) | 3 | Initialize, shutdown, and frame updates |
| [Controller Detection](#controller-detection) | 5 | Find and identify connected controllers |
| [Action Sets](#action-sets) | 6 | Manage action sets and layers |
| [Action Handles](#action-handles) | 4 | Get handles for digital/analog actions |
| [Digital Actions](#digital-actions) | 2 | Read button/digital input states |
| [Analog Actions](#analog-actions) | 3 | Read stick/trigger analog values |
| [Motion Data](#motion-data) | 1 | Read gyro and accelerometer data |
| [Haptics](#haptics) | 4 | Trigger vibration and LED control |
| [Configuration](#configuration) | 4 | Binding UI, device info, remote play |
| [Glyphs](#glyphs) | 3 | Get button icons and labels |

---

## Supported Controllers

| Controller Type | Detection | Digital | Analog | Motion | Rumble | LED |
|----------------|-----------|---------|--------|--------|--------|-----|
| Xbox 360 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Xbox One/Series | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| PS3 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| PS4 (DualShock 4) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PS5 (DualSense) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Switch Pro | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Switch Joy-Cons | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Steam Controller | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Steam Deck | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Lenovo Legion Go | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Generic Gamepad | ✅ | ✅ | ✅ | ❌ | ⚠️ | ❌ |

> **Note:** Lenovo Legion Go controller support was added in Steamworks SDK 1.63. The original Legion Go model has touchpads while newer models may not.

---

## Initialization

Functions for initializing and managing Steam Input system lifecycle.

### `init(explicitCallRunFrame?)`

Initialize the Steam Input API and start detecting controllers.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_Init()` - Initialize Steam Input system

**Parameters:**
- `explicitCallRunFrame?: boolean` - If `true`, you must call `runFrame()` manually. If `false` (default), Steam calls it automatically.

**Returns:** `boolean` - `true` if initialization succeeded

**Example:**
```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();

// Initialize Steam API first
if (!steam.init({ appId: 480 })) {
  console.error('Failed to initialize Steam');
  process.exit(1);
}

// Initialize Steam Input
if (!steam.input.init()) {
  console.error('Failed to initialize Steam Input');
  process.exit(1);
}

console.log('✅ Steam Input initialized');
```

**Notes:**
- Must be called after `steam.init()`
- Call once at game startup
- Use `explicitCallRunFrame: true` for manual frame control
- Default behavior handles frame updates automatically

---

### `shutdown()`

Shutdown the Steam Input API and release all resources.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_Shutdown()` - Shutdown Steam Input system

**Returns:** `boolean` - `true` if shutdown succeeded

**Example:**
```typescript
// Stop all rumble before shutdown
controllers.forEach(handle => {
  steam.input.triggerVibration(handle, 0, 0);
});

// Clean shutdown
if (steam.input.shutdown()) {
  console.log('✅ Steam Input shutdown complete');
}

steam.shutdown();
```

**Notes:**
- Call before `steam.shutdown()`
- Stops all vibration
- Releases controller handles
- Should be called at game exit

---

### `runFrame()`

Update Steam Input state for the current frame.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_RunFrame()` - Update controller states

**Returns:** `void`

**Example:**
```typescript
// Game loop
function gameLoop() {
  // Update input state every frame
  steam.input.runFrame();
  
  // Read controller input
  const controllers = steam.input.getConnectedControllers();
  
  controllers.forEach(handle => {
    const jumpHandle = steam.input.getDigitalActionHandle('Jump');
    const jumpData = steam.input.getDigitalActionData(handle, jumpHandle);
    
    if (jumpData.state && jumpData.active) {
      player.jump();
    }
  });
  
  requestAnimationFrame(gameLoop);
}

gameLoop();
```

**Notes:**
- **Must be called every frame** for input to update
- Call at the start of your game loop
- Not needed if `init()` was called with `explicitCallRunFrame: false`
- Processes controller connections/disconnections

---

## Controller Detection

Functions for detecting and identifying connected controllers.

### `getConnectedControllers()`

Get array of all currently connected controller handles.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetConnectedControllers()` - Get controller handles

**Returns:** `bigint[]` - Array of controller handles (empty if none connected)

**Example:**
```typescript
steam.input.runFrame();

const controllers = steam.input.getConnectedControllers();

console.log(`Found ${controllers.length} controller(s)`);

controllers.forEach((handle, index) => {
  const info = steam.input.getControllerInfo(handle);
  console.log(`Controller ${index + 1}: ${info.typeName}`);
});
```

**Notes:**
- Returns empty array if no controllers connected
- Handles are 64-bit integers (bigint)
- Call `runFrame()` before to ensure up-to-date state
- Automatically detects hot-plugging

---

### `getInputTypeForHandle(handle)`

Get the controller type for a specific handle.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetInputTypeForHandle()` - Get device type

**Parameters:**
- `handle: bigint` - Controller handle from `getConnectedControllers()`

**Returns:** `SteamInputType` - Controller type enum value

**Type:**
```typescript
enum SteamInputType {
  Unknown = 0,
  SteamController = 1,
  XBox360Controller = 2,
  XBoxOneController = 3,
  GenericGamepad = 4,
  PS4Controller = 5,
  AppleMFiController = 6,
  AndroidController = 7,
  SwitchJoyConPair = 8,
  SwitchJoyConSingle = 9,
  SwitchProController = 10,
  MobileTouch = 11,
  PS3Controller = 12,
  PS5Controller = 13,
  SteamDeckController = 14,
  Count = 15,
  MaximumPossibleValue = 255
}
```

**Example:**
```typescript
import { SteamInputType } from 'steamworks-ffi-node';

const controllers = steam.input.getConnectedControllers();

if (controllers.length > 0) {
  const handle = controllers[0];
  const type = steam.input.getInputTypeForHandle(handle);
  
  switch (type) {
    case SteamInputType.XBox360Controller:
      console.log('Xbox 360 controller detected');
      break;
    case SteamInputType.PS4Controller:
      console.log('DualShock 4 detected');
      break;
    case SteamInputType.PS5Controller:
      console.log('DualSense detected');
      break;
    case SteamInputType.SteamDeckController:
      console.log('Steam Deck controls detected');
      break;
    default:
      console.log(`Controller type: ${type}`);
  }
}
```

---

### `getControllerInfo(handle)`

Get detailed information about a controller.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetInputTypeForHandle()` - Get device type
- Helper function to format type name

**Parameters:**
- `handle: bigint` - Controller handle

**Returns:** `ControllerInfo`

**Type:**
```typescript
interface ControllerInfo {
  handle: bigint;           // Controller handle
  type: SteamInputType;     // Type enum value
  typeName: string;         // Human-readable type name
  gamepadIndex: number;     // XInput index (-1 if not XInput device)
}
```

**Example:**
```typescript
const controllers = steam.input.getConnectedControllers();

controllers.forEach((handle, index) => {
  const info = steam.input.getControllerInfo(handle);
  
  console.log(`\nController ${index + 1}:`);
  console.log(`  Type: ${info.typeName}`);
  console.log(`  Handle: ${info.handle}`);
  console.log(`  Type ID: ${info.type}`);
  console.log(`  XInput Index: ${info.gamepadIndex >= 0 ? info.gamepadIndex : 'N/A'}`);
});
```

---

### `getGamepadIndexForController(handle)`

Get the XInput gamepad index for a controller.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetGamepadIndexForController()` - Get XInput index

**Parameters:**
- `handle: bigint` - Controller handle

**Returns:** `number` - XInput index (0-3), or -1 if not an XInput device

**Example:**
```typescript
const handle = controllers[0];
const gamepadIndex = steam.input.getGamepadIndexForController(handle);

if (gamepadIndex >= 0) {
  console.log(`This is XInput controller #${gamepadIndex}`);
} else {
  console.log('Not an XInput device');
}
```

---

### `getControllerForGamepadIndex(index)`

Get the Steam Input handle for an XInput gamepad index.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetControllerForGamepadIndex()` - Get handle from XInput index

**Parameters:**
- `index: number` - XInput gamepad index (0-3)

**Returns:** `bigint` - Controller handle, or 0n if not found

**Example:**
```typescript
// Get Steam Input handle for XInput controller 0
const handle = steam.input.getControllerForGamepadIndex(0);

if (handle !== 0n) {
  console.log('Found Steam Input handle for XInput gamepad 0');
  const info = steam.input.getControllerInfo(handle);
  console.log(`Type: ${info.typeName}`);
} else {
  console.log('No XInput controller at index 0');
}
```

**Notes:**
- Only works for XInput-compatible controllers (Xbox, generic gamepads)
- Returns 0n if no controller at that index
- Useful for bridging XInput and Steam Input APIs

---

## Action Sets

Functions for managing action sets and action layers.

**Action Sets** define groups of actions for different game states (menu, gameplay, driving, etc.). Steam Input uses an action-based system instead of reading buttons directly - this allows players to customize controls without changing your code!

### `getActionSetHandle(actionSetName)`

Get a handle for an action set by name.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetActionSetHandle()` - Get action set handle

**Parameters:**
- `actionSetName: string` - Name of the action set from your input_actions.vdf file

**Returns:** `bigint` - Action set handle (0n if not found)

**Example:**
```typescript
// Cache action set handles at startup (don't query every frame!)
const menuSet = steam.input.getActionSetHandle('MenuControls');
const gameplaySet = steam.input.getActionSetHandle('GameplayControls');
const drivingSet = steam.input.getActionSetHandle('DrivingControls');

if (menuSet === 0n) {
  console.error('MenuControls action set not found in input_actions.vdf');
}
```

**Notes:**
- Names must match those in your input_actions.vdf file
- Cache handles at startup (don't query every frame)
- Returns 0n if action set doesn't exist
- Case-sensitive

---

### `activateActionSet(controllerHandle, actionSetHandle)`

Activate an action set for a controller.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_ActivateActionSet()` - Activate action set

**Parameters:**
- `controllerHandle: bigint` - Controller handle
- `actionSetHandle: bigint` - Action set handle from `getActionSetHandle()`

**Returns:** `void`

**Example:**
```typescript
const controllers = steam.input.getConnectedControllers();
const gameplaySet = steam.input.getActionSetHandle('GameplayControls');

// Activate gameplay controls for all controllers
controllers.forEach(handle => {
  steam.input.activateActionSet(handle, gameplaySet);
});

// Switch to menu controls
function openMenu() {
  const menuSet = steam.input.getActionSetHandle('MenuControls');
  controllers.forEach(handle => {
    steam.input.activateActionSet(handle, menuSet);
  });
}
```

**Notes:**
- Only one action set can be active at a time per controller
- Activating a new set deactivates the previous one
- Action layers stack on top of the active set

---

### `getCurrentActionSet(controllerHandle)`

Get the currently active action set for a controller.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetCurrentActionSet()` - Get active action set handle

**Parameters:**
- `controllerHandle: bigint` - Controller handle

**Returns:** `bigint` - Currently active action set handle

**Example:**
```typescript
const handle = controllers[0];
const currentSet = steam.input.getCurrentActionSet(handle);
const gameplaySet = steam.input.getActionSetHandle('GameplayControls');

if (currentSet === gameplaySet) {
  console.log('Gameplay controls are active');
} else {
  console.log('Different action set active');
}
```

---

### `activateActionSetLayer(controllerHandle, actionSetLayerHandle)`

Activate an action set layer for a controller.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_ActivateActionSetLayer()` - Activate action layer

**Parameters:**
- `controllerHandle: bigint` - Controller handle
- `actionSetLayerHandle: bigint` - Action set layer handle

**Returns:** `void`

**Example:**
```typescript
// Add aim layer when aiming down sights
const aimLayer = steam.input.getActionSetHandle('AimLayer');

function startAiming(handle: bigint) {
  steam.input.activateActionSetLayer(handle, aimLayer);
  console.log('Aim layer activated - reduced sensitivity');
}

function stopAiming(handle: bigint) {
  steam.input.deactivateActionSetLayer(handle, aimLayer);
  console.log('Aim layer deactivated');
}
```

**Notes:**
- Layers stack on top of the active action set
- Multiple layers can be active simultaneously
- Layers override actions from the base set

---

### `deactivateActionSetLayer(controllerHandle, actionSetLayerHandle)`

Deactivate an action set layer for a controller.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_DeactivateActionSetLayer()` - Deactivate action layer

**Parameters:**
- `controllerHandle: bigint` - Controller handle
- `actionSetLayerHandle: bigint` - Action set layer handle to deactivate

**Returns:** `void`

**Example:**
```typescript
const inventoryLayer = steam.input.getActionSetHandle('InventoryLayer');

// Deactivate when closing inventory
steam.input.deactivateActionSetLayer(controllerHandle, inventoryLayer);
```

---

### `deactivateAllActionSetLayers(controllerHandle)`

Deactivate all action set layers for a controller.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_DeactivateAllActionSetLayers()` - Deactivate all layers

**Parameters:**
- `controllerHandle: bigint` - Controller handle

**Returns:** `void`

**Example:**
```typescript
// Reset to base action set (no layers)
steam.input.deactivateAllActionSetLayers(controllerHandle);
console.log('All layers deactivated');
```

---

### `getActiveActionSetLayers(controllerHandle)`

Get all currently active action set layers for a controller.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetActiveActionSetLayers()` - Get active layer handles

**Parameters:**
- `controllerHandle: bigint` - Controller handle

**Returns:** `bigint[]` - Array of active action set layer handles

**Example:**
```typescript
const activeLayers = steam.input.getActiveActionSetLayers(controllerHandle);

console.log(`${activeLayers.length} active layer(s)`);

activeLayers.forEach(layerHandle => {
  console.log(`Layer handle: ${layerHandle}`);
});
```

---

## Action Handles

Functions for getting action handles by name.

### `getDigitalActionHandle(actionName)`

Get a handle for a digital action (button) by name.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetDigitalActionHandle()` - Get digital action handle

**Parameters:**
- `actionName: string` - Name of the digital action from input_actions.vdf

**Returns:** `bigint` - Digital action handle (0n if not found)

**Example:**
```typescript
// Cache action handles at startup
const jumpHandle = steam.input.getDigitalActionHandle('Jump');
const shootHandle = steam.input.getDigitalActionHandle('Fire');
const interactHandle = steam.input.getDigitalActionHandle('Interact');

if (jumpHandle === 0n) {
  console.error('Jump action not found in input_actions.vdf');
}
```

**Notes:**
- Names must match those in your input_actions.vdf file
- Cache handles at startup (don't query every frame)
- Returns 0n if action doesn't exist
- Case-sensitive

---

### `getAnalogActionHandle(actionName)`

Get a handle for an analog action (stick/trigger) by name.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetAnalogActionHandle()` - Get analog action handle

**Parameters:**
- `actionName: string` - Name of the analog action from input_actions.vdf

**Returns:** `bigint` - Analog action handle (0n if not found)

**Example:**
```typescript
// Cache action handles at startup
const moveHandle = steam.input.getAnalogActionHandle('Move');
const cameraHandle = steam.input.getAnalogActionHandle('Camera');
const aimHandle = steam.input.getAnalogActionHandle('Aim');

if (moveHandle === 0n) {
  console.error('Move action not found in input_actions.vdf');
}
```

---

### `getStringForDigitalActionName(digitalActionHandle)`

Get the string name for a digital action handle.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetStringForDigitalActionName()` - Get action name

**Parameters:**
- `digitalActionHandle: bigint` - Digital action handle

**Returns:** `string` - Action name, or empty string if invalid

**Example:**
```typescript
const jumpHandle = steam.input.getDigitalActionHandle('Jump');
const name = steam.input.getStringForDigitalActionName(jumpHandle);

console.log(`Action name: ${name}`); // "Jump"
```

---

### `getStringForAnalogActionName(analogActionHandle)`

Get the string name for an analog action handle.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetStringForAnalogActionName()` - Get action name

**Parameters:**
- `analogActionHandle: bigint` - Analog action handle

**Returns:** `string` - Action name, or empty string if invalid

**Example:**
```typescript
const moveHandle = steam.input.getAnalogActionHandle('Move');
const name = steam.input.getStringForAnalogActionName(moveHandle);

console.log(`Action name: ${name}`); // "Move"
```

---

## Digital Actions

Functions for reading digital action (button) states.

### `getDigitalActionData(controllerHandle, digitalActionHandle)`

Read the current state of a digital action.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetDigitalActionData()` - Get digital action state

**Parameters:**
- `controllerHandle: bigint` - Controller handle
- `digitalActionHandle: bigint` - Digital action handle from `getDigitalActionHandle()`

**Returns:** `DigitalActionData`

**Type:**
```typescript
interface DigitalActionData {
  state: boolean;  // true if button is pressed
  active: boolean; // true if action is available in current action set
}
```

**Example:**
```typescript
const jumpHandle = steam.input.getDigitalActionHandle('Jump');
const shootHandle = steam.input.getDigitalActionHandle('Fire');

function update() {
  steam.input.runFrame();
  
  controllers.forEach(handle => {
    // Check jump
    const jumpData = steam.input.getDigitalActionData(handle, jumpHandle);
    if (jumpData.state && jumpData.active) {
      player.jump();
    }
    
    // Check shoot
    const shootData = steam.input.getDigitalActionData(handle, shootHandle);
    if (shootData.state && shootData.active) {
      player.shoot();
    }
  });
}
```

**Notes:**
- Check both `state` and `active` before acting on input
- `active` is false if action not in current action set
- Call `runFrame()` before reading for up-to-date state

---

### `getDigitalActionOrigins(controllerHandle, actionSetHandle, digitalActionHandle)`

Get the physical inputs (origins) bound to a digital action.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetDigitalActionOrigins()` - Get action origins

**Parameters:**
- `controllerHandle: bigint` - Controller handle
- `actionSetHandle: bigint` - Action set handle
- `digitalActionHandle: bigint` - Digital action handle

**Returns:** `number[]` - Array of origin IDs

**Example:**
```typescript
const jumpHandle = steam.input.getDigitalActionHandle('Jump');
const actionSet = steam.input.getCurrentActionSet(controllerHandle);

const origins = steam.input.getDigitalActionOrigins(
  controllerHandle,
  actionSet,
  jumpHandle
);

console.log(`Jump is bound to ${origins.length} input(s)`);
```

---

## Analog Actions

Functions for reading analog action (stick/trigger) states.

### `getAnalogActionData(controllerHandle, analogActionHandle)`

Read the current state of an analog action.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetAnalogActionData()` - Get analog action state

**Parameters:**
- `controllerHandle: bigint` - Controller handle
- `analogActionHandle: bigint` - Analog action handle from `getAnalogActionHandle()`

**Returns:** `AnalogActionData`

**Type:**
```typescript
interface AnalogActionData {
  mode: number;    // Input mode
  x: number;       // X axis value (-1.0 to 1.0)
  y: number;       // Y axis value (-1.0 to 1.0)
  active: boolean; // true if action is available
}
```

**Example:**
```typescript
const moveHandle = steam.input.getAnalogActionHandle('Move');
const cameraHandle = steam.input.getAnalogActionHandle('Camera');

function update() {
  steam.input.runFrame();
  
  controllers.forEach(handle => {
    // Movement
    const moveData = steam.input.getAnalogActionData(handle, moveHandle);
    if (moveData.active) {
      player.move(moveData.x, moveData.y);
      console.log(`Move: X=${moveData.x.toFixed(2)}, Y=${moveData.y.toFixed(2)}`);
    }
    
    // Camera
    const cameraData = steam.input.getAnalogActionData(handle, cameraHandle);
    if (cameraData.active) {
      camera.rotate(cameraData.x, cameraData.y);
    }
  });
}
```

**Notes:**
- Values range from -1.0 to 1.0
- Check `active` before using values
- Call `runFrame()` before reading for up-to-date state

---

### `getAnalogActionOrigins(controllerHandle, actionSetHandle, analogActionHandle)`

Get the physical inputs (origins) bound to an analog action.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetAnalogActionOrigins()` - Get action origins

**Parameters:**
- `controllerHandle: bigint` - Controller handle
- `actionSetHandle: bigint` - Action set handle
- `analogActionHandle: bigint` - Analog action handle

**Returns:** `number[]` - Array of origin IDs

**Example:**
```typescript
const moveHandle = steam.input.getAnalogActionHandle('Move');
const actionSet = steam.input.getCurrentActionSet(controllerHandle);

const origins = steam.input.getAnalogActionOrigins(
  controllerHandle,
  actionSet,
  moveHandle
);

console.log(`Move is bound to ${origins.length} input(s)`);
```

---

### `stopAnalogActionMomentum(controllerHandle, analogActionHandle)`

Stop momentum/smoothing for an analog action.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_StopAnalogActionMomentum()` - Stop momentum

**Parameters:**
- `controllerHandle: bigint` - Controller handle
- `analogActionHandle: bigint` - Analog action handle

**Returns:** `void`

**Example:**
```typescript
const cameraHandle = steam.input.getAnalogActionHandle('Camera');

// Stop camera momentum when player pauses
function onPause() {
  controllers.forEach(handle => {
    steam.input.stopAnalogActionMomentum(handle, cameraHandle);
  });
}
```

---

## Motion Data

Functions for reading motion sensor data (gyro/accelerometer).

### `getMotionData(controllerHandle)`

Get motion sensor data from a controller.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetMotionData()` - Get motion sensor data

**Parameters:**
- `controllerHandle: bigint` - Controller handle

**Returns:** `MotionData | null` - Motion data, or null if not supported

**Type:**
```typescript
interface MotionData {
  rotQuatX: number;    // Rotation quaternion X
  rotQuatY: number;    // Rotation quaternion Y
  rotQuatZ: number;    // Rotation quaternion Z
  rotQuatW: number;    // Rotation quaternion W
  posAccelX: number;   // Positional acceleration X (m/s²)
  posAccelY: number;   // Positional acceleration Y (m/s²)
  posAccelZ: number;   // Positional acceleration Z (m/s²)
  rotVelX: number;     // Rotational velocity X (rad/s)
  rotVelY: number;     // Rotational velocity Y (rad/s)
  rotVelZ: number;     // Rotational velocity Z (rad/s)
}
```

**Example:**
```typescript
function update() {
  steam.input.runFrame();
  
  const motion = steam.input.getMotionData(controllerHandle);
  
  if (motion) {
    // Use gyro for camera control
    camera.rotateByGyro(motion.rotVelX, motion.rotVelY, motion.rotVelZ);
    
    // Detect shake gesture
    const acceleration = Math.sqrt(
      motion.posAccelX ** 2 + 
      motion.posAccelY ** 2 + 
      motion.posAccelZ ** 2
    );
    
    if (acceleration > 2.5) {
      console.log('Controller shaken!');
      player.performShakeAction();
    }
  }
}
```

**Notes:**
- Returns null if controller doesn't support motion
- Supported on PS4, PS5, Switch Pro, Joy-Cons, Steam Controller
- Rotation velocity in radians per second
- Acceleration in meters per second squared

---

## Haptics

Functions for haptic feedback (rumble, vibration, LED control).

### `triggerVibration(controllerHandle, leftMotorSpeed, rightMotorSpeed)`

Trigger basic rumble vibration on a controller.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_TriggerVibration()` - Trigger vibration

**Parameters:**
- `controllerHandle: bigint` - Controller handle
- `leftMotorSpeed: number` - Left motor intensity (0-65535)
- `rightMotorSpeed: number` - Right motor intensity (0-65535)

**Returns:** `void`

**Example:**
```typescript
// Light rumble
steam.input.triggerVibration(controllerHandle, 10000, 10000);

// Strong rumble
steam.input.triggerVibration(controllerHandle, 65535, 65535);

// Stop rumble
steam.input.triggerVibration(controllerHandle, 0, 0);

// Damage feedback
function playDamageRumble(handle: bigint) {
  steam.input.triggerVibration(handle, 50000, 50000);
  setTimeout(() => {
    steam.input.triggerVibration(handle, 0, 0);
  }, 200);
}
```

**Notes:**
- Values range from 0 (off) to 65535 (maximum)
- Call with 0, 0 to stop vibration
- Remember to stop rumble before shutdown

---

### `triggerVibrationExtended(controllerHandle, leftMotor, rightMotor, leftTrigger, rightTrigger)`

Trigger extended vibration including trigger motors (Xbox controllers).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_TriggerVibrationExtended()` - Trigger extended vibration

**Parameters:**
- `controllerHandle: bigint` - Controller handle
- `leftMotor: number` - Left motor intensity (0-65535)
- `rightMotor: number` - Right motor intensity (0-65535)
- `leftTrigger: number` - Left trigger motor intensity (0-65535)
- `rightTrigger: number` - Right trigger motor intensity (0-65535)

**Returns:** `void`

**Example:**
```typescript
// Rumble with trigger motors (Xbox controllers)
steam.input.triggerVibrationExtended(
  controllerHandle,
  20000, // left motor
  20000, // right motor
  40000, // left trigger
  40000  // right trigger
);

// Shooting feedback (only right trigger)
steam.input.triggerVibrationExtended(controllerHandle, 0, 0, 0, 50000);
setTimeout(() => {
  steam.input.triggerVibrationExtended(controllerHandle, 0, 0, 0, 0);
}, 100);
```

**Notes:**
- Trigger motors only available on some Xbox controllers
- Falls back to main motors if not supported

---

### `triggerSimpleHapticEvent(controllerHandle, hapticLocation, intensity, gainDB, otherIntensity, otherGainDB)`

Trigger a simple haptic event.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_TriggerSimpleHapticEvent()` - Trigger haptic event

**Parameters:**
- `controllerHandle: bigint` - Controller handle
- `hapticLocation: ControllerHapticLocation` - Which haptic to trigger
- `intensity: number` - Intensity (0-255)
- `gainDB: number` - Gain in decibels (0-255)
- `otherIntensity: number` - Other side intensity (0-255)
- `otherGainDB: number` - Other side gain (0-255)

**Type:**
```typescript
enum ControllerHapticLocation {
  Left = 1,
  Right = 2,
  Both = 3
}
```

**Returns:** `void`

**Example:**
```typescript
import { ControllerHapticLocation } from 'steamworks-ffi-node';

// Left haptic
steam.input.triggerSimpleHapticEvent(
  controllerHandle,
  ControllerHapticLocation.Left,
  100, // intensity
  50,  // gain
  100, // other intensity
  50   // other gain
);
```

---

### `setLEDColor(controllerHandle, red, green, blue, flags)`

Set LED color on controllers that support it (PS4/PS5).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_SetLEDColor()` - Set LED color

**Parameters:**
- `controllerHandle: bigint` - Controller handle
- `red: number` - Red component (0-255)
- `green: number` - Green component (0-255)
- `blue: number` - Blue component (0-255)
- `flags: number` - Flags (0 = set color, 1 = restore default)

**Returns:** `void`

**Example:**
```typescript
import { SteamInputType } from 'steamworks-ffi-node';

const type = steam.input.getInputTypeForHandle(controllerHandle);

if (type === SteamInputType.PS4Controller || 
    type === SteamInputType.PS5Controller) {
  
  // Set color based on health
  const health = player.getHealth();
  
  if (health > 70) {
    steam.input.setLEDColor(controllerHandle, 0, 255, 0, 0); // Green
  } else if (health > 30) {
    steam.input.setLEDColor(controllerHandle, 255, 255, 0, 0); // Yellow
  } else {
    steam.input.setLEDColor(controllerHandle, 255, 0, 0, 0); // Red
  }
  
  // Restore default on cleanup
  steam.input.setLEDColor(controllerHandle, 0, 0, 0, 1);
}
```

**Notes:**
- Only works on PS4 and PS5 controllers
- Use flags=1 to restore default color
- Remember to restore default before shutdown

---

## Configuration

Functions for controller configuration and device information.

### `showBindingPanel(controllerHandle)`

Show the controller binding configuration UI.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_ShowBindingPanel()` - Show binding UI

**Parameters:**
- `controllerHandle: bigint` - Controller handle

**Returns:** `boolean` - `true` if UI was shown

**Example:**
```typescript
// Add to options menu
function openControllerConfig() {
  const controllers = steam.input.getConnectedControllers();
  
  if (controllers.length > 0) {
    const success = steam.input.showBindingPanel(controllers[0]);
    
    if (success) {
      console.log('Controller configuration opened');
    } else {
      console.log('Failed to open configuration');
    }
  } else {
    console.log('No controller connected');
  }
}
```

**Notes:**
- Opens Steam's controller configuration overlay
- Players can rebind all actions
- Returns immediately (non-blocking)

---

### `getDeviceBindingRevision(controllerHandle)`

Get the binding configuration version for a controller.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetDeviceBindingRevision()` - Get binding version

**Parameters:**
- `controllerHandle: bigint` - Controller handle

**Returns:** `{ major: number; minor: number; } | null` - Version info, or null if unavailable

**Example:**
```typescript
const revision = steam.input.getDeviceBindingRevision(controllerHandle);

if (revision) {
  console.log(`Binding version: ${revision.major}.${revision.minor}`);
} else {
  console.log('No binding revision available');
}
```

---

### `getRemotePlaySessionID(controllerHandle)`

Get the Remote Play session ID for a controller.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetRemotePlaySessionID()` - Get session ID

**Parameters:**
- `controllerHandle: bigint` - Controller handle

**Returns:** `number` - Session ID (0 if not in Remote Play)

**Example:**
```typescript
const sessionID = steam.input.getRemotePlaySessionID(controllerHandle);

if (sessionID > 0) {
  console.log(`Remote Play session: ${sessionID}`);
} else {
  console.log('Local controller (not Remote Play)');
}
```

---

### `getSessionInputConfigurationSettings()`

Get session-wide input configuration settings.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetSessionInputConfigurationSettings()` - Get settings

**Returns:** `number` - Configuration settings flags

**Example:**
```typescript
const settings = steam.input.getSessionInputConfigurationSettings();

console.log(`Session configuration: ${settings}`);
```

---

## Glyphs

Functions for getting button glyphs (icons) and labels.

### `getGlyphPNGForActionOrigin(origin, size, flags)`

Get the file path to a PNG glyph for an action origin.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetGlyphPNGForActionOrigin()` - Get PNG path

**Parameters:**
- `origin: number` - Action origin ID
- `size: SteamInputGlyphSize` - Size of the glyph
- `flags: number` - Flags (0 for default)

**Type:**
```typescript
enum SteamInputGlyphSize {
  Small = 0,
  Medium = 1,
  Large = 2,
  Count = 3
}
```

**Returns:** `string` - File path to PNG, or empty string if unavailable

**Example:**
```typescript
import { SteamInputGlyphSize } from 'steamworks-ffi-node';

const jumpHandle = steam.input.getDigitalActionHandle('Jump');
const actionSet = steam.input.getCurrentActionSet(controllerHandle);
const origins = steam.input.getDigitalActionOrigins(
  controllerHandle,
  actionSet,
  jumpHandle
);

if (origins.length > 0) {
  const pngPath = steam.input.getGlyphPNGForActionOrigin(
    origins[0],
    SteamInputGlyphSize.Medium,
    0
  );
  
  console.log(`Button icon: ${pngPath}`);
  // Display this PNG in your UI
}
```

---

### `getGlyphSVGForActionOrigin(origin, flags)`

Get the file path to an SVG glyph for an action origin.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetGlyphSVGForActionOrigin()` - Get SVG path

**Parameters:**
- `origin: number` - Action origin ID
- `flags: number` - Flags (0 for default)

**Returns:** `string` - File path to SVG, or empty string if unavailable

**Example:**
```typescript
const origins = steam.input.getDigitalActionOrigins(
  controllerHandle,
  actionSet,
  jumpHandle
);

if (origins.length > 0) {
  const svgPath = steam.input.getGlyphSVGForActionOrigin(origins[0], 0);
  console.log(`Button icon (SVG): ${svgPath}`);
}
```

---

### `getStringForActionOrigin(origin)`

Get a localized string label for an action origin.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamInput_GetStringForActionOrigin()` - Get origin string

**Parameters:**
- `origin: number` - Action origin ID

**Returns:** `string` - Localized label (e.g., "A Button", "Cross"), or empty string

**Example:**
```typescript
const origins = steam.input.getDigitalActionOrigins(
  controllerHandle,
  actionSet,
  jumpHandle
);

if (origins.length > 0) {
  const label = steam.input.getStringForActionOrigin(origins[0]);
  console.log(`Press ${label} to jump`);
  // Output: "Press A Button to jump" (Xbox)
  // Output: "Press Cross to jump" (PlayStation)
}
```

---

## Type Definitions

Complete TypeScript type definitions for Steam Input.

### Enums

```typescript
enum SteamInputType {
  Unknown = 0,
  SteamController = 1,
  XBox360Controller = 2,
  XBoxOneController = 3,
  GenericGamepad = 4,
  PS4Controller = 5,
  AppleMFiController = 6,
  AndroidController = 7,
  SwitchJoyConPair = 8,
  SwitchJoyConSingle = 9,
  SwitchProController = 10,
  MobileTouch = 11,
  PS3Controller = 12,
  PS5Controller = 13,
  SteamDeckController = 14,
  Count = 15,
  MaximumPossibleValue = 255
}

enum SteamInputGlyphSize {
  Small = 0,
  Medium = 1,
  Large = 2,
  Count = 3
}

enum ControllerHapticLocation {
  Left = 1,
  Right = 2,
  Both = 3
}
```

### Interfaces

```typescript
interface ControllerInfo {
  handle: bigint;
  type: SteamInputType;
  typeName: string;
  gamepadIndex: number;
}

interface DigitalActionData {
  state: boolean;
  active: boolean;
}

interface AnalogActionData {
  mode: number;
  x: number;
  y: number;
  active: boolean;
}

interface MotionData {
  rotQuatX: number;
  rotQuatY: number;
  rotQuatZ: number;
  rotQuatW: number;
  posAccelX: number;
  posAccelY: number;
  posAccelZ: number;
  rotVelX: number;
  rotVelY: number;
  rotVelZ: number;
}
```

---

## Complete Examples

### Example 1: Basic Game Input

```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();

// Initialize
steam.init({ appId: 480 });
steam.input.init();

// Cache action handles
const gameplaySet = steam.input.getActionSetHandle('GameplayControls');
const jumpHandle = steam.input.getDigitalActionHandle('Jump');
const moveHandle = steam.input.getAnalogActionHandle('Move');
const cameraHandle = steam.input.getAnalogActionHandle('Camera');

// Game loop
function gameLoop() {
  steam.input.runFrame();
  
  const controllers = steam.input.getConnectedControllers();
  
  controllers.forEach(handle => {
    // Activate gameplay controls
    steam.input.activateActionSet(handle, gameplaySet);
    
    // Jump button
    const jump = steam.input.getDigitalActionData(handle, jumpHandle);
    if (jump.state && jump.active) {
      player.jump();
    }
    
    // Movement stick
    const move = steam.input.getAnalogActionData(handle, moveHandle);
    if (move.active) {
      player.move(move.x, move.y);
    }
    
    // Camera stick
    const camera = steam.input.getAnalogActionData(handle, cameraHandle);
    if (camera.active) {
      player.lookAround(camera.x, camera.y);
    }
  });
  
  requestAnimationFrame(gameLoop);
}

gameLoop();

// Cleanup
process.on('exit', () => {
  steam.input.shutdown();
  steam.shutdown();
});
```

### Example 2: Multi-Controller Support

```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();

class Player {
  constructor(public controllerHandle: bigint, public id: number) {}
}

const players: Player[] = [];

// Initialize
steam.init({ appId: 480 });
steam.input.init();

// Cache action handles
const gameplaySet = steam.input.getActionSetHandle('GameplayControls');
const jumpHandle = steam.input.getDigitalActionHandle('Jump');
const moveHandle = steam.input.getAnalogActionHandle('Move');

function updatePlayers() {
  steam.input.runFrame();
  
  const controllers = steam.input.getConnectedControllers();
  
  // Add new players
  controllers.forEach((handle, index) => {
    if (!players.find(p => p.controllerHandle === handle)) {
      players.push(new Player(handle, index));
      console.log(`Player ${index + 1} joined`);
    }
  });
  
  // Remove disconnected players
  players.forEach((player, index) => {
    if (!controllers.includes(player.controllerHandle)) {
      console.log(`Player ${player.id + 1} left`);
      players.splice(index, 1);
    }
  });
  
  // Update each player
  players.forEach(player => {
    steam.input.activateActionSet(player.controllerHandle, gameplaySet);
    
    const jump = steam.input.getDigitalActionData(player.controllerHandle, jumpHandle);
    if (jump.state && jump.active) {
      console.log(`Player ${player.id + 1} jumped`);
    }
    
    const move = steam.input.getAnalogActionData(player.controllerHandle, moveHandle);
    if (move.active && (Math.abs(move.x) > 0.1 || Math.abs(move.y) > 0.1)) {
      console.log(`Player ${player.id + 1} moving: (${move.x.toFixed(2)}, ${move.y.toFixed(2)})`);
    }
  });
}

setInterval(updatePlayers, 16); // 60 FPS
```

### Example 3: Motion Controls

```typescript
import SteamworksSDK, { SteamInputType } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();

steam.init({ appId: 480 });
steam.input.init();

function updateMotion() {
  steam.input.runFrame();
  
  const controllers = steam.input.getConnectedControllers();
  
  controllers.forEach(handle => {
    const type = steam.input.getInputTypeForHandle(handle);
    
    // Check if controller supports motion
    if (type === SteamInputType.PS4Controller ||
        type === SteamInputType.PS5Controller ||
        type === SteamInputType.SwitchProController) {
      
      const motion = steam.input.getMotionData(handle);
      
      if (motion) {
        // Use for aiming
        camera.rotateByGyro(
          motion.rotVelX * 0.5,
          motion.rotVelY * 0.5,
          motion.rotVelZ * 0.5
        );
        
        // Detect shake
        const accel = Math.sqrt(
          motion.posAccelX ** 2 +
          motion.posAccelY ** 2 +
          motion.posAccelZ ** 2
        );
        
        if (accel > 3.0) {
          console.log('Shake detected!');
          player.reloadWeapon();
        }
      }
    }
  });
}

setInterval(updateMotion, 16);
```

---

## Best Practices

### ✅ Do

- **Cache action handles at startup** - Don't call `getDigitalActionHandle()` every frame
- **Call `runFrame()` every frame** - Required for input to update
- **Check `active` flag** - Before reading input data
- **Support hot-plugging** - Handle controllers connecting/disconnecting
- **Use action sets** - For different game states (menu vs gameplay)
- **Provide configuration UI** - Via `showBindingPanel()`
- **Stop rumble on cleanup** - Call `triggerVibration(handle, 0, 0)` before shutdown
- **Test with multiple controller types** - Xbox, PlayStation, Switch, etc.

### ❌ Don't

- Don't query action handles every frame - cache them at startup
- Don't forget to call `runFrame()` each update
- Don't assume specific button layouts - use action-based system
- Don't hardcode button names in UI - use glyphs and origin strings
- Don't leave rumble running - stop it explicitly
- Don't assume controllers stay connected - check each frame
- Don't forget to call `shutdown()` on exit

### Example: Proper Initialization

```typescript
class GameInput {
  private controllers: bigint[] = [];
  private actionHandles = {
    gameplaySet: BigInt(0),
    move: BigInt(0),
    camera: BigInt(0),
    jump: BigInt(0),
    shoot: BigInt(0),
  };
  
  init(): boolean {
    // Initialize Steam Input
    if (!steam.input.init()) {
      console.error('Failed to init Steam Input');
      return false;
    }
    
    // Cache action set handles
    this.actionHandles.gameplaySet = steam.input.getActionSetHandle('GameplayControls');
    
    // Cache action handles
    this.actionHandles.move = steam.input.getAnalogActionHandle('Move');
    this.actionHandles.camera = steam.input.getAnalogActionHandle('Camera');
    this.actionHandles.jump = steam.input.getDigitalActionHandle('Jump');
    this.actionHandles.shoot = steam.input.getDigitalActionHandle('Fire');
    
    // Validate handles
    if (this.actionHandles.gameplaySet === 0n) {
      console.error('GameplayControls action set not found');
      return false;
    }
    
    return true;
  }
  
  update() {
    steam.input.runFrame();
    this.controllers = steam.input.getConnectedControllers();
  }
  
  getInput(playerIndex = 0) {
    if (playerIndex >= this.controllers.length) {
      return null;
    }
    
    const handle = this.controllers[playerIndex];
    
    // Activate action set
    steam.input.activateActionSet(handle, this.actionHandles.gameplaySet);
    
    // Read input
    const move = steam.input.getAnalogActionData(handle, this.actionHandles.move);
    const camera = steam.input.getAnalogActionData(handle, this.actionHandles.camera);
    const jump = steam.input.getDigitalActionData(handle, this.actionHandles.jump);
    const shoot = steam.input.getDigitalActionData(handle, this.actionHandles.shoot);
    
    return { move, camera, jump, shoot };
  }
  
  shutdown() {
    // Stop all rumble
    this.controllers.forEach(handle => {
      steam.input.triggerVibration(handle, 0, 0);
    });
    
    steam.input.shutdown();
  }
}
```

---

## Testing

### Virtual Controller Setup

#### Windows - vgamepad (Recommended)

```bash
# Install ViGEmBus driver
# Download from: https://github.com/ViGEm/ViGEmBus/releases

# Install Python vgamepad
pip install vgamepad

# Run virtual controller server
cd tests/gamepad_emulator
python vgamepad_server.py xbox server
```

#### Steam Desktop Configuration (Cross-Platform)

```
1. Open Steam
2. Settings → Controller → Desktop Configuration
3. Your keyboard/mouse will act as a virtual controller
```

#### Linux - xboxdrv

```bash
# Install xboxdrv
sudo apt-get install xboxdrv

# Run virtual controller
sudo xboxdrv --silent --detach-kernel-driver
```

### Running Tests

```bash
# TypeScript test
npm run test:input:ts

# JavaScript test
npm run test:input:js
```

**Test Coverage (35+ functions):**
- ✅ Initialization (init, shutdown, runFrame)
- ✅ Controller detection and info
- ✅ Action sets and layers
- ✅ Digital actions
- ✅ Analog actions
- ✅ Motion data
- ✅ Haptics (vibration, LED)
- ✅ Configuration and binding
- ✅ Glyphs and labels
- ✅ XInput integration

---

## Notes

### Platform Support
- ✅ Windows
- ✅ macOS
- ✅ Linux
- ✅ Steam Deck

### Action Configuration File

Create `input_actions.vdf` in your game directory:

```vdf
"input_actions"
{
  "actions"
  {
    "GameplayControls"
    {
      "title" "#Gameplay"
      "StickPadGyro"
      {
        "Move" "#Move"
        "Camera" "#Look"
      }
      "Button"
      {
        "Jump" "#Jump"
        "Fire" "#Fire"
      }
    }
  }
  
  "localization"
  {
    "english"
    {
      "#Gameplay" "Gameplay Controls"
      "#Move" "Move"
      "#Look" "Look Around"
      "#Jump" "Jump"
      "#Fire" "Fire Weapon"
    }
  }
}
```

### Best Practices Summary

1. **Always cache action handles** at startup
2. **Call `runFrame()` every frame** to update state
3. **Check `active` flag** before using input
4. **Support hot-plugging** by checking controllers each frame
5. **Use action sets** for different game modes
6. **Stop rumble** before shutdown
7. **Test with real hardware** - virtual controllers have limitations

---

## Related Documentation

- [Achievement Manager](./ACHIEVEMENT_MANAGER.md) - Unlock achievements with controller input
- [Steam API Core](./STEAM_API_CORE.md) - Core Steam initialization
- [Overlay Manager](./OVERLAY_MANAGER.md) - Controller configuration overlay

---

## Steamworks SDK Reference

**Interface:** `ISteamInput` (v006)

**Official Documentation:** [Steamworks Input Documentation](https://partner.steamgames.com/doc/features/steam_controller)

**SDK Functions Used:**
- `SteamAPI_ISteamInput_Init()`
- `SteamAPI_ISteamInput_Shutdown()`
- `SteamAPI_ISteamInput_RunFrame()`
- `SteamAPI_ISteamInput_GetConnectedControllers()`
- `SteamAPI_ISteamInput_GetInputTypeForHandle()`
- `SteamAPI_ISteamInput_GetActionSetHandle()`
- `SteamAPI_ISteamInput_ActivateActionSet()`
- `SteamAPI_ISteamInput_GetCurrentActionSet()`
- `SteamAPI_ISteamInput_ActivateActionSetLayer()`
- `SteamAPI_ISteamInput_DeactivateActionSetLayer()`
- `SteamAPI_ISteamInput_DeactivateAllActionSetLayers()`
- `SteamAPI_ISteamInput_GetActiveActionSetLayers()`
- `SteamAPI_ISteamInput_GetDigitalActionHandle()`
- `SteamAPI_ISteamInput_GetDigitalActionData()`
- `SteamAPI_ISteamInput_GetDigitalActionOrigins()`
- `SteamAPI_ISteamInput_GetAnalogActionHandle()`
- `SteamAPI_ISteamInput_GetAnalogActionData()`
- `SteamAPI_ISteamInput_GetAnalogActionOrigins()`
- `SteamAPI_ISteamInput_StopAnalogActionMomentum()`
- `SteamAPI_ISteamInput_GetMotionData()`
- `SteamAPI_ISteamInput_TriggerVibration()`
- `SteamAPI_ISteamInput_TriggerVibrationExtended()`
- `SteamAPI_ISteamInput_TriggerSimpleHapticEvent()`
- `SteamAPI_ISteamInput_SetLEDColor()`
- `SteamAPI_ISteamInput_ShowBindingPanel()`
- `SteamAPI_ISteamInput_GetDeviceBindingRevision()`
- `SteamAPI_ISteamInput_GetRemotePlaySessionID()`
- `SteamAPI_ISteamInput_GetSessionInputConfigurationSettings()`
- `SteamAPI_ISteamInput_GetStringForDigitalActionName()`
- `SteamAPI_ISteamInput_GetStringForAnalogActionName()`
- `SteamAPI_ISteamInput_GetGlyphPNGForActionOrigin()`
- `SteamAPI_ISteamInput_GetGlyphSVGForActionOrigin()`
- `SteamAPI_ISteamInput_GetStringForActionOrigin()`
- `SteamAPI_ISteamInput_GetGamepadIndexForController()`
- `SteamAPI_ISteamInput_GetControllerForGamepadIndex()`
