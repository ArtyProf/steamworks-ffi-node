[![npm](https://img.shields.io/npm/v/steamworks-ffi-node.svg)](https://www.npmjs.com/package/steamworks-ffi-node)
[![Chat](https://img.shields.io/discord/1426518243077656699?label=chat&logo=discord)](https://discord.gg/Ruzx4Z7cKr)

# Steamworks FFI - Steamworks SDK Integration

A production-ready TypeScript/JavaScript wrapper for the Steamworks SDK using Koffi FFI, designed for Node.js and Electron applications with **Steamworks SDK integration**.

> ✅ **No C++ Compilation Required**: Uses Koffi FFI for seamless installation without Visual Studio Build Tools!

> 🎉 **NEW: 100% Achievement API Coverage** - All 20 Steam achievement functions implemented! [See Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/ACHIEVEMENT_MANAGER.md)

> 🎉 **NEW: 100% Stats API Coverage** - All 14 Steam statistics functions implemented! [See Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/STATS_MANAGER.md)

> 🎉 **NEW: 100% Leaderboard API Coverage** - All 7 Steam leaderboard functions implemented! [See Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/LEADERBOARD_MANAGER.md)

> 🎉 **NEW: Friends API** - 10 essential Steam friends and social functions implemented! [See Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/FRIENDS_MANAGER.md)

> 🎉 **NEW: Rich Presence API** - 6 functions for custom status display and friend join functionality! [See Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/RICH_PRESENCE_MANAGER.md)

> 🎉 **NEW: Overlay API** - 7 functions for complete Steam overlay control! [See Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/OVERLAY_MANAGER.md)

## 🎯 Features

- **Complete Achievement API**: 100% coverage of Steam Achievement functionality (20/20 functions)
  - ✅ Core operations (get, unlock, clear, check status)
  - ✅ Visual features (icons, progress notifications)
  - ✅ Progress tracking (get limits for progress bars)
  - ✅ Friend comparisons (see friend achievements)
  - ✅ Global statistics (unlock percentages, popularity sorting)
  - ✅ Testing tools (reset stats/achievements)
- **Complete Stats API**: 100% coverage of Steam User Stats functionality (14/14 functions)
  - ✅ User stats (get/set int/float, average rate tracking)
  - ✅ Friend comparisons (compare stats with friends)
  - ✅ Global statistics (worldwide aggregated data with history)
- **Complete Leaderboard API**: 100% coverage of Steam Leaderboard functionality (7/7 functions)
  - ✅ Leaderboard management (find, create, get info)
  - ✅ Score operations (upload with optional details)
  - ✅ Entry download (global, friends, specific users)
  - ✅ UGC integration (attach replays/screenshots to entries)
- **Friends & Social API**: Essential Steam friends and social features (10 core functions)
  - ✅ Current user info (persona name, online state)
  - ✅ Friends list management (count, iterate, get all friends)
  - ✅ Friend information (names, states, relationships, Steam levels)
  - ✅ Friend activity (check games being played)
- **Rich Presence API**: Complete Rich Presence support (6 functions)
  - ✅ Set/clear rich presence key/value pairs
  - ✅ Query friend rich presence data
  - ✅ Display custom status in friends list
  - ✅ Enable friend join functionality
- **Overlay API**: Complete Steam overlay control (7 functions)
  - ✅ Open overlay dialogs (friends, achievements, settings, etc.)
  - ✅ Open user profiles, stats, and achievements
  - ✅ Open overlay web browser to URLs
  - ✅ Open store pages with purchase options
  - ✅ Show invite dialogs for multiplayer sessions
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
import SteamworksSDK from 'steamworks-ffi-node';

// Initialize Steam connection
const steam = new SteamworksSDK();
const initialized = steam.init({ appId: 480 }); // Your Steam App ID

if (initialized) {
  // Get achievements from Steam servers
  const achievements = await steam.achievements.getAllAchievements();
  console.log('Steam achievements:', achievements);
  
  // Unlock achievement (permanent in Steam!)
  await steam.achievements.unlockAchievement('ACH_WIN_ONE_GAME');
  
  // Check unlock status from Steam
  const isUnlocked = await steam.achievements.isAchievementUnlocked('ACH_WIN_ONE_GAME');
  console.log('Achievement unlocked:', isUnlocked);
  
  // Track user statistics
  const kills = await steam.stats.getStatInt('total_kills') || 0;
  await steam.stats.setStatInt('total_kills', kills + 1);
  
  // Get global statistics
  await steam.stats.requestGlobalStats(7);
  await new Promise(resolve => setTimeout(resolve, 2000));
  steam.runCallbacks();
  const globalKills = await steam.stats.getGlobalStatInt('global.total_kills');
  console.log('Total kills worldwide:', globalKills);
  
  // Work with leaderboards
  const leaderboard = await steam.leaderboards.findOrCreateLeaderboard(
    'HighScores',
    1, // Descending (higher is better)
    0  // Numeric display
  );
  
  if (leaderboard) {
    // Upload score
    await steam.leaderboards.uploadLeaderboardScore(
      leaderboard.handle,
      1000,
      1  // Keep best score
    );
    
    // Download top 10 scores
    const topScores = await steam.leaderboards.downloadLeaderboardEntries(
      leaderboard.handle,
      0, // Global
      0,
      9
    );
    console.log('Top 10 scores:', topScores);
  }
  
  // Access friends and social features
  const personaName = steam.friends.getPersonaName();
  const friendCount = steam.friends.getFriendCount(4); // All friends
  console.log(`${personaName} has ${friendCount} friends`);
  
  // Get all friends with details
  const allFriends = steam.friends.getAllFriends(4); // All friends
  allFriends.slice(0, 5).forEach(friend => {
    const name = steam.friends.getFriendPersonaName(friend.steamId);
    const state = steam.friends.getFriendPersonaState(friend.steamId);
    const level = steam.friends.getFriendSteamLevel(friend.steamId);
    console.log(`${name}: Level ${level}, Status: ${state}`);
    
    // Check if playing a game
    const gameInfo = steam.friends.getFriendGamePlayed(friend.steamId);
    if (gameInfo.playing) {
      console.log(`  Playing: ${gameInfo.gameName} (AppID: ${gameInfo.gameId})`);
    }
  });
  
  // Set rich presence for custom status
  steam.richPresence.setRichPresence('status', 'In Main Menu');
  steam.richPresence.setRichPresence('connect', '+connect server:27015');
  
  // Open Steam overlay
  steam.overlay.activateGameOverlay('Friends'); // Open friends list
  steam.overlay.activateGameOverlayToWebPage('https://example.com/wiki'); // Open wiki
}

// Cleanup
steam.shutdown();
```

### JavaScript (CommonJS)

```javascript
const SteamworksSDK = require('steamworks-ffi-node').default;

async function example() {
  const steam = new SteamworksSDK();
  
  if (steam.init({ appId: 480 })) {
    const achievements = await steam.achievements.getAllAchievements();
    console.log(`Found ${achievements.length} achievements`);
    
    // Unlock first locked achievement
    const locked = achievements.find(a => !a.unlocked);
    if (locked) {
      await steam.achievements.unlockAchievement(locked.apiName);
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

### API Guides:
- **[Achievement Manager](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/ACHIEVEMENT_MANAGER.md)** - Complete achievement system (20 functions)
- **[Stats Manager](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/STATS_MANAGER.md)** - User and global statistics (14 functions)
- **[Leaderboard Manager](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/LEADERBOARD_MANAGER.md)** - Leaderboard operations (7 functions)
- **[Friends Manager](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/FRIENDS_MANAGER.md)** - Friends and social features (10 functions)
- **[Rich Presence Manager](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/RICH_PRESENCE_MANAGER.md)** - Custom status display and join functionality (6 functions)
- **[Overlay Manager](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/OVERLAY_MANAGER.md)** - Steam overlay control (7 functions)

## 🎮 Steamworks Integration

This library connects directly to the Steam client and Steamworks SDK:

```javascript
// Steamworks API
const steam = new SteamworksSDK();
steam.init({ appId: 480 }); // Connects to actual Steam

// Live achievements from Steam servers
const achievements = await steam.achievements.getAllAchievements();
console.log(achievements); // Achievement data from your Steam app

// Permanent achievement unlock in Steam
await steam.achievements.unlockAchievement('YOUR_ACHIEVEMENT');
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
import SteamworksSDK from 'steamworks-ffi-node';

app.whenReady().then(() => {
  const steam = new SteamworksSDK();
  
  if (steam.init({ appId: YOUR_STEAM_APP_ID })) {
    console.log('Steam initialized in Electron!');
    
    // Handle achievement unlocks from renderer process
    // via IPC if needed
  }
});

app.on('before-quit', () => {
  const steam = new SteamworksSDK();
  steam.shutdown();
});
```

### 📦 Packaging with ASAR

When packaging your Electron app with ASAR archives, **native modules must be unpacked**. The library automatically detects ASAR and looks for files in `.asar.unpacked`.

#### electron-builder Configuration

Add to your `package.json` or `electron-builder.yml`:

```json
{
  "build": {
    "asarUnpack": [
      "node_modules/steamworks-ffi-node/**/*"
    ]
  }
}
```

#### electron-forge Configuration

Add to your `forge.config.js`:

```javascript
module.exports = {
  packagerConfig: {
    asar: {
      unpack: "**/{node_modules/steamworks-ffi-node}/**/*"
    }
  }
};
```

The library will automatically:
1. Detect if running inside an ASAR archive
2. Replace `.asar` with `.asar.unpacked` in the library path
3. Load the Steamworks SDK from the unpacked directory

This ensures native libraries work correctly in packaged Electron apps!

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
- ❌ "cannot open shared object file: Not a directory" (Linux) → **Solution**: Add `asarUnpack` configuration (see Electron Integration section above)
- ❌ Native module errors in packaged app → **Solution**: Ensure `steamworks-ffi-node` is in `asarUnpack` list

## 📄 License

MIT License - see LICENSE file for details.

### Steamworks SDK Redistributables

This package includes redistributable binaries from the Steamworks SDK (© Valve Corporation).
These are distributed under the Steamworks SDK Access Agreement in accordance with Section 1.1(b).

See [THIRD_PARTY_LICENSES.md](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/THIRD_PARTY_LICENSES.md) for full details.
