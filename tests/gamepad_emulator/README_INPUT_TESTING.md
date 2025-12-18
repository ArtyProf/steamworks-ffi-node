# Steam Input Testing with Virtual Gamepads

This directory contains a comprehensive testing infrastructure for the Steam Input API, including virtual gamepad emulation for testing without physical controllers.

## 📁 Structure

```
tests/
├── gamepad_emulator/           # Python virtual gamepad server
│   ├── vgamepad_server.py      # Main server for Xbox/PS4 controller emulation
│   ├── requirements.txt        # Python dependencies
│   ├── __init__.py             # Package initialization
│   ├── README.md               # Detailed usage instructions
│   └── vgamepad-controller.ts  # TypeScript wrapper for Python server
├── ts/                         # TypeScript test files
│   └── test-input.ts          # Comprehensive Steam Input API tests
└── js/                         # JavaScript test files
    └── test-input.js          # JavaScript version of tests
```

## 🚀 Quick Start

### Prerequisites

1. **Steam** - Must be running and you must be logged in
2. **Python 3.7+** - For virtual gamepad emulation (Windows/Linux only)
3. **vgamepad library** - Install with:

   ```bash
   pip install vgamepad
   ```

   **⚠️ Platform Support:**

   - ✅ **Windows 10/11** - Fully supported
   - ⚠️ **Linux** - Experimental support (requires `uinput` permissions)
   - ❌ **macOS** - NOT supported (use a real controller instead)

### Running Tests

#### Without Virtual Gamepad (Physical Controller Required)

```bash
# TypeScript
npm run test:input:ts

# JavaScript
npm run test:input:js
```

#### With Virtual Xbox 360 Controller

```bash
# TypeScript
npm run test:input-xbox:ts

# JavaScript
npm run test:input-xbox:js
```

#### With Virtual PS4 Controller

```bash
# TypeScript
npm run test:input-ps4:ts

# JavaScript
npm run test:input-ps4:js
```

## 🎮 What Gets Tested

The test suite covers **ALL** implemented Steam Input API methods:

### Core Functions

- ✅ `init()` - Initialize Steam Input
- ✅ `shutdown()` - Shutdown Steam Input
- ✅ `runFrame()` - Update input state
- ✅ `getConnectedControllers()` - Get all connected controllers

### Controller Information

- ✅ `getInputTypeForHandle()` - Get controller type
- ✅ `getControllerInfo()` - Get detailed controller info
- ✅ `getControllerForGamepadIndex()` - XInput slot lookup
- ✅ `getGamepadIndexForController()` - Reverse XInput lookup

### Action Sets

- ✅ `getActionSetHandle()` - Get action set by name
- ✅ `activateActionSet()` - Switch action set
- ✅ `getCurrentActionSet()` - Get active action set
- ✅ `activateActionSetLayer()` - Add action layer
- ✅ `deactivateActionSetLayer()` - Remove action layer
- ✅ `deactivateAllActionSetLayers()` - Clear all layers
- ✅ `getActiveActionSetLayers()` - List active layers

### Digital Actions (Buttons)

- ✅ `getDigitalActionHandle()` - Get button action by name
- ✅ `getDigitalActionData()` - Read button state
- ✅ `getStringForDigitalActionName()` - Get action name

### Analog Actions (Sticks, Triggers)

- ✅ `getAnalogActionHandle()` - Get analog action by name
- ✅ `getAnalogActionData()` - Read analog values
- ✅ `getStringForAnalogActionName()` - Get action name
- ✅ `stopAnalogActionMomentum()` - Stop trackball momentum

### Motion Data

- ✅ `getMotionData()` - Read gyro & accelerometer

### Haptics

- ✅ `triggerVibration()` - Basic rumble
- ✅ `triggerVibrationExtended()` - Per-motor control
- ✅ `triggerSimpleHapticEvent()` - Trackpad haptics

### Visual Feedback

- ✅ `setLEDColor()` - DualShock/DualSense LED control

### Glyphs & UI

- ✅ `getGlyphPNGForActionOrigin()` - Get button icon (PNG)
- ✅ `getGlyphSVGForActionOrigin()` - Get button icon (SVG)
- ✅ `getStringForActionOrigin()` - Get button name
- ✅ `showBindingPanel()` - Open config UI

### Session & Configuration

- ✅ `getDeviceBindingRevision()` - Get binding version
- ✅ `getRemotePlaySessionID()` - Check Remote Play status
- ✅ `getSessionInputConfigurationSettings()` - Get session config

## 🐍 Python Virtual Gamepad Server

The `vgamepad_server.py` creates **real HID devices** that Steam recognizes as hardware.

### Features

- Xbox 360 controller emulation
- PS4 (DualShock 4) controller emulation
- Full button control
- Analog stick simulation
- Trigger control
- Command server (stdin/stdout communication)

### Commands

