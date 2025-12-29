# Utils Manager API Documentation

Complete reference for all Steam Utils functionality in Steamworks FFI.

## Overview

The `SteamUtilsManager` provides access to the `ISteamUtils` interface, offering system utilities, device detection, image loading, overlay notification positioning, and helper functions.

Key features include:
1. **System Information**: Battery level, IP country, server time, activity tracking
2. **Device Detection**: Steam Deck, Big Picture Mode, VR, Steam China
3. **Overlay Notifications**: Position and inset control
4. **Image Loading**: Load avatars and icons from Steam's cache
5. **Gamepad Text Input**: Virtual keyboards for controller input
6. **Text Filtering**: Built-in profanity filter for user-generated content

## Quick Reference

| Category | Functions | Description |
|----------|-----------|-------------|
| [System Information](#system-information) | 9 | Battery, country, time, activity |
| [Device Detection](#device-detection) | 6 | Steam Deck, Big Picture, VR, China |
| [Overlay Notifications](#overlay-notifications) | 3 | Position and inset control |
| [Image Loading](#image-loading) | 2 | Load avatar/icon RGBA data |
| [Gamepad Text Input](#gamepad-text-input) | 5 | Virtual keyboard dialogs |
| [Text Filtering](#text-filtering) | 2 | Profanity filtering |
| [Utility Methods](#utility-methods) | 2 | IPC count, VR dashboard |

**Total: 29 Functions**

---

## System Information

Functions for retrieving system and environment information.

### `getIPCountry()`

Gets the 2-letter country code for the user's IP address.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_GetIPCountry()` - Get country code from IP

**Returns:** `string` - Two-letter country code (e.g., "US", "GB", "JP"), or empty string on failure

**Example:**
```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

const country = steam.utils.getIPCountry();
console.log(`User country: ${country}`); // e.g., "US", "GB", "JP"

// Load region-specific content
if (['JP', 'KR', 'CN', 'TW'].includes(country)) {
  loadAsianLocalization();
}
```

**Notes:**
- Determined by Steam's GeoIP database based on external IP
- Useful for region-specific content or analytics

---

### `getCurrentBatteryPower()`

Gets the current battery power level of the device.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_GetCurrentBatteryPower()` - Get battery percentage

**Returns:** `number` - Battery percentage (0-100), or 255 (`BATTERY_POWER_AC`) if on AC power

**Example:**
```typescript
import { BATTERY_POWER_AC } from 'steamworks-ffi-node';

const battery = steam.utils.getCurrentBatteryPower();

if (battery === BATTERY_POWER_AC) {
  console.log('Device is connected to AC power');
} else {
  console.log(`Battery: ${battery}%`);
  if (battery < 20) {
    showLowBatteryWarning();
  }
}
```

**Notes:**
- Returns 255 (`BATTERY_POWER_AC`) when device is plugged in
- Useful for power-saving optimizations on portable devices

---

### `getAppID()`

Gets the current App ID of the running application.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_GetAppID()` - Get current app ID

**Returns:** `number` - The App ID, or 0 if not initialized

**Example:**
```typescript
const appId = steam.utils.getAppID();
console.log(`Running App ID: ${appId}`);
```

---

### `getSecondsSinceAppActive()`

Gets the number of seconds since the application became active.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_GetSecondsSinceAppActive()` - Get app idle time

**Returns:** `number` - Seconds since the app was last active

**Example:**
```typescript
const idleTime = steam.utils.getSecondsSinceAppActive();
if (idleTime > 300) {
  pauseExpensiveOperations();
}
```

---

### `getSecondsSinceComputerActive()`

Gets the number of seconds since the computer was last active.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_GetSecondsSinceComputerActive()` - Get computer idle time

**Returns:** `number` - Seconds since last user input

**Example:**
```typescript
const computerIdle = steam.utils.getSecondsSinceComputerActive();
if (computerIdle > 600) {
  showIdleScreen();
  pauseGame();
}
```

**Notes:**
- Reflects user input activity (mouse, keyboard)
- Useful for detecting AFK state

---

### `getServerRealTime()`

Gets the current time from Steam servers.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_GetServerRealTime()` - Get Steam server time

**Returns:** `number` - Unix timestamp in seconds

**Example:**
```typescript
const serverTime = steam.utils.getServerRealTime();
const date = new Date(serverTime * 1000);
console.log(`Steam server time: ${date.toISOString()}`);
```

**Notes:**
- More reliable than local time for multiplayer synchronization
- Returns Unix timestamp (seconds since Jan 1, 1970)

---

### `getServerRealTimeAsDate()`

Gets the current Steam server time as a JavaScript Date object.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_GetServerRealTime()` - Get Steam server time (wrapped)

**Returns:** `Date` - Date object representing Steam server time

**Example:**
```typescript
const serverDate = steam.utils.getServerRealTimeAsDate();
console.log(`Server time: ${serverDate.toISOString()}`);
console.log(`Local time: ${new Date().toISOString()}`);
```

**Notes:**
- Convenience wrapper around `getServerRealTime()`

---

### `getSteamUILanguage()`

Gets the Steam client UI language.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_GetSteamUILanguage()` - Get UI language

**Returns:** `string` - Language code (e.g., "english", "french", "japanese")

**Example:**
```typescript
const uiLanguage = steam.utils.getSteamUILanguage();
console.log(`Steam UI language: ${uiLanguage}`);
```

**Notes:**
- May differ from game language setting
- Common codes: "english", "french", "german", "spanish", "japanese", "korean", "schinese", "tchinese"

---

### `getConnectedUniverse()`

Gets the connected Steam universe.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_GetConnectedUniverse()` - Get universe ID

**Returns:** `number` - Universe ID (1 = Public, 2 = Beta, 3 = Internal, 4 = Dev)

**Example:**
```typescript
const universe = steam.utils.getConnectedUniverse();
const universeNames: { [key: number]: string } = {
  0: 'Invalid',
  1: 'Public',
  2: 'Beta',
  3: 'Internal',
  4: 'Dev'
};
console.log(`Connected to: ${universeNames[universe]}`);
```

**Notes:**
- Most users will be connected to Public universe (1)

---

## Device Detection

Functions for detecting device type and environment.

### `isSteamRunningOnSteamDeck()`

Checks if running on a Steam Deck device.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_IsSteamRunningOnSteamDeck()` - Check Steam Deck

**Returns:** `boolean` - `true` if running on Steam Deck

**Example:**
```typescript
if (steam.utils.isSteamRunningOnSteamDeck()) {
  console.log('Running on Steam Deck!');
  setTargetFramerate(40);        // Better battery life
  enableTouchControls();
  optimizeForHandheld();
  setGraphicsPreset('deck');
}
```

**Notes:**
- Use for Steam Deck-specific optimizations
- Consider battery life, screen size, and input methods

---

### `isSteamInBigPictureMode()`

Checks if Steam is running in Big Picture Mode.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_IsSteamInBigPictureMode()` - Check Big Picture Mode

**Returns:** `boolean` - `true` if Big Picture Mode is active

**Example:**
```typescript
if (steam.utils.isSteamInBigPictureMode()) {
  console.log('Big Picture Mode - using controller UI');
  useControllerUI();
  increaseFontSizes();
  enlargeButtons();
}
```

**Notes:**
- Indicates controller-oriented Steam UI
- Common on Steam Deck and living room setups

---

### `isVRHeadsetStreamingEnabled()`

Checks if VR headset streaming is enabled.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_IsVRHeadsetStreamingEnabled()` - Check VR streaming

**Returns:** `boolean` - `true` if VR streaming is enabled

**Example:**
```typescript
if (steam.utils.isVRHeadsetStreamingEnabled()) {
  console.log('VR streaming is enabled');
}
```

---

### `setVRHeadsetStreamingEnabled(enabled)`

Enables or disables VR headset streaming.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_SetVRHeadsetStreamingEnabled()` - Set VR streaming

**Parameters:**
- `enabled: boolean` - Whether to enable VR streaming

**Returns:** `void`

**Example:**
```typescript
// Enable VR streaming
steam.utils.setVRHeadsetStreamingEnabled(true);

// Disable VR streaming
steam.utils.setVRHeadsetStreamingEnabled(false);
```

---

### `isSteamChinaLauncher()`

Checks if running on Steam China launcher.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_IsSteamChinaLauncher()` - Check Steam China

**Returns:** `boolean` - `true` if using Steam China

**Example:**
```typescript
if (steam.utils.isSteamChinaLauncher()) {
  console.log('Running on Steam China');
  loadChinaCompliantContent();
}
```

---

### `getDeviceEnvironment()`

Gets comprehensive device environment information (convenience method).

**Steamworks SDK Functions:**
- Multiple ISteamUtils functions combined

**Returns:** `DeviceEnvironment`

**Type:**
```typescript
interface DeviceEnvironment {
  isSteamDeck: boolean;
  isBigPictureMode: boolean;
  isVRStreamingEnabled: boolean;
  isSteamChina: boolean;
  isOnBattery: boolean;
  batteryPercent: number | null;  // null if on AC power
  ipCountry: string;
  steamUILanguage: string;
  connectedUniverse: number;
}
```

**Example:**
```typescript
const env = steam.utils.getDeviceEnvironment();

console.log('Device Environment:');
console.log(`  Steam Deck:      ${env.isSteamDeck}`);
console.log(`  Big Picture:     ${env.isBigPictureMode}`);
console.log(`  VR Streaming:    ${env.isVRStreamingEnabled}`);
console.log(`  Steam China:     ${env.isSteamChina}`);
console.log(`  On Battery:      ${env.isOnBattery}`);
console.log(`  Battery Percent: ${env.batteryPercent !== null ? env.batteryPercent + '%' : 'N/A (AC)'}`);
console.log(`  IP Country:      ${env.ipCountry}`);
console.log(`  UI Language:     ${env.steamUILanguage}`);
console.log(`  Universe:        ${env.connectedUniverse}`);
```

**Notes:**
- Convenience method that gathers all device info at once
- Useful for initialization and logging

---

## Overlay Notifications

Functions for controlling Steam overlay notification positioning.

### `setOverlayNotificationPosition(position)`

Sets the position for Steam overlay notifications.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_SetOverlayNotificationPosition()` - Set notification corner

**Parameters:**
- `position: ENotificationPosition` - Corner of the screen for notifications

**Enum Values:**
```typescript
enum ENotificationPosition {
  TopLeft = 0,
  TopRight = 1,
  BottomLeft = 2,
  BottomRight = 3
}
```

**Returns:** `void`

**Example:**
```typescript
import { ENotificationPosition } from 'steamworks-ffi-node';

// Move notifications to bottom left to avoid HUD conflicts
steam.utils.setOverlayNotificationPosition(ENotificationPosition.BottomLeft);

// Or top right for different UI layout
steam.utils.setOverlayNotificationPosition(ENotificationPosition.TopRight);
```

**Notes:**
- Controls where Steam notifications (achievements, screenshots, etc.) appear
- Default is typically bottom-right

---

### `setOverlayNotificationInset(horizontalInset, verticalInset)`

Sets an inset for overlay notifications from the corner.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_SetOverlayNotificationInset()` - Set notification inset

**Parameters:**
- `horizontalInset: number` - Pixels to inset horizontally from the corner
- `verticalInset: number` - Pixels to inset vertically from the corner

**Returns:** `void`

**Example:**
```typescript
// Inset notifications 100px from corner to avoid HUD elements
steam.utils.setOverlayNotificationInset(100, 50);

// Reset to corner
steam.utils.setOverlayNotificationInset(0, 0);
```

**Notes:**
- Use to fine-tune notification position away from game UI elements

---

### `overlayNeedsPresent()`

Checks if the overlay needs a present call.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_BOverlayNeedsPresent()` - Check overlay present

**Returns:** `boolean` - `true` if overlay content needs to be presented

**Example:**
```typescript
// In your render loop
if (steam.utils.overlayNeedsPresent()) {
  // Ensure Steam overlay is rendered
  forceOverlayRender();
}
```

**Notes:**
- Returns true if there's an overlay (notification popup) that needs rendering
- Useful for games with custom rendering loops

---

## Image Loading

Functions for loading images from Steam's image cache.

### `getImageSize(imageHandle)`

Gets the size of an image from Steam's image cache.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_GetImageSize()` - Get image dimensions

**Parameters:**
- `imageHandle: number` - Image handle from other Steam APIs (e.g., avatar handles)

**Returns:** `ImageSize | null`

**Type:**
```typescript
interface ImageSize {
  width: number;
  height: number;
}
```

**Example:**
```typescript
// Get avatar handle from friends API
const avatarHandle = steam.friends.getSmallFriendAvatar(steamId);

if (avatarHandle > 0) {
  const size = steam.utils.getImageSize(avatarHandle);
  if (size) {
    console.log(`Avatar size: ${size.width}x${size.height}`);
  }
}
```

**Notes:**
- Image handles come from other Steam APIs (ISteamFriends, ISteamUserStats)
- Returns null for invalid handles

---

### `getImageRGBA(imageHandle)`

Gets the RGBA pixel data for an image from Steam's image cache.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_GetImageSize()` - Get dimensions first
- `SteamAPI_ISteamUtils_GetImageRGBA()` - Load RGBA pixel data

**Parameters:**
- `imageHandle: number` - Image handle from other Steam APIs

**Returns:** `ImageRGBA | null`

**Type:**
```typescript
interface ImageRGBA {
  width: number;
  height: number;
  data: Buffer;  // Raw RGBA pixels (4 bytes per pixel)
}
```

**Example:**
```typescript
// Load avatar image
const avatarHandle = steam.friends.getMediumFriendAvatar(steamId);
const image = steam.utils.getImageRGBA(avatarHandle);

if (image) {
  console.log(`Loaded ${image.width}x${image.height} image`);
  console.log(`Buffer size: ${image.data.length} bytes`);
  console.log(`Expected: ${image.width * image.height * 4} bytes`);
  
  // Each pixel is 4 bytes: R, G, B, A
  // Use with canvas, save to file, convert to base64, etc.
}
```

**Notes:**
- Data is RGBA format (4 bytes per pixel)
- Buffer size is `width * height * 4` bytes
- First calls `getImageSize()` internally to determine buffer size

---

## Gamepad Text Input

Functions for showing virtual keyboards for gamepad/controller input.

### `showGamepadTextInput(inputMode, lineMode, description, maxCharacters, existingText)`

Opens the full-screen gamepad text input dialog.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_ShowGamepadTextInput()` - Show virtual keyboard

**Parameters:**
- `inputMode: EGamepadTextInputMode` - Normal or password input mode
- `lineMode: EGamepadTextInputLineMode` - Single or multiple lines
- `description: string` - Description text shown above the input field
- `maxCharacters: number` - Maximum number of characters allowed
- `existingText: string` - Pre-filled text in the input field (optional)

**Enum Values:**
```typescript
enum EGamepadTextInputMode {
  Normal = 0,    // Visible text
  Password = 1   // Hidden text
}

enum EGamepadTextInputLineMode {
  SingleLine = 0,
  MultipleLines = 1
}
```

**Returns:** `boolean` - `true` if the dialog was successfully opened

**Example:**
```typescript
import { EGamepadTextInputMode, EGamepadTextInputLineMode } from 'steamworks-ffi-node';

// Show text input for player name
const opened = steam.utils.showGamepadTextInput(
  EGamepadTextInputMode.Normal,
  EGamepadTextInputLineMode.SingleLine,
  'Enter your player name',
  32,
  'Player1'  // Pre-filled text
);

if (opened) {
  // Wait for GamepadTextInputDismissed_t callback
  // Then retrieve text with getEnteredGamepadTextInput()
}
```

**Notes:**
- Shows a Steam virtual keyboard for entering text using a gamepad
- Retrieve result via callback or polling

---

### `getEnteredGamepadTextLength()`

Gets the length of the text entered in the gamepad text input dialog.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_GetEnteredGamepadTextLength()` - Get text length

**Returns:** `number` - Length of entered text (including null terminator)

**Example:**
```typescript
const length = steam.utils.getEnteredGamepadTextLength();
console.log(`User entered ${length} characters`);
```

---

### `getEnteredGamepadTextInput(maxLength)`

Gets the text entered in the gamepad text input dialog.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_GetEnteredGamepadTextInput()` - Get entered text

**Parameters:**
- `maxLength: number` - Maximum length of text to retrieve (default: 256)

**Returns:** `string` - The entered text, or empty string on failure

**Example:**
```typescript
// After GamepadTextInputDismissed_t callback
const length = steam.utils.getEnteredGamepadTextLength();
if (length > 0) {
  const text = steam.utils.getEnteredGamepadTextInput(length);
  console.log(`User entered: ${text}`);
  setPlayerName(text);
}
```

---

### `showFloatingGamepadTextInput(mode, textFieldX, textFieldY, textFieldWidth, textFieldHeight)`

Shows a floating gamepad text input panel.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_ShowFloatingGamepadTextInput()` - Show floating keyboard

**Parameters:**
- `mode: EFloatingGamepadTextInputMode` - Keyboard mode
- `textFieldX: number` - X position of the text field in screen pixels
- `textFieldY: number` - Y position of the text field in screen pixels
- `textFieldWidth: number` - Width of the text field
- `textFieldHeight: number` - Height of the text field

**Enum Values:**
```typescript
enum EFloatingGamepadTextInputMode {
  SingleLine = 0,
  MultipleLines = 1,
  Email = 2,
  Numeric = 3
}
```

**Returns:** `boolean` - `true` if the floating keyboard was shown

**Example:**
```typescript
import { EFloatingGamepadTextInputMode } from 'steamworks-ffi-node';

// Show floating keyboard near chat input field
steam.utils.showFloatingGamepadTextInput(
  EFloatingGamepadTextInputMode.SingleLine,
  100,  // x position
  500,  // y position
  400,  // width
  30    // height
);
```

**Notes:**
- Unlike `showGamepadTextInput()`, this shows a smaller, floating keyboard
- Useful for in-game chat without covering the whole screen

---

### `dismissFloatingGamepadTextInput()`

Dismisses the floating gamepad text input panel.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_DismissFloatingGamepadTextInput()` - Hide keyboard

**Returns:** `boolean` - `true` if the panel was dismissed

**Example:**
```typescript
// Close floating keyboard when done
steam.utils.dismissFloatingGamepadTextInput();
```

---

## Text Filtering

Functions for filtering user-generated content.

### `initFilterText(unFilterOptions)`

Initializes the text filtering system.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_InitFilterText()` - Initialize filter

**Parameters:**
- `unFilterOptions: number` - Reserved, pass 0 (default)

**Returns:** `boolean` - `true` if initialization succeeded

**Example:**
```typescript
// Initialize text filtering (once at startup)
const initialized = steam.utils.initFilterText();
if (initialized) {
  console.log('Text filtering ready');
}
```

**Notes:**
- Must be called before using `filterText()`
- Loads filtering dictionaries

---

### `filterText(context, sourceSteamID, inputMessage, maxOutputLength)`

Filters user-generated text for profanity and slurs.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_FilterText()` - Filter text content

**Parameters:**
- `context: ETextFilteringContext` - Context where text will be used
- `sourceSteamID: string` - Steam ID of the user who created the text
- `inputMessage: string` - Text to filter
- `maxOutputLength: number` - Maximum length of output buffer (default: 256)

**Enum Values:**
```typescript
enum ETextFilteringContext {
  Unknown = 0,
  GameContent = 1,
  Chat = 2,
  Name = 3
}
```

**Returns:** `string` - Filtered text with profanity replaced by asterisks

**Example:**
```typescript
import { ETextFilteringContext } from 'steamworks-ffi-node';

// Initialize first
steam.utils.initFilterText();

// Filter a chat message
const rawMessage = 'Hello everyone!';
const filteredMessage = steam.utils.filterText(
  ETextFilteringContext.Chat,
  senderSteamId,
  rawMessage,
  256
);

displayChatMessage(filteredMessage);
```

**Notes:**
- Filtered characters are replaced with asterisks
- Different contexts may have different filtering rules

---

## Utility Methods

Additional utility functions.

### `getIPCCallCount()`

Gets the number of IPC calls made since the last call to this function.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_GetIPCCallCount()` - Get IPC call count

**Returns:** `number` - IPC call count since last query

**Example:**
```typescript
// Performance monitoring
const initialCount = steam.utils.getIPCCallCount();

// ... make some API calls ...
steam.utils.getIPCountry();
steam.utils.getAppID();
steam.friends.getPersonaName();

const afterCount = steam.utils.getIPCCallCount();
console.log(`Made ${afterCount - initialCount} IPC calls`);
```

**Notes:**
- Useful for debugging and performance monitoring
- Count resets each time you call this function

---

### `startVRDashboard()`

Launches the Steam VR dashboard.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_StartVRDashboard()` - Open VR dashboard

**Returns:** `void`

**Example:**
```typescript
// Open SteamVR dashboard
steam.utils.startVRDashboard();
```

**Notes:**
- Brings up the SteamVR dashboard overlay if SteamVR is running

---

### `isOnBattery()`

Checks if the device is running on battery power (convenience method).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_GetCurrentBatteryPower()` - Get battery (wrapped)

**Returns:** `boolean` - `true` if running on battery

**Example:**
```typescript
if (steam.utils.isOnBattery()) {
  enablePowerSavingMode();
  reduceGraphicsQuality();
}
```

**Notes:**
- Convenience wrapper around `getCurrentBatteryPower()`

---

## TypeScript Types

```typescript
// Notification position
enum ENotificationPosition {
  TopLeft = 0,
  TopRight = 1,
  BottomLeft = 2,
  BottomRight = 3
}

// Gamepad text input modes
enum EGamepadTextInputMode {
  Normal = 0,
  Password = 1
}

enum EGamepadTextInputLineMode {
  SingleLine = 0,
  MultipleLines = 1
}

enum EFloatingGamepadTextInputMode {
  SingleLine = 0,
  MultipleLines = 1,
  Email = 2,
  Numeric = 3
}

// Text filtering context
enum ETextFilteringContext {
  Unknown = 0,
  GameContent = 1,
  Chat = 2,
  Name = 3
}

// Image types
interface ImageSize {
  width: number;
  height: number;
}

interface ImageRGBA {
  width: number;
  height: number;
  data: Buffer;
}

// Device environment
interface DeviceEnvironment {
  isSteamDeck: boolean;
  isBigPictureMode: boolean;
  isVRStreamingEnabled: boolean;
  isSteamChina: boolean;
  isOnBattery: boolean;
  batteryPercent: number | null;
  ipCountry: string;
  steamUILanguage: string;
  connectedUniverse: number;
}

// Constants
const BATTERY_POWER_AC = 255;  // Returned when on AC power
```

---

## Complete Example

```typescript
import SteamworksSDK, { 
  ENotificationPosition,
  BATTERY_POWER_AC 
} from 'steamworks-ffi-node';

async function utilsExample() {
  const steam = SteamworksSDK.getInstance();
  steam.init({ appId: 480 });

  // Get complete device environment
  const env = steam.utils.getDeviceEnvironment();
  
  console.log('=== Device Environment ===');
  console.log(`Country: ${env.ipCountry}`);
  console.log(`Language: ${env.steamUILanguage}`);
  console.log(`Steam Deck: ${env.isSteamDeck}`);
  console.log(`Big Picture: ${env.isBigPictureMode}`);
  console.log(`On Battery: ${env.isOnBattery}`);
  if (env.batteryPercent !== null) {
    console.log(`Battery: ${env.batteryPercent}%`);
  }

  // Configure for Steam Deck
  if (env.isSteamDeck) {
    console.log('\n=== Steam Deck Optimizations ===');
    setGraphicsQuality('deck');
    setTargetFramerate(40);
    enableTouchInput();
  }

  // Configure for Big Picture / TV
  if (env.isBigPictureMode) {
    console.log('\n=== Big Picture Mode ===');
    useControllerInterface();
    scaleFonts(1.5);
  }

  // Battery optimization
  if (env.isOnBattery && env.batteryPercent !== null && env.batteryPercent < 30) {
    console.log('\n=== Low Battery Mode ===');
    enablePowerSaving();
  }

  // Position notifications to avoid HUD
  steam.utils.setOverlayNotificationPosition(ENotificationPosition.TopRight);
  steam.utils.setOverlayNotificationInset(100, 100);
  console.log('\nNotifications positioned to top-right with 100px inset');

  // Load avatar image
  const mySteamId = steam.getStatus().steamId;
  const avatarHandle = steam.friends.getMediumFriendAvatar(mySteamId);
  if (avatarHandle > 0) {
    const image = steam.utils.getImageRGBA(avatarHandle);
    if (image) {
      console.log(`\nLoaded avatar: ${image.width}x${image.height} (${image.data.length} bytes)`);
    }
  }

  // Server time
  const serverDate = steam.utils.getServerRealTimeAsDate();
  console.log(`\nSteam server time: ${serverDate.toISOString()}`);

  // IPC monitoring
  const ipcCount = steam.utils.getIPCCallCount();
  console.log(`IPC calls made: ${ipcCount}`);

  steam.shutdown();
}

utilsExample();
```

---

## Best Practices

1. **Check Steam Deck First**
   - Use `isSteamRunningOnSteamDeck()` to enable handheld optimizations
   - Consider 40Hz framerate for better battery life
   - Enable touch/trackpad controls

2. **Handle Battery Gracefully**
   - Check `isOnBattery()` to enable power-saving features
   - Monitor battery percentage for low-power warnings
   - Reduce effects and framerate when on battery

3. **Position Notifications Carefully**
   - Use `setOverlayNotificationPosition()` to avoid UI conflicts
   - Add insets with `setOverlayNotificationInset()` for fine-tuning

4. **Cache Device Environment**
   - Call `getDeviceEnvironment()` once at startup
   - Don't poll these functions every frame

5. **Initialize Text Filtering Once**
   - Call `initFilterText()` at startup
   - Reuse for all filtering operations

---

## Error Handling

```typescript
// Most functions return sensible defaults on error
const country = steam.utils.getIPCountry();  // Empty string on error
const battery = steam.utils.getCurrentBatteryPower();  // 255 (AC) on error
const isSteamDeck = steam.utils.isSteamRunningOnSteamDeck();  // false on error

// Image loading returns null on error
const image = steam.utils.getImageRGBA(avatarHandle);
if (image === null) {
  console.log('Failed to load image or invalid handle');
  useDefaultAvatar();
}

// Text filtering returns original text on error
const filtered = steam.utils.filterText(context, steamId, text, 256);
// If filtering fails, returns the original unfiltered text
```

---

## Testing

Comprehensive test suite available:

```bash
# TypeScript test
npm run test:utils:ts

# JavaScript test  
npm run test:utils:js
```

**Test Coverage (29 functions):**
- ✅ System Information (IP country, battery, server time, activity)
- ✅ Device Detection (Steam Deck, Big Picture, VR, China)
- ✅ Overlay Notifications (position, inset)
- ✅ Image Loading (size, RGBA data)
- ✅ IPC Monitoring
- ✅ Text Filtering
- ✅ Convenience Methods (getDeviceEnvironment, isOnBattery)

**Test Files:**
- `tests/ts/test-utils.ts` - TypeScript comprehensive test
- `tests/js/test-utils.js` - JavaScript comprehensive test

---

## Notes

### Platform Support
- ✅ Windows
- ✅ macOS  
- ✅ Linux
- Steam Deck detection works on all platforms (returns false when not on Deck)

### Battery Detection
- Returns `255` (`BATTERY_POWER_AC`) on desktops without batteries
- Accurate percentage on laptops, Steam Deck, and other portable devices

### Image Loading Performance
- Images are loaded from Steam's cache
- First access may require downloading from network
- Avatar handles of 0 or -1 indicate no avatar available

---

## Related Documentation

- [Friends Manager](./FRIENDS_MANAGER.md) - Get avatar handles for image loading
- [Overlay Manager](./OVERLAY_MANAGER.md) - Overlay-related functions
- [Steam API Core](./STEAM_API_CORE.md) - Core Steam initialization

---

## Steamworks SDK Reference

**Interface:** `ISteamUtils` (v010)

**Official Documentation:** [Steamworks ISteamUtils Documentation](https://partner.steamgames.com/doc/api/ISteamUtils)

**SDK Functions Used:**
- `SteamAPI_ISteamUtils_GetIPCountry()`
- `SteamAPI_ISteamUtils_GetCurrentBatteryPower()`
- `SteamAPI_ISteamUtils_GetAppID()`
- `SteamAPI_ISteamUtils_GetSecondsSinceAppActive()`
- `SteamAPI_ISteamUtils_GetSecondsSinceComputerActive()`
- `SteamAPI_ISteamUtils_GetServerRealTime()`
- `SteamAPI_ISteamUtils_GetSteamUILanguage()`
- `SteamAPI_ISteamUtils_GetConnectedUniverse()`
- `SteamAPI_ISteamUtils_IsSteamRunningOnSteamDeck()`
- `SteamAPI_ISteamUtils_IsSteamInBigPictureMode()`
- `SteamAPI_ISteamUtils_IsVRHeadsetStreamingEnabled()`
- `SteamAPI_ISteamUtils_SetVRHeadsetStreamingEnabled()`
- `SteamAPI_ISteamUtils_IsSteamChinaLauncher()`
- `SteamAPI_ISteamUtils_SetOverlayNotificationPosition()`
- `SteamAPI_ISteamUtils_SetOverlayNotificationInset()`
- `SteamAPI_ISteamUtils_BOverlayNeedsPresent()`
- `SteamAPI_ISteamUtils_GetImageSize()`
- `SteamAPI_ISteamUtils_GetImageRGBA()`
- `SteamAPI_ISteamUtils_ShowGamepadTextInput()`
- `SteamAPI_ISteamUtils_GetEnteredGamepadTextLength()`
- `SteamAPI_ISteamUtils_GetEnteredGamepadTextInput()`
- `SteamAPI_ISteamUtils_ShowFloatingGamepadTextInput()`
- `SteamAPI_ISteamUtils_DismissFloatingGamepadTextInput()`
- `SteamAPI_ISteamUtils_InitFilterText()`
- `SteamAPI_ISteamUtils_FilterText()`
- `SteamAPI_ISteamUtils_GetIPCCallCount()`
- `SteamAPI_ISteamUtils_StartVRDashboard()`
