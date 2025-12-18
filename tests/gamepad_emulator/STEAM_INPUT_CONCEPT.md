# 🎮 Steam Input Explained - Action-Based Controller Configuration

## The Core Concept

Steam Input solves the **"button mapping chaos"** problem by using **actions** instead of physical buttons.

### ❌ Traditional Approach (Hardcoded Buttons)

```typescript
// Game reads physical buttons directly
if (controller.A.pressed) {        // Xbox: A button
  player.jump();
}
if (controller.Cross.pressed) {    // PlayStation: X button (Cross)
  player.jump();
}
if (controller.B.pressed) {        // Nintendo: B button
  player.jump();
}
// Problem: Different positions, users can't remap, accessibility issues
```

### ✅ Steam Input Approach (Action-Based)

```typescript
// 1. Define actions (not buttons!)
const jumpAction = steam.input.getDigitalActionHandle('Jump');

// 2. Read the action state (works on ANY controller)
const jumpData = steam.input.getDigitalActionData(controllerHandle, jumpAction);
if (jumpData.state) {
  player.jump();  // Works whether user pressed A, X, B, or custom mapping!
}
```

---

## 📝 Configuration Workflow

### Step 1: Define Actions (Game Developer)

You create an **Input Action Manifest** file (`.vdf` format):

```vdf
"controller_mappings"
{
  "version"     "3"
  "title"       "My Game Controller Configuration"
  "description" "Default controller bindings"
  
  "actions"
  {
    // Digital Actions (Buttons)
    "Jump"        { "type" "button" }
    "Fire"        { "type" "button" }
    "Reload"      { "type" "button" }
    "Interact"    { "type" "button" }
    
    // Analog Actions (Sticks, Triggers)
    "Move"        { "type" "joystick" }
    "Camera"      { "type" "joystick" }
    "Aim"         { "type" "trigger" }
  }
  
  "action_sets"
  {
    // Context-based controls
    "GameplayControls"
    {
      "Jump"
      "Fire"
      "Reload"
      "Interact"
      "Move"
      "Camera"
      "Aim"
    }
    
    "MenuControls"
    {
      "Interact"  // Same action, different context
      "Move"      // Navigate menus with same stick
    }
    
    "VehicleControls"
    {
      "Fire"      // Now it's "shoot" from vehicle
      "Move"      // Now it's "steer"
    }
  }
}
```

### Step 2: Steam Creates Default Mappings

Steam automatically maps your actions to physical buttons for each controller type:

```
Xbox 360 Controller:
  Jump   → A button
  Fire   → Right Trigger
  Reload → X button
  Move   → Left Stick
  Camera → Right Stick

PlayStation 4 Controller:
  Jump   → Cross (✕) button
  Fire   → R2 trigger
  Reload → Square (□) button
  Move   → Left Stick
  Camera → Right Stick

Steam Controller:
  Jump   → A button
  Fire   → Right Trigger
  Reload → X button
  Move   → Left Trackpad (as joystick)
  Camera → Right Trackpad (as joystick)
```

### Step 3: User Customization (The Magic Part!)

Users can open the configuration UI and remap everything:

```typescript
// In your game code:
steam.input.showBindingPanel(controllerHandle);
```

This opens Steam's powerful configuration UI where users can:
- Remap any button to any action
- Create mode shifts (hold button to change controls)
- Add action layers
- Configure sensitivity curves
- Set up accessibility features
- Share configurations with community

---

## 🔍 How It Works in the Tests

Let me show you the exact code from our tests:

### Test Section: Action Set Management

```typescript
// Test 5: Action Set Management (Line 203)
if (controllers.length > 0) {
  const testHandle = controllers[0];
  
  // 1️⃣ GET ACTION SET HANDLES
  // Action sets are like "control schemes" - gameplay, menu, vehicle, etc.
  const menuSetHandle = steam.input.getActionSetHandle('MenuControls');
  const gameplaySetHandle = steam.input.getActionSetHandle('GameplayControls');
  
  console.log(`MenuControls handle: ${menuSetHandle}`);
  console.log(`GameplayControls handle: ${gameplaySetHandle}`);
  
  // 2️⃣ ACTIVATE AN ACTION SET
  // Switch to menu controls (only menu actions will be active)
  steam.input.activateActionSet(testHandle, menuSetHandle);
  console.log('✓ Switched to MenuControls');
  
  // 3️⃣ CHECK CURRENT ACTION SET
  const currentSet = steam.input.getCurrentActionSet(testHandle);
  console.log(`Current action set: ${currentSet}`);
  
  // 4️⃣ USE ACTION LAYERS (optional modifiers)
  // Layers add extra actions without disabling current set
  const layerHandle = steam.input.getActionSetHandle('MenuLayer');
  if (layerHandle !== 0n) {
    steam.input.activateActionSetLayer(testHandle, layerHandle);
    console.log('✓ Added MenuLayer on top');
    
    // Can have multiple layers active
    const activeLayers = steam.input.getActiveActionSetLayers(testHandle);
    console.log(`Active layers: ${activeLayers.length}`);
  }
}
```

