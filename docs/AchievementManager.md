# Achievement Manager API Documentation

Complete reference for all achievement-related functionality in Steamworks FFI.

## Overview

The `SteamAchievementManager` provides **100% coverage** of the Steamworks Achievement API with 21 functions organized into logical categories.

**Architecture**: The Achievement Manager is part of a modular architecture:
- `SteamLibraryLoader`: Handles FFI library loading and function binding
- `SteamAPICore`: Manages Steam API lifecycle (init, shutdown, callbacks)  
- `SteamAchievementManager`: Handles all achievement operations (this module)
- `SteamworksSDK`: Main class that composes all modules and exposes the public API

All functions are accessed through the main `SteamworksSDK` class using composition pattern.

## Quick Reference

| Category | Functions | Description |
|----------|-----------|-------------|
| [Core Operations](#core-operations) | 7 | Get, unlock, clear, check achievements |
| [Visual & UI](#visual--ui-features) | 3 | Icons, progress notifications |
| [Progress Tracking](#progress-tracking) | 2 | Get progress limits for achievements |
| [Friend/Social](#friendsocial-features) | 2 | Compare achievements with friends |
| [Global Statistics](#global-statistics) | 6 | Unlock percentages, popularity |
| [Testing/Dev](#testingdevelopment) | 1 | Reset stats and achievements |

---

## Core Operations

Essential achievement functionality for getting, unlocking, and managing achievements.

### `getAllAchievements()`

Get all achievements for the current game with complete details.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_GetNumAchievements()` - Get total count
- `SteamAPI_ISteamUserStats_GetAchievementName()` - Get API name
- `SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute()` - Get display name and description
- `SteamAPI_ISteamUserStats_GetAchievementAndUnlockTime()` - Get unlock status and timestamp

**Returns:** `Promise<SteamAchievement[]>`

**Type:**
```typescript
interface SteamAchievement {
  apiName: string;        // Steam internal ID (e.g., "ACH_WIN_ONE_GAME")
  displayName: string;    // User-friendly name (e.g., "Winner")
  description: string;    // Achievement description
  unlocked: boolean;      // Current unlock status
  unlockTime: number;     // Unix timestamp (0 if locked)
  hidden?: boolean;       // Whether achievement is hidden
}
```

**Example:**
```typescript
import Steam from 'steamworks-ffi-node';

const steam = Steam.getInstance();
const achievements = await steam.getAllAchievements();

console.log(`Found ${achievements.length} achievements`);

achievements.forEach(ach => {
  const status = ach.unlocked ? '✅' : '🔒';
  console.log(`${status} ${ach.displayName}`);
  console.log(`   ${ach.description}`);
  
  if (ach.unlockTime > 0) {
    const date = new Date(ach.unlockTime * 1000);
    console.log(`   Unlocked: ${date.toLocaleString()}`);
  }
});
```

---

### `unlockAchievement(achievementName)`

Unlock an achievement and sync to Steam servers.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_SetAchievement()` - Set achievement as unlocked
- `SteamAPI_ISteamUserStats_StoreStats()` - Store to Steam servers
- `SteamAPI_RunCallbacks()` - Process unlock callback

**Parameters:**
- `achievementName: string` - Achievement API name (e.g., "ACH_WIN_ONE_GAME")

**Returns:** `Promise<boolean>` - `true` if successfully unlocked

**Example:**
```typescript
// Simple unlock
const success = await steam.unlockAchievement('ACH_WIN_ONE_GAME');
if (success) {
  console.log('🎉 Achievement unlocked!');
}

// Check first, then unlock
const isUnlocked = await steam.isAchievementUnlocked('ACH_WIN_ONE_GAME');
if (!isUnlocked) {
  await steam.unlockAchievement('ACH_WIN_ONE_GAME');
}
```

**Notes:**
- Achievement is permanently unlocked on Steam
- Automatically calls `StoreStats()` to sync
- Processes callbacks automatically

---

### `clearAchievement(achievementName)`

Clear an achievement (for testing purposes).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_ClearAchievement()` - Clear achievement
- `SteamAPI_ISteamUserStats_StoreStats()` - Store to Steam servers
- `SteamAPI_RunCallbacks()` - Process clear callback

**Parameters:**
- `achievementName: string` - Achievement API name

**Returns:** `Promise<boolean>` - `true` if successfully cleared

**Example:**
```typescript
// Clear for testing
const success = await steam.clearAchievement('ACH_WIN_ONE_GAME');
if (success) {
  console.log('Achievement cleared for testing');
}

// Clear all achievements (testing)
const achievements = await steam.getAllAchievements();
for (const ach of achievements.filter(a => a.unlocked)) {
  await steam.clearAchievement(ach.apiName);
}
```

**⚠️ Warning:** This permanently removes the achievement from the user's Steam profile. Only use for testing!

---

### `isAchievementUnlocked(achievementName)`

Check if a specific achievement is unlocked.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_GetAchievementAndUnlockTime()` - Get unlock status

**Parameters:**
- `achievementName: string` - Achievement API name

**Returns:** `Promise<boolean>` - `true` if unlocked

**Example:**
```typescript
const unlocked = await steam.isAchievementUnlocked('ACH_WIN_ONE_GAME');
console.log(`Status: ${unlocked ? 'Unlocked ✅' : 'Locked 🔒'}`);

// Use in conditional logic
if (!await steam.isAchievementUnlocked('ACH_WIN_ONE_GAME')) {
  // Award the achievement
  await steam.unlockAchievement('ACH_WIN_ONE_GAME');
}
```

---

### `getAchievementByName(achievementName)`

Get detailed information about a specific achievement.

**Steamworks SDK Functions:**
- Calls `getAllAchievements()` internally (see above for SDK functions)

**Parameters:**
- `achievementName: string` - Achievement API name

**Returns:** `Promise<SteamAchievement | null>`

**Example:**
```typescript
const achievement = await steam.getAchievementByName('ACH_WIN_ONE_GAME');

if (achievement) {
  console.log(`Name: ${achievement.displayName}`);
  console.log(`Description: ${achievement.description}`);
  console.log(`Status: ${achievement.unlocked ? 'Unlocked' : 'Locked'}`);
  
  if (achievement.unlockTime > 0) {
    const date = new Date(achievement.unlockTime * 1000);
    console.log(`Unlocked on: ${date.toLocaleDateString()}`);
  }
} else {
  console.log('Achievement not found');
}
```

---

### `getTotalAchievementCount()`

Get total number of achievements available for this game.

**Returns:** `Promise<number>`

**Example:**
```typescript
const total = await steam.getTotalAchievementCount();
console.log(`This game has ${total} achievements`);
```

---

### `getUnlockedAchievementCount()`

Get number of achievements the user has unlocked.

**Steamworks SDK Functions:**
- Calls `getAllAchievements()` and counts unlocked

**Returns:** `Promise<number>`

**Example:**
```typescript
const total = await steam.getTotalAchievementCount();
const unlocked = await steam.getUnlockedAchievementCount();
const percentage = (unlocked / total * 100).toFixed(1);

console.log(`Progress: ${unlocked}/${total} (${percentage}%)`);

// Show progress bar
const barLength = 20;
const filled = Math.round(unlocked / total * barLength);
const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
console.log(`[${bar}] ${percentage}%`);
```

---

## Visual & UI Features

Functions for displaying achievement icons and progress notifications.

### `getAchievementIcon(achievementName)`

Get icon handle for an achievement. Can be used with `ISteamUtils::GetImageRGBA()` to get actual image data.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_GetAchievementIcon()` - Get icon handle

**Parameters:**
- `achievementName: string` - Achievement API name

**Returns:** `Promise<number>` - Icon handle (0 if none or still loading)

**Example:**
```typescript
const iconHandle = await steam.getAchievementIcon('ACH_WIN_ONE_GAME');

if (iconHandle > 0) {
  console.log(`Icon handle: ${iconHandle}`);
  // Use with ISteamUtils::GetImageRGBA() to get actual image
} else {
  console.log('No icon available or still loading');
}
```

**Note:** The icon handle can be used with Steam's Utils interface to retrieve the actual RGBA image data.

---

### `getAllAchievementsWithIcons()`

Get all achievements with their icon handles included.

**Steamworks SDK Functions:**
- Calls `getAllAchievements()` internally
- `SteamAPI_ISteamUserStats_GetAchievementIcon()` - Get icon for each achievement

**Returns:** `Promise<AchievementWithIcon[]>`

**Type:**
```typescript
interface AchievementWithIcon extends SteamAchievement {
  iconHandle: number;  // Icon handle for GetImageRGBA
}
```

**Example:**
```typescript
const achievements = await steam.getAllAchievementsWithIcons();

achievements.forEach(ach => {
  const status = ach.unlocked ? '✅' : '🔒';
  console.log(`${status} ${ach.displayName}`);
  console.log(`   Icon handle: ${ach.iconHandle}`);
});

// Filter achievements with icons
const withIcons = achievements.filter(a => a.iconHandle > 0);
console.log(`${withIcons.length} achievements have icons`);
```

---

### `indicateAchievementProgress(achievementName, currentProgress, maxProgress)`

Show a progress notification in the Steam overlay.

**Parameters:**
- `achievementName: string` - Achievement API name
- `currentProgress: number` - Current progress value
- `maxProgress: number` - Maximum progress value

**Returns:** `Promise<boolean>` - `true` if notification shown

**Example:**
```typescript
// Show progress notification
await steam.indicateAchievementProgress('ACH_COLLECT_100_ITEMS', 50, 100);
// Steam overlay shows: "50/100 items collected"

// Update progress as player advances
let itemsCollected = 0;
const target = 100;

function collectItem() {
  itemsCollected++;
  
  // Show progress at milestones
  if (itemsCollected % 10 === 0) {
    steam.indicateAchievementProgress('ACH_COLLECT_100_ITEMS', itemsCollected, target);
  }
  
  // Unlock when complete
  if (itemsCollected >= target) {
    steam.unlockAchievement('ACH_COLLECT_100_ITEMS');
  }
}
```

**⚠️ Important:** Calling this with `N/N` progress does **NOT** automatically unlock the achievement. You must still call `unlockAchievement()`.

---

## Progress Tracking

Get progress limits for achievements that track progress.

### `getAchievementProgressLimitsInt(achievementName)`

Get integer-based progress limits for an achievement.

**Parameters:**
- `achievementName: string` - Achievement API name

**Returns:** `Promise<AchievementProgressLimits | null>`

**Type:**
```typescript
interface AchievementProgressLimits {
  minProgress: number;
  maxProgress: number;
}
```

**Example:**
```typescript
const limits = await steam.getAchievementProgressLimitsInt('ACH_COLLECT_100_ITEMS');

if (limits) {
  console.log(`Progress range: ${limits.minProgress} to ${limits.maxProgress}`);
  
  // Use for progress tracking
  const currentProgress = 50;
  const percentage = (currentProgress / limits.maxProgress * 100).toFixed(1);
  console.log(`Progress: ${percentage}%`);
  
  // Show notification at milestones
  if (currentProgress % 25 === 0) {
    await steam.indicateAchievementProgress(
      'ACH_COLLECT_100_ITEMS',
      currentProgress,
      limits.maxProgress
    );
  }
} else {
  console.log('No progress tracking for this achievement');
}
```

---

### `getAchievementProgressLimitsFloat(achievementName)`

Get float-based progress limits for an achievement.

**Parameters:**
- `achievementName: string` - Achievement API name

**Returns:** `Promise<AchievementProgressLimits | null>`

**Example:**
```typescript
const limits = await steam.getAchievementProgressLimitsFloat('ACH_TRAVEL_FAR');

if (limits) {
  console.log(`Travel range: ${limits.minProgress} to ${limits.maxProgress} miles`);
  
  // Track distance traveled
  let distanceTraveled = 2500.5; // miles
  
  console.log(`Progress: ${distanceTraveled}/${limits.maxProgress} miles`);
  
  if (distanceTraveled >= limits.maxProgress) {
    await steam.unlockAchievement('ACH_TRAVEL_FAR');
  }
}
```

**Use Case:** Perfect for achievements that track continuous values like distance, time, or currency.

---

## Friend/Social Features

Compare achievements with Steam friends.

### `requestUserStats(steamId)`

Request achievement stats for another user (friend). This is an asynchronous operation.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_RequestUserStats()` - Request friend's stats (async call)

**Parameters:**
- `steamId: string` - Steam ID of the user (64-bit as string)

**Returns:** `Promise<boolean>` - `true` if request sent successfully

**Example:**
```typescript
const friendSteamId = '76561198012345678';

// Request friend's stats
const success = await steam.requestUserStats(friendSteamId);

if (success) {
  console.log('📊 Requesting friend stats...');
  
  // Wait for Steam callback
  await new Promise(resolve => setTimeout(resolve, 1000));
  steam.runCallbacks();
  
  // Now you can get friend's achievements
  const friendAch = await steam.getUserAchievement(friendSteamId, 'ACH_WIN_ONE_GAME');
  console.log(`Friend status: ${friendAch?.unlocked ? 'Unlocked' : 'Locked'}`);
}
```

**⚠️ Important:** You must wait for the callback before calling `getUserAchievement()`.

---

### `getUserAchievement(steamId, achievementName)`

Get achievement status for another user. Must call `requestUserStats()` first.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_GetUserAchievementAndUnlockTime()` - Get friend's achievement data
- `SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute()` - Get display info

**Parameters:**
- `steamId: string` - Steam ID of the user
- `achievementName: string` - Achievement API name

**Returns:** `Promise<UserAchievement | null>`

**Type:**
```typescript
interface UserAchievement {
  steamId: string;
  apiName: string;
  displayName: string;
  description: string;
  unlocked: boolean;
  unlockTime: number;
}
```

**Example:**
```typescript
async function compareWithFriend(friendSteamId: string) {
  // Request friend's data
  await steam.requestUserStats(friendSteamId);
  await new Promise(resolve => setTimeout(resolve, 1000));
  steam.runCallbacks();
  
  // Get all your achievements
  const myAchievements = await steam.getAllAchievements();
  
  console.log('🏆 Achievement Comparison:');
  
  for (const myAch of myAchievements) {
    const friendAch = await steam.getUserAchievement(friendSteamId, myAch.apiName);
    
    if (!friendAch) continue;
    
    const myStatus = myAch.unlocked ? '✅' : '🔒';
    const friendStatus = friendAch.unlocked ? '✅' : '🔒';
    
    console.log(`${myAch.displayName}:`);
    console.log(`  You: ${myStatus}`);
    console.log(`  Friend: ${friendStatus}`);
    
    if (myAch.unlocked && !friendAch.unlocked) {
      console.log(`  🎉 You're ahead on this one!`);
    }
  }
}
```

---

## Global Statistics

Access worldwide achievement unlock percentages and popularity data.

### `requestGlobalAchievementPercentages()`

Request global achievement unlock percentages from Steam. Asynchronous operation.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_RequestGlobalAchievementPercentages()` - Request global data (async call)

**Returns:** `Promise<boolean>` - `true` if request sent

**Example:**
```typescript
// Request global data
const success = await steam.requestGlobalAchievementPercentages();

if (success) {
  console.log('📊 Requesting global stats...');
  
  // Wait for Steam callback (usually takes 1-2 seconds)
  await new Promise(resolve => setTimeout(resolve, 2000));
  steam.runCallbacks();
  
  // Now you can access global statistics
  const percent = await steam.getAchievementAchievedPercent('ACH_WIN_ONE_GAME');
  console.log(`${percent}% of players have unlocked this`);
}
```

**⚠️ Important:** Wait for the callback before accessing global statistics methods.

---

### `getAchievementAchievedPercent(achievementName)`

Get percentage of users who unlocked a specific achievement.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_GetAchievementAchievedPercent()` - Get global unlock percentage

**Parameters:**
- `achievementName: string` - Achievement API name

**Returns:** `Promise<number | null>` - Percentage (0-100) or `null` if unavailable

**Example:**
```typescript
const percent = await steam.getAchievementAchievedPercent('ACH_WIN_ONE_GAME');

if (percent !== null) {
  console.log(`${percent.toFixed(2)}% of players have this achievement`);
  
  // Categorize rarity
  if (percent < 1) {
    console.log('🏆 Ultra Rare!');
  } else if (percent < 5) {
    console.log('💎 Rare');
  } else if (percent < 20) {
    console.log('🥈 Uncommon');
  } else {
    console.log('🥉 Common');
  }
}
```

**Prerequisite:** Must call `requestGlobalAchievementPercentages()` first.

---

### `getAllAchievementsWithGlobalStats()`

Get all achievements with global unlock percentages.

**Steamworks SDK Functions:**
- Calls `getAllAchievements()` internally
- `SteamAPI_ISteamUserStats_GetAchievementAchievedPercent()` - Get percentage for each

**Returns:** `Promise<AchievementGlobalStats[]>`

**Type:**
```typescript
interface AchievementGlobalStats {
  apiName: string;
  displayName: string;
  description: string;
  unlocked: boolean;              // Your unlock status
  globalUnlockPercentage: number; // Global unlock %
}
```

**Example:**
```typescript
const stats = await steam.getAllAchievementsWithGlobalStats();

console.log('🌍 Global Achievement Statistics:');

stats.forEach((ach, index) => {
  const yourStatus = ach.unlocked ? '✅' : '🔒';
  const rarity = ach.globalUnlockPercentage < 5 ? '💎' : '';
  
  console.log(`${index + 1}. ${yourStatus} ${ach.displayName} ${rarity}`);
  console.log(`   ${ach.globalUnlockPercentage.toFixed(2)}% of players`);
  
  if (ach.unlocked && ach.globalUnlockPercentage < 1) {
    console.log(`   🎖️ You have a rare achievement!`);
  }
});
```

**Prerequisite:** Must call `requestGlobalAchievementPercentages()` first.

---

### `getMostAchievedAchievementInfo()`

Get the most commonly unlocked achievement.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_GetMostAchievedAchievementInfo()` - Get most popular achievement

**Returns:** `Promise<{ apiName: string; percent: number; unlocked: boolean; iterator: number } | null>`

**Example:**
```typescript
const mostAchieved = await steam.getMostAchievedAchievementInfo();

if (mostAchieved) {
  console.log(`🥇 Most achieved: ${mostAchieved.apiName}`);
  console.log(`   Unlocked by ${mostAchieved.percent.toFixed(2)}% of players`);
  console.log(`   Your status: ${mostAchieved.unlocked ? 'Unlocked ✅' : 'Locked 🔒'}`);
  
  // Use iterator to get next achievements
  const iterator = mostAchieved.iterator;
}
```

**Prerequisite:** Must call `requestGlobalAchievementPercentages()` first.

---

### `getNextMostAchievedAchievementInfo(previousIterator)`

Get next achievement in popularity order.

**Parameters:**
- `previousIterator: number` - Iterator from previous call

**Returns:** `Promise<{ apiName: string; percent: number; unlocked: boolean; iterator: number } | null>`

**Example:**
```typescript
// Get top 5 most achieved achievements
const first = await steam.getMostAchievedAchievementInfo();
if (!first) return;

console.log(`1. ${first.apiName}: ${first.percent.toFixed(2)}%`);

let iterator = first.iterator;
for (let i = 2; i <= 5; i++) {
  const next = await steam.getNextMostAchievedAchievementInfo(iterator);
  if (!next) break;
  
  console.log(`${i}. ${next.apiName}: ${next.percent.toFixed(2)}%`);
  iterator = next.iterator;
}
```

---

### `getAllAchievementsSortedByPopularity()`

Get all achievements sorted by global unlock percentage (most achieved first).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_GetMostAchievedAchievementInfo()` - Get first
- `SteamAPI_ISteamUserStats_GetNextMostAchievedAchievementInfo()` - Iterate through all
- `SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute()` - Get display info for each

**Returns:** `Promise<AchievementGlobalStats[]>`

**Example:**
```typescript
const sorted = await steam.getAllAchievementsSortedByPopularity();

console.log('🏆 Achievements by Popularity:');

sorted.forEach((ach, index) => {
  const yourStatus = ach.unlocked ? '✅' : '🔒';
  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
  
  console.log(`${index + 1}. ${medal} ${ach.displayName} ${yourStatus}`);
  console.log(`   ${ach.globalUnlockPercentage.toFixed(2)}% of players`);
});

// Find rarest achievements
const rarest = sorted.slice().reverse().slice(0, 3);
console.log('\n💎 Rarest Achievements:');
rarest.forEach((ach, i) => {
  console.log(`${i + 1}. ${ach.displayName}: ${ach.globalUnlockPercentage.toFixed(2)}%`);
});
```

**Prerequisite:** Must call `requestGlobalAchievementPercentages()` first.

---

## Testing/Development

Tools for testing and resetting achievement data.

### `resetAllStats(includeAchievements)`

Reset all stats and optionally all achievements.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUserStats_ResetAllStats()` - Reset all user stats/achievements
- `SteamAPI_ISteamUserStats_StoreStats()` - Store the reset to servers
- `SteamAPI_RunCallbacks()` - Process the reset

**Parameters:**
- `includeAchievements: boolean` - If `true`, also resets all achievements (default: `false`)

**Returns:** `Promise<boolean>` - `true` if successfully reset

**Example:**
```typescript
// Reset only stats, keep achievements
const success = await steam.resetAllStats(false);
console.log('Stats reset:', success);

// Reset EVERYTHING including achievements
console.log('⚠️ WARNING: Resetting ALL stats and achievements!');
await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second warning
const success = await steam.resetAllStats(true);
console.log('Everything reset:', success);
```

**⚠️ DANGER:** This permanently deletes ALL user statistics and optionally ALL achievements! Only use for testing and development.

**Best Practice:**
```typescript
// Add safeguards
if (process.env.NODE_ENV === 'production') {
  console.error('resetAllStats() disabled in production!');
  return;
}

console.warn('This will reset all stats. Are you sure? (5 seconds to cancel)');
await new Promise(resolve => setTimeout(resolve, 5000));

await steam.resetAllStats(true);
```

---

## Complete Usage Example

```typescript
import Steam from 'steamworks-ffi-node';

async function comprehensiveExample() {
  const steam = Steam.getInstance();
  
  // Initialize
  if (!steam.init({ appId: 480 })) {
    console.error('Failed to initialize Steam');
    return;
  }
  
  try {
    // ===== CORE OPERATIONS =====
    console.log('📊 Core Operations:');
    const achievements = await steam.getAllAchievements();
    const total = await steam.getTotalAchievementCount();
    const unlocked = await steam.getUnlockedAchievementCount();
    console.log(`Progress: ${unlocked}/${total} achievements`);
    
    // ===== VISUAL FEATURES =====
    console.log('\n🎨 Visual Features:');
    const withIcons = await steam.getAllAchievementsWithIcons();
    console.log(`${withIcons.filter(a => a.iconHandle > 0).length} have icons`);
    
    // ===== PROGRESS TRACKING =====
    console.log('\n📈 Progress Tracking:');
    const limits = await steam.getAchievementProgressLimitsFloat('ACH_TRAVEL_FAR');
    if (limits) {
      console.log(`Range: ${limits.minProgress}-${limits.maxProgress}`);
      await steam.indicateAchievementProgress('ACH_TRAVEL_FAR', 2500, limits.maxProgress);
    }
    
    // ===== GLOBAL STATISTICS =====
    console.log('\n🌍 Global Statistics:');
    await steam.requestGlobalAchievementPercentages();
    await new Promise(resolve => setTimeout(resolve, 2000));
    steam.runCallbacks();
    
    const globalStats = await steam.getAllAchievementsWithGlobalStats();
    globalStats.forEach(ach => {
      if (ach.globalUnlockPercentage < 5) {
        console.log(`💎 ${ach.displayName}: ${ach.globalUnlockPercentage.toFixed(2)}% (rare!)`);
      }
    });
    
    const sorted = await steam.getAllAchievementsSortedByPopularity();
    console.log(`Most achieved: ${sorted[0].displayName} (${sorted[0].globalUnlockPercentage.toFixed(2)}%)`);
    
    // ===== FRIEND COMPARISON =====
    console.log('\n👥 Friend Comparison:');
    const status = steam.getStatus();
    await steam.requestUserStats(status.steamId);
    await new Promise(resolve => setTimeout(resolve, 1000));
    steam.runCallbacks();
    
    const userAch = await steam.getUserAchievement(status.steamId, 'ACH_WIN_ONE_GAME');
    if (userAch) {
      console.log(`Your achievement: ${userAch.unlocked ? 'Unlocked' : 'Locked'}`);
    }
    
  } finally {
    steam.shutdown();
  }
}

comprehensiveExample();
```

---

## Best Practices

### 1. Check Before Unlock
```typescript
// ✅ Good
if (!await steam.isAchievementUnlocked('ACH_WIN_ONE_GAME')) {
  await steam.unlockAchievement('ACH_WIN_ONE_GAME');
}

// ❌ Unnecessary
await steam.unlockAchievement('ACH_WIN_ONE_GAME'); // Works but redundant
```

### 2. Progress Notifications at Milestones
```typescript
// ✅ Good - Show at meaningful intervals
if (progress % 25 === 0) {
  await steam.indicateAchievementProgress('ACH_COLLECT_100', progress, 100);
}

// ❌ Bad - Too frequent
await steam.indicateAchievementProgress('ACH_COLLECT_100', progress, 100); // Every update
```

### 3. Cache Achievement Data
```typescript
// ✅ Good - Fetch once
const achievements = await steam.getAllAchievements();
const totalCount = achievements.length;
const unlockedCount = achievements.filter(a => a.unlocked).length;

// ❌ Bad - Multiple fetches
const total = await steam.getTotalAchievementCount();
const achievements = await steam.getAllAchievements();
const unlocked = await steam.getUnlockedAchievementCount();
```

### 4. Handle Async Operations
```typescript
// ✅ Good - Wait for callbacks
await steam.requestGlobalAchievementPercentages();
await new Promise(resolve => setTimeout(resolve, 2000));
steam.runCallbacks();
const percent = await steam.getAchievementAchievedPercent('ACH_WIN_ONE_GAME');

// ❌ Bad - Don't wait
await steam.requestGlobalAchievementPercentages();
const percent = await steam.getAchievementAchievedPercent('ACH_WIN_ONE_GAME'); // null
```

### 5. Error Handling
```typescript
// ✅ Good
const achievement = await steam.getAchievementByName('ACH_WIN_ONE_GAME');
if (achievement) {
  console.log(achievement.displayName);
} else {
  console.error('Achievement not found');
}

// ❌ Bad - No null check
const achievement = await steam.getAchievementByName('ACH_WIN_ONE_GAME');
console.log(achievement.displayName); // Might crash
```

---

## Related Documentation

- [SteamAPICore Documentation](https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/SteamAPICore.md)
- [GitHub Repository](https://github.com/ArtyProf/steamworks-ffi-node)
- [NPM Package](https://www.npmjs.com/package/steamworks-ffi-node)

---

**Last Updated:** October 10, 2025  
**Coverage:** 100% of Steamworks Achievement API (21/21 functions)
