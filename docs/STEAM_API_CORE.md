# SteamAPICore Documentation

The `SteamAPICore` module manages the Steam API lifecycle, including initialization, shutdown, and callback processing. It serves as the foundation for all Steam operations in the modular steamworks-ffi-node architecture.

## Overview

`SteamAPICore` is responsible for:
- Ensuring application was launched through Steam (`restartAppIfNecessary`)
- Initializing the Steam API connection
- Managing Steam interface handles (UserStats, User)
- Processing Steam callbacks
- Checking Steam client status
- Shutting down the Steam API cleanly

## API Reference

### `setSdkPath(customSdkPath: string): void`

Set custom SDK path (optional).

Must be called **BEFORE** `restartAppIfNecessary()` or `init()` if using a custom SDK location.
The path should be relative to the project root.

**Parameters:**
- `customSdkPath` (string) - Path to the steamworks_sdk folder (e.g., 'vendor/steamworks_sdk')

**Example:**
```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();

// IMPORTANT: Set SDK path BEFORE any Steam operations
steam.setSdkPath('vendor/steamworks_sdk');

// Now restartAppIfNecessary() will use the custom path
if (steam.restartAppIfNecessary(480)) {
  process.exit(0);
}

steam.init({ appId: 480 });
```

**Custom SDK Path Examples:**
```typescript
// Vendor folder organization
steam.setSdkPath('vendor/steamworks_sdk');

// Nested SDK structure
steam.setSdkPath('libs/sdk/steamworks');

// Monorepo configuration
steam.setSdkPath('packages/game/steamworks_sdk');
```

---

### `setDebug(enabled: boolean): void`

Enable or disable debug logging.

Controls debug output for Steam API operations. When enabled, displays detailed
information about SDK loading, initialization, and internal operations.
Errors and warnings are always shown regardless of debug mode.

Must be called **BEFORE** `restartAppIfNecessary()` or `init()` to see early initialization logs.

**Parameters:**
- `enabled` (boolean) - `true` to enable debug logs, `false` to disable (default: false)

**Example:**
```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();

// Enable debug mode to see detailed logs
steam.setDebug(true);

// Set custom SDK path (debug logs will show path resolution)
steam.setSdkPath('vendor/steamworks_sdk');

// Check restart requirement (debug logs will show library loading)
if (steam.restartAppIfNecessary(480)) {
  process.exit(0);
}

// Initialize (debug logs will show initialization steps)
steam.init({ appId: 480 });

// Disable debug logs after initialization if desired
steam.setDebug(false);
```

**What it does:**
- Controls visibility of debug-level log messages
- Shows SDK path resolution and library loading details
- Displays initialization steps and interface setup
- Shows shutdown progress
- **Always displays errors and warnings** regardless of debug setting

**Benefits:**
- **Development**: See detailed initialization and SDK loading information
- **Production**: Disable debug logs to reduce noise
- **Troubleshooting**: Diagnose SDK path issues and initialization problems
- **Flexibility**: Toggle at any point during runtime

**Debug Log Examples:**
```
[Steamworks] Debug mode enabled
[Steamworks] Using custom SDK path: vendor/steamworks_sdk
[Steamworks] Loading Steamworks SDK from: /path/to/vendor/steamworks_sdk/redistributable_bin/osx/libsteam_api.dylib
[Steamworks] Initializing Steam API...
[Steamworks] Requesting current stats from Steam...
[Steamworks] Steam API initialized successfully!
[Steamworks] Connected to Steam for App ID: 480
```

---

### `init(options: SteamInitOptions): boolean`

Initialize the Steam API and connect to the Steam client.

**Steamworks SDK Functions:**
- `SteamAPI_Init()` - Initialize Steam API
- `SteamAPI_SteamUserStats_v013()` - Get UserStats interface  
- `SteamAPI_SteamUser_v023()` - Get User interface
- `SteamAPI_ISteamUserStats_RequestCurrentStats()` - Request current stats
- `SteamAPI_IsSteamRunning()` - Check Steam client status
- `SteamAPI_ISteamUser_GetSteamID()` - Get user's Steam ID

**Parameters:**
```typescript
interface SteamInitOptions {
  appId: number;  // Your Steam Application ID
}
```

**Returns:** `boolean` - `true` if initialization successful, `false` otherwise

