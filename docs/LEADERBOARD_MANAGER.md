# Leaderboard Manager API Documentation

Complete reference for all leaderboard-related functionality in Steamworks FFI.

## Overview

The `SteamLeaderboardManager` provides **100% coverage** of the Steamworks Leaderboard API with 7 functions organized into logical categories. Leaderboards allow you to rank players globally, display scores, and attach user-generated content to entries.

## Quick Reference

| Category | Functions | Description |
|----------|-----------|-------------|
| [Leaderboard Management](#leaderboard-management) | 3 | Find, create, and get leaderboard info |
| [Score Operations](#score-operations) | 1 | Upload scores with optional details |
| [Entry Download](#entry-download) | 2 | Download leaderboard entries (global, friends, users) |
| [UGC Integration](#ugc-integration) | 1 | Attach user-generated content to entries |

---

## Leaderboard Management

Functions for finding, creating, and retrieving leaderboard information.

### `findOrCreateLeaderboard(name, sortMethod, displayType)`

Find or create a leaderboard with specified settings.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_FindOrCreateLeaderboard()` - Find or create leaderboard
- `SteamAPI_ISteamUserStats_GetLeaderboardName()` - Get leaderboard name
- `SteamAPI_ISteamUserStats_GetLeaderboardEntryCount()` - Get entry count
- `SteamAPI_ISteamUserStats_GetLeaderboardSortMethod()` - Get sort method
- `SteamAPI_ISteamUserStats_GetLeaderboardDisplayType()` - Get display type

**Parameters:**
- `name: string` - Unique leaderboard name (must match Steamworks Partner configuration)
- `sortMethod: LeaderboardSortMethod` - How to sort scores
  - `LeaderboardSortMethod.Descending` (1) - Higher scores are better
  - `LeaderboardSortMethod.Ascending` (0) - Lower scores are better
- `displayType: LeaderboardDisplayType` - How to display scores
  - `LeaderboardDisplayType.Numeric` (0) - Display as numbers
  - `LeaderboardDisplayType.TimeSeconds` (1) - Display as time in seconds
  - `LeaderboardDisplayType.TimeMilliseconds` (2) - Display as time in milliseconds

**Returns:** `Promise<LeaderboardInfo | null>` - Leaderboard info object, or null if failed

**Type:**
```typescript
interface LeaderboardInfo {
  handle: bigint;                          // Internal leaderboard handle
  name: string;                            // Leaderboard name
  entryCount: number;                      // Total number of entries
  sortMethod: LeaderboardSortMethod;       // Sort direction
  displayType: LeaderboardDisplayType;     // Display format
}

enum LeaderboardSortMethod {
  Ascending = 0,   // Lower is better (time trials)
  Descending = 1   // Higher is better (high scores)
}

enum LeaderboardDisplayType {
  Numeric = 0,           // Regular number (e.g., 1000)
  TimeSeconds = 1,       // Time in seconds (e.g., 65.432)
  TimeMilliseconds = 2   // Time in milliseconds (e.g., 65432)
}
```

**Example:**
```typescript
import SteamworksSDK, { LeaderboardSortMethod, LeaderboardDisplayType } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: YOUR_APP_ID });

// High score leaderboard (higher is better)
const highScores = await steam.leaderboards.findOrCreateLeaderboard(
  'HighScores',
  LeaderboardSortMethod.Descending,
  LeaderboardDisplayType.Numeric
);

if (highScores) {
  console.log(`Leaderboard: ${highScores.name}`);
  console.log(`Total entries: ${highScores.entryCount}`);
  console.log(`Handle: ${highScores.handle}`);
}

// Speed run leaderboard (lower time is better)
const speedRun = await steam.leaderboards.findOrCreateLeaderboard(
  'SpeedRun_Level1',
  LeaderboardSortMethod.Ascending,
  LeaderboardDisplayType.TimeMilliseconds
);

steam.shutdown();
```

**Notes:**
- Creates the leaderboard if it doesn't exist
- Leaderboard settings are fixed once created
- Use consistent names across your game
- Waits up to 2 seconds for Steam server response

---

### `findLeaderboard(name)`

Find an existing leaderboard without creating it.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_FindLeaderboard()` - Find existing leaderboard
- `SteamAPI_ISteamUserStats_GetLeaderboardName()` - Get leaderboard name
- `SteamAPI_ISteamUserStats_GetLeaderboardEntryCount()` - Get entry count
- `SteamAPI_ISteamUserStats_GetLeaderboardSortMethod()` - Get sort method
- `SteamAPI_ISteamUserStats_GetLeaderboardDisplayType()` - Get display type

**Parameters:**
- `name: string` - Leaderboard name to find

**Returns:** `Promise<LeaderboardInfo | null>` - Leaderboard info if found, null otherwise

**Example:**
```typescript
const leaderboard = await steam.leaderboards.findLeaderboard('HighScores');

if (leaderboard) {
  console.log(`Found leaderboard with ${leaderboard.entryCount} entries`);
} else {
  console.log('Leaderboard does not exist');
}
```

**Notes:**
- Returns null if leaderboard doesn't exist
- Use this to check if a leaderboard exists before uploading
- Waits up to 2 seconds for Steam server response

---

### `getLeaderboardInfo(handle)`

Get detailed information about a leaderboard.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_GetLeaderboardName()` - Get leaderboard name
- `SteamAPI_ISteamUserStats_GetLeaderboardEntryCount()` - Get entry count
- `SteamAPI_ISteamUserStats_GetLeaderboardSortMethod()` - Get sort method
- `SteamAPI_ISteamUserStats_GetLeaderboardDisplayType()` - Get display type

**Parameters:**
- `handle: bigint` - Leaderboard handle from `findLeaderboard()` or `findOrCreateLeaderboard()`

**Returns:** `Promise<LeaderboardInfo | null>` - Leaderboard info object, or null if invalid

**Example:**
```typescript
const leaderboard = await steam.leaderboards.findLeaderboard('HighScores');
if (leaderboard) {
  const info = await steam.leaderboards.getLeaderboardInfo(leaderboard.handle);
  console.log(`${info.name}: ${info.entryCount} entries`);
  console.log(`Sort: ${info.sortMethod === 1 ? 'Descending' : 'Ascending'}`);
}
```

---

## Score Operations

Functions for uploading and managing leaderboard scores.

### `uploadLeaderboardScore(handle, score, uploadMethod, scoreDetails?)`

Upload a score to a leaderboard with optional additional data.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_UploadLeaderboardScore()` - Upload score to Steam

**Parameters:**
- `handle: bigint` - Leaderboard handle
- `score: number` - The score value (integer)
- `uploadMethod: LeaderboardUploadScoreMethod` - How to handle the upload
  - `LeaderboardUploadScoreMethod.KeepBest` (1) - Only update if new score is better
  - `LeaderboardUploadScoreMethod.ForceUpdate` (0) - Always update regardless
- `scoreDetails?: number[]` - Optional array of up to 64 int32 values for additional data

**Returns:** `Promise<LeaderboardScoreUploadResult | null>` - Upload result, or null if failed

**Type:**
```typescript
interface LeaderboardScoreUploadResult {
  success: boolean;            // Whether upload succeeded
  leaderboardHandle: bigint;   // Handle to the leaderboard
  score: number;               // The score that was uploaded
  scoreChanged: boolean;       // Whether the score changed
  globalRankNew: number;       // New global rank (1 = best)
  globalRankPrevious: number;  // Previous global rank
}

enum LeaderboardUploadScoreMethod {
  ForceUpdate = 0,  // Always update
  KeepBest = 1      // Only update if better
}
```

**Example:**
```typescript
import { LeaderboardUploadScoreMethod } from 'steamworks-ffi-node';

const leaderboard = await steam.leaderboards.findOrCreateLeaderboard(
  'HighScores',
  LeaderboardSortMethod.Descending,
  LeaderboardDisplayType.Numeric
);

// Simple score upload (only if better)
const result = await steam.leaderboards.uploadLeaderboardScore(
  leaderboard.handle,
  1000,
  LeaderboardUploadScoreMethod.KeepBest
);

if (result?.scoreChanged) {
  console.log(`New rank: ${result.globalRankNew}`);
  console.log(`Previous rank: ${result.globalRankPrevious}`);
}

// Upload with additional details (e.g., time, deaths, collectibles)
const detailedResult = await steam.leaderboards.uploadLeaderboardScore(
  leaderboard.handle,
  1000,
  LeaderboardUploadScoreMethod.KeepBest,
  [120, 5, 15]  // time: 120s, deaths: 5, collectibles: 15
);

// Force update (for testing or when score might be worse)
await steam.leaderboards.uploadLeaderboardScore(
  leaderboard.handle,
  500,
  LeaderboardUploadScoreMethod.ForceUpdate
);
```

**Notes:**
- `KeepBest` respects the leaderboard's sort method (ascending/descending)
- Details array can store up to 64 int32 values (e.g., sub-scores, metadata)
- Details are retrieved when downloading entries
- Waits up to 3 seconds for Steam server response

---

## Entry Download

Functions for downloading and viewing leaderboard entries.

### `downloadLeaderboardEntries(handle, dataRequest, rangeStart, rangeEnd)`

Download leaderboard entries based on various criteria.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_DownloadLeaderboardEntries()` - Request entries from Steam

**Parameters:**
- `handle: bigint` - Leaderboard handle
- `dataRequest: LeaderboardDataRequest` - Type of entries to download
  - `LeaderboardDataRequest.Global` (0) - Get global entries by rank
  - `LeaderboardDataRequest.GlobalAroundUser` (1) - Get entries around current user
  - `LeaderboardDataRequest.Friends` (2) - Get entries for friends only
- `rangeStart: number` - Starting index/offset (0-based for Global, offset for AroundUser)
- `rangeEnd: number` - Ending index/offset

**Returns:** `Promise<LeaderboardEntry[]>` - Array of leaderboard entries

**Type:**
```typescript
interface LeaderboardEntry {
  steamId: string;        // Steam ID of the player
  globalRank: number;     // Global rank (1 = best)
  score: number;          // The score value
  details: number[];      // Additional score details (up to 64 int32)
  ugcHandle: bigint;      // UGC content handle (0 if none)
}

enum LeaderboardDataRequest {
  Global = 0,            // Get top scores globally
  GlobalAroundUser = 1,  // Get scores around current user
  Friends = 2            // Get friend scores only
}
```

**Example:**
```typescript
import { LeaderboardDataRequest } from 'steamworks-ffi-node';

const leaderboard = await steam.leaderboards.findLeaderboard('HighScores');

// Get top 10 global scores
const top10 = await steam.leaderboards.downloadLeaderboardEntries(
  leaderboard.handle,
  LeaderboardDataRequest.Global,
  0,  // Start at rank 1 (0-indexed)
  9   // End at rank 10
);

console.log('Top 10 Players:');
top10.forEach(entry => {
  console.log(`${entry.globalRank}. ${entry.steamId}: ${entry.score}`);
  if (entry.details.length > 0) {
    console.log(`   Details: ${entry.details.join(', ')}`);
  }
});

// Get scores around current user (5 above, 5 below)
const aroundUser = await steam.leaderboards.downloadLeaderboardEntries(
  leaderboard.handle,
  LeaderboardDataRequest.GlobalAroundUser,
  -5,  // 5 entries above user
  5    // 5 entries below user
);

console.log('Scores around you:');
aroundUser.forEach(entry => {
  console.log(`Rank ${entry.globalRank}: ${entry.score}`);
});

// Get all friend scores
const friends = await steam.leaderboards.downloadLeaderboardEntries(
  leaderboard.handle,
  LeaderboardDataRequest.Friends,
  0,   // Ignored for Friends request
  0    // Ignored for Friends request
);

console.log(`${friends.length} friends on leaderboard`);
```

**Notes:**
- Global request: rangeStart and rangeEnd are 0-based ranks
- GlobalAroundUser: negative values for entries above, positive for below
- Friends: rangeStart and rangeEnd are ignored
- Maximum 100 entries per request
- Waits up to 3 seconds for Steam server response

---

### `downloadLeaderboardEntriesForUsers(handle, steamIds)`

Download leaderboard entries for specific Steam users.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_DownloadLeaderboardEntriesForUsers()` - Request specific user entries

**Parameters:**
- `handle: bigint` - Leaderboard handle
- `steamIds: string[]` - Array of Steam ID strings (max 100)

**Returns:** `Promise<LeaderboardEntry[]>` - Array of leaderboard entries for specified users

**Example:**
```typescript
// Get entries for specific players
const entries = await steam.leaderboards.downloadLeaderboardEntriesForUsers(
  leaderboard.handle,
  [
    '76561198000000000',
    '76561198000000001',
    '76561198000000002'
  ]
);

console.log('Player Scores:');
entries.forEach(entry => {
  console.log(`${entry.steamId}: ${entry.score} (Rank: ${entry.globalRank})`);
});

// Compare with a specific friend
const friendSteamId = '76561198000000000';
const friendEntries = await steam.leaderboards.downloadLeaderboardEntriesForUsers(
  leaderboard.handle,
  [friendSteamId]
);

if (friendEntries.length > 0) {
  const friend = friendEntries[0];
  console.log(`Friend rank: ${friend.globalRank}`);
  console.log(`Friend score: ${friend.score}`);
}
```

**Notes:**
- Maximum 100 Steam IDs per request
- Only returns entries for users who have scores
- Empty array if no users have submitted scores
- Waits up to 3 seconds for Steam server response

---

## UGC Integration

Functions for attaching user-generated content to leaderboard entries.

### `attachLeaderboardUGC(handle, ugcHandle)`

Attach user-generated content (like replays or screenshots) to the current user's leaderboard entry.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_AttachLeaderboardUGC()` - Attach UGC to entry

**Parameters:**
- `handle: bigint` - Leaderboard handle
- `ugcHandle: bigint` - Handle to shared UGC content (from `ISteamRemoteStorage::FileShare()`)

**Returns:** `Promise<boolean>` - `true` if successfully attached

**Example:**
```typescript
// Note: You need to share a file first using ISteamRemoteStorage
// This example assumes you have a UGC handle from FileShare()

const ugcHandle = BigInt('123456789'); // From ISteamRemoteStorage.FileShare()

const success = await steam.leaderboards.attachLeaderboardUGC(
  leaderboard.handle,
  ugcHandle
);

if (success) {
  console.log('UGC attached to leaderboard entry');
  console.log('Other players can now download your replay/screenshot');
}
```

**Notes:**
- UGC must first be shared using `ISteamRemoteStorage::FileShare()`
- Only one UGC item per leaderboard entry
- Attaching new UGC replaces previous UGC
- Common uses: replays, screenshots, custom levels, ghost data
- UGC is attached to your current score entry
- Waits up to 3 seconds for Steam server response

---

## Configuration

### Steamworks Partner Setup

Leaderboards must be configured in the Steamworks Partner portal before use.

**Steps:**
1. Log in to [Steamworks Partner](https://partner.steamgames.com/)
2. Select your app
3. Go to **Stats & Achievements** → **Leaderboards**
4. Click **Add New Leaderboard**
5. Configure:
   - **Name**: Exact string used in `findOrCreateLeaderboard()` (e.g., "HighScores")
   - **Community Name**: Display name shown to players
   - **Sort Method**: Ascending (lower is better) or Descending (higher is better)
   - **Display Type**: Numeric, Time (Seconds), or Time (Milliseconds)
   - **Writes**: Who can write (Trusted only, or Players)
   - **Reads**: Who can read (Friends only, or Public)
6. Save and publish changes

**Important:**
- Leaderboard names are case-sensitive
- Names must match exactly between code and Partner portal
- Settings cannot be changed after creation
- Test in Spacewar (AppID 480) before production

---

## TypeScript Types

Complete type definitions for leaderboard functionality.

```typescript
// Enums
enum LeaderboardSortMethod {
  Ascending = 0,   // Lower scores are better (time trials)
  Descending = 1   // Higher scores are better (high scores)
}

enum LeaderboardDisplayType {
  Numeric = 0,           // Display as number (1000)
  TimeSeconds = 1,       // Display as seconds (65.432)
  TimeMilliseconds = 2   // Display as milliseconds (65432)
}

enum LeaderboardDataRequest {
  Global = 0,            // Get global top scores
  GlobalAroundUser = 1,  // Get scores around current user
  Friends = 2            // Get friend scores only
}

enum LeaderboardUploadScoreMethod {
  ForceUpdate = 0,  // Always update the score
  KeepBest = 1      // Only update if new score is better
}

// Interfaces
interface LeaderboardInfo {
  handle: bigint;                          // Internal leaderboard handle
  name: string;                            // Leaderboard name
  entryCount: number;                      // Total number of entries
  sortMethod: LeaderboardSortMethod;       // Sort direction
  displayType: LeaderboardDisplayType;     // Display format
}

interface LeaderboardEntry {
  steamId: string;        // Steam ID of the player (64-bit as string)
  globalRank: number;     // Global rank (1 = best)
  score: number;          // The score value
  details: number[];      // Additional score details (up to 64 int32)
  ugcHandle: bigint;      // UGC content handle (0 if none)
}

interface LeaderboardScoreUploadResult {
  success: boolean;            // Whether upload succeeded
  leaderboardHandle: bigint;   // Handle to the leaderboard
  score: number;               // The score that was uploaded
  scoreChanged: boolean;       // Whether the score changed
  globalRankNew: number;       // New global rank (1 = best)
  globalRankPrevious: number;  // Previous global rank (0 if first time)
}
```

---

## Complete Examples

### Example 1: High Score Leaderboard

```typescript
import Steam, {
  LeaderboardSortMethod,
  LeaderboardDisplayType,
  LeaderboardUploadScoreMethod,
  LeaderboardDataRequest
} from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();

async function highScoreExample() {
  // Initialize Steam
  if (!steam.init({ appId: YOUR_APP_ID })) {
    console.error('Failed to initialize Steam');
    return;
  }

  // Find or create high score leaderboard
  const leaderboard = await steam.leaderboards.findOrCreateLeaderboard(
    'HighScores',
    LeaderboardSortMethod.Descending,  // Higher is better
    LeaderboardDisplayType.Numeric
  );

  if (!leaderboard) {
    console.error('Failed to get leaderboard');
    steam.shutdown();
    return;
  }

  console.log(`Leaderboard: ${leaderboard.name}`);
  console.log(`Total entries: ${leaderboard.entryCount}`);

  // Upload player's score (only if it's better)
  const playerScore = 1500;
  const result = await steam.leaderboards.uploadLeaderboardScore(
    leaderboard.handle,
    playerScore,
    LeaderboardUploadScoreMethod.KeepBest
  );

  if (result?.scoreChanged) {
    console.log(`Score updated! New rank: ${result.globalRankNew}`);
    if (result.globalRankPrevious > 0) {
      console.log(`Previous rank: ${result.globalRankPrevious}`);
    }
  } else {
    console.log('Score not updated (existing score is better)');
  }

  // Download top 10 scores
  const topScores = await steam.leaderboards.downloadLeaderboardEntries(
    leaderboard.handle,
    LeaderboardDataRequest.Global,
    0,
    9
  );

  console.log('\nTop 10 High Scores:');
  topScores.forEach((entry, index) => {
    console.log(`${index + 1}. Rank ${entry.globalRank}: ${entry.score} points`);
  });

  // Download scores around current user
  const nearby = await steam.leaderboards.downloadLeaderboardEntries(
    leaderboard.handle,
    LeaderboardDataRequest.GlobalAroundUser,
    -3,  // 3 above
    3    // 3 below
  );

  console.log('\nScores around you:');
  nearby.forEach(entry => {
    console.log(`Rank ${entry.globalRank}: ${entry.score} points`);
  });

  steam.shutdown();
}

highScoreExample();
```

### Example 2: Speed Run with Details

```typescript
import Steam, {
  LeaderboardSortMethod,
  LeaderboardDisplayType,
  LeaderboardUploadScoreMethod,
  LeaderboardDataRequest
} from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();

async function speedRunExample() {
  steam.init({ appId: YOUR_APP_ID });

  // Create speed run leaderboard (lower time is better)
  const leaderboard = await steam.leaderboards.findOrCreateLeaderboard(
    'Level1_SpeedRun',
    LeaderboardSortMethod.Ascending,      // Lower is better
    LeaderboardDisplayType.TimeMilliseconds
  );

  if (!leaderboard) return;

  // Complete level and record stats
  const timeInMilliseconds = 65432;  // 65.432 seconds
  const deathCount = 3;
  const checkpointsUsed = 2;
  const secretsFound = 5;

  // Upload time with detailed stats
  const result = await steam.leaderboards.uploadLeaderboardScore(
    leaderboard.handle,
    timeInMilliseconds,
    LeaderboardUploadScoreMethod.KeepBest,
    [deathCount, checkpointsUsed, secretsFound]  // Additional details
  );

  if (result?.scoreChanged) {
    console.log(`New best time: ${timeInMilliseconds}ms`);
    console.log(`World rank: ${result.globalRankNew}`);
  }

  // View top times with details
  const topRuns = await steam.leaderboards.downloadLeaderboardEntries(
    leaderboard.handle,
    LeaderboardDataRequest.Global,
    0,
    9
  );

  console.log('\nTop 10 Speed Runs:');
  topRuns.forEach(entry => {
    const time = entry.score / 1000; // Convert to seconds
    console.log(`Rank ${entry.globalRank}: ${time.toFixed(3)}s`);
    
    if (entry.details.length >= 3) {
      console.log(`  Deaths: ${entry.details[0]}`);
      console.log(`  Checkpoints: ${entry.details[1]}`);
      console.log(`  Secrets: ${entry.details[2]}`);
    }
  });

  steam.shutdown();
}

speedRunExample();
```

### Example 3: Friend Comparison

```typescript
import Steam, {
  LeaderboardDataRequest,
  LeaderboardSortMethod,
  LeaderboardDisplayType
} from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();

async function friendComparisonExample() {
  steam.init({ appId: YOUR_APP_ID });

  const leaderboard = await steam.leaderboards.findOrCreateLeaderboard(
    'HighScores',
    LeaderboardSortMethod.Descending,
    LeaderboardDisplayType.Numeric
  );

  if (!leaderboard) return;

  // Get all friend scores
  const friendScores = await steam.leaderboards.downloadLeaderboardEntries(
    leaderboard.handle,
    LeaderboardDataRequest.Friends,
    0,
    0  // Range is ignored for Friends request
  );

  console.log(`${friendScores.length} friends on leaderboard:`);
  
  // Sort by rank
  friendScores.sort((a, b) => a.globalRank - b.globalRank);
  
  friendScores.forEach(entry => {
    console.log(`Rank ${entry.globalRank}: ${entry.score} points`);
  });

  // Compare with specific friends
  const specificFriends = [
    '76561198000000000',
    '76561198000000001'
  ];

  const friendEntries = await steam.leaderboards.downloadLeaderboardEntriesForUsers(
    leaderboard.handle,
    specificFriends
  );

  console.log('\nSpecific friend comparison:');
  friendEntries.forEach(entry => {
    console.log(`${entry.steamId}: ${entry.score} (Rank ${entry.globalRank})`);
  });

  steam.shutdown();
}

friendComparisonExample();
```

---

## Best Practices

### 1. Leaderboard Naming
```typescript
// ✅ Good: Descriptive, organized names
'HighScores'
'Level1_SpeedRun'
'Daily_Challenge_2024_10_11'
'Endless_Mode_HighScore'

// ❌ Bad: Generic or unclear names
'Leaderboard1'
'test'
'lb'
```

### 2. Score Upload Strategy
```typescript
// ✅ Good: Only update when score is better
await steam.leaderboards.uploadLeaderboardScore(
  handle,
  newScore,
  LeaderboardUploadScoreMethod.KeepBest
);

// ⚠️ Use with caution: Force update (for testing only)
await steam.leaderboards.uploadLeaderboardScore(
  handle,
  testScore,
  LeaderboardUploadScoreMethod.ForceUpdate
);
```

### 3. Using Score Details
```typescript
// ✅ Good: Store meaningful metadata
const details = [
  completionTime,    // How long it took
  enemiesKilled,     // Combat stats
  secretsFound,      // Exploration stats
  powerupsUsed,      // Strategy stats
  difficultyLevel    // Game settings
];

await steam.leaderboards.uploadLeaderboardScore(handle, score, method, details);

// ❌ Bad: Random or meaningless data
const details = [1, 2, 3, 4]; // What do these mean?
```

### 4. Error Handling
```typescript
// ✅ Good: Check for null returns
const leaderboard = await steam.leaderboards.findLeaderboard('HighScores');
if (!leaderboard) {
  console.error('Leaderboard not found');
  return;
}

const result = await steam.leaderboards.uploadLeaderboardScore(/*...*/);
if (!result) {
  console.error('Failed to upload score');
  return;
}

// ✅ Good: Handle network issues gracefully
try {
  const entries = await steam.leaderboards.downloadLeaderboardEntries(/*...*/);
  if (entries.length === 0) {
    console.log('No entries found or network error');
  }
} catch (error) {
  console.error('Leaderboard error:', error);
}
```

### 5. Caching
```typescript
// ✅ Good: Cache leaderboard handles
class LeaderboardCache {
  private handles = new Map<string, bigint>();

  async getHandle(name: string): Promise<bigint | null> {
    if (this.handles.has(name)) {
      return this.handles.get(name)!;
    }

    const leaderboard = await steam.leaderboards.findLeaderboard(name);
    if (leaderboard) {
      this.handles.set(name, leaderboard.handle);
      return leaderboard.handle;
    }

    return null;
  }
}
```

---

## Common Issues & Solutions

### Issue: Leaderboard Not Found

**Problem:** `findLeaderboard()` returns null

**Solutions:**
1. Check leaderboard name spelling (case-sensitive)
2. Verify leaderboard is published in Steamworks Partner
3. Use `findOrCreateLeaderboard()` to create if missing
4. Check Steam is running and user is logged in

```typescript
// Try to find, fallback to create
let leaderboard = await steam.leaderboards.findLeaderboard('HighScores');
if (!leaderboard) {
  leaderboard = await steam.leaderboards.findOrCreateLeaderboard(
    'HighScores',
    LeaderboardSortMethod.Descending,
    LeaderboardDisplayType.Numeric
  );
}
```

### Issue: Score Not Updating

**Problem:** `uploadLeaderboardScore()` succeeds but score doesn't change

**Solutions:**
1. Check if using `KeepBest` with worse score
2. Verify sort method matches your intent (ascending vs descending)
3. Check `scoreChanged` in result object

```typescript
const result = await steam.leaderboards.uploadLeaderboardScore(
  handle,
  newScore,
  LeaderboardUploadScoreMethod.KeepBest
);

if (result && !result.scoreChanged) {
  console.log('Score not updated - existing score is better');
  console.log(`Current best: ${result.score}`);
}
```

### Issue: Empty Entries Array

**Problem:** `downloadLeaderboardEntries()` returns empty array

**Solutions:**
1. No entries exist yet (upload a score first)
2. Network error (check Steam connection)
3. Invalid range for Global request
4. No friends have scores (for Friends request)

```typescript
const entries = await steam.leaderboards.downloadLeaderboardEntries(
  handle,
  LeaderboardDataRequest.Global,
  0,
  9
);

if (entries.length === 0) {
  console.log('No entries found. Upload a score first!');
  await steam.leaderboards.uploadLeaderboardScore(handle, 100, KeepBest);
}
```

### Issue: Timeout Errors

**Problem:** Operations take too long or fail

**Solutions:**
1. Check internet connection
2. Verify Steam client is running
3. Wait for callbacks to process
4. Don't call operations too frequently

```typescript
// Good: Wait between operations
await steam.leaderboards.uploadLeaderboardScore(/*...*/);
await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
const entries = await steam.leaderboards.downloadLeaderboardEntries(/*...*/);
```

---

## Testing

### Test with Spacewar (AppID 480)

Steam provides a test game (Spacewar) for development:

```typescript
// Test leaderboards without a published game
const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 }); // Spacewar

const leaderboard = await steam.leaderboards.findOrCreateLeaderboard(
  'Test_HighScores',
  LeaderboardSortMethod.Descending,
  LeaderboardDisplayType.Numeric
);

// Upload test scores
await steam.leaderboards.uploadLeaderboardScore(
  leaderboard.handle,
  1000,
  LeaderboardUploadScoreMethod.ForceUpdate
);

// View results
const entries = await steam.leaderboards.downloadLeaderboardEntries(
  leaderboard.handle,
  LeaderboardDataRequest.Global,
  0,
  9
);

console.log('Test scores:', entries);

steam.shutdown();
```

### Reset Leaderboard (Development Only)

To clear test data, use `ForceUpdate` with 0:

```typescript
// Clear your score (development only)
await steam.leaderboards.uploadLeaderboardScore(
  leaderboard.handle,
  0,
  LeaderboardUploadScoreMethod.ForceUpdate
);
```

**⚠️ Warning:** Do not provide this functionality to end users!

---

## Additional Resources

- [Steamworks Leaderboards Documentation](https://partner.steamgames.com/doc/features/leaderboards)
- [Leaderboard Web API](https://partner.steamgames.com/doc/webapi/ISteamLeaderboards)
- [Stats & Achievements](https://partner.steamgames.com/doc/features/achievements)
- [User-Generated Content](https://partner.steamgames.com/doc/features/workshop)

---

**Questions or Issues?** Visit the [GitHub Issues](https://github.com/ArtyProf/steamworks-ffi-node/issues) page.
