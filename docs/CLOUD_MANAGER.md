# Cloud Manager API Documentation

Complete reference for Steam Cloud (Remote Storage) functionality in Steamworks FFI.

## Overview

The `SteamCloudManager` provides **100% coverage** of essential Steam Cloud file operations with 14 functions for file management, quota tracking, and cloud settings.

## Quick Reference

| Category | Functions | Description |
|----------|-----------|-------------|
| [File Operations](#file-operations) | 4 | Write, read, delete, check existence |
| [File Metadata](#file-metadata) | 3 | Get size, timestamp, persistence status |
| [File Listing](#file-listing) | 3 | Count, iterate, list all files |
| [Quota Management](#quota-management) | 1 | Check storage usage and limits |
| [Cloud Settings](#cloud-settings) | 3 | Check/toggle cloud sync settings |

---

## File Operations

Core file management operations for Steam Cloud storage.

### `fileWrite(filename, data)`

Write file data to Steam Cloud storage.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamRemoteStorage_FileWrite()` - Write file to cloud

**Parameters:**
- `filename: string` - Name of the file (max 260 characters)
- `data: Buffer` - File data to write (max 100MB per write, 200MB total per file)

**Returns:** `boolean` - `true` if successfully written

**Example:**
```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = new SteamworksSDK();

// Save game state
const saveData = {
  level: 5,
  score: 1000,
  inventory: ['sword', 'shield', 'potion']
};

const buffer = Buffer.from(JSON.stringify(saveData));
const success = steam.cloud.fileWrite('savegame.json', buffer);

if (success) {
  console.log('✅ Save file uploaded to Steam Cloud');
} else {
  console.error('❌ Failed to write to Steam Cloud');
}
```

---

### `fileRead(filename)`

Read file data from Steam Cloud storage.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamRemoteStorage_FileRead()` - Read file from cloud
- `SteamAPI_ISteamRemoteStorage_GetFileSize()` - Get file size

**Parameters:**
- `filename: string` - Name of the file to read

**Returns:** `CloudFileReadResult`

**Type:**
```typescript
interface CloudFileReadResult {
  success: boolean;    // Whether read was successful
  filename: string;    // Name of the file
  data: Buffer | null; // File contents (null if failed)
  bytesRead: number;   // Number of bytes read
}
```

**Example:**
```typescript
const result = steam.cloud.fileRead('savegame.json');

if (result.success && result.data) {
  const saveData = JSON.parse(result.data.toString());
  console.log(`Loaded save: Level ${saveData.level}, Score ${saveData.score}`);
  console.log(`Read ${result.bytesRead} bytes from Steam Cloud`);
} else {
  console.log('No save file found, starting new game');
}
```

---

### `fileExists(filename)`

Check if a file exists in Steam Cloud storage.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamRemoteStorage_FileExists()` - Check file existence

**Parameters:**
- `filename: string` - Name of the file to check

**Returns:** `boolean` - `true` if file exists

**Example:**
```typescript
if (steam.cloud.fileExists('savegame.json')) {
  console.log('Save file found, loading...');
  const save = steam.cloud.fileRead('savegame.json');
} else {
  console.log('No save file, creating new game...');
}
```

---

### `fileDelete(filename)`

Delete a file from Steam Cloud storage.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamRemoteStorage_FileDelete()` - Delete file from cloud

**Parameters:**
- `filename: string` - Name of the file to delete

**Returns:** `boolean` - `true` if successfully deleted

**Example:**
```typescript
// Delete old save
const deleted = steam.cloud.fileDelete('savegame_old.json');
if (deleted) {
  console.log('🗑️ Old save deleted');
}

// Delete with confirmation
if (steam.cloud.fileExists('savegame.json')) {
  const confirm = true; // Get user confirmation
  if (confirm) {
    steam.cloud.fileDelete('savegame.json');
    console.log('Save file deleted');
  }
}
```

---

## File Metadata

Get detailed information about files in Steam Cloud.

### `getFileSize(filename)`

Get the size of a file in bytes.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamRemoteStorage_GetFileSize()` - Get file size

**Parameters:**
- `filename: string` - Name of the file

**Returns:** `number` - File size in bytes (0 if file doesn't exist)

**Example:**
```typescript
const size = steam.cloud.getFileSize('savegame.json');
if (size > 0) {
  const kb = (size / 1024).toFixed(2);
  console.log(`Save file: ${kb} KB`);
}
```

---

### `getFileTimestamp(filename)`

Get the last modification timestamp of a file.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamRemoteStorage_GetFileTimestamp()` - Get file timestamp

**Parameters:**
- `filename: string` - Name of the file

**Returns:** `number` - Unix timestamp in seconds (0 if file doesn't exist)

**Example:**
```typescript
const timestamp = steam.cloud.getFileTimestamp('savegame.json');
if (timestamp > 0) {
  const date = new Date(timestamp * 1000);
  console.log(`Last saved: ${date.toLocaleString()}`);
  
  // Check if save is recent
  const hoursSinceModified = (Date.now() / 1000 - timestamp) / 3600;
  if (hoursSinceModified < 1) {
    console.log('Recent save detected');
  }
}
```

---

### `filePersisted(filename)`

Check if a file has been successfully uploaded/persisted to Steam Cloud.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamRemoteStorage_FilePersisted()` - Check persistence status

**Parameters:**
- `filename: string` - Name of the file

**Returns:** `boolean` - `true` if file is persisted to cloud

**Example:**
```typescript
// Verify upload after write
const buffer = Buffer.from('game data');
steam.cloud.fileWrite('progress.dat', buffer);

setTimeout(() => {
  if (steam.cloud.filePersisted('progress.dat')) {
    console.log('✅ File successfully synced to Steam Cloud');
  } else {
    console.log('⏳ File still uploading...');
  }
}, 1000);
```

---

## File Listing

Enumerate and list files in Steam Cloud storage.

### `getFileCount()`

Get the total number of files in Steam Cloud.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamRemoteStorage_GetFileCount()` - Get file count

**Returns:** `number` - Total number of files

**Example:**
```typescript
const count = steam.cloud.getFileCount();
console.log(`Steam Cloud contains ${count} files`);

if (count === 0) {
  console.log('No cloud saves found');
}
```

---

### `getFileNameAndSize(index)`

Get name and size of a file by index (for manual iteration).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamRemoteStorage_GetFileNameAndSize()` - Get file info by index

**Parameters:**
- `index: number` - File index (0 to fileCount-1)

**Returns:** `{ name: string; size: number } | null`

**Example:**
```typescript
// Manual iteration through all files
const fileCount = steam.cloud.getFileCount();
console.log(`Iterating through ${fileCount} files:\n`);

for (let i = 0; i < fileCount; i++) {
  const fileInfo = steam.cloud.getFileNameAndSize(i);
  if (fileInfo) {
    const kb = (fileInfo.size / 1024).toFixed(2);
    console.log(`[${i}] ${fileInfo.name} - ${kb} KB`);
  }
}
```

---

### `getAllFiles()`

Get complete information about all files in Steam Cloud (recommended over manual iteration).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamRemoteStorage_GetFileCount()` - Get file count
- `SteamAPI_ISteamRemoteStorage_GetFileNameAndSize()` - Get each file's info
- `SteamAPI_ISteamRemoteStorage_GetFileTimestamp()` - Get timestamp
- `SteamAPI_ISteamRemoteStorage_FileExists()` - Verify existence
- `SteamAPI_ISteamRemoteStorage_FilePersisted()` - Check sync status

**Returns:** `CloudFileInfo[]`

**Type:**
```typescript
interface CloudFileInfo {
  name: string;       // File name
  size: number;       // Size in bytes
  timestamp: number;  // Unix timestamp
  exists: boolean;    // Whether file exists
  persisted: boolean; // Whether synced to cloud
}
```

**Example:**
```typescript
const files = steam.cloud.getAllFiles();

console.log(`\n📁 Steam Cloud Files (${files.length} total):\n`);

files.forEach((file, index) => {
  const kb = (file.size / 1024).toFixed(2);
  const date = new Date(file.timestamp * 1000).toLocaleString();
  const status = file.persisted ? '☁️' : '⏳';
  
  console.log(`${status} ${file.name}`);
  console.log(`   Size: ${kb} KB`);
  console.log(`   Modified: ${date}`);
  console.log('');
});

// Find largest file
const largest = files.reduce((max, file) => 
  file.size > max.size ? file : max
, files[0]);
console.log(`Largest file: ${largest.name} (${largest.size} bytes)`);
```

---

## Quota Management

Monitor Steam Cloud storage usage and limits.

### `getQuota()`

Get detailed information about cloud storage quota.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamRemoteStorage_GetQuota()` - Get quota information

**Returns:** `CloudQuota`

**Type:**
```typescript
interface CloudQuota {
  totalBytes: number;     // Total quota in bytes
  availableBytes: number; // Available space in bytes
  usedBytes: number;      // Used space in bytes
  percentUsed: number;    // Percentage used (0-100)
}
```

**Example:**
```typescript
const quota = steam.cloud.getQuota();

console.log('\n📊 Steam Cloud Quota:');
console.log(`Total:     ${(quota.totalBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Used:      ${(quota.usedBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Available: ${(quota.availableBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Usage:     ${quota.percentUsed.toFixed(2)}%`);

// Check if quota is running low
if (quota.percentUsed > 90) {
  console.log('⚠️ Warning: Cloud storage almost full!');
}

// Check if upload will fit
const fileSize = 5 * 1024 * 1024; // 5 MB
if (fileSize > quota.availableBytes) {
  console.log('❌ Not enough cloud space for upload');
} else {
  console.log('✅ Sufficient space available');
}
```

---

## Cloud Settings

Check and configure Steam Cloud settings for the user and application.

### `isCloudEnabledForAccount()`

Check if Steam Cloud is enabled globally for the user's account.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamRemoteStorage_IsCloudEnabledForAccount()` - Check account setting

**Returns:** `boolean` - `true` if cloud is enabled for the account

**Example:**
```typescript
if (!steam.cloud.isCloudEnabledForAccount()) {
  console.log('⚠️ Steam Cloud is disabled in user settings');
  console.log('Please enable it in Steam Settings > Cloud');
} else {
  console.log('✅ Steam Cloud is enabled for this account');
}
```

---

### `isCloudEnabledForApp()`

Check if Steam Cloud is enabled for the current application.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamRemoteStorage_IsCloudEnabledForApp()` - Check app setting

**Returns:** `boolean` - `true` if cloud is enabled for the app

**Example:**
```typescript
const appCloudEnabled = steam.cloud.isCloudEnabledForApp();
const accountCloudEnabled = steam.cloud.isCloudEnabledForAccount();

if (!accountCloudEnabled) {
  console.log('Cloud disabled: User account setting');
} else if (!appCloudEnabled) {
  console.log('Cloud disabled: Application setting');
} else {
  console.log('✅ Cloud fully enabled and ready');
}
```

---

### `setCloudEnabledForApp(enabled)`

Enable or disable Steam Cloud for the current application.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamRemoteStorage_SetCloudEnabledForApp()` - Set app cloud setting

**Parameters:**
- `enabled: boolean` - `true` to enable, `false` to disable

**Returns:** `void`

**Example:**
```typescript
// Let user toggle cloud saves
function toggleCloudSaves(enable: boolean) {
  steam.cloud.setCloudEnabledForApp(enable);
  
  if (enable) {
    console.log('☁️ Cloud saves enabled');
  } else {
    console.log('💾 Cloud saves disabled (local only)');
  }
}

// UI toggle
toggleCloudSaves(true);  // Enable cloud saves
toggleCloudSaves(false); // Disable cloud saves

// Check setting after toggle
console.log(`Cloud enabled: ${steam.cloud.isCloudEnabledForApp()}`);
```

---

## Type Definitions

### CloudFileInfo
```typescript
interface CloudFileInfo {
  name: string;       // File name
  size: number;       // Size in bytes
  timestamp: number;  // Unix timestamp (seconds)
  exists: boolean;    // Whether file exists
  persisted: boolean; // Whether synced to cloud
}
```

### CloudQuota
```typescript
interface CloudQuota {
  totalBytes: number;     // Total quota in bytes
  availableBytes: number; // Available space in bytes
  usedBytes: number;      // Used space in bytes
  percentUsed: number;    // Percentage used (0-100)
}
```

### CloudFileReadResult
```typescript
interface CloudFileReadResult {
  success: boolean;    // Whether read was successful
  filename: string;    // Name of the file
  data: Buffer | null; // File contents (null if failed)
  bytesRead: number;   // Number of bytes read
}
```

### CloudFileWriteResult
```typescript
interface CloudFileWriteResult {
  success: boolean;   // Whether write was successful
  filename: string;   // Name of the file
  bytesWritten: number; // Number of bytes written
}
```

### ERemoteStoragePlatform
```typescript
enum ERemoteStoragePlatform {
  None = 0,
  Windows = 1 << 0,
  OSX = 1 << 1,
  PS3 = 1 << 2,
  Linux = 1 << 3,
  Reserved = 1 << 4,
  All = 0xffffffff
}
```

### CloudConstants
```typescript
const MAX_CLOUD_FILE_CHUNK_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_FILE_SIZE = 200 * 1024 * 1024;             // 200 MB
const MAX_FILENAME_LENGTH = 260;                     // characters
```

---

## Common Patterns

### Save/Load Game State

```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = new SteamworksSDK();

// Save game
function saveGame(gameState: any) {
  const data = Buffer.from(JSON.stringify(gameState));
  const success = steam.cloud.fileWrite('savegame.json', data);
  
  if (success) {
    console.log('✅ Game saved to Steam Cloud');
  }
  
  return success;
}

// Load game
function loadGame(): any | null {
  if (!steam.cloud.fileExists('savegame.json')) {
    return null;
  }
  
  const result = steam.cloud.fileRead('savegame.json');
  
  if (result.success && result.data) {
    return JSON.parse(result.data.toString());
  }
  
  return null;
}

// Usage
const gameState = { level: 5, score: 1000 };
saveGame(gameState);

const loaded = loadGame();
if (loaded) {
  console.log(`Loaded: Level ${loaded.level}, Score ${loaded.score}`);
}
```

---

### Auto-Save with Quota Check

```typescript
function autoSave(data: any) {
  const buffer = Buffer.from(JSON.stringify(data));
  const quota = steam.cloud.getQuota();
  
  // Check if we have space
  if (buffer.length > quota.availableBytes) {
    console.error('❌ Not enough cloud space for save');
    return false;
  }
  
  // Warn if quota is high
  if (quota.percentUsed > 90) {
    console.warn('⚠️ Cloud storage is almost full');
  }
  
  // Write file
  const success = steam.cloud.fileWrite('autosave.json', buffer);
  
  if (success) {
    console.log(`✅ Auto-saved (${buffer.length} bytes)`);
  }
  
  return success;
}
```

---

### Cloud Save Browser

```typescript
function listCloudSaves() {
  const files = steam.cloud.getAllFiles();
  const saves = files.filter(f => f.name.endsWith('.sav'));
  
  console.log(`\n💾 Found ${saves.length} save files:\n`);
  
  saves.forEach((save, index) => {
    const date = new Date(save.timestamp * 1000);
    const kb = (save.size / 1024).toFixed(2);
    const status = save.persisted ? '☁️' : '⏳';
    
    console.log(`${index + 1}. ${status} ${save.name}`);
    console.log(`   Last modified: ${date.toLocaleString()}`);
    console.log(`   Size: ${kb} KB`);
    console.log('');
  });
  
  return saves;
}

// Delete old saves
function cleanupOldSaves(keepCount: number = 5) {
  const saves = listCloudSaves();
  
  // Sort by timestamp (newest first)
  saves.sort((a, b) => b.timestamp - a.timestamp);
  
  // Delete old saves
  const toDelete = saves.slice(keepCount);
  
  toDelete.forEach(save => {
    const deleted = steam.cloud.fileDelete(save.name);
    if (deleted) {
      console.log(`🗑️ Deleted old save: ${save.name}`);
    }
  });
}
```

---

### Multi-File Configuration

```typescript
interface GameConfig {
  graphics: any;
  audio: any;
  controls: any;
}

function saveConfig(config: GameConfig) {
  // Save each section as separate file
  const files = {
    'config_graphics.json': config.graphics,
    'config_audio.json': config.audio,
    'config_controls.json': config.controls
  };
  
  let allSuccess = true;
  
  for (const [filename, data] of Object.entries(files)) {
    const buffer = Buffer.from(JSON.stringify(data));
    const success = steam.cloud.fileWrite(filename, buffer);
    
    if (!success) {
      allSuccess = false;
      console.error(`Failed to save ${filename}`);
    }
  }
  
  return allSuccess;
}

function loadConfig(): GameConfig | null {
  const configFiles = ['config_graphics.json', 'config_audio.json', 'config_controls.json'];
  
  // Check if all config files exist
  const allExist = configFiles.every(f => steam.cloud.fileExists(f));
  
  if (!allExist) {
    return null;
  }
  
  // Load each file
  const graphics = JSON.parse(steam.cloud.fileRead('config_graphics.json').data!.toString());
  const audio = JSON.parse(steam.cloud.fileRead('config_audio.json').data!.toString());
  const controls = JSON.parse(steam.cloud.fileRead('config_controls.json').data!.toString());
  
  return { graphics, audio, controls };
}
```

---

## Testing

Comprehensive test suite available:

```bash
# TypeScript test
npm run test:cloud:ts

# JavaScript test
npm run test:cloud:js
```

**Test Coverage (14/14 functions):**
- ✅ File Write & Read
- ✅ File Existence & Deletion
- ✅ File Size & Timestamp
- ✅ File Persistence Status
- ✅ File Count & Listing
- ✅ Manual File Iteration
- ✅ Quota Management
- ✅ Cloud Settings (Account & App)
- ✅ Enable/Disable Cloud for App

**Test Files:**
- `tests/ts/test-complete-cloud.ts` - TypeScript comprehensive test
- `tests/js/test-complete-cloud.js` - JavaScript comprehensive test

---

## Notes

### Quota Limits
- Default quota varies by game (typically 100MB - 1GB+)
- Spacewar (AppID 480) has 4KB quota for testing
- Check quota before large uploads
- Consider implementing cleanup for old saves

### File Size Limits
- **Per write operation:** 100 MB (`MAX_CLOUD_FILE_CHUNK_SIZE`)
- **Per file total:** 200 MB (`MAX_FILE_SIZE`)
- **Filename:** 260 characters max (`MAX_FILENAME_LENGTH`)

### Best Practices
1. **Always check quota** before writing large files
2. **Use compression** for large save files (e.g., gzip)
3. **Verify persistence** after critical saves
4. **Handle cloud disabled** gracefully (fallback to local saves)
5. **Clean up old files** to manage quota
6. **Use meaningful filenames** for easier debugging
7. **Test with Spacewar** (AppID 480) during development

### Platform Support
- ✅ Windows
- ✅ macOS  
- ✅ Linux
- Platform-specific sync handled automatically by Steam

### Error Handling
All file operations return boolean or structured results. Always check return values:

```typescript
// ✅ Good
if (steam.cloud.fileWrite('save.dat', buffer)) {
  console.log('Saved successfully');
} else {
  console.error('Save failed');
}

// ✅ Good
const result = steam.cloud.fileRead('save.dat');
if (result.success) {
  processData(result.data);
} else {
  console.error('Read failed');
}

// ❌ Bad - no error checking
steam.cloud.fileWrite('save.dat', buffer);
const data = steam.cloud.fileRead('save.dat').data; // Could be null!
```

---

## Related Documentation

- [Achievement Manager](./ACHIEVEMENT_MANAGER.md) - Unlock achievements when cloud saves complete
- [Stats Manager](./STATS_MANAGER.md) - Store stats alongside cloud saves
- [Steam API Core](./STEAM_API_CORE.md) - Core Steam initialization

---

## Steamworks SDK Reference

**Interface:** `ISteamRemoteStorage` (v016)

**Official Documentation:** [Steamworks Cloud Documentation](https://partner.steamgames.com/doc/features/cloud)

**SDK Functions Used:**
- `SteamAPI_ISteamRemoteStorage_FileWrite()`
- `SteamAPI_ISteamRemoteStorage_FileRead()`
- `SteamAPI_ISteamRemoteStorage_FileExists()`
- `SteamAPI_ISteamRemoteStorage_FileDelete()`
- `SteamAPI_ISteamRemoteStorage_GetFileSize()`
- `SteamAPI_ISteamRemoteStorage_GetFileTimestamp()`
- `SteamAPI_ISteamRemoteStorage_FilePersisted()`
- `SteamAPI_ISteamRemoteStorage_GetFileCount()`
- `SteamAPI_ISteamRemoteStorage_GetFileNameAndSize()`
- `SteamAPI_ISteamRemoteStorage_GetQuota()`
- `SteamAPI_ISteamRemoteStorage_IsCloudEnabledForAccount()`
- `SteamAPI_ISteamRemoteStorage_IsCloudEnabledForApp()`
- `SteamAPI_ISteamRemoteStorage_SetCloudEnabledForApp()`
