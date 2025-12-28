# Screenshot Manager API Documentation

Complete reference for all Steam Screenshots functionality in Steamworks FFI.

## Overview

The `SteamScreenshotManager` provides access to the Steam Screenshots API, enabling you to capture screenshots, add them to the user's Steam library, and tag them with metadata like location, users, and Workshop items.

Screenshots can be captured in two ways:
1. **Overlay capture**: Using `triggerScreenshot()` to have Steam capture the screen (requires overlay)
2. **Manual capture**: Your game captures the image and uses `writeScreenshot()` or `addScreenshotToLibrary()` (works without overlay)

## Quick Reference

| Category | Functions | Description |
|----------|-----------|-------------|
| [Screenshot Capture](#screenshot-capture) | 3 | Add screenshots from files or raw data |
| [Screenshot Hooking](#screenshot-hooking) | 3 | Control screenshot handling |
| [Screenshot Tagging](#screenshot-tagging) | 3 | Tag screenshots with metadata |

**Total: 9 Functions**

---

## Screenshot Capture

Functions for capturing and adding screenshots to the Steam library.

### `addScreenshotToLibrary(filename, thumbnailFilename, width, height)`

Adds a screenshot to the user's Steam library from a file on disk.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamScreenshots_AddScreenshotToLibrary()` - Add screenshot from file

**Parameters:**
- `filename: string` - Path to the screenshot file (JPEG, TGA, or PNG)
- `thumbnailFilename: string | null` - Path to thumbnail (200px wide) or null for auto-generation
- `width: number` - Width of the image in pixels
- `height: number` - Height of the image in pixels

**Returns:** `ScreenshotHandle` - Handle for the screenshot, or `INVALID_SCREENSHOT_HANDLE` on failure

**Example:**
```typescript
import SteamworksSDK, { INVALID_SCREENSHOT_HANDLE } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Add screenshot without custom thumbnail
const handle = steam.screenshots.addScreenshotToLibrary(
  '/path/to/screenshot.png',
  null,  // Steam will generate thumbnail
  1920,
  1080
);

if (handle !== INVALID_SCREENSHOT_HANDLE) {
  console.log('Screenshot added with handle:', handle);
  steam.screenshots.setLocation(handle, 'Boss Arena');
}

// Add with custom thumbnail
const handle2 = steam.screenshots.addScreenshotToLibrary(
  '/path/to/screenshot.jpg',
  '/path/to/thumb_200px.jpg',
  2560,
  1440
);
```

**Notes:**
- Supported formats: JPEG, TGA, PNG
- If thumbnail is provided, it must be 200 pixels wide with same aspect ratio
- This method works without the Steam overlay
- The returned handle can be used to tag the screenshot

---

### `writeScreenshot(rgbData, width, height)`

Writes a screenshot to the user's Steam library from raw RGB pixel data.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamScreenshots_WriteScreenshot()` - Write raw RGB data as screenshot

**Parameters:**
- `rgbData: Buffer` - Buffer containing raw RGB pixel data (3 bytes per pixel, no alpha)
- `width: number` - Width of the image in pixels
- `height: number` - Height of the image in pixels

**Returns:** `ScreenshotHandle` - Handle for the screenshot, or `INVALID_SCREENSHOT_HANDLE` on failure

**Example:**
```typescript
// Capture from your renderer
const width = 1920;
const height = 1080;
const rgbData = myRenderer.captureScreenRGB();

// Or create programmatically
const rgbData = Buffer.alloc(width * height * 3);
for (let i = 0; i < rgbData.length; i += 3) {
  rgbData[i] = 255;     // R
  rgbData[i + 1] = 128; // G
  rgbData[i + 2] = 64;  // B
}

const handle = steam.screenshots.writeScreenshot(rgbData, width, height);

if (handle !== INVALID_SCREENSHOT_HANDLE) {
  steam.screenshots.setLocation(handle, 'Procedural Generation Test');
}
```

**Notes:**
- The image data must be in RGB format (3 bytes per pixel, no alpha channel)
- Buffer size should be exactly `width * height * 3` bytes
- This method works without the Steam overlay
- Useful for capturing from custom render targets

---

### `triggerScreenshot()`

Triggers the Steam overlay to take a screenshot.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamScreenshots_TriggerScreenshot()` - Trigger overlay screenshot

**Returns:** `void`

**Example:**
```typescript
// Add a screenshot button to your game
function onScreenshotButtonClick() {
  steam.screenshots.triggerScreenshot();
}

// Equivalent to user pressing the screenshot hotkey (F12 by default)
```

**Notes:**
- **Requires Steam overlay to be available**
- If screenshots are hooked via `hookScreenshots(true)`, this sends a callback instead
- Equivalent to the user pressing the screenshot hotkey

---

## Screenshot Hooking

Functions for controlling how screenshots are handled.

### `hookScreenshots(hook)`

Toggles whether your game handles screenshots or Steam does.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamScreenshots_HookScreenshots()` - Enable/disable screenshot hooking

**Parameters:**
- `hook: boolean` - `true` to handle screenshots yourself, `false` to let Steam handle them

**Returns:** `void`

**Example:**
```typescript
// Tell Steam we'll handle screenshots
steam.screenshots.hookScreenshots(true);

// In your screenshot callback handler:
function onScreenshotRequested() {
  // Capture from your render target
  const rgbData = myRenderer.captureScreenRGB();
  
  // Remove HUD elements if needed
  hideHUD();
  const cleanRgbData = myRenderer.captureScreenRGB();
  showHUD();
  
  // Add to Steam library
  const handle = steam.screenshots.writeScreenshot(cleanRgbData, 1920, 1080);
  steam.screenshots.setLocation(handle, getCurrentMapName());
}

// Later, restore default behavior
steam.screenshots.hookScreenshots(false);
```

**Notes:**
- When hooked, Steam will NOT automatically capture screenshots
- Your game receives a ScreenshotRequested_t callback instead
- Useful for capturing from specific render targets or removing HUD

---

### `isScreenshotsHooked()`

Checks if screenshots are currently hooked by your game.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamScreenshots_IsScreenshotsHooked()` - Check hook status

**Returns:** `boolean` - `true` if your game handles screenshots, `false` if Steam handles them

**Example:**
```typescript
const hooked = steam.screenshots.isScreenshotsHooked();

if (hooked) {
  console.log('Game is handling screenshots');
} else {
  console.log('Steam overlay handles screenshots');
}
```

---

## Screenshot Tagging

Functions for adding metadata to screenshots.

### `setLocation(handle, location)`

Sets the location metadata for a screenshot.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamScreenshots_SetLocation()` - Set screenshot location

**Parameters:**
- `handle: ScreenshotHandle` - Screenshot handle from capture functions
- `location: string` - Location string (e.g., map name, level name)

**Returns:** `boolean` - `true` if location was set successfully

**Example:**
```typescript
const handle = steam.screenshots.addScreenshotToLibrary(
  '/path/to/screenshot.jpg',
  null,
  1920,
  1080
);

if (handle !== INVALID_SCREENSHOT_HANDLE) {
  // Tag with game location
  steam.screenshots.setLocation(handle, 'World 3 - Lava Caves');
  
  // Or more detailed
  steam.screenshots.setLocation(handle, 'Level 5: Final Boss - Phase 2');
}
```

**Notes:**
- Location is displayed in the Steam screenshot viewer
- Helps users remember where screenshots were taken
- Can be called multiple times to update the location

---

### `tagUser(handle, steamId)`

Tags a Steam user as being visible in the screenshot.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamScreenshots_TagUser()` - Tag user in screenshot

**Parameters:**
- `handle: ScreenshotHandle` - Screenshot handle from capture functions
- `steamId: bigint` - Steam ID of the user to tag

**Returns:** `boolean` - `true` if user was tagged successfully

**Example:**
```typescript
const handle = steam.screenshots.addScreenshotToLibrary(
  '/path/to/group_photo.jpg',
  null,
  1920,
  1080
);

if (handle !== INVALID_SCREENSHOT_HANDLE) {
  // Tag friends visible in the screenshot
  const friends = steam.friends.getAllFriends();
  
  for (const friend of friends.slice(0, 5)) {
    steam.screenshots.tagUser(handle, BigInt(friend.steamId));
  }
}
```

**Notes:**
- Maximum 32 users can be tagged per screenshot
- Tagged users will see the screenshot on their profile
- Users can untag themselves from screenshots

---

### `tagPublishedFile(handle, publishedFileId)`

Tags a Workshop item as being visible in the screenshot.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamScreenshots_TagPublishedFile()` - Tag Workshop item

**Parameters:**
- `handle: ScreenshotHandle` - Screenshot handle from capture functions
- `publishedFileId: bigint` - Workshop item ID to tag

**Returns:** `boolean` - `true` if Workshop item was tagged successfully

**Example:**
```typescript
const handle = steam.screenshots.addScreenshotToLibrary(
  '/path/to/modded_screenshot.jpg',
  null,
  1920,
  1080
);

if (handle !== INVALID_SCREENSHOT_HANDLE) {
  // Tag the Workshop mods visible in this screenshot
  const customMapId = BigInt('123456789');
  const characterSkinId = BigInt('987654321');
  
  steam.screenshots.tagPublishedFile(handle, customMapId);
  steam.screenshots.tagPublishedFile(handle, characterSkinId);
  
  steam.screenshots.setLocation(handle, 'Custom Map: Epic Arena');
}
```

**Notes:**
- Maximum 32 Workshop items can be tagged per screenshot
- Tagged items will show the screenshot on their Workshop page
- Useful for showing mods/custom content in screenshots

---

## VR Screenshots

### `addVRScreenshotToLibrary(type, filename, vrFilename)`

Adds a VR screenshot to the user's Steam library.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamScreenshots_AddVRScreenshotToLibrary()` - Add VR screenshot

**Parameters:**
- `type: EVRScreenshotType` - Type of VR screenshot
- `filename: string` - Path to normal 2D image for library view
- `vrFilename: string` - Path to VR-specific image

**Returns:** `ScreenshotHandle` - Handle for the screenshot, or `INVALID_SCREENSHOT_HANDLE` on failure

**VR Screenshot Types:**
```typescript
enum EVRScreenshotType {
  None = 0,
  Mono = 1,
  Stereo = 2,
  MonoCubemap = 3,
  MonoPanorama = 4,
  StereoPanorama = 5
}
```

**Example:**
```typescript
import { EVRScreenshotType } from 'steamworks-ffi-node';

const handle = steam.screenshots.addVRScreenshotToLibrary(
  EVRScreenshotType.Stereo,
  '/path/to/preview.jpg',        // 2D preview for library
  '/path/to/stereo_capture.jpg'  // Actual stereo VR image
);

if (handle !== INVALID_SCREENSHOT_HANDLE) {
  steam.screenshots.setLocation(handle, 'VR Space Station');
}
```

---

## TypeScript Types

```typescript
// Screenshot handle type
type ScreenshotHandle = number;

// Invalid handle constant
const INVALID_SCREENSHOT_HANDLE: ScreenshotHandle = 0;

// VR screenshot types
enum EVRScreenshotType {
  None = 0,
  Mono = 1,
  Stereo = 2,
  MonoCubemap = 3,
  MonoPanorama = 4,
  StereoPanorama = 5
}

// Constants
const K_SCREENSHOT_MAX_TAGGED_USERS = 32;
const K_SCREENSHOT_MAX_TAGGED_PUBLISHED_FILES = 32;
const K_SCREENSHOT_THUMB_WIDTH = 200;
```

---

## Complete Example

```typescript
import SteamworksSDK, { 
  INVALID_SCREENSHOT_HANDLE,
  EVRScreenshotType 
} from 'steamworks-ffi-node';
import * as fs from 'fs';

async function screenshotExample() {
  const steam = SteamworksSDK.getInstance();
  steam.init({ appId: 480 });

  // Method 1: Add existing file
  const handle1 = steam.screenshots.addScreenshotToLibrary(
    './screenshots/epic_moment.png',
    null,
    1920,
    1080
  );

  if (handle1 !== INVALID_SCREENSHOT_HANDLE) {
    steam.screenshots.setLocation(handle1, 'Final Boss - Victory!');
  }

  // Method 2: Write raw RGB data
  const width = 800;
  const height = 600;
  const rgbData = Buffer.alloc(width * height * 3);
  
  // Create a gradient
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 3;
      rgbData[offset] = Math.floor((x / width) * 255);
      rgbData[offset + 1] = Math.floor((y / height) * 255);
      rgbData[offset + 2] = 128;
    }
  }

  const handle2 = steam.screenshots.writeScreenshot(rgbData, width, height);
  
  if (handle2 !== INVALID_SCREENSHOT_HANDLE) {
    steam.screenshots.setLocation(handle2, 'Procedural Art');
    
    // Tag some friends
    const friends = steam.friends.getAllFriends();
    if (friends.length > 0) {
      steam.screenshots.tagUser(handle2, BigInt(friends[0].steamId));
    }
  }

  // Method 3: Hook screenshots for custom handling
  steam.screenshots.hookScreenshots(true);
  
  // Check status
  console.log('Screenshots hooked:', steam.screenshots.isScreenshotsHooked());
  
  // Restore default
  steam.screenshots.hookScreenshots(false);

  steam.shutdown();
}

screenshotExample();
```

---

## Best Practices

1. **Use File-Based Methods When Possible**
   - `addScreenshotToLibrary()` is more efficient than `writeScreenshot()`
   - Save to disk first, then add to library

2. **Always Tag Screenshots**
   - Location helps users find screenshots later
   - Tag relevant Workshop items for discoverability

3. **Consider Hooking for Quality**
   - Hook screenshots to capture from clean render targets
   - Remove HUD elements for cleaner screenshots

4. **Handle Invalid Handles**
   - Always check for `INVALID_SCREENSHOT_HANDLE`
   - Operations may fail if Steam Cloud is unavailable

5. **Respect User Privacy**
   - Only tag users who are actually visible
   - Users can untag themselves

---

## Error Handling

```typescript
const handle = steam.screenshots.addScreenshotToLibrary(
  '/path/to/image.jpg',
  null,
  1920,
  1080
);

if (handle === INVALID_SCREENSHOT_HANDLE) {
  console.error('Failed to add screenshot');
  // Possible reasons:
  // - File doesn't exist or can't be read
  // - Invalid image format
  // - Steam Cloud not available
  // - Steam not initialized
  return;
}

// Safe to use handle
steam.screenshots.setLocation(handle, 'My Location');
```

---

## Overlay Requirements

| Function | Requires Overlay |
|----------|-----------------|
| `addScreenshotToLibrary()` | ❌ No |
| `writeScreenshot()` | ❌ No |
| `triggerScreenshot()` | ✅ Yes |
| `hookScreenshots()` | ❌ No |
| `isScreenshotsHooked()` | ❌ No |
| `setLocation()` | ❌ No |
| `tagUser()` | ❌ No |
| `tagPublishedFile()` | ❌ No |
| `addVRScreenshotToLibrary()` | ❌ No |

Most functions work without the overlay, making the Screenshots API suitable for headless or non-graphical environments.
