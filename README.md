# Steamworks FFI - Real Steam Integration

A production-ready TypeScript/JavaScript wrapper for the Steamworks SDK using Koffi FFI, designed for Node.js and Electron applications with **real Steam client integration**.

> ✅ **No C++ Compilation Required**: Uses Koffi FFI for seamless installation without Visual Studio Build Tools!

## 🎯 Features

- **Real Steam Integration**: Direct FFI calls to Steamworks C++ SDK
- **Cross-Platform**: Windows, macOS, and Linux support
- **Electron Ready**: Perfect for Electron applications
- **Production Ready**: Full Steam client connection and API access
- **TypeScript Support**: Complete TypeScript definitions included
- **Achievement System**: Full CRUD operations for Steam achievements

## 🚀 Quick Start

### Prerequisites

**Before using, you need:**

1. **Steamworks SDK**: Download from [Steam Partner Portal](https://partner.steamgames.com/) and place in `steamworks_sdk/` directory

2. **Steam Client**: Must be running and logged in for real integration

### Installation

```bash
# Install dependencies (using Koffi FFI - no C++ compilation required!)
npm install

# Build TypeScript
npm run build
```

### Basic Usage

```typescript
import Steam from 'steamworks-ffi';

// Initialize real Steam connection
const steam = Steam.getInstance();
const initialized = steam.init({ appId: 480 }); // Your Steam App ID

if (initialized) {
  // Get achievements from Steam servers
  const achievements = await steam.getAllAchievements();
  console.log('Real Steam achievements:', achievements);
  
  // Unlock achievement (permanent in Steam!)
  await steam.unlockAchievement('ACH_WIN_ONE_GAME');
  
  // Check unlock status from Steam
  const isUnlocked = await steam.isAchievementUnlocked('ACH_WIN_ONE_GAME');
  console.log('Achievement unlocked:', isUnlocked);
}

// Cleanup
steam.shutdown();
```

### JavaScript (CommonJS)

```javascript
const Steam = require('steamworks-ffi').default;

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

## 📚 API Reference

### Steam Class

#### `Steam.getInstance()`
Get the singleton Steam instance.

#### `init(options: SteamInitOptions): boolean`
Initialize the Steam API.
- `options.appId`: Your Steam Application ID

#### `shutdown(): void`
Shutdown the Steam API and cleanup resources.

#### `getStatus(): SteamStatus`
Get current Steam status information.

### Achievement Methods

#### `getAllAchievements(): Promise<SteamAchievement[]>`
Get all available achievements for the app.

#### `unlockAchievement(apiName: string): Promise<boolean>`
Unlock a specific achievement.

#### `clearAchievement(apiName: string): Promise<boolean>`
Clear/reset an achievement (for testing).

#### `isAchievementUnlocked(apiName: string): Promise<boolean>`
Check if an achievement is unlocked.

#### `getAchievement(apiName: string): Promise<SteamAchievement | null>`
Get details for a specific achievement.

#### `getTotalCount(): Promise<number>`
Get total number of achievements.

#### `getUnlockedCount(): Promise<number>`
Get number of unlocked achievements.

### Types

```typescript
interface SteamAchievement {
  apiName: string;        // Internal achievement ID
  displayName: string;    // User-friendly name
  description: string;    // Achievement description
  unlocked: boolean;      // Whether it's unlocked
  unlockTime: number;     // Unix timestamp of unlock (0 if locked)
}

interface SteamInitOptions {
  appId: number;          // Your Steam Application ID
}

interface SteamStatus {
  initialized: boolean;   // Whether Steam API is initialized
  appId: number;         // Current app ID
  steamId: string;       // Current user's Steam ID
}
```

## 🎮 Real Steam Integration

This library connects directly to the Steam client and Steamworks SDK:

```javascript
// Real Steam API - no mocking!
const steam = Steam.getInstance();
steam.init({ appId: 480 }); // Connects to actual Steam

// Live achievements from Steam servers
const achievements = await steam.getAllAchievements();
console.log(achievements); // Real achievement data from your Steam app

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

For Electron applications, just use it in your main process:

```typescript
// main.ts
import { app } from 'electron';
import Steam from 'steamworks-ffi';

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

## 🏗️ Production Setup

### Steamworks SDK Setup

1. **Download SDK**: Get from [Steam Partner Portal](https://partner.steamgames.com/)
2. **Extract to project**:
   ```
   steamworks_sdk/
   ├── public/steam/           # Header files
   └── redistributable_bin/    # Native libraries
       ├── win64/steam_api64.dll
       ├── osx/libsteam_api.dylib
       └── linux64/libsteam_api.so
   ```
3. **Get Steam App ID**: Register your game on Steamworks
4. **Create steam_appid.txt**: File with your App ID in project root

### Testing Setup

For immediate testing, use Spacewar (App ID 480):
- Free Steam app for testing
- Add to Steam library: steam://install/480
- Requires Steam client running and logged in

## 🔧 Requirements

### Development
- **Node.js**: 18+ 
- **TypeScript**: 5.0+ (optional)
- **Visual Studio Build Tools**: C++ workload required
- **Python**: For native module compilation

### Runtime
- **Steam Client**: Must be running and logged in
- **Steamworks SDK**: Redistributable binaries required
- **Valid Steam App ID**: From registered Steam application

### Platform Support
- ✅ **Windows**: steam_api64.dll / steam_api.dll
- ✅ **macOS**: libsteam_api.dylib  
- ✅ **Linux**: libsteam_api.so

## 🚀 Quick Start

```bash
# 1. Setup environment
npm run setup

# 2. Install dependencies
npm install  

# 3. Build TypeScript
npm run build

# 4. Test with Steam
npm start
```

## 🔧 Troubleshooting

**"Library not found"**: Install Steamworks SDK to `steamworks_sdk/`  
**"SteamAPI_Init failed"**: Make sure Steam client is running  
**Build errors**: Install Visual Studio C++ Build Tools  
**"Missing VC++ toolset"**: Add C++ workload in VS Installer  

## 📄 License

MIT License - see LICENSE file for details.