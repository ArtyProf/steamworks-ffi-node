# Gamepad Emulator for Steamworks Input Testing

This folder contains Python scripts to emulate virtual game controllers for testing Steamworks Input API.

## ⚠️ Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| **Windows 10/11** | ✅ **Fully Supported** | Works out of the box with ViGEmBus |
| **Linux** | ⚠️ **Experimental** | Requires `uinput` permissions |
| **macOS** | ❌ **NOT SUPPORTED** | No virtual gamepad framework available |

**macOS Users**: You must use a **real physical controller** for testing. The virtual gamepad emulation cannot work on macOS because there's no user-space API for creating virtual HID devices.

## Requirements

### Windows / Linux:

```bash
pip install vgamepad
```

**Windows Note:** On Windows 10/11, vgamepad works out of the box. On older Windows versions, you may need [ViGEmBus driver](https://github.com/ViGEm/ViGEmBus/releases).

**Linux Note:** You need to grant permission to `/dev/uinput`:
```bash
sudo chmod +0666 /dev/uinput
```

### macOS:

```bash
# Virtual gamepad NOT supported on macOS
# Connect a real controller instead:
# - Xbox One/Series controller (USB or Bluetooth)
# - DualShock 4/DualSense (USB or Bluetooth)  
# - Nintendo Switch Pro Controller
# - Any USB gamepad
```

## Files

- **vgamepad_server.py** - Main virtual gamepad server that creates Xbox 360 or PS4 controllers
- **requirements.txt** - Python dependencies

## Usage

### Standalone Test

Run automated test sequence:

```bash
# Xbox 360 controller
python tests/gamepad_emulator/vgamepad_server.py xbox test

# PS4 controller
python tests/gamepad_emulator/vgamepad_server.py ps4 test
```

### Interactive Server Mode

Run server for programmatic control:

```bash
# Xbox 360 controller
python tests/gamepad_emulator/vgamepad_server.py xbox server

# PS4 controller
python tests/gamepad_emulator/vgamepad_server.py ps4 server
```

### Commands (Server Mode)

Once the server is running, send commands via stdin:

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

### Button Names

**Xbox 360:**
- A, B, X, Y
- LB, RB (bumpers)
- Start, Back
- LS, RS (stick clicks)
- DpadUp, DpadDown, DpadLeft, DpadRight

**PS4:**
- Cross, Circle, Square, Triangle
- L1, R1 (bumpers)
- L3, R3 (stick clicks)
- Options, Share
- PS, Touchpad

## Integration with Tests

The Node.js tests automatically start and stop the Python server:

```bash
# TypeScript tests with virtual controller
npm run test:input-xbox:ts
npm run test:input-ps4:ts

# JavaScript tests with virtual controller
npm run test:input-xbox:js
npm run test:input-ps4:js
```

## Troubleshooting

### Virtual controller not detected by Steam

1. Check Device Manager (Windows) for "Xbox 360 Controller for Windows" or "Wireless Controller"
2. Ensure Steam is running
3. Enable controller support in Steam Settings → Controller
4. Wait 3-5 seconds after starting the emulator

### Python not found

Make sure Python 3.7+ is installed and in your PATH:
```bash
python --version
```

### vgamepad import error

Install the dependency:
```bash
pip install vgamepad
```

### Permission errors (Linux/macOS)

vgamepad may require additional setup on Linux/macOS. Consider using physical controllers or Steam Desktop Configuration mode instead.

## Alternative Testing Methods

If vgamepad doesn't work on your platform:

1. **Physical Controller** - Connect any USB gamepad
2. **Steam Desktop Configuration** - Enable in Steam Settings → Controller
3. **DS4Windows** (Windows) - Virtual DualShock 4 emulator
4. **xboxdrv** (Linux) - Virtual Xbox controller driver

## Platform Support

| Platform | Support | Notes |
|----------|---------|-------|
| Windows 10/11 | ✅ Excellent | Native support, no drivers needed |
| Windows 7/8 | ⚠️ Good | Requires ViGEmBus driver |
| Linux | ⚠️ Limited | May require additional setup |
| macOS | ⚠️ Limited | Consider physical controllers |