### Test Section: Reading Button Input (Digital Actions)

```typescript
// Test 6: Digital Action Input (Line 254)
if (controllers.length > 0 && virtualGamepad) {
  const testHandle = controllers[0];
  
  // 1️⃣ SIMULATE BUTTON PRESS (from virtual gamepad)
  console.log('Pressing A button on virtual controller...');
  await virtualGamepad.pressButton('A', 500);  // Press physical A
  steam.input.runFrame();  // Update Steam Input state
  
  // 2️⃣ GET ACTION HANDLES BY NAME
  // These are defined in your action manifest
  const jumpActionHandle = steam.input.getDigitalActionHandle('Jump');
  const fireActionHandle = steam.input.getDigitalActionHandle('Fire');
  
  console.log(`Jump action handle: ${jumpActionHandle}`);
  console.log(`Fire action handle: ${fireActionHandle}`);
  
  if (jumpActionHandle !== 0n) {
    // 3️⃣ READ THE ACTION STATE (not the button!)
    const actionData = steam.input.getDigitalActionData(testHandle, jumpActionHandle);
    
    console.log(`Jump action state: ${actionData.state}`);     // true/false
    console.log(`Jump action active: ${actionData.active}`);   // Is this action available?
    
    // 4️⃣ GET HUMAN-READABLE NAME
    const actionName = steam.input.getStringForDigitalActionName(jumpActionHandle);
    console.log(`Action name: "${actionName}"`);  // "Jump"
    
    // 5️⃣ USE IN GAME LOOP
    if (actionData.state && actionData.active) {
      // player.jump();  // This would make player jump
      console.log('🦘 Player would jump now!');
    }
  } else {
    console.log('ℹ️  No actions configured (normal for test apps)');
    console.log('   In a real game, you define actions in IGA file');
  }
}
```

### Test Section: Reading Analog Input (Sticks, Triggers)

```typescript
// Test 7: Analog Action Input (Line 295)
if (controllers.length > 0 && virtualGamepad) {
  const testHandle = controllers[0];
  
  // 1️⃣ SIMULATE STICK MOVEMENT
  console.log('Moving left stick on virtual controller...');
  virtualGamepad.setLeftStick(0.7, 0.5);  // X=0.7 (right), Y=0.5 (up)
  await delay(200);
  steam.input.runFrame();
  await delay(200);
  
  // 2️⃣ GET ANALOG ACTION HANDLES
  const moveActionHandle = steam.input.getAnalogActionHandle('Move');
  const cameraActionHandle = steam.input.getAnalogActionHandle('Camera');
  
  console.log(`Move action handle: ${moveActionHandle}`);
  console.log(`Camera action handle: ${cameraActionHandle}`);
  
  if (moveActionHandle !== 0n) {
    // 3️⃣ READ ANALOG ACTION DATA
    const actionData = steam.input.getAnalogActionData(testHandle, moveActionHandle);
    
    console.log(`Mode: ${actionData.mode}`);           // Joystick, trigger, etc.
    console.log(`X: ${actionData.x.toFixed(3)}`);      // -1.0 to 1.0
    console.log(`Y: ${actionData.y.toFixed(3)}`);      // -1.0 to 1.0
    console.log(`Active: ${actionData.active}`);       // Is action available?
    
    // 4️⃣ USE IN GAME LOOP
    if (actionData.active) {
      // player.move(actionData.x, actionData.y);
      console.log(`🚶 Player would move X=${actionData.x}, Y=${actionData.y}`);
    }
  } else {
    console.log('ℹ️  No analog actions configured');
  }
  
  // Reset stick
  virtualGamepad.setLeftStick(0, 0);
}
```

### Test Section: Opening Configuration UI

```typescript
// Test 12: Binding UI & Session Info (Line 500)
if (controllers.length > 0) {
  const testHandle = controllers[0];
  
  // 🎨 OPEN STEAM'S CONFIGURATION UI
  // This is where users customize their controls!
  console.log('Opening controller configuration UI...');
  
  // Uncomment this line to actually open the UI:
  // steam.input.showBindingPanel(testHandle);
  
  console.log('User can now:');
  console.log('  • Remap any button to any action');
  console.log('  • Adjust sensitivity and dead zones');
  console.log('  • Create mode shifts and action layers');
  console.log('  • Enable accessibility features');
  console.log('  • Share configs with community');
  
  // 📊 GET CURRENT CONFIGURATION INFO
  const revision = steam.input.getDeviceBindingRevision(testHandle);
  if (revision) {
    console.log(`Current binding version: v${revision.major}.${revision.minor}`);
  }
  
  const sessionID = steam.input.getRemotePlaySessionID(testHandle);
  console.log(`Remote Play: ${sessionID !== 0 ? 'Active' : 'Local'}`);
  
  const sessionConfig = steam.input.getSessionInputConfigurationSettings();
  console.log(`Session config: ${sessionConfig}`);
}
```

