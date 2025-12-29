# Steamworks FFI Documentation

Complete API documentation for all Steamworks FFI functionality.

## 🎯 Manager-Based API

Steamworks FFI uses a **manager-based architecture** for better organization:

```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Access features through specialized managers
steam.achievements.*   // Achievement operations
steam.stats.*          // Statistics operations
steam.leaderboards.*   // Leaderboard operations
steam.friends.*        // Friends and social operations
steam.richPresence.*   // Rich Presence operations
steam.overlay.*        // Overlay control operations
steam.cloud.*          // Cloud storage operations
steam.workshop.*       // Workshop/UGC operations
steam.input.*          // Controller input operations
steam.screenshots.*    // Screenshots operations
steam.apps.*           // DLC and app ownership operations
steam.matchmaking.*    // Multiplayer lobby operations
steam.utils.*          // System utilities and device detection
```

This design:

- ✅ **Groups related functions** - Easy to discover all achievement/stats/leaderboard methods
- ✅ **Clear namespacing** - No naming conflicts
- ✅ **Better IDE support** - Autocomplete shows relevant methods
- ✅ **Logical organization** - Matches Steamworks SDK structure

---

## 📚 Available Documentation

### Core API

- **[SteamAPICore Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/STEAM_API_CORE.md)**
  - Initialization and lifecycle management
  - Steam callbacks and event handling
  - Status checking and diagnostics
  - Platform-specific library loading

### Achievement System

- **[Achievement Manager API](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/ACHIEVEMENT_MANAGER.md)**
  - **20 Functions** - 100% Achievement API coverage
  - Core operations (get, unlock, clear, check status)
  - Visual features (icons, progress notifications)
  - Progress tracking (get limits for progress bars)
  - Friend comparisons (see friend achievements)
  - Global statistics (unlock percentages, popularity sorting)
  - Testing tools (reset stats/achievements)

### Statistics System

- **[Stats Manager API](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/STATS_MANAGER.md)**
  - **14 Functions** - 100% Stats API coverage
  - User stats (get/set int/float, average rate tracking)
  - Friend comparisons (compare stats with friends)
  - Global statistics (worldwide aggregated data with history)

### Leaderboard System

- **[Leaderboard Manager API](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/LEADERBOARD_MANAGER.md)**
  - **7 Functions** - 100% Leaderboard API coverage
  - Leaderboard management (find, create, get info)
  - Score operations (upload with optional details)
  - Entry download (global, friends, specific users)
  - UGC integration (attach replays/screenshots to entries)

### Friends & Social System

- **[Friends Manager API](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/FRIENDS_MANAGER.md)**
  - **22 Functions** - Complete friends and social features
  - Current user info (get persona name, online status)
  - Friends list management (count, iterate, retrieve all)
  - Friend information (names, status, relationship types, Steam levels)
  - Friend activity (check what games friends are playing)
  - Friend avatars (small/medium/large avatar handles)
  - Friend groups (manage and query friend tags/categories)
  - Coplay tracking (recently played with users)

### Rich Presence System

- **[Rich Presence Manager API](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/RICH_PRESENCE_MANAGER.md)**
  - **6 Functions** - Complete Rich Presence support
  - Set/clear rich presence key/value pairs
  - Query friend rich presence data
  - Display custom status in Steam friends list
  - Enable friend join functionality
  - Player groups and localization support

### Overlay System

- **[Overlay Manager API](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/OVERLAY_MANAGER.md)**
  - **7 Functions** - Complete overlay control
  - Open overlay to various dialogs (friends, achievements, etc.)
  - Open overlay to user profiles and stats
  - Open overlay browser to URLs
  - Open store pages with purchase options
  - Show invite dialogs for multiplayer

### Cloud Storage System

