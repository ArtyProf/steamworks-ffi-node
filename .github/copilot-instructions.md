# Steamworks FFI - AI Coding Assistant Instructions

## Project Overview

This is **Steamworks FFI**, a minimal, cross-platform TypeScript/JavaScript wrapper for Steamworks SDK achievements functionality. It's designed to be tiny, lightweight, and perfect for Node.js and Electron applications.

### 🎯 Project Goals
- **Minimal Implementation**: Focus only on Steam achievements functionality
- **Cross-Platform**: Windows, macOS, Linux support
- **Electron Ready**: Seamless integration with Electron applications
- **Development Friendly**: Mock system for development without Steam SDK
- **TypeScript First**: Full type safety and IDE support

### 🏗️ Architecture

```
src/
├── index.ts     # Main entry point and exports
├── steam.ts     # Core Steam FFI wrapper class  
└── types.ts     # TypeScript type definitions

examples/
├── electron-main.js  # Electron main process integration
├── preload.js       # Electron preload script
└── index.html       # Demo web interface

dist/            # Compiled JavaScript output
test.js          # Simple test script
steam_appid.txt  # Steam App ID file (required by Steam)
```

### 🔧 Technology Stack
- **TypeScript 5.0+**: Primary language with strict type checking
- **Node.js 18+**: Runtime environment
- **Pure JavaScript**: No native dependencies for maximum compatibility
- **Mock System**: Built-in development mode without Steam SDK

## 📝 Coding Guidelines

### Code Style
- **ES2020 target** with CommonJS modules
- **Strict TypeScript**: All types must be explicit
- **Async/await**: Prefer over Promises for better readability
- **Singleton pattern**: Steam class uses singleton for global state
- **Error handling**: Always wrap Steam API calls in try/catch

### Key Patterns

#### 1. Steam Singleton Usage
```typescript
const steam = Steam.getInstance();
const initialized = steam.init({ appId: 480 });
```

#### 2. Achievement Operations
```typescript
// Always check initialization first
if (!this.initialized) {
  console.warn('⚠️ Steam API not initialized');
  return false;
}

// Use async/await for all achievement operations
const achievements = await steam.getAllAchievements();
const unlocked = await steam.unlockAchievement('ACH_WIN_ONE_GAME');
```

#### 3. Mock Development Mode
- All methods work without Steam SDK installed
- Mock data in `MOCK_ACHIEVEMENTS` array
- Console logging with emoji indicators (🎮, ✅, ❌, ⚠️)

### TypeScript Interface Contracts

```typescript
// Core interfaces that must be maintained
interface SteamAchievement {
  apiName: string;        // Steam internal ID
  displayName: string;    // User-friendly name
  description: string;    // Description text
  unlocked: boolean;      // Current unlock status
  unlockTime: number;     // Unix timestamp (0 if locked)
}

interface SteamInitOptions {
  appId: number;          // Steam Application ID
}

interface SteamStatus {
  initialized: boolean;   // API initialization status
  appId: number;         // Current app ID
  steamId: string;       // User's Steam ID (or '0')
}
```

## 🎨 Development Workflow

### Adding New Features
1. **Extend the Steam class** in `src/steam.ts`
2. **Add TypeScript types** in `src/types.ts` if needed
3. **Update exports** in `src/index.ts`
4. **Add mock behavior** for development mode
5. **Update README.md** with new API documentation

### Testing Guidelines
- Use `test.js` for quick functionality tests
- Test both initialized and uninitialized states
- Verify mock mode works correctly
- Check async operations complete properly

### Example Implementation Pattern
```typescript
async newSteamMethod(param: string): Promise<boolean> {
  if (!this.initialized) {
    console.warn('⚠️ Steam API not initialized');
    return false;
  }

  try {
    // Simulate async operation in mock mode
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Mock logic here
    console.log(`🎮 Mock: ${param} processed`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error in newSteamMethod:`, error.message);
    return false;
  }
}
```

## 🚀 Integration Patterns

### Electron Applications
- Initialize Steam in **main process** only
- Use **IPC communication** for renderer process access
- Handle **app lifecycle** events for proper cleanup
- Set up **contextBridge** for secure renderer access

### Node.js Applications  
- Use **CommonJS requires** or **ES module imports**
- Handle **process signals** (SIGINT, SIGTERM) for cleanup
- Ensure **steam_appid.txt** exists for Steam detection

## 🐛 Common Issues & Solutions

### "Steam API not initialized" 
- Check if `init()` was called successfully
- Verify `steam_appid.txt` exists with correct App ID
- Ensure Steam client is running (production only)

### TypeScript Compilation Errors
- All Node.js types are available via `@types/node`
- Use `skipLibCheck: true` for external library issues
- Import statements must use explicit file extensions in some cases

### Electron Integration Issues
- Steam must be initialized in **main process**, not renderer
- Use **preload scripts** for secure IPC communication
- Handle **before-quit** event for proper Steam shutdown

## 🎯 Future Enhancements

Priority features to consider:
1. **Real Steam SDK Integration**: Replace mock with actual FFI calls
2. **Steam Friends API**: Social features integration
3. **Steam Cloud**: Save file synchronization
4. **Steam Workshop**: Mod support
5. **Steam Overlay**: In-game overlay integration

### Extension Points
- Add new methods to `SteamFFI` class
- Extend `SteamStatus` interface for additional data
- Create specialized classes for different Steam subsystems
- Implement event system for Steam callbacks

## 📋 File-Specific Instructions

### `src/steam.ts`
- **Core implementation**: Main Steam wrapper logic
- **Singleton pattern**: Always use `getInstance()`
- **Mock data**: Keep `MOCK_ACHIEVEMENTS` updated
- **Error logging**: Use consistent emoji indicators

### `src/types.ts`  
- **Interface definitions**: All TypeScript interfaces
- **Documentation comments**: JSDoc for all public interfaces
- **Backward compatibility**: Don't break existing interfaces

### `src/index.ts`
- **Public API**: Only export what users need
- **Re-exports**: Keep exports organized and documented
- **Usage examples**: Include commented examples

### `examples/`
- **Working examples**: All code must be functional
- **Best practices**: Demonstrate proper usage patterns
- **Error handling**: Show how to handle failures gracefully

---

This wrapper prioritizes **simplicity, reliability, and developer experience**. Keep implementations minimal, well-tested, and thoroughly documented.