```
PRESS:<button>:<duration_ms>   - Press a button
LSTICK:<x>:<y>                  - Set left stick (-1.0 to 1.0)
RSTICK:<x>:<y>                  - Set right stick (-1.0 to 1.0)
LTRIGGER:<value>                - Set left trigger (0.0 to 1.0)
RTRIGGER:<value>                - Set right trigger (0.0 to 1.0)
RESET                           - Reset all inputs
TEST                            - Run automated test sequence
PING                            - Check if server is alive
EXIT                            - Shutdown server
```

### Standalone Usage

```bash
# Start Xbox controller in server mode
python tests/gamepad_emulator/vgamepad_server.py xbox server

# Run automated test
python tests/gamepad_emulator/vgamepad_server.py xbox test

# PS4 controller
python tests/gamepad_emulator/vgamepad_server.py ps4 server
```

## 📝 Node.js Integration

The `VirtualGamepad` class in `vgamepad-controller.ts` provides a clean API:

```typescript
import { VirtualGamepad } from "../helpers/vgamepad-controller";

// Create and start virtual gamepad
const gamepad = new VirtualGamepad("xbox");
await gamepad.start(3000); // 3 second detection wait

// Press buttons
await gamepad.pressButton("A", 500); // Press A for 500ms

// Move analog sticks
gamepad.setLeftStick(0.7, 0.5); // X=0.7, Y=0.5
gamepad.setRightStick(-0.3, 1.0);

// Control triggers
gamepad.setLeftTrigger(0.8); // 80% pressed
gamepad.setRightTrigger(1.0); // Fully pressed

// Reset inputs
gamepad.reset();

// Cleanup
await gamepad.stop();
```

## 🔧 Troubleshooting

### Virtual controller not detected by Steam

1. Check Device Manager (Windows) for virtual controller
2. Enable controller support in Steam Settings → Controller → General Controller Settings
3. Wait 3-5 seconds after starting the emulator
4. Restart Steam if necessary

### Python not found

```bash
python --version  # Should be 3.7+
```

### vgamepad import error

```bash
pip install vgamepad
```

### Tests fail on macOS/Linux

vgamepad has best support on Windows. On other platforms:

- Use a physical USB controller
- Enable Steam Desktop Configuration mode
- Check gamepad_emulator/README.md for platform-specific instructions

## 📊 Test Output Example

```
========================================================
STEAM INPUT - Comprehensive API Test Suite
========================================================

Test 0: Starting Virtual Gamepad...
----------------------------------------
Controller Type: XBOX
Initializing Python vgamepad server...

✅ Virtual gamepad started successfully
   Steam should now detect a virtual controller

Test 1: Initializing Steam API...
----------------------------------------
✅ Steam API initialized

Test 2: Initializing Steam Input...
----------------------------------------
✅ Steam Input initialized

Test 3: Detecting Controllers...
----------------------------------------
✅ Detected 1 controller(s)!

Test 4: getInputTypeForHandle, getControllerInfo
----------------------------------------

Controller 1:
  Handle: 12345
  Type (getInputTypeForHandle): Xbox 360 Controller
  Type (getControllerInfo): Xbox 360 Controller
  XInput Index: 0

✅ Controller information retrieved

[... 15 total tests ...]

========================================================
TEST SUMMARY
========================================================
Virtual Gamepad: ✅ Used
Controllers Detected: ✅ 1
API Methods: ✅ All present
Steam Input: ✅ Working

✅ Comprehensive controller testing completed successfully!
   Tested 35 API methods
   Tested with virtual controller
========================================================
```

## 🌐 Platform Support

| Platform      | Virtual Gamepad | Notes                                                                  |
| ------------- | --------------- | ---------------------------------------------------------------------- |
| Windows 10/11 | ✅ Excellent    | Native support, no drivers needed                                      |
| Windows 7/8   | ⚠️ Good         | Requires [ViGEmBus driver](https://github.com/ViGEm/ViGEmBus/releases) |
| Linux         | ⚠️ Limited      | May require additional setup                                           |
| macOS         | ⚠️ Limited      | Consider physical controllers                                          |

## 📚 Additional Resources

- [Steam Input Documentation](https://partner.steamgames.com/doc/features/steam_controller)
- [vgamepad GitHub](https://github.com/yannbouteiller/vgamepad)
- [Steamworks SDK](https://partner.steamgames.com/doc/sdk)

## 🤝 Contributing

When adding new Steam Input API methods:

1. Update `src/internal/SteamInputManager.ts`
2. Add type definitions to `src/types/input.ts`
3. Add FFI declarations to `src/internal/SteamLibraryLoader.ts`
4. Update test files: `tests/ts/test-input.ts` and `tests/js/test-input.js`
5. Update API method list in test validation section
6. Update documentation: `docs/INPUT_MANAGER.md`

## 📄 License

Same as parent project.
