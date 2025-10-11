# Stats Manager API Documentation

Complete reference for all statistics-related functionality in Steamworks FFI.

## Overview

The `SteamStatsManager` provides comprehensive Steam statistics tracking with 13 functions organized into logical categories.

## Quick Reference

| Category | Functions | Description |
|----------|-----------|-------------|
| [User Stats](#user-stats-operations) | 5 | Get/set integer and float stats, average rates |
| [Friend/User Stats](#frienduser-stats) | 3 | Request and compare stats with friends |
| [Global Stats](#global-statistics) | 5 | View aggregated stats across all users |

---

## User Stats Operations

Essential stat functionality for tracking and updating player statistics.

### `getStatInt(statName)`

Get an integer stat value for the current user.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_GetStatInt32()` - Get int32 stat value

**Parameters:**
- `statName: string` - Name of the stat to retrieve

**Returns:** `Promise<number | null>` - The stat value, or null if not found

**Example:**
```typescript
import Steam from 'steamworks-ffi-node';

const steam = Steam.getInstance();
steam.init({ appId: YOUR_APP_ID });

const kills = await steam.getStatInt('total_kills');
if (kills !== null) {
  console.log(`Total kills: ${kills}`);
}

steam.shutdown();
```

---

### `getStatFloat(statName)`

Get a float stat value for the current user.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_GetStatFloat()` - Get float stat value

**Parameters:**
- `statName: string` - Name of the stat to retrieve

**Returns:** `Promise<number | null>` - The stat value, or null if not found

**Example:**
```typescript
const distance = await steam.getStatFloat('total_distance');
if (distance !== null) {
  console.log(`Total distance: ${distance.toFixed(2)} km`);
}
```

---

### `setStatInt(statName, value)`

Set an integer stat value for the current user. Automatically stored to Steam servers.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_SetStatInt32()` - Set int32 stat value
- `SteamAPI_ISteamUserStats_StoreStats()` - Store stats to Steam servers
- `SteamAPI_RunCallbacks()` - Process Steam callbacks

**Parameters:**
- `statName: string` - Name of the stat to set
- `value: number` - Integer value to set

**Returns:** `Promise<boolean>` - `true` if successful

**Example:**
```typescript
// Update kill count
const currentKills = await steam.getStatInt('total_kills') || 0;
await steam.setStatInt('total_kills', currentKills + 1);

// Track games played
const gamesPlayed = await steam.getStatInt('games_played') || 0;
await steam.setStatInt('games_played', gamesPlayed + 1);

// Set specific value
await steam.setStatInt('player_level', 15);
```

**Note:** Stats are automatically synced to Steam servers when set.

---

### `setStatFloat(statName, value)`

Set a float stat value for the current user. Automatically stored to Steam servers.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_SetStatFloat()` - Set float stat value
- `SteamAPI_ISteamUserStats_StoreStats()` - Store stats to Steam servers
- `SteamAPI_RunCallbacks()` - Process Steam callbacks

**Parameters:**
- `statName: string` - Name of the stat to set
- `value: number` - Float value to set

**Returns:** `Promise<boolean>` - `true` if successful

**Example:**
```typescript
// Track distance traveled
const currentDistance = await steam.getStatFloat('total_distance') || 0;
await steam.setStatFloat('total_distance', currentDistance + 123.45);

// Track accuracy percentage
await steam.setStatFloat('accuracy', 87.5);

// Track average speed
await steam.setStatFloat('average_speed', 45.2);
```

---

### `updateAvgRateStat(statName, countThisSession, sessionLength)`

Update an average rate stat (e.g., kills per hour, damage per second). Steam automatically calculates the running average.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_UpdateAvgRateStat()` - Update average rate stat
- `SteamAPI_ISteamUserStats_StoreStats()` - Store stats to Steam servers
- `SteamAPI_RunCallbacks()` - Process Steam callbacks

**Parameters:**
- `statName: string` - Name of the stat to update
- `countThisSession: number` - Count for this session
- `sessionLength: number` - Length of session in seconds

**Returns:** `Promise<boolean>` - `true` if successful

**Example:**
```typescript
// Player got 15 kills in 3600 seconds (1 hour)
await steam.updateAvgRateStat('kills_per_hour', 15, 3600);

// Player dealt 500 damage in 60 seconds
await steam.updateAvgRateStat('damage_per_second', 500, 60);

// Calculate session stats
const sessionStart = Date.now();
// ... gameplay happens ...
const sessionEnd = Date.now();
const sessionSeconds = (sessionEnd - sessionStart) / 1000;
await steam.updateAvgRateStat('points_per_second', earnedPoints, sessionSeconds);
```

**Note:** Steam maintains a running average across all sessions automatically.

---

## Friend/User Stats

Compare your stats with friends and other users.

### `requestUserStatsForStats(steamId)`

Request stats for another user (friend). Must be called before getting user stats.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_RequestUserStats()` - Request user stats from Steam

**Parameters:**
- `steamId: string | bigint` - Steam ID of the user (e.g., "76561197960287930")

**Returns:** `Promise<boolean>` - `true` if request was sent successfully

**Example:**
```typescript
const friendSteamId = '76561197960287930';

// Request friend's stats
await steam.requestUserStatsForStats(friendSteamId);

// Wait for Steam to process the request
await new Promise(resolve => setTimeout(resolve, 2000));
steam.runCallbacks();

// Now you can get their stats
const friendKills = await steam.getUserStatInt(friendSteamId, 'total_kills');
```

**Important:** 
- This is an asynchronous request
- Wait 1-2 seconds and call `runCallbacks()` before retrieving stats
- The friend must have played the game

---

### `getUserStatInt(steamId, statName)`

Get an integer stat value for another user (friend). Must call `requestUserStatsForStats()` first.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_GetUserStatInt32()` - Get user's int32 stat value

**Parameters:**
- `steamId: string | bigint` - Steam ID of the user
- `statName: string` - Name of the stat to retrieve

**Returns:** `Promise<number | null>` - The stat value, or null if not found

**Example:**
```typescript
async function compareWithFriend(friendSteamId: string) {
  const steam = Steam.getInstance();
  steam.init({ appId: YOUR_APP_ID });
  
  // Get your stats
  const myKills = await steam.getStatInt('total_kills') || 0;
  const myGames = await steam.getStatInt('games_played') || 0;
  
  // Get friend's stats
  await steam.requestUserStatsForStats(friendSteamId);
  await new Promise(resolve => setTimeout(resolve, 2000));
  steam.runCallbacks();
  
  const friendKills = await steam.getUserStatInt(friendSteamId, 'total_kills') || 0;
  const friendGames = await steam.getUserStatInt(friendSteamId, 'games_played') || 0;
  
  console.log('Comparison:');
  console.log(`You: ${myKills} kills in ${myGames} games`);
  console.log(`Friend: ${friendKills} kills in ${friendGames} games`);
  console.log(`Difference: ${myKills - friendKills} kills`);
  
  steam.shutdown();
}
```

---

### `getUserStatFloat(steamId, statName)`

Get a float stat value for another user (friend). Must call `requestUserStatsForStats()` first.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_GetUserStatFloat()` - Get user's float stat value

**Parameters:**
- `steamId: string | bigint` - Steam ID of the user
- `statName: string` - Name of the stat to retrieve

**Returns:** `Promise<number | null>` - The stat value, or null if not found

**Example:**
```typescript
const friendDistance = await steam.getUserStatFloat(friendSteamId, 'total_distance');
if (friendDistance !== null) {
  console.log(`Friend traveled: ${friendDistance.toFixed(2)} km`);
}

const friendAccuracy = await steam.getUserStatFloat(friendSteamId, 'accuracy');
if (friendAccuracy !== null) {
  console.log(`Friend accuracy: ${friendAccuracy.toFixed(1)}%`);
}
```

---

## Global Statistics

View aggregated statistics across all users worldwide.

### `requestGlobalStats(historyDays)`

Request global stats data from Steam. Must be called before getting global stats.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_RequestGlobalStats()` - Request global stats from Steam

**Parameters:**
- `historyDays: number` (optional) - Number of days of history to retrieve (0-60, default: 0)

**Returns:** `Promise<boolean>` - `true` if request was sent successfully

**Example:**
```typescript
// Request global stats without history
await steam.requestGlobalStats(0);

// Request global stats with 7 days of history
await steam.requestGlobalStats(7);

// Request global stats with maximum history (30 days)
await steam.requestGlobalStats(30);

// Wait for Steam to process
await new Promise(resolve => setTimeout(resolve, 2000));
steam.runCallbacks();

// Now you can access global stats
```

**Note:** Wait 2-3 seconds and call `runCallbacks()` before accessing global stats.

---

### `getGlobalStatInt(statName)`

Get a global stat value (int64). Must call `requestGlobalStats()` first.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_GetGlobalStatInt64()` - Get global int64 stat value

**Parameters:**
- `statName: string` - Name of the global stat

**Returns:** `Promise<bigint | null>` - The stat value, or null if not found

**Example:**
```typescript
async function viewGlobalStats() {
  const steam = Steam.getInstance();
  steam.init({ appId: YOUR_APP_ID });
  
  // Request global stats
  await steam.requestGlobalStats(0);
  await new Promise(resolve => setTimeout(resolve, 2000));
  steam.runCallbacks();
  
  // Get aggregated stats
  const totalPlayers = await steam.getGlobalStatInt('global.total_players');
  const totalKills = await steam.getGlobalStatInt('global.total_kills');
  const totalGames = await steam.getGlobalStatInt('global.games_played');
  
  if (totalPlayers && totalKills && totalGames) {
    console.log('🌍 Global Statistics:');
    console.log(`Total Players: ${totalPlayers.toLocaleString()}`);
    console.log(`Total Kills: ${totalKills.toLocaleString()}`);
    console.log(`Total Games: ${totalGames.toLocaleString()}`);
    
    const avgKillsPerPlayer = Number(totalKills) / Number(totalPlayers);
    console.log(`Average Kills per Player: ${avgKillsPerPlayer.toFixed(2)}`);
  }
  
  steam.shutdown();
}
```

---

### `getGlobalStatDouble(statName)`

Get a global stat value (double). Must call `requestGlobalStats()` first.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_GetGlobalStatDouble()` - Get global double stat value

**Parameters:**
- `statName: string` - Name of the global stat

**Returns:** `Promise<number | null>` - The stat value, or null if not found

**Example:**
```typescript
const totalDistance = await steam.getGlobalStatDouble('global.total_distance');
if (totalDistance !== null) {
  console.log(`Total distance traveled by all players: ${totalDistance.toLocaleString()} km`);
}

const avgAccuracy = await steam.getGlobalStatDouble('global.average_accuracy');
if (avgAccuracy !== null) {
  console.log(`Global average accuracy: ${avgAccuracy.toFixed(2)}%`);
}
```

---

### `getGlobalStatHistoryInt(statName, days)`

Get historical data for a global stat (int64). Returns daily values.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_GetGlobalStatHistoryInt64()` - Get global stat history

**Parameters:**
- `statName: string` - Name of the global stat
- `days: number` (optional) - Number of days of history (1-60, default: 7)

**Returns:** `Promise<bigint[] | null>` - Array of daily values ([0] = today, [1] = yesterday, etc.)

**Example:**
```typescript
const history = await steam.getGlobalStatHistoryInt('global.daily_kills', 7);

if (history) {
  console.log('Last 7 days of global kills:');
  history.forEach((kills, index) => {
    const label = index === 0 ? 'Today' : 
                  index === 1 ? 'Yesterday' : 
                  `${index} days ago`;
    console.log(`${label}: ${kills.toLocaleString()} kills`);
  });
  
  // Calculate trend
  const total = history.reduce((sum, val) => sum + Number(val), 0);
  const average = total / history.length;
  console.log(`7-day average: ${average.toLocaleString()} kills/day`);
}
```

---

### `getGlobalStatHistoryDouble(statName, days)`

Get historical data for a global stat (double). Returns daily values.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_GetGlobalStatHistoryDouble()` - Get global stat history

**Parameters:**
- `statName: string` - Name of the global stat
- `days: number` (optional) - Number of days of history (1-60, default: 7)

**Returns:** `Promise<number[] | null>` - Array of daily values ([0] = today, [1] = yesterday, etc.)

**Example:**
```typescript
const playtimeHistory = await steam.getGlobalStatHistoryDouble('global.daily_playtime', 30);

if (playtimeHistory) {
  console.log('Last 30 days of global playtime:');
  
  const totalHours = playtimeHistory.reduce((sum, hours) => sum + hours, 0);
  const avgHoursPerDay = totalHours / playtimeHistory.length;
  
  console.log(`Total: ${totalHours.toLocaleString()} hours`);
  console.log(`Average: ${avgHoursPerDay.toFixed(2)} hours/day`);
  
  // Find peak day
  const maxHours = Math.max(...playtimeHistory);
  const peakIndex = playtimeHistory.indexOf(maxHours);
  console.log(`Peak day: ${peakIndex} days ago with ${maxHours.toFixed(2)} hours`);
}
```

---

## Configuration

### Setting Up Stats in Steamworks

Before using stats, configure them in your Steamworks Partner account:

1. **Go to Stats & Achievements**
   - Navigate to your app's Stats & Achievements section
   - Click on "Stats" tab

2. **Add Stat Definitions**
   - Click "Add New Stat"
   - Set stat name (e.g., "total_kills", "games_played")
   - Choose type: Integer (int32) or Float
   - Set default value (usually 0)

3. **Configure Global Stats** (optional)
   - Check "Aggregated" to enable global statistics
   - This allows `getGlobalStat*` functions to work

4. **Set Display Properties** (optional)
   - Display name: User-friendly name
   - Increment only: Prevents stat from decreasing
   - Max change: Maximum allowed change per update

5. **Publish Changes**
   - Click "Publish" to make stats available
   - Changes may take a few minutes to propagate

---

## TypeScript Types

```typescript
interface SteamStat {
  name: string;
  value: number;
  type: 'int' | 'float';
}

interface UserStat {
  steamId: string;
  name: string;
  value: number;
  type: 'int' | 'float';
}

interface GlobalStat {
  name: string;
  value: number;
  type: 'int64' | 'double';
}

interface GlobalStatHistory {
  name: string;
  history: number[];  // [0] = today, [1] = yesterday, etc.
  type: 'int64' | 'double';
}
```

---

## Complete Examples

### Example 1: Track Game Session

```typescript
import Steam from 'steamworks-ffi-node';

async function trackGameSession() {
  const steam = Steam.getInstance();
  steam.init({ appId: YOUR_APP_ID });
  
  // Session start
  const sessionStart = Date.now();
  
  // Get current stats
  const gamesPlayed = await steam.getStatInt('games_played') || 0;
  const totalKills = await steam.getStatInt('total_kills') || 0;
  const totalDistance = await steam.getStatFloat('total_distance') || 0;
  
  // Simulate gameplay
  const sessionKills = 15;
  const sessionDistance = 1234.56;
  
  // Update stats
  await steam.setStatInt('games_played', gamesPlayed + 1);
  await steam.setStatInt('total_kills', totalKills + sessionKills);
  await steam.setStatFloat('total_distance', totalDistance + sessionDistance);
  
  // Update average rate stats
  const sessionEnd = Date.now();
  const sessionSeconds = (sessionEnd - sessionStart) / 1000;
  await steam.updateAvgRateStat('kills_per_hour', sessionKills, sessionSeconds);
  
  console.log('✅ Session stats saved to Steam');
  
  steam.shutdown();
}

trackGameSession();
```

---

### Example 2: Leaderboard Comparison

```typescript
async function createLeaderboard(friendSteamIds: string[]) {
  const steam = Steam.getInstance();
  steam.init({ appId: YOUR_APP_ID });
  
  // Get your stats
  const myKills = await steam.getStatInt('total_kills') || 0;
  const myGames = await steam.getStatInt('games_played') || 0;
  const myKDR = myGames > 0 ? myKills / myGames : 0;
  
  const leaderboard = [
    { name: 'You', kills: myKills, games: myGames, kdr: myKDR }
  ];
  
  // Get friends' stats
  for (const friendId of friendSteamIds) {
    await steam.requestUserStatsForStats(friendId);
    await new Promise(resolve => setTimeout(resolve, 2000));
    steam.runCallbacks();
    
    const friendKills = await steam.getUserStatInt(friendId, 'total_kills') || 0;
    const friendGames = await steam.getUserStatInt(friendId, 'games_played') || 0;
    const friendKDR = friendGames > 0 ? friendKills / friendGames : 0;
    
    leaderboard.push({
      name: `Friend ${friendId.slice(-4)}`,
      kills: friendKills,
      games: friendGames,
      kdr: friendKDR
    });
  }
  
  // Sort by kills
  leaderboard.sort((a, b) => b.kills - a.kills);
  
  // Display leaderboard
  console.log('\n🏆 Leaderboard:');
  leaderboard.forEach((player, index) => {
    console.log(`${index + 1}. ${player.name}`);
    console.log(`   Kills: ${player.kills}, Games: ${player.games}, KDR: ${player.kdr.toFixed(2)}`);
  });
  
  steam.shutdown();
}
```

---

### Example 3: Global Statistics Dashboard

```typescript
async function showGlobalDashboard() {
  const steam = Steam.getInstance();
  steam.init({ appId: YOUR_APP_ID });
  
  // Request global stats with 30 days history
  await steam.requestGlobalStats(30);
  await new Promise(resolve => setTimeout(resolve, 2000));
  steam.runCallbacks();
  
  console.log('\n🌍 GLOBAL STATISTICS DASHBOARD\n');
  
  // Overall stats
  const totalPlayers = await steam.getGlobalStatInt('global.total_players');
  const totalKills = await steam.getGlobalStatInt('global.total_kills');
  const totalGames = await steam.getGlobalStatInt('global.games_played');
  
  if (totalPlayers && totalKills && totalGames) {
    console.log('📊 Overall Statistics:');
    console.log(`Players: ${Number(totalPlayers).toLocaleString()}`);
    console.log(`Total Kills: ${Number(totalKills).toLocaleString()}`);
    console.log(`Total Games: ${Number(totalGames).toLocaleString()}`);
    console.log(`Avg Kills/Player: ${(Number(totalKills) / Number(totalPlayers)).toFixed(2)}\n`);
  }
  
  // Historical trends
  const killHistory = await steam.getGlobalStatHistoryInt('global.daily_kills', 7);
  if (killHistory) {
    console.log('📈 Last 7 Days Trend:');
    killHistory.forEach((kills, index) => {
      const day = index === 0 ? 'Today' : index === 1 ? 'Yesterday' : `${index}d ago`;
      const bar = '█'.repeat(Math.floor(Number(kills) / 10000));
      console.log(`${day.padEnd(10)} ${Number(kills).toLocaleString().padStart(10)} ${bar}`);
    });
  }
  
  steam.shutdown();
}
```

---

## Best Practices

### 1. Always Check for Null

Stats may not be configured or available:

```typescript
const kills = await steam.getStatInt('total_kills');
if (kills !== null) {
  console.log(`Kills: ${kills}`);
} else {
  console.log('Stat not configured in Steamworks');
}
```

### 2. Use Appropriate Stat Types

- **int32**: Whole numbers (kills, games, levels)
- **float**: Decimals (distance, accuracy, speed)
- **Average rates**: Time-based averages (kills/hour, DPS)

### 3. Wait for Async Requests

Always wait for Steam callbacks:

```typescript
// ❌ Wrong
await steam.requestGlobalStats(7);
const stat = await steam.getGlobalStatInt('global.kills'); // null!

// ✅ Correct
await steam.requestGlobalStats(7);
await new Promise(resolve => setTimeout(resolve, 2000));
steam.runCallbacks();
const stat = await steam.getGlobalStatInt('global.kills'); // works!
```

### 4. Batch Stat Updates

Update multiple stats together for efficiency:

```typescript
// Update all session stats at once
await steam.setStatInt('games_played', gamesPlayed + 1);
await steam.setStatInt('total_kills', totalKills + sessionKills);
await steam.setStatFloat('total_distance', totalDistance + sessionDistance);
await steam.updateAvgRateStat('kills_per_hour', sessionKills, sessionSeconds);
```

### 5. Handle BigInt for Global Stats

Global stats return `bigint` for large numbers:

```typescript
const totalKills = await steam.getGlobalStatInt('global.total_kills');
if (totalKills) {
  // Convert to number for calculations
  const killsNumber = Number(totalKills);
  console.log(`Total: ${killsNumber.toLocaleString()}`);
}
```

---

## Error Handling

All stat methods return `null` or `false` on error and log warnings:

```typescript
// Returns null on error
const stat = await steam.getStatInt('invalid_stat');
if (stat === null) {
  console.log('Stat not found - check Steamworks configuration');
}

// Returns false on error
const success = await steam.setStatInt('my_stat', 100);
if (!success) {
  console.log('Failed to set stat - check initialization');
}
```

**Common Issues:**
- ⚠️ **Stat not configured**: Add stat in Steamworks Partner site
- ⚠️ **Steam not initialized**: Call `steam.init()` before using stats
- ⚠️ **Async not complete**: Wait longer and call `runCallbacks()`
- ⚠️ **Friend stats unavailable**: Friend must have played the game
- ⚠️ **Global stats not configured**: Mark stats as "aggregated" in Steamworks

---

**Last Updated:** October 11, 2025