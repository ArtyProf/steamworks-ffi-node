# SteamAPICore Documentation

The `SteamAPICore` module manages the Steam API lifecycle, including initialization, shutdown, and callback processing. It serves as the foundation for all Steam operations in the modular steamworks-ffi-node architecture.

## Overview

`SteamAPICore` is responsible for:
- Initializing the Steam API connection
- Managing Steam interface handles (UserStats, User)
- Processing Steam callbacks
- Checking Steam client status
- Shutting down the Steam API cleanly

## API Reference

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
import Steam from 'steamworks-ffi-node';

const steam = Steam.getInstance();
const success = steam.init({ appId: 480 });

if (success) {
  console.log('✅ Connected to Steam!');
} else {
  console.error('❌ Failed to connect to Steam');
}
```

**What it does:**
1. Sets `SteamAppId` environment variable and creates `steam_appid.txt` file
2. Loads the Steamworks SDK library via FFI
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
import Steam from 'steamworks-ffi-node';

async function steamExample() {
  const steam = Steam.getInstance();
  
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
  
  // Do work...
  const achievements = await steam.getAllAchievements();
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
  const steam = Steam.getInstance();
  steam.shutdown();
  process.exit(0);
});

steamExample();
```

---

## Best Practices

### 1. Initialize Once
```typescript
// ✅ Good - Singleton pattern
const steam = Steam.getInstance();
steam.init({ appId: 480 });

// ❌ Bad - Don't create multiple instances
const steam1 = Steam.getInstance();
const steam2 = Steam.getInstance(); // Same instance
```

### 2. Always Shutdown
```typescript
// ✅ Good
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
if (!steam.getStatus().initialized) {
  steam.init({ appId: 480 });
}

await steam.getAllAchievements();
```

### 4. Process Callbacks Regularly
```typescript
// ✅ Good - Regular callback processing
setInterval(() => {
  steam.runCallbacks();
}, 1000);

// Or after operations
await steam.unlockAchievement('ACH_WIN_ONE_GAME');
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

**Last Updated:** October 11, 2025