**Example:**
```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();

// Default SDK location (steamworks_sdk/ in project root)
const success = steam.init({ appId: 480 });

if (success) {
  console.log('✅ Connected to Steam!');
} else {
  console.error('❌ Failed to connect to Steam');
}
```

**With Custom SDK Path:**
```typescript
const steam = SteamworksSDK.getInstance();

// Set custom SDK path BEFORE init()
steam.setSdkPath('vendor/steamworks_sdk');

// Ensure app launched through Steam
if (steam.restartAppIfNecessary(480)) {
  process.exit(0);
}

// Now initialize with custom SDK location
const success = steam.init({ appId: 480 });
```

**What it does:**
1. Sets `SteamAppId` environment variable
2. Loads the Steamworks SDK library via FFI from custom path (if set via setSdkPath()) or default locations
3. Calls `SteamAPI_Init()` to connect to Steam client
4. Retrieves interface handles for UserStats and User
5. Requests current stats from Steam servers via `RequestCurrentStats()`
6. Processes initial Steam callbacks

**Requirements:**
- Steam client must be running
- User must be logged in
- Valid Steam App ID

---

### `shutdown(): void`

Shutdown the Steam API connection and clean up resources.

**Steamworks SDK Functions:**
- `SteamAPI_Shutdown()` - Disconnect from Steam

**Example:**
```typescript
steam.shutdown();
console.log('Steam API disconnected');
```

**What it does:**
1. Calls `SteamAPI_Shutdown()` to disconnect
2. Cleans up interface handles
3. Resets initialization state

**Best Practice:**
Always call `shutdown()` before your application exits:

```typescript
process.on('exit', () => {
  steam.shutdown();
});

process.on('SIGINT', () => {
  steam.shutdown();
  process.exit(0);
});
```

---

### `getStatus(): SteamStatus`

Get current Steam API status and user information.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_GetSteamID()` - Get user's Steam ID

**Returns:**
```typescript
interface SteamStatus {
  initialized: boolean;  // Whether API is initialized
  appId: number;        // Current Steam App ID
  steamId: string;      // User's Steam ID (64-bit as string)
}
```

**Example:**
```typescript
const status = steam.getStatus();
console.log(`Connected: ${status.initialized}`);
console.log(`App ID: ${status.appId}`);
console.log(`Steam ID: ${status.steamId}`);
```

---

### `runCallbacks(): void`

Process pending Steam callbacks. Should be called regularly.

**Steamworks SDK Functions:**
- `SteamAPI_RunCallbacks()` - Process all pending callbacks

**Example:**
```typescript
// Process callbacks after operations
await steam.unlockAchievement('ACH_WIN_ONE_GAME');
steam.runCallbacks(); // Process the achievement unlock callback

// Or in a game loop
setInterval(() => {
  steam.runCallbacks();
}, 1000); // Every second
```

**What it does:**
Processes pending Steam callbacks such as:
- Achievement unlock confirmations
- Stats update confirmations
- User stats received callbacks
- Global stats received callbacks

**Best Practice:**
Call after Steam operations that trigger callbacks:
```typescript
// After unlocking achievement
await steam.unlockAchievement('ACH_WIN_ONE_GAME');
steam.runCallbacks();

// After requesting global stats
await steam.requestGlobalAchievementPercentages();
await new Promise(resolve => setTimeout(resolve, 2000));
steam.runCallbacks(); // Process the callback
```

---

### `isSteamRunning(): boolean`

Check if Steam client is currently running.

**Steamworks SDK Functions:**
- `SteamAPI_IsSteamRunning()` - Check Steam client status

**Returns:** `boolean` - `true` if Steam is running, `false` otherwise

**Example:**
```typescript
if (!steam.isSteamRunning()) {
  console.error('❌ Steam client is not running');
  console.log('💡 Please start Steam and try again');
  process.exit(1);
}
```

**Use Case:**
Check before initialization:
```typescript
if (steam.isSteamRunning()) {
  const success = steam.init({ appId: 480 });
} else {
  console.error('Please launch Steam first');
}
```

---

### `restartAppIfNecessary(appId: number): boolean`

Ensures your application was launched through the Steam client. If not, Steam will restart your application properly and this function returns `true`, indicating your app should exit immediately.

**Steamworks SDK Functions:**
- `SteamAPI_RestartAppIfNecessary()` - Check if app needs to restart through Steam

**Parameters:**
- `appId` (number) - Your Steam Application ID

**Returns:** 
- `true` - App should terminate immediately (Steam is restarting it)
- `false` - App should continue normally (launched correctly)

**When to Use:**
Call this **before** `init()` to ensure your application:
- Was launched through Steam client
- Has proper Steam overlay support
- Has correct Steam authentication

**Example - Basic Usage:**
```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();

