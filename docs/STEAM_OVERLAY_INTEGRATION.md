# Steam Overlay Integration for Electron

This guide explains how to add Steam overlay support (Shift+Tab) to Electron applications using native rendering across all platforms.

> **Status: Working** - This feature has been tested on macOS (Metal), Windows (OpenGL), and Linux (OpenGL 3.3 on Steam Deck Desktop Mode/SteamOS).

## Overview

The Steam overlay integration allows Electron applications to display the Steam overlay by:

1. Creating a native graphics window (Metal on macOS, DirectX 11 on Windows, OpenGL on Linux)
2. Capturing Electron's content and rendering it to the native surface
3. Allowing Steam to inject its overlay renderer

This enables full Steam overlay functionality (Shift+Tab, friends list, achievements, etc.) in Electron apps.

## Platform Support

| Platform    | Renderer     | Status                             |
| ----------- | ------------ | ---------------------------------- |
| **macOS**   | Metal        | Tested                             |
| **Windows** | OpenGL       | Tested                             |
| **Linux**   | OpenGL 3.3 + X11 | Tested (Steam Deck Desktop Mode) |

### System Requirements

| Platform | Minimum Version         |
| -------- | ----------------------- |
| macOS    | 10.15+ (Catalina)       |
| Windows  | Windows 10+             |
| Linux    | X11 with OpenGL 3.3+    |
| SteamOS  | Steam Deck Desktop Mode |

## Quick Start

### 1. Install Dependencies

```bash
npm install steamworks-ffi-node
# or
yarn add steamworks-ffi-node
```

### 2. Build Native Module (Optional)

The native overlay module is built automatically during installation if prebuilds aren't available for your platform.

To manually rebuild:

```bash
npm run build:native
```

### 3. Basic Integration

```typescript
import { app, BrowserWindow } from "electron";
import SteamworksSDK from "steamworks-ffi-node";

const steam = SteamworksSDK.getInstance();

// Initialize Steam
if (!steam.init({ appId: 480 })) {
  console.error("Failed to initialize Steam");
  app.quit();
}

// Run callbacks periodically
setInterval(() => steam.runCallbacks(), 1000);

app.whenReady().then(() => {
  // Create your window normally
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Add Steam overlay - ONE LINE!
  if (steam.isOverlayAvailable()) {
    steam.addElectronSteamOverlay(win);
  }

  win.loadFile("index.html");
});

app.on("before-quit", () => {
  steam.shutdown();
});
```

## API Reference

### `addElectronSteamOverlay(browserWindow, options?)`

Adds Steam overlay support to an Electron BrowserWindow.

**Parameters:**

- `browserWindow` - The Electron BrowserWindow
- `options` (optional):
  - `title?: string` - Window title (default: "Electron Steam App")
  - `fps?: number` - Frame rate (default: 60)
  - `vsync?: boolean` - Enable VSync (default: true)

**Returns:** `boolean` - True if overlay was successfully added

**Example:**

```typescript
const success = steam.addElectronSteamOverlay(win, {
  title: "My Steam Game",
  fps: 60,
  vsync: true,
});

if (success) {
  console.log("Steam overlay enabled!");
} else {
  console.log("Failed to enable overlay");
}
```

### `isOverlayAvailable()`

Checks if Steam overlay is available on the current system.

**Returns:** `boolean` - True if overlay can be used

**Example:**

```typescript
if (steam.isOverlayAvailable()) {
  steam.addElectronSteamOverlay(win);
} else {
  console.log("Steam overlay not available on this platform");
}
```

## Platform-Specific Notes

### macOS (Metal)

The macOS implementation uses Metal for rendering:

- Creates a borderless `MTKView` window
- Uses a custom `NSWindow` subclass to prevent focus stealing
- Syncs with Electron window position, size, minimize/restore, and focus states

**Required Entitlements** (`entitlements.mac.plist`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- Required for Steam overlay injection -->
  <key>com.apple.security.cs.allow-dyld-environment-variables</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>

  <!-- Standard Electron entitlements -->
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
</dict>
</plist>
```

### Windows (OpenGL)

The Windows implementation uses OpenGL:

- Creates a borderless window with `WS_EX_TOPMOST` and `WS_EX_NOACTIVATE`
- Uses WGL for OpenGL context creation
- Click-through input handling via `WM_NCHITTEST` returning `HTTRANSPARENT`
- DPI-aware coordinate scaling for high-DPI displays

**Requirements:**

- OpenGL capable GPU
- Windows 10 or later recommended

### Linux (OpenGL)

The Linux implementation uses OpenGL 3.3 with X11:

- Creates an X11 window with override redirect
- Uses GLX for OpenGL context
- Supports all major distributions (SteamOS, Ubuntu, Arch, Mint, Fedora, etc.)
- **Tested on**: Steam Deck Desktop Mode (SteamOS)

**Requirements:**

- X11 display server (Wayland not yet supported)
- OpenGL 3.3+ capable driver

## electron-builder Configuration

Add to your `package.json`:

```json
{
  "build": {
    "mac": {
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "buildconfig/entitlements.mac.plist",
      "entitlementsInherit": "buildconfig/entitlements.mac.plist"
    }
  }
}
```

## Complete Example

```typescript
import { app, BrowserWindow } from "electron";
import SteamworksSDK from "steamworks-ffi-node";

const steam = SteamworksSDK.getInstance();
let mainWindow: BrowserWindow | null = null;

// Initialize Steam before app ready
const STEAM_APP_ID = 480; // Replace with your Steam App ID

if (!steam.init({ appId: STEAM_APP_ID })) {
  console.error("Failed to initialize Steam - is Steam running?");
  app.quit();
}

// Run Steam callbacks periodically
setInterval(() => {
  steam.runCallbacks();
}, 1000);

// Create window when app is ready
app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: "My Steam Game",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Check if Steam overlay is available
  if (steam.isOverlayAvailable()) {
    // Wait for content to load before enabling overlay
    mainWindow.webContents.once("did-finish-load", () => {
      setTimeout(() => {
        const success = steam.addElectronSteamOverlay(mainWindow!, {
          title: "My Steam Game",
          fps: 60,
          vsync: true,
        });

        if (success) {
          console.log("Steam overlay enabled! Press Shift+Tab to open.");
        } else {
          console.error("Failed to enable Steam overlay");
        }
      }, 500); // Small delay to ensure window is fully rendered
    });
  } else {
    console.warn("Steam overlay not available on this system");
  }

  mainWindow.loadFile("index.html");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
});

