# Steamworks FFI - Steamworks SDK Integration

A production-ready TypeScript/JavaScript wrapper for the Steamworks SDK using Koffi FFI, designed for Node.js and Electron applications with **Steamworks SDK integration**.

> ✅ **No C++ Compilation Required**: Uses Koffi FFI for seamless installation without Visual Studio Build Tools!

> 🎉 **NEW: 100% Achievement API Coverage** - All 20 Steam achievement functions implemented! [See Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/ACHIEVEMENT_MANAGER.md)

> 🎉 **NEW: 100% Stats API Coverage** - All 13 Steam statistics functions implemented! [See Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/STATS_MANAGER.md)

## 🎯 Features

- **Complete Achievement API**: 100% coverage of Steam Achievement functionality (20/20 functions)
  - ✅ Core operations (get, unlock, clear, check status)
  - ✅ Visual features (icons, progress notifications)
  - ✅ Progress tracking (get limits for progress bars)
  - ✅ Friend comparisons (see friend achievements)
  - ✅ Global statistics (unlock percentages, popularity sorting)
  - ✅ Testing tools (reset stats/achievements)
- **Complete Stats API**: 100% coverage of Steam User Stats functionality (13/13 functions)
  - ✅ User stats (get/set int/float, average rate tracking)
  - ✅ Friend comparisons (compare stats with friends)
  - ✅ Global statistics (worldwide aggregated data with history)
- **Steamworks Integration**: Direct FFI calls to Steamworks C++ SDK
- **Cross-Platform**: Windows, macOS, and Linux support
- **Batteries Included**: All Steamworks redistributables bundled - no SDK download needed!
- **Electron Ready**: Perfect for Electron applications
- **TypeScript Support**: Complete TypeScript definitions included
- **No C++ Compilation**: Uses Koffi FFI for seamless installation

## 🚀 Quick Start

### Installation

```bash
# Install the package - includes all Steam redistributables!
npm install steamworks-ffi-node
```

### Setup

1. **Create `steam_appid.txt`** in your project root:
   ```bash
   echo "480" > steam_appid.txt  # Use 480 for testing, or your Steam App ID
   ```

2. **Make sure Steam is running** and you're logged in

### Basic Usage

```typescript
import Steam from 'steamworks-ffi-node';

// Initialize Steam connection
const steam = Steam.getInstance();
const initialized = steam.init({ appId: 480 }); // Your Steam App ID

if (initialized) {
  // Get achievements from Steam servers
  const achievements = await steam.getAllAchievements();
  console.log('Steam achievements:', achievements);
  
  // Unlock achievement (permanent in Steam!)
  await steam.unlockAchievement('ACH_WIN_ONE_GAME');
  
  // Check unlock status from Steam
  const isUnlocked = await steam.isAchievementUnlocked('ACH_WIN_ONE_GAME');
  console.log('Achievement unlocked:', isUnlocked);
  
  // Track user statistics
  const kills = await steam.getStatInt('total_kills') || 0;
  await steam.setStatInt('total_kills', kills + 1);
  
  // Get global statistics
  await steam.requestGlobalStats(7);
  await new Promise(resolve => setTimeout(resolve, 2000));
  steam.runCallbacks();
  const globalKills = await steam.getGlobalStatInt('global.total_kills');
  console.log('Total kills worldwide:', globalKills);
}

// Cleanup
steam.shutdown();
```

### JavaScript (CommonJS)

```javascript
const Steam = require('steamworks-ffi-node').default;

async function example() {
  const steam = Steam.getInstance();
  
  if (steam.init({ appId: 480 })) {
    const achievements = await steam.getAllAchievements();
    console.log(`Found ${achievements.length} achievements`);
    
    // Unlock first locked achievement
    const locked = achievements.find(a => !a.unlocked);
    if (locked) {
      await steam.unlockAchievement(locked.apiName);
    }
  }
  
  steam.shutdown();
}

example();
```

### Testing with Spacewar

For immediate testing, use Spacewar (App ID 480):
- Free Steam app for testing Steamworks features
- Add to Steam library: `steam://install/480` or search "Spacewar" in Steam
- Launch it once, then you can test with App ID 480

## 📚 API Documentation

Complete documentation for all APIs is available in the [docs folder](https://github.com/ArtyProf/steamworks-ffi-node/tree/main/docs):

➡️ **[View Complete Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/README.md)**

## 🎮 Steamworks Integration

This library connects directly to the Steam client and Steamworks SDK:

```javascript
// Steam API - no mocking!
const steam = Steam.getInstance();
steam.init({ appId: 480 }); // Connects to actual Steam

// Live achievements from Steam servers
const achievements = await steam.getAllAchievements();
console.log(achievements); // Achievement data from your Steam app

// Permanent achievement unlock in Steam
await steam.unlockAchievement('YOUR_ACHIEVEMENT');
// ^ This shows up in Steam overlay and is saved permanently
```

**What happens when you unlock an achievement:**
- ✅ Steam overlay notification appears
- ✅ Achievement saved to Steam servers permanently
- ✅ Syncs across all devices
- ✅ Appears in Steam profile
- ✅ Counts toward Steam statistics

## 🖥️ Electron Integration

For Electron applications, use it in your main process:

```typescript
// main.ts
import { app } from 'electron';
import Steam from 'steamworks-ffi-node';

app.whenReady().then(() => {
  const steam = Steam.getInstance();
  
  if (steam.init({ appId: YOUR_STEAM_APP_ID })) {
    console.log('Steam initialized in Electron!');
    
    // Handle achievement unlocks from renderer process
    // via IPC if needed
  }
});

app.on('before-quit', () => {
  Steam.getInstance().shutdown();
});
```

## 🔧 Requirements

- **Node.js**: 18+ 
- **Steam Client**: Must be running and logged in
- **Steam App ID**: Get yours at [Steamworks Partner](https://partner.steamgames.com/)
- **steam_appid.txt**: Create in your project root with your App ID

### Platform Support
- ✅ **Windows**: Included (steam_api64.dll / steam_api.dll)
- ✅ **macOS**: Included (libsteam_api.dylib)
- ✅ **Linux**: Included (libsteam_api.so)

All redistributable binaries are included in the package - no manual SDK download required!

## 🔧 Troubleshooting

### "SteamAPI_Init failed"
- ❌ Steam client not running → **Solution**: Start Steam and log in
- ❌ `steam_appid.txt` missing → **Solution**: Create file in project root with your App ID
- ❌ Invalid App ID → **Solution**: Use 480 for testing, or your registered App ID

### "Cannot find module 'steamworks-ffi-node'"
- ❌ Package not installed → **Solution**: Run `npm install steamworks-ffi-node`

### Achievement operations not working
- ❌ Not initialized → **Solution**: Call `steam.init({ appId })` first
- ❌ No achievements configured → **Solution**: Configure achievements in Steamworks Partner site
- ❌ Using Spacewar → **Note**: Spacewar may not have achievements, use your own App ID

### Electron-specific issues
- ❌ Initialized in renderer → **Solution**: Only initialize in main process
- ❌ Not cleaning up → **Solution**: Call `shutdown()` in `before-quit` event  

## 📄 License

MIT License - see LICENSE file for details.

### Steamworks SDK Redistributables

This package includes redistributable binaries from the Steamworks SDK (© Valve Corporation).
These are distributed under the Steamworks SDK Access Agreement in accordance with Section 1.1(b).

See [THIRD_PARTY_LICENSES.md](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/THIRD_PARTY_LICENSES.md) for full details.