- **[Cloud Manager API](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/CLOUD_MANAGER.md)**
  - **17 Functions** - Complete Steam Cloud (Remote Storage) support
  - File operations (write, read, delete, check existence)
  - File metadata (size, timestamp, persistence status)
  - File listing (count, iterate, get all with details)
  - Quota management (track storage usage and limits)
  - Cloud settings (check/toggle cloud sync for account and app)
  - Batch writes (atomic multi-file operations)

### Workshop System

- **[Workshop Manager API](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/WORKSHOP_MANAGER.md)**
  - **30 Functions** - Complete Steam Workshop/UGC support
  - Subscription management (subscribe, unsubscribe, list items)
  - Item state & information (download progress, installation info)
  - Query operations (text search, browse, filter Workshop content)
  - Item creation & update (create, upload, manage your Workshop items)
  - Voting & favorites (vote on items, manage favorites)
  - Item deletion (permanently delete your Workshop items)

### Input System

- **[Input Manager API](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/INPUT_MANAGER.md)**
  - **35+ Functions** - Complete Steam Input (controller) support
  - Controller detection (Xbox, PlayStation, Switch, Steam Controller, Steam Deck)
  - Action sets and layers (menu controls, gameplay controls, etc.)
  - Digital actions (buttons) and analog actions (sticks/triggers)
  - Motion data (gyro, accelerometer for supported controllers)
  - Haptics (vibration, LED control for DualShock/DualSense)
  - ⚠️ **Tested with virtual gamepad only** - not yet tested in production projects

### Screenshots System

- **[Screenshot Manager API](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/SCREENSHOT_MANAGER.md)**
  - **9 Functions** - Complete Steam Screenshots support
  - Screenshot capture (programmatic and user-triggered)
  - Add existing images to Steam library (from files or raw RGB data)
  - Location tagging (geotag screenshots with location names)
  - User tagging (tag friends who appear in screenshots)
  - Workshop integration (link screenshots to published items)
  - Screenshot hooks (intercept F12 to handle screenshots yourself)
  - VR screenshot support (side-by-side and cubemap formats)

### Apps/DLC System

- **[Apps Manager API](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/APPS_MANAGER.md)**
  - **28 Functions** - Complete DLC and app ownership support
  - DLC ownership checks (is DLC owned and installed)
  - Install/uninstall optional DLC
  - App ownership verification (subscribed, free weekend, Family Sharing)
  - Beta branch management (list, switch, get info)
  - App metadata (languages, build info, install directories)
  - Launch parameters (Steam URL launch params)
  - Timed trial status

### Matchmaking System

- **[Matchmaking Manager API](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/MATCHMAKING_MANAGER.md)**
  - **30+ Functions** - Complete lobby matchmaking support
  - Lobby creation (public, private, friends-only, invisible)
  - Lobby searching with filters (string, numerical, near, distance)
  - Lobby joining and leaving
  - Lobby data (get/set metadata for searching and game state)
  - Member management (list, limit, ownership transfer)
  - Lobby chat (send/receive messages between members)
  - Game server association (link dedicated servers to lobbies)
  - ⚠️ **Requires two Steam accounts for full testing** - multiplayer API

### Utils System

- **[Utils Manager API](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/UTILS_MANAGER.md)**
  - **25+ Functions** - Complete Steam Utils support
  - System information (battery level, IP country, server time)
  - Device detection (Steam Deck, Big Picture Mode, VR, Steam China)
  - Overlay notification positioning (corner + inset)
  - Image loading (avatars, achievement icons from Steam cache)
  - Gamepad text input (full-screen and floating keyboards)
  - Text filtering (profanity filter for user-generated content)
  - Performance monitoring (IPC call count)

## 🚀 Quick Links

### Getting Started