// Quit when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Clean up Steam on quit
app.on("before-quit", () => {
  console.log("Shutting down Steam...");
  steam.shutdown();
});

// macOS: Re-create window when dock icon is clicked
app.on("activate", () => {
  if (mainWindow === null) {
    // Re-create window logic here
  }
});
```

## Testing

### 1. Add to Steam

1. Open Steam
2. Click "Games" → "Add a Non-Steam Game to My Library"
3. Browse to your Electron app
4. Add it to Steam

### 2. Restart Steam (optional, in some cases it could be an issue on macOS)

**CRITICAL:** After adding your app, you **must restart Steam** for the overlay to work!

### 3. Launch from Steam

Launch your app from Steam (not directly). Press **Shift+Tab** to open the overlay.

## Troubleshooting

### Overlay doesn't appear

1. **Restart Steam** - This is the #1 issue!
2. Check Steam Settings → In-Game → "Enable Steam Overlay" is checked
3. Verify you're launching from Steam, not directly
4. Check console for errors
5. Clean steam download cache

### macOS-specific issues

- Check entitlements: `codesign -d --entitlements :- YourApp.app`
- Verify code signing: `codesign -vv YourApp.app`
- Install Xcode Command Line Tools: `xcode-select --install`

### Windows-specific issues

- Ensure OpenGL is available
- Check Windows Event Viewer for graphics errors
- Update graphics drivers
- For high-DPI displays, coordinates are automatically scaled

### Linux-specific issues

- Verify X11 is running (Wayland not supported)
- Check OpenGL version: `glxinfo | grep "OpenGL version"`
- Install required libraries: `libX11`, `libGL`, `libGLX`

### Build fails

1. Install build tools for your platform:
   - macOS: `xcode-select --install`
   - Windows: Visual Studio Build Tools
   - Linux: `build-essential`, `libx11-dev`, `libgl1-mesa-dev`
2. Install node-gyp: `npm install -g node-gyp`
3. Rebuild: `npm run build:native`

### App crashes

1. Check logs for crash information
2. Verify native module is loaded correctly
3. Ensure proper cleanup with `steam.shutdown()` on quit

### Performance issues

1. Lower FPS: `steam.addElectronSteamOverlay(win, { fps: 30 })`
2. Disable VSync: `steam.addElectronSteamOverlay(win, { vsync: false })`
3. Reduce window size

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Window                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Web Content                        │  │
│  │              (HTML/CSS/JavaScript)                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                 │
│                    capturePage()                            │
│                           ▼                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Frame Buffer (BGRA)                      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                     N-API Bridge
                            │
┌─────────────────────────────────────────────────────────────┐
│                   Native Overlay Window                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │   Metal (macOS) / OpenGL (Win/Linux)                  │  │
│  │                                                       │  │
│  │   ┌─────────────────────────────────────────────────┐ │  │
│  │   │           Texture with Electron Content         │ │  │
│  │   └─────────────────────────────────────────────────┘ │  │
│  │                         +                             │  │
│  │   ┌─────────────────────────────────────────────────┐ │  │
│  │   │              Steam Overlay Layer                │ │  │
│  │   │         (Injected by Steam client)              │ │  │
│  │   └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Frame Pipeline

1. **Electron Rendering**: Your Electron window renders normally
2. **Frame Capture**: `capturePage()` captures the window content at 60 FPS
3. **Buffer Transfer**: Frame data is passed to native module via N-API
4. **Texture Upload**: Frame is uploaded to GPU texture
5. **Native Rendering**: Native window displays the texture
6. **Steam Injection**: Steam injects overlay renderer into native window
7. **Overlay Rendering**: Steam overlay renders on top of your content

## Performance

- **CPU Usage**: ~2-5% additional CPU for frame copying
- **Memory**: ~50-100 MB for buffers and textures
- **Latency**: <16ms (60 FPS) frame delay
- **GPU**: Minimal GPU usage (texture upload + blit)

## Best Practices

1. **Always check availability**: Use `isOverlayAvailable()` before enabling
2. **Handle failures gracefully**: The app should work without overlay
3. **Wait for content load**: Enable overlay after `did-finish-load` event
4. **Test thoroughly**: Test with Steam overlay enabled and disabled
5. **Monitor performance**: Profile your app with overlay active
6. **Proper cleanup**: Always call `steam.shutdown()` on quit

## Known Limitations

- Linux Wayland support not available (X11 only)
- High DPI scaling may require additional handling on some platforms
- VR/AR applications may need special consideration

## License

MIT - See LICENSE file for details

## Support

- GitHub Issues: https://github.com/ArtyProf/steamworks-ffi-node/issues
- Steam Partner Forums: https://partner.steamgames.com/