// Check BEFORE initializing
if (steam.restartAppIfNecessary(480)) {
  console.log('App was not launched through Steam. Restarting...');
  process.exit(0);
}

// If we reach here, continue with normal initialization
steam.init({ appId: 480 });
```

**Example - Electron Integration:**
```typescript
import { app } from 'electron';
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();

app.whenReady().then(() => {
  // Check before doing anything else
  if (steam.restartAppIfNecessary(480)) {
    console.log('Restarting through Steam...');
    app.quit();
    return;
  }
  
  // Continue with normal initialization
  steam.init({ appId: 480 });
  
  // ... rest of app initialization
  createWindow();
});
```

**Example - Express/Node.js Server:**
```typescript
import express from 'express';
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();

// Check at startup
if (steam.restartAppIfNecessary(480)) {
  console.log('Server needs to restart through Steam');
  process.exit(0);
}

steam.init({ appId: 480 });

const app = express();
// ... server setup
```

**How It Works:**

Returns `false` (continue normally) when:
- ✅ App was launched through Steam client
- ✅ `steam_appid.txt` file exists (development mode)
- ✅ `SteamAppId` environment variable is set (development mode)
- ✅ Steam is not installed (safe fallback)

Returns `true` (should exit) when:
- ❌ App was launched directly by user (not through Steam)
- ❌ No development files/env vars present
- ❌ Steam client detects improper launch

**What Happens When It Returns True:**

1. User double-clicked your `.exe` instead of launching through Steam
2. Function returns `true`
3. Your app calls `process.exit(0)`
4. Steam client detects this and launches your app properly
5. On relaunch, function returns `false` and app continues normally

**Development Mode:**

You don't need Steam launch during development! Use either:

**Option 1: steam_appid.txt file**
```bash
echo "480" > steam_appid.txt
```

**Option 2: Environment variable**
```bash
export SteamAppId=480
node your-app.js
```

**Option 3: Skip check in development**
```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

if (!isDevelopment && steam.restartAppIfNecessary(480)) {
  process.exit(0);
}

steam.init({ appId: 480 });
```

**Production Deployment:**

For production releases on Steam:

1. **Always call this before `init()`** - Ensures proper Steam integration
2. **Don't include `steam_appid.txt`** - Only for development
3. **Steam DRM users can skip** - DRM wrapper handles this automatically
4. **Test both scenarios:**
   - Launch through Steam (should continue normally)
   - Launch `.exe` directly (should restart through Steam)

**When NOT Needed:**

- ❌ Using Steam DRM wrapper on your executable
- ❌ Development/testing with `steam_appid.txt` or env var
- ❌ App is not distributed through Steam

**Best Practices:**

✅ **DO:**
- Call before `init()` for best results
- Exit immediately if it returns `true`
- Use during production builds
- Test both launch methods

❌ **DON'T:**
- Call after `init()` (too late)
- Ignore the return value
- Include `steam_appid.txt` in production
- Skip this for Steam-distributed apps (unless using DRM)

**Troubleshooting:**

**Problem:** Always returns `true` even when launched through Steam
- ✅ Solution: Remove `steam_appid.txt` from production build
- ✅ Solution: Ensure you're testing with the actual Steam build

**Problem:** Returns `false` but overlay doesn't work
- ✅ Solution: Call this BEFORE `init()`, not after
- ✅ Solution: Verify Steam overlay is enabled in Steam settings

**Problem:** Can't test during development
- ✅ Solution: Create `steam_appid.txt` with your App ID
- ✅ Solution: Set `SteamAppId` environment variable

**See Also:**
- [Steam Partner Documentation - Redistributables](https://partner.steamgames.com/doc/sdk/api)
- [Steam DRM Wrapper Guide](https://partner.steamgames.com/doc/features/drm)

---

### `getCurrentGameLanguage(): string`

Get the current language that Steam is running in. This is useful for loading appropriate localization files for your game.

**Steamworks SDK Functions:**
- `SteamAPI_SteamApps_v008()` - Get Apps interface
- `SteamAPI_ISteamApps_GetCurrentGameLanguage()` - Get current language

**Returns:** `string` - Language code (e.g., 'english', 'french', 'german')

**Example:**
```typescript
const language = steam.getCurrentGameLanguage();
console.log('Steam language:', language);