---

## 🎯 Real Game Example

Here's how you'd use this in an actual game:

```typescript
class GameController {
  private steam: SteamworksSDK;
  private controllerHandle: bigint;
  
  // Action handles (get once at initialization)
  private jumpAction: bigint;
  private fireAction: bigint;
  private reloadAction: bigint;
  private moveAction: bigint;
  private cameraAction: bigint;
  
  // Action sets
  private gameplaySet: bigint;
  private menuSet: bigint;
  private vehicleSet: bigint;
  
  init() {
    this.steam = SteamworksSDK.getInstance();
    this.steam.input.init();
    
    // Get action handles (do this once!)
    this.jumpAction = this.steam.input.getDigitalActionHandle('Jump');
    this.fireAction = this.steam.input.getDigitalActionHandle('Fire');
    this.reloadAction = this.steam.input.getDigitalActionHandle('Reload');
    this.moveAction = this.steam.input.getAnalogActionHandle('Move');
    this.cameraAction = this.steam.input.getAnalogActionHandle('Camera');
    
    // Get action set handles
    this.gameplaySet = this.steam.input.getActionSetHandle('GameplayControls');
    this.menuSet = this.steam.input.getActionSetHandle('MenuControls');
    this.vehicleSet = this.steam.input.getActionSetHandle('VehicleControls');
    
    // Get first controller
    const controllers = this.steam.input.getConnectedControllers();
    if (controllers.length > 0) {
      this.controllerHandle = controllers[0];
      
      // Start in gameplay mode
      this.steam.input.activateActionSet(this.controllerHandle, this.gameplaySet);
    }
  }
  
  update() {
    // Update Steam Input state every frame
    this.steam.input.runFrame();
    
    if (!this.controllerHandle) return;
    
    // Read button actions
    const jumpData = this.steam.input.getDigitalActionData(
      this.controllerHandle, 
      this.jumpAction
    );
    if (jumpData.state && jumpData.active) {
      this.player.jump();
    }
    
    const fireData = this.steam.input.getDigitalActionData(
      this.controllerHandle,
      this.fireAction
    );
    if (fireData.state && fireData.active) {
      this.player.fire();
    }
    
    const reloadData = this.steam.input.getDigitalActionData(
      this.controllerHandle,
      this.reloadAction
    );
    if (reloadData.state && reloadData.active) {
      this.player.reload();
    }
    
    // Read analog actions
    const moveData = this.steam.input.getAnalogActionData(
      this.controllerHandle,
      this.moveAction
    );
    if (moveData.active) {
      this.player.move(moveData.x, moveData.y);
    }
    
    const cameraData = this.steam.input.getAnalogActionData(
      this.controllerHandle,
      this.cameraAction
    );
    if (cameraData.active) {
      this.camera.rotate(cameraData.x, cameraData.y);
    }
  }
  
  enterVehicle() {
    // Switch to vehicle controls
    this.steam.input.activateActionSet(this.controllerHandle, this.vehicleSet);
    // Now "Move" controls steering, "Fire" shoots vehicle weapon
  }
  
  exitVehicle() {
    // Back to gameplay controls
    this.steam.input.activateActionSet(this.controllerHandle, this.gameplaySet);
  }
  
  openMenu() {
    // Switch to menu controls
    this.steam.input.activateActionSet(this.controllerHandle, this.menuSet);
  }
  
  openControllerSettings() {
    // Let user customize controls
    this.steam.input.showBindingPanel(this.controllerHandle);
  }
}
```

---

## 🌟 Key Benefits

1. **Universal Controller Support** - Works with Xbox, PlayStation, Nintendo, Steam Controller, custom controllers
2. **User Customization** - Players can remap everything to their preference
3. **Accessibility** - Players with disabilities can configure controls that work for them
4. **Context Switching** - Different controls for gameplay, menus, vehicles (action sets)
5. **Community Sharing** - Players can share and download controller configurations
6. **Future-Proof** - New controllers automatically work without game updates

---

## 📚 Where Configuration Happens

The test shows three places configuration is tested:

1. **Line 203-251**: Action Set Management
   - Getting handles for control schemes
   - Switching between different contexts
   - Managing action layers

2. **Line 254-293**: Digital Actions (Buttons)
   - Getting button action handles
   - Reading button state
   - Showing how physical buttons map to logical actions

3. **Line 295-337**: Analog Actions (Sticks)
   - Getting analog action handles
   - Reading stick/trigger values
   - Using analog input for movement

4. **Line 500-530**: Configuration UI
   - `showBindingPanel()` - Opens Steam's configuration interface
   - Users customize ALL mappings here
   - No code needed from developer!

The beauty is: **you write your game using actions, Steam handles the configuration UI automatically!**
