# Steamworks FFI Documentation

Complete API documentation for all Steamworks FFI functionality.

## 🎯 Manager-Based API

Steamworks FFI uses a **manager-based architecture** for better organization:

```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = new SteamworksSDK();
steam.init({ appId: 480 });

// Access features through specialized managers
steam.achievements.*  // Achievement operations
steam.stats.*         // Statistics operations  
steam.leaderboards.*  // Leaderboard operations
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

## 🚀 Quick Links

### Getting Started
- [Installation Guide](https://github.com/ArtyProf/steamworks-ffi-node#installation)
- [Quick Start Examples](https://github.com/ArtyProf/steamworks-ffi-node#quick-start)
- [Electron Integration](https://github.com/ArtyProf/steamworks-ffi-node#electron-integration)

### Testing
- Run Achievement Tests: `npm run test:achievements`
- Run Stats Tests: `npm run test:stats`
- Run Leaderboard Tests: `npm run test:leaderboards`

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