// Load appropriate translations
switch (language) {
  case 'french':
    loadFrenchTranslations();
    break;
  case 'german':
    loadGermanTranslations();
    break;
  case 'japanese':
    loadJapaneseTranslations();
    break;
  case 'schinese':
    loadSimplifiedChineseTranslations();
    break;
  case 'tchinese':
    loadTraditionalChineseTranslations();
    break;
  default:
    loadEnglishTranslations();
}
```

**Common Language Codes:**

| Code | Language |
|------|----------|
| `english` | English |
| `french` | French |
| `german` | German |
| `spanish` | Spanish (Spain) |
| `latam` | Spanish (Latin America) |
| `italian` | Italian |
| `japanese` | Japanese |
| `korean` | Korean |
| `portuguese` | Portuguese |
| `brazilian` | Portuguese (Brazil) |
| `russian` | Russian |
| `schinese` | Simplified Chinese |
| `tchinese` | Traditional Chinese |
| `thai` | Thai |
| `polish` | Polish |
| `danish` | Danish |
| `dutch` | Dutch |
| `finnish` | Finnish |
| `norwegian` | Norwegian |
| `swedish` | Swedish |
| `hungarian` | Hungarian |
| `czech` | Czech |
| `romanian` | Romanian |
| `turkish` | Turkish |
| `arabic` | Arabic |
| `bulgarian` | Bulgarian |
| `greek` | Greek |
| `ukrainian` | Ukrainian |
| `vietnamese` | Vietnamese |

**Localization Example:**
```typescript
import SteamworksSDK from 'steamworks-ffi-node';
import * as fs from 'fs';
import * as path from 'path';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Get Steam language
const language = steam.getCurrentGameLanguage();
console.log(`Steam is running in: ${language}`);

// Load localized strings
const localizationPath = path.join(
  __dirname, 
  'localization', 
  `${language}.json`
);

let strings;
if (fs.existsSync(localizationPath)) {
  strings = JSON.parse(fs.readFileSync(localizationPath, 'utf8'));
  console.log(`✅ Loaded ${language} translations`);
} else {
  // Fallback to English
  strings = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, 'localization', 'english.json'), 
      'utf8'
    )
  );
  console.log(`⚠️ No translations for ${language}, using English`);
}

// Use localized strings
console.log(strings.welcomeMessage);
console.log(strings.playButton);
```

**Returns:** Returns `'english'` as fallback if:
- Steam API is not initialized
- Apps interface is unavailable
- An error occurs retrieving the language

**Best Practice:**
Get language early in initialization to set up localization:
```typescript
const steam = SteamworksSDK.getInstance();
if (steam.init({ appId: 480 })) {
  // Get language immediately after init
  const language = steam.getCurrentGameLanguage();
  
  // Initialize your localization system
  i18n.locale = language;
  
  // Continue with game initialization
  await loadGameAssets(language);
}
```

---

## Internal Methods

These methods are used internally by other modules:

### `isInitialized(): boolean`

Check if Steam API is initialized.

```typescript
if (this.apiCore.isInitialized()) {
  // Safe to make Steam API calls
}
```

---

### `getUserStatsInterface(): any | null`

Get the ISteamUserStats interface handle.

```typescript
const userStatsInterface = this.apiCore.getUserStatsInterface();
if (userStatsInterface) {
  // Can call ISteamUserStats functions
}
```

---

### `getUserInterface(): any | null`

Get the ISteamUser interface handle.

```typescript
const userInterface = this.apiCore.getUserInterface();
if (userInterface) {
  // Can call ISteamUser functions
}
```

---

## Environment Setup

### steam_appid.txt

The Steam API requires a `steam_appid.txt` file in your application directory. The `init()` method creates this automatically in the current working directory, and also sets the `SteamAppId` environment variable.

**Automatic Creation:**
```typescript
// When you call init(), it automatically:
// 1. Sets process.env.SteamAppId = "480"  
// 2. Creates steam_appid.txt in process.cwd()
steam.init({ appId: 480 });
```

**Manual Creation (optional):**
```bash
echo "480" > steam_appid.txt
```

**Location:** Current working directory (`process.cwd()`)

---

## Error Handling

### Common Issues

#### "Steam API initialization failed"

**Causes:**
- Steam client not running
- User not logged into Steam
- Invalid App ID
- Missing Steamworks SDK redistributables

**Solution:**
```typescript
if (!steam.isSteamRunning()) {
  console.error('Steam client is not running');
  return;
}