- [Installation Guide](https://github.com/ArtyProf/steamworks-ffi-node#installation)
- [Quick Start Examples](https://github.com/ArtyProf/steamworks-ffi-node#quick-start)
- [Electron Integration](https://github.com/ArtyProf/steamworks-ffi-node#electron-integration)

### Testing

**JavaScript Tests** (Production - Uses compiled dist/):

- Run Achievement Tests: `npm run test:achievements:js` - Tests all 20 achievement functions
- Run Stats Tests: `npm run test:stats:js` - Tests all 14 stats functions
- Run Leaderboard Tests: `npm run test:leaderboards:js` - Tests all 7 leaderboard functions
- Run Friends Tests: `npm run test:friends:js` - Tests all 22 friends functions
- Run Cloud Tests: `npm run test:cloud:js` - Tests all 17 cloud storage functions
- Run Rich Presence & Overlay Tests: `npm run test:richpresence-overlay:js` - Tests 6 rich presence + 7 overlay functions
- Run Workshop Tests: `npm run test:workshop:js` - Tests all 30 Workshop/UGC functions
- Run Input Tests: `npm run test:input-xbox:js` or `npm run test:input-ps4:js` - Tests 35+ input functions with virtual gamepad
- Run Apps/DLC Tests: `npm run test:apps:js` - Tests all 28 apps/DLC functions
- Run Screenshots Tests: `npm run test:screenshots:js` - Tests all 9 screenshot functions
- Run Matchmaking Host: `npm run test:matchmaking:host:js` - Creates lobby, waits for players
- Run Matchmaking Join: `npm run test:matchmaking:join:js` - Searches and joins lobbies
- Run Utils Tests: `npm run test:utils:js` - Tests all utils functions

**TypeScript Tests** (Development - Direct src/ imports, no rebuild needed):

- Run Achievement Tests: `npm run test:achievements:ts` - With type safety ✨
- Run Stats Tests: `npm run test:stats:ts` - With type safety ✨
- Run Leaderboard Tests: `npm run test:leaderboards:ts` - With type safety ✨
- Run Friends Tests: `npm run test:friends:ts` - With type safety ✨
- Run Cloud Tests: `npm run test:cloud:ts` - With type safety ✨
- Run Rich Presence & Overlay Tests: `npm run test:richpresence-overlay:ts` - With type safety ✨
- Run Workshop Tests: `npm run test:workshop:ts` - With type safety ✨
- Run Input Tests: `npm run test:input-xbox:ts` or `npm run test:input-ps4:ts` - With type safety ✨
- Run Apps/DLC Tests: `npm run test:apps:ts` - With type safety ✨
- Run Screenshots Tests: `npm run test:screenshots:ts` - With type safety ✨
- Run Matchmaking Host: `npm run test:matchmaking:host:ts` - Creates lobby, waits for players ✨
- Run Matchmaking Join: `npm run test:matchmaking:join:ts` - Searches and joins lobbies ✨
- Run Utils Tests: `npm run test:utils:ts` - With type safety ✨

⚠️ **Note:** Matchmaking tests require two separate Steam accounts to fully test multiplayer functionality. Run the host test on one machine, then the join test on another machine with a different Steam account.

📁 All tests are in `tests/` folder with separate `js/` and `ts/` subfolders.

💡 **Pro tip**: TypeScript tests import directly from `src/` so you can test changes immediately without running `npm run build`!

### Additional Resources

- [GitHub Repository](https://github.com/ArtyProf/steamworks-ffi-node)
- [NPM Package](https://www.npmjs.com/package/steamworks-ffi-node)
- [Report Issues](https://github.com/ArtyProf/steamworks-ffi-node/issues)

---

## 📖 Documentation Structure

Each API documentation includes:

- **Overview** - Architecture and design patterns
- **Quick Reference** - Function categories and counts
- **Detailed Functions** - Parameters, returns, SDK mappings, examples
- **Configuration** - Steamworks Partner setup instructions
- **TypeScript Types** - Interface definitions
- **Complete Examples** - Real-world usage scenarios
- **Best Practices** - Guidelines and recommendations
- **Error Handling** - Common issues and solutions

---

**Need help?** Check the [troubleshooting section](https://github.com/ArtyProf/steamworks-ffi-node#troubleshooting) in the main README or [open an issue](https://github.com/ArtyProf/steamworks-ffi-node/issues).
