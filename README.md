[![npm](https://img.shields.io/npm/v/steamworks-ffi-node.svg)](https://www.npmjs.com/package/steamworks-ffi-node)
[![Chat](https://img.shields.io/discord/1426518243077656699?label=chat&logo=discord)](https://discord.gg/Ruzx4Z7cKr)

# Steamworks FFI - Steamworks SDK Integration for Node.js applications

A TypeScript/JavaScript wrapper for the Steamworks SDK using Koffi FFI, designed for Node.js and Electron applications with **Steamworks SDK v1.62 integration**.

---

## 📑 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Steamworks Integration](#steamworks-integration)
- [Electron Integration](#electron-integration)
- [Requirements](#requirements)
- [Troubleshooting](#troubleshooting)
- [How to Support This Project](#how-to-support-this-project)
- [License](#license)

---

> ✅ **No C++ Compilation Required**: Uses Koffi FFI for seamless installation without Visual Studio Build Tools!

> ⚡ **Latest Steamworks SDK**: Built with Steamworks SDK v1.62 - includes all latest Steam features and improvements!

> 🎉 **NEW: 100% Achievement API Coverage** - All 20 Steam achievement functions implemented! [See Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/ACHIEVEMENT_MANAGER.md)

> 🎉 **NEW: 100% Stats API Coverage** - All 14 Steam statistics functions implemented! [See Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/STATS_MANAGER.md)

> 🎉 **NEW: 100% Leaderboard API Coverage** - All 7 Steam leaderboard functions implemented! [See Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/LEADERBOARD_MANAGER.md)

> 🎉 **NEW: Friends API** - 22 complete Steam friends and social functions implemented! [See Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/FRIENDS_MANAGER.md)

> 🎉 **NEW: Rich Presence API** - 6 functions for custom status display and friend join functionality! [See Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/RICH_PRESENCE_MANAGER.md)

> 🎉 **NEW: Overlay API** - 7 functions for complete Steam overlay control! [See Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/OVERLAY_MANAGER.md)

> 🎉 **NEW: Cloud Storage API** - 17 functions for complete Steam Cloud (Remote Storage) integration including batch writes! [See Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/CLOUD_MANAGER.md)

> 🎉 **NEW: Workshop API** - 30 functions for complete Steam Workshop/UGC integration including item deletion! [See Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/WORKSHOP_MANAGER.md)

> 🎉 **NEW: Input API** - 35+ functions for complete Steam Input (controller) support! [See Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/INPUT_MANAGER.md) ⚠️ Tested with virtual gamepad only

## Features

- **Core API**: Essential Steam application functions
  - ✅ Language detection (get current Steam language for localization)
  - ✅ Steam status monitoring
  - ✅ Callback processing
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
- **Friends & Social API**: Complete Steam friends and social features (22 functions)
  - ✅ Current user info (persona name, online state)
  - ✅ Friends list management (count, iterate, get all friends)
  - ✅ Friend information (names, states, relationships, Steam levels)
  - ✅ Friend activity (check games being played)
  - ✅ Friend avatars (small/medium/large avatar handles)
  - ✅ Friend groups (tags/categories management)
  - ✅ Coplay tracking (recently played with users)
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
- **Cloud Storage API**: Complete Steam Cloud (Remote Storage) integration (17 functions)
  - ✅ File operations (write, read, delete, check existence)
  - ✅ File metadata (size, timestamp, persistence status)
  - ✅ File listing (count, iterate, get all with details)
  - ✅ Quota management (track storage usage and limits)
  - ✅ Cloud settings (check/toggle cloud sync for account and app)
  - ✅ Batch writes (atomic multi-file operations)
- **Workshop API**: Complete Steam Workshop/UGC integration (30 functions)
  - ✅ Subscription management (subscribe, unsubscribe, list items)
  - ✅ Item state & information (download progress, installation info)
  - ✅ Query operations (text search, browse, filter Workshop content)
  - ✅ Item creation & update (create, upload, manage your Workshop items)
  - ✅ Voting & favorites (vote on items, manage favorites)
  - ✅ Item deletion (permanently delete your Workshop items)
- **Input API**: Complete Steam Input (controller) support (35+ functions) ⚠️ _Tested with virtual gamepad only_
  - ✅ Controller detection (Xbox, PlayStation, Switch, Steam Controller, Steam Deck)
  - ✅ Action sets and layers (menu controls, gameplay controls, etc.)
  - ✅ Digital actions (buttons) and analog actions (sticks/triggers)
  - ✅ Motion data (gyro, accelerometer for supported controllers)
  - ✅ Haptics (vibration, LED control for DualShock/DualSense)
- **Steamworks Integration**: Direct FFI calls to Steamworks C++ SDK
- **Cross-Platform**: Windows, macOS, and Linux support
- **Easy Setup**: Simple installation with clear SDK setup guide
- **Electron Ready**: Perfect for Electron applications
- **TypeScript Support**: Complete TypeScript definitions included
- **No C++ Compilation**: Uses Koffi FFI for seamless installation

## Quick Start

### Installation

```bash
# Install the package
npm install steamworks-ffi-node
```

### Setup

1. **Download Steamworks SDK** (required separately due to licensing):

   - Visit [Steamworks Partner site](https://partner.steamgames.com/)
   - Download the latest Steamworks SDK
   - Extract and copy `redistributable_bin` folder to your project
   - See [STEAMWORKS_SDK_SETUP.md](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/STEAMWORKS_SDK_SETUP.md) for detailed instructions

2. **Create `steam_appid.txt` (optional)** in your project root:

   ```bash
   echo "480" > steam_appid.txt  # Use 480 for testing, or your Steam App ID
   ```

   _Note: You can skip this file and pass the App ID directly to `steam.init(appId)` instead_

3. **Make sure Steam is running** and you're logged in

### Basic Usage

```typescript
import SteamworksSDK from "steamworks-ffi-node";

// Helper to auto-start callback polling
function startCallbackPolling(steam: SteamworksSDK, interval: number = 1000) {
  return setInterval(() => {
    steam.runCallbacks();
  }, interval);
}

// Initialize Steam connection
const steam = SteamworksSDK.getInstance();
const initialized = steam.init({ appId: 480 }); // Your Steam App ID

if (initialized) {
  // Start callback polling automatically (required for async operations)
  const callbackInterval = startCallbackPolling(steam, 1000);

  // Get current Steam language for localization
  const language = steam.getCurrentGameLanguage();
  console.log("Steam language:", language); // e.g., 'english', 'french', 'german'

  // Get achievements from Steam servers
  const achievements = await steam.achievements.getAllAchievements();
  console.log("Steam achievements:", achievements);

  // Unlock achievement (permanent in Steam!)
  await steam.achievements.unlockAchievement("ACH_WIN_ONE_GAME");

  // Check unlock status from Steam
  const isUnlocked = await steam.achievements.isAchievementUnlocked(
    "ACH_WIN_ONE_GAME"
  );
  console.log("Achievement unlocked:", isUnlocked);

  // Track user statistics
  const kills = (await steam.stats.getStatInt("total_kills")) || 0;
  await steam.stats.setStatInt("total_kills", kills + 1);

  // Get global statistics
  await steam.stats.requestGlobalStats(7);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  steam.runCallbacks();
  const globalKills = await steam.stats.getGlobalStatInt("global.total_kills");
  console.log("Total kills worldwide:", globalKills);

  // Work with leaderboards
  const leaderboard = await steam.leaderboards.findOrCreateLeaderboard(
    "HighScores",
    1, // Descending (higher is better)
    0 // Numeric display
  );

  if (leaderboard) {
    // Upload score
    await steam.leaderboards.uploadLeaderboardScore(
      leaderboard.handle,
      1000,
      1 // Keep best score
    );

    // Download top 10 scores
    const topScores = await steam.leaderboards.downloadLeaderboardEntries(
      leaderboard.handle,
      0, // Global
      0,
      9
    );
    console.log("Top 10 scores:", topScores);
  }

  // Access friends and social features
  const personaName = steam.friends.getPersonaName();
  const friendCount = steam.friends.getFriendCount(4); // All friends
  console.log(`${personaName} has ${friendCount} friends`);

  // Get all friends with details
  const allFriends = steam.friends.getAllFriends(4); // All friends
  allFriends.slice(0, 5).forEach((friend) => {
    const name = steam.friends.getFriendPersonaName(friend.steamId);
    const state = steam.friends.getFriendPersonaState(friend.steamId);
    const level = steam.friends.getFriendSteamLevel(friend.steamId);
    console.log(`${name}: Level ${level}, Status: ${state}`);

    // Get avatar handles
    const smallAvatar = steam.friends.getSmallFriendAvatar(friend.steamId);
    const mediumAvatar = steam.friends.getMediumFriendAvatar(friend.steamId);
    if (smallAvatar > 0) {
      console.log(
        `  Avatar handles: small=${smallAvatar}, medium=${mediumAvatar}`
      );
    }

    // Check if playing a game
    const gameInfo = steam.friends.getFriendGamePlayed(friend.steamId);
    if (gameInfo) {
      console.log(`  Playing: App ${gameInfo.gameId}`);
    }
  });

  // Check friend groups (tags)
  const groupCount = steam.friends.getFriendsGroupCount();
  if (groupCount > 0) {
    const groupId = steam.friends.getFriendsGroupIDByIndex(0);
    const groupName = steam.friends.getFriendsGroupName(groupId);
    const members = steam.friends.getFriendsGroupMembersList(groupId);
    console.log(`Group "${groupName}" has ${members.length} members`);
  }

  // Check recently played with
  const coplayCount = steam.friends.getCoplayFriendCount();
  if (coplayCount > 0) {
    const recentPlayer = steam.friends.getCoplayFriend(0);
    const playerName = steam.friends.getFriendPersonaName(recentPlayer);
    const coplayTime = steam.friends.getFriendCoplayTime(recentPlayer);
    console.log(`Recently played with ${playerName}`);
  }

  // Set rich presence for custom status
  steam.richPresence.setRichPresence("status", "In Main Menu");
  steam.richPresence.setRichPresence("connect", "+connect server:27015");

  // Open Steam overlay
  steam.overlay.activateGameOverlay("Friends"); // Open friends list
  steam.overlay.activateGameOverlayToWebPage("https://example.com/wiki"); // Open wiki

  // Steam Cloud storage operations
  const saveData = { level: 5, score: 1000, inventory: ["sword", "shield"] };
  const buffer = Buffer.from(JSON.stringify(saveData));

  // Write save file to Steam Cloud
  const written = steam.cloud.fileWrite("savegame.json", buffer);
  if (written) {
    console.log("✅ Save uploaded to Steam Cloud");
  }

  // Check cloud quota
  const quota = steam.cloud.getQuota();
  console.log(
    `Cloud storage: ${quota.usedBytes}/${
      quota.totalBytes
    } bytes (${quota.percentUsed.toFixed(2)}%)`
  );

  // Read save file from Steam Cloud
  if (steam.cloud.fileExists("savegame.json")) {
    const result = steam.cloud.fileRead("savegame.json");
    if (result.success && result.data) {
      const loadedSave = JSON.parse(result.data.toString());
      console.log(
        `Loaded save: Level ${loadedSave.level}, Score ${loadedSave.score}`
      );
    }
  }

  // List all cloud files
  const cloudFiles = steam.cloud.getAllFiles();
  console.log(`Steam Cloud contains ${cloudFiles.length} files:`);
  cloudFiles.forEach((file) => {
    const kb = (file.size / 1024).toFixed(2);
    const status = file.persisted ? "☁️" : "⏳";
    console.log(`${status} ${file.name} - ${kb} KB`);
  });

  // Steam Workshop operations
  // Subscribe to a Workshop item
  const subscribeResult = await steam.workshop.subscribeItem(123456789n);
  if (subscribeResult.success) {
    console.log("✅ Subscribed to Workshop item");
  }

  // Get all subscribed items
  const subscribedItems = steam.workshop.getSubscribedItems();
  console.log(`Subscribed to ${subscribedItems.length} Workshop items`);

  // Query Workshop items with text search
  const query = steam.workshop.createQueryAllUGCRequest(
    11, // RankedByTextSearch - for text search queries
    0, // Items
    480, // Creator App ID
    480, // Consumer App ID
    1 // Page 1
  );

  if (query) {
    // Set search text to filter results
    steam.workshop.setSearchText(query, "map");

    const queryResult = await steam.workshop.sendQueryUGCRequest(query);
    if (queryResult) {
      console.log(
        `Found ${queryResult.numResults} Workshop items matching "map"`
      );

      // Get details for each item
      for (let i = 0; i < queryResult.numResults; i++) {
        const details = steam.workshop.getQueryUGCResult(query, i);
        if (details) {
          console.log(`📦 ${details.title} by ${details.steamIDOwner}`);
          console.log(
            `   Score: ${details.score}, Downloads: ${details.numUniqueSubscriptions}`
          );
        }
      }
    }
    steam.workshop.releaseQueryUGCRequest(query);
  }

  // Check download progress for subscribed items
  subscribedItems.forEach((itemId) => {
    const state = steam.workshop.getItemState(itemId);
    const stateFlags = [];
    if (state & 1) stateFlags.push("Subscribed");
    if (state & 4) stateFlags.push("Needs Update");
    if (state & 8) stateFlags.push("Installed");
    if (state & 16) stateFlags.push("Downloading");

    console.log(`Item ${itemId}: ${stateFlags.join(", ")}`);

    if (state & 16) {
      // If downloading
      const progress = steam.workshop.getItemDownloadInfo(itemId);
      if (progress) {
        const percent = ((progress.downloaded / progress.total) * 100).toFixed(
          1
        );
        console.log(
          `  Download: ${percent}% (${progress.downloaded}/${progress.total} bytes)`
        );
      }
    }

    if (state & 8) {
      // If installed
      const info = steam.workshop.getItemInstallInfo(itemId);
      if (info.success) {
        console.log(`  Installed at: ${info.folder}`);
      }
    }
  });
}

// Cleanup
clearInterval(callbackInterval);
steam.shutdown();
```

### JavaScript

```javascript
// Option 1: ESM Named import
import { SteamworksSDK } from "steamworks-ffi-node";

// Option 2: CommonJs named import (recommended - no .default needed)
const { SteamworksSDK } = require("steamworks-ffi-node");

// Option 3: CommonJs default named import (also works)
const SteamworksSDK = require("steamworks-ffi-node").default;

// Helper to auto-start callback polling
function startCallbackPolling(steam, interval = 1000) {
  return setInterval(() => {
    steam.runCallbacks();
  }, interval);
}

async function example() {
  const steam = SteamworksSDK.getInstance();

  if (steam.init({ appId: 480 })) {
    // Start callback polling automatically
    const callbackInterval = startCallbackPolling(steam, 1000);

    const achievements = await steam.achievements.getAllAchievements();
    console.log(`Found ${achievements.length} achievements`);

    // Unlock first locked achievement
    const locked = achievements.find((a) => !a.unlocked);
    if (locked) {
      await steam.achievements.unlockAchievement(locked.apiName);
    }

    // Cleanup
    clearInterval(callbackInterval);
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

## API Documentation

Complete documentation for all APIs is available in the [docs folder](https://github.com/ArtyProf/steamworks-ffi-node/tree/main/docs):

➡️ **[View Complete Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/README.md)**

### API Guides:

- **[Achievement Manager](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/ACHIEVEMENT_MANAGER.md)** - Complete achievement system (20 functions)
- **[Stats Manager](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/STATS_MANAGER.md)** - User and global statistics (14 functions)
- **[Leaderboard Manager](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/LEADERBOARD_MANAGER.md)** - Leaderboard operations (7 functions)
- **[Friends Manager](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/FRIENDS_MANAGER.md)** - Friends and social features (22 functions)
- **[Rich Presence Manager](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/RICH_PRESENCE_MANAGER.md)** - Custom status display and join functionality (6 functions)
- **[Overlay Manager](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/OVERLAY_MANAGER.md)** - Steam overlay control (7 functions)
- **[Cloud Storage Manager](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/CLOUD_MANAGER.md)** - Steam Cloud file operations (14 functions)
- **[Workshop Manager](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/WORKSHOP_MANAGER.md)** - Steam Workshop/UGC operations (29 functions)
- **[Input Manager](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/INPUT_MANAGER.md)** - Steam Input controller support (35+ functions) ⚠️ _Virtual gamepad testing only_

## Steamworks Integration

This library connects directly to the Steam client and Steamworks SDK:

```javascript
// Steamworks API
const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 }); // Connects to actual Steam

// Live achievements from Steam servers
const achievements = await steam.achievements.getAllAchievements();
console.log(achievements); // Achievement data from your Steam app

// Permanent achievement unlock in Steam
await steam.achievements.unlockAchievement("YOUR_ACHIEVEMENT");
// ^ This shows up in Steam overlay and is saved permanently
```

**What happens when you unlock an achievement:**

- ✅ Steam overlay notification appears
- ✅ Achievement saved to Steam servers permanently
- ✅ Syncs across all devices
- ✅ Appears in Steam profile
- ✅ Counts toward Steam statistics

## Electron Integration

For Electron applications, use it in your main process:

```typescript
// main.ts
import { app } from "electron";
import SteamworksSDK from "steamworks-ffi-node";

app.whenReady().then(() => {
  const steam = SteamworksSDK.getInstance();

  if (steam.init({ appId: YOUR_STEAM_APP_ID })) {
    console.log("Steam initialized in Electron!");

    // Handle achievement unlocks from renderer process
    // via IPC if needed
  }
});

app.on("before-quit", () => {
  const steam = SteamworksSDK.getInstance();
  steam.shutdown();
});
```

### 📦 Electron Packaging

For Electron applications, the library will automatically detect the Steamworks SDK files in your project directory. No special packaging configuration is needed - just ensure your `steamworks_sdk/redistributable_bin` folder is present in your project.

The library searches for the SDK in standard locations within your Electron app bundle.

## Requirements

- **Node.js**: 18+
- **Steam Client**: Must be running and logged in
- **Steam App ID**: Get yours at [Steamworks Partner](https://partner.steamgames.com/)
- **steam_appid.txt**: Optional - create in your project root OR pass to `steam.init(appId)`

### Platform Support

- ✅ **Windows**: steam_api64.dll / steam_api.dll
- ✅ **macOS**: libsteam_api.dylib
- ✅ **Linux**: libsteam_api.so

**Steamworks SDK Version**: v1.62 (Latest)

_Note: You must download and install the SDK redistributables separately as described in the Setup section above._

## Troubleshooting

### "SteamAPI_Init failed"

- ❌ Steam client not running → **Solution**: Start Steam and log in
- ❌ No App ID specified → **Solution**: Create `steam_appid.txt` in project root OR pass App ID to `steam.init(appId)`
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
- ❌ "Steamworks SDK library not found" in packaged app → **Solution**: Include SDK redistributables in your build (see Electron Packaging section above)
- ❌ Native module errors in packaged app → **Solution**: Ensure Steamworks SDK files are properly included in your app bundle

## How to Support This Project

You can support the development of this library by wishlisting, subscribing, and purchasing the app **AFK Companion** on Steam:

👉 [AFK Companion on Steam](https://store.steampowered.com/app/2609100/AFK_Companion/)

- Add the app to your wishlist
- Subscribe to updates
- Buy and run the app

**AFK Companion** is built using this library! Your support helps fund further development and improvements.

---

## License

MIT License - see LICENSE file for details.

**Note**: This package requires the Steamworks SDK redistributables to be installed separately by users. Users are responsible for complying with Valve's Steamworks SDK Access Agreement when downloading and using the SDK.