const success = steam.init({ appId: 480 });
if (!success) {
  console.error('Initialization failed');
  console.log('Check:');
  console.log('1. Steam is running');
  console.log('2. You are logged in');
  console.log('3. App ID is valid');
}
```

---

#### "Interface not available"

**Cause:** API not initialized

**Solution:**
```typescript
const status = steam.getStatus();
if (!status.initialized) {
  console.error('Initialize Steam first');
  steam.init({ appId: 480 });
}
```

---

## Complete Example

```typescript
import SteamworksSDK from 'steamworks-ffi-node';

async function steamExample() {
  const steam = SteamworksSDK.getInstance();
  
  // Check if Steam is running
  if (!steam.isSteamRunning()) {
    console.error('❌ Steam client not running');
    return;
  }
  
  // Initialize
  console.log('🔌 Connecting to Steam...');
  const initialized = steam.init({ appId: 480 });
  
  if (!initialized) {
    console.error('❌ Failed to initialize Steam API');
    return;
  }
  
  console.log('✅ Connected to Steam!');
  
  // Get status
  const status = steam.getStatus();
  console.log(`📊 Steam ID: ${status.steamId}`);
  console.log(`📊 App ID: ${status.appId}`);
  
  // Do work with managers...
  const achievements = await steam.achievements.getAllAchievements();
  console.log(`Found ${achievements.length} achievements`);
  
  // Process callbacks
  steam.runCallbacks();
  
  // Cleanup
  console.log('🧹 Shutting down...');
  steam.shutdown();
  console.log('✅ Disconnected');
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  const steam = SteamworksSDK.getInstance();
  steam.shutdown();
  process.exit(0);
});

steamExample();
```

---

## Best Practices

### 1. Create Instance Per Usage
```typescript
// ✅ Good - Create instance when needed
const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Multiple instances are fine
const steam1 = SteamworksSDK.getInstance();
const steam2 = SteamworksSDK.getInstance();
```

### 2. Always Shutdown
```typescript
// ✅ Good
const steam = SteamworksSDK.getInstance();
try {
  steam.init({ appId: 480 });
  // ... work ...
} finally {
  steam.shutdown();
}
```

### 3. Check Status
```typescript
// ✅ Good - Check before operations
const steam = SteamworksSDK.getInstance();
if (!steam.getStatus().initialized) {
  steam.init({ appId: 480 });
}

await steam.achievements.getAllAchievements();
```

### 4. Process Callbacks Regularly
```typescript
// ✅ Good - Regular callback processing
setInterval(() => {
  steam.runCallbacks();
}, 1000);

// Or after operations
await steam.achievements.unlockAchievement('ACH_WIN_ONE_GAME');
steam.runCallbacks();
```

### 5. Handle Errors
```typescript
// ✅ Good - Handle initialization failure
const initialized = steam.init({ appId: 480 });
if (!initialized) {
  console.error('Failed to connect to Steam');
  // Show user-friendly error
  // Provide fallback behavior
  return;
}
```

---

## Platform-Specific Notes

### Windows
- Requires Steam client installed and running
- Works with both 32-bit and 64-bit applications
- Steam typically installed in `C:\Program Files (x86)\Steam`

### macOS
- Requires Steam.app running
- Steam typically in `/Applications/Steam.app`
- Library loaded from bundle: `Steam.AppBundle/Steam/Contents/MacOS`

### Linux
- Requires Steam client running
- Works with both 32-bit and 64-bit
- Steam typically installed in `~/.steam` or `~/.local/share/Steam`

---

## Troubleshooting

### API Won't Initialize

1. **Check Steam is running:**
   ```typescript
   console.log('Steam running:', steam.isSteamRunning());
   ```

2. **Verify App ID:**
   - Use 480 (Spacewar) for testing
   - Make sure your game's App ID is correct
   - App must be in your Steam library

3. **Check logs:**
   - Look for `[Steamworks]` prefixed messages in console
   - Check for error messages from Steam

4. **Verify redistributables:**
   - Ensure `steamworks_sdk/redistributable_bin/` exists in package
   - Check platform-specific library is present:
     - Windows: `steam_api64.dll` or `steam_api.dll`
     - macOS: `libsteam_api.dylib`
     - Linux: `libsteam_api.so`

---