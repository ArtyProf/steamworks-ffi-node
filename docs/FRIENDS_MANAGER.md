# Friends Manager API Documentation

Complete reference for Steam Friends and social functionality in Steamworks FFI.

## Overview

The `SteamFriendsManager` provides implementation of the Steamworks Friends API with 10 essential functions for managing friends and social features.

## Quick Reference

| Category | Functions | Description |
|----------|-----------|-------------|
| [Current User](#current-user-info) | 2 | Get your persona name and online status |
| [Friends List](#friends-list-management) | 4 | Count, iterate, and retrieve friends |
| [Friend Information](#friend-information) | 3 | Get friend details and status |
| [Friend Activity](#friend-activity) | 1 | Check what games friends are playing |

---

## Current User Info

Get information about the currently logged-in user.

### `getPersonaName()`

Gets the current user's persona name (Steam display name).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_GetPersonaName()` - Get current user's display name

**Returns:** `string` - The user's Steam display name, or empty string if unavailable

**Example:**
```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

const myName = steam.friends.getPersonaName();
console.log(`Logged in as: ${myName}`);
```

**Use Cases:**
- Display welcome messages
- Show current user in UI
- Log user identity for debugging

---

### `getPersonaState()`

Gets the current user's persona state (online status).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_GetPersonaState()` - Get current user's online status

**Returns:** `EPersonaState` - Current online status enum value

**Persona States:**
```typescript
enum EPersonaState {
  Offline = 0,          // Not logged in
  Online = 1,           // Online and available
  Busy = 2,             // Online but marked as busy
  Away = 3,             // Away from keyboard
  Snooze = 4,           // Auto-away (extended absence)
  LookingToTrade = 5,   // Looking to trade items
  LookingToPlay = 6,    // Looking for a game
  Invisible = 7         // Appears offline to others
}
```

**Example:**
```typescript
const state = steam.friends.getPersonaState();

switch (state) {
  case EPersonaState.Online:
    console.log('✅ You are online');
    break;
  case EPersonaState.Away:
    console.log('💤 You are away');
    break;
  case EPersonaState.Busy:
    console.log('⏰ You are busy');
    break;
  case EPersonaState.Offline:
    console.log('⚫ You appear offline');
    break;
}

// Check if user is available
const isAvailable = state === EPersonaState.Online || state === EPersonaState.LookingToPlay;
if (isAvailable) {
  console.log('Ready to play!');
}
```

---

## Friends List Management

Retrieve and manage your Steam friends list.

### `getFriendCount(friendFlags?)`

Gets the count of friends matching specified flags.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_GetFriendCount()` - Get friend count with filters

**Parameters:**
- `friendFlags: EFriendFlags` (optional) - Flags to filter which friends to count (default: `EFriendFlags.Immediate`)

**Friend Flags:**
```typescript
enum EFriendFlags {
  None = 0x00,
  Blocked = 0x01,
  FriendshipRequested = 0x02,
  Immediate = 0x04,           // Regular friends (most common)
  ClanMember = 0x08,
  OnGameServer = 0x10,
  RequestingFriendship = 0x80,
  RequestingInfo = 0x100,
  Ignored = 0x200,
  IgnoredFriend = 0x400,
  ChatMember = 0x1000,
  All = 0xFFFF                // All relationships
}
```

**Returns:** `number` - Count of friends matching the flags

**Example:**
```typescript
// Get regular friends count
const friendCount = steam.friends.getFriendCount(EFriendFlags.Immediate);
console.log(`You have ${friendCount} friends`);

// Get all relationships including blocked, ignored, etc.
const allCount = steam.friends.getFriendCount(EFriendFlags.All);
console.log(`Total relationships: ${allCount}`);

// Get friends on same game server
const onServer = steam.friends.getFriendCount(EFriendFlags.OnGameServer);
console.log(`${onServer} friends on this server`);
```

**⚠️ Important:** Use the same flags when calling `getFriendByIndex()` to iterate through the list.

---

### `getFriendByIndex(index, friendFlags?)`

Gets a friend's Steam ID by their index in the friends list.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_GetFriendByIndex()` - Get friend Steam ID at index

**Parameters:**
- `index: number` - Zero-based index (0 to `getFriendCount()` - 1)
- `friendFlags: EFriendFlags` (optional) - Same flags used in `getFriendCount()` (default: `EFriendFlags.Immediate`)

**Returns:** `string | null` - Friend's Steam ID as a string, or `null` if invalid index

**Example:**
```typescript
// Iterate through all friends
const count = steam.friends.getFriendCount(EFriendFlags.Immediate);

for (let i = 0; i < count; i++) {
  const steamId = steam.friends.getFriendByIndex(i, EFriendFlags.Immediate);
  
  if (steamId) {
    const name = steam.friends.getFriendPersonaName(steamId);
    console.log(`${i + 1}. ${name} (${steamId})`);
  }
}

// Get first 10 friends
const first10 = [];
for (let i = 0; i < Math.min(10, count); i++) {
  const steamId = steam.friends.getFriendByIndex(i, EFriendFlags.Immediate);
  if (steamId) first10.push(steamId);
}
```

**⚠️ Important:** Must use the same `friendFlags` value as `getFriendCount()` for consistent results.

---

### `getAllFriends(friendFlags?)`

Gets all friends with their complete information in a single call.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_GetFriendCount()` - Get total count
- `SteamAPI_ISteamFriends_GetFriendByIndex()` - Iterate through friends
- `SteamAPI_ISteamFriends_GetFriendPersonaName()` - Get each friend's name
- `SteamAPI_ISteamFriends_GetFriendPersonaState()` - Get each friend's status
- `SteamAPI_ISteamFriends_GetFriendRelationship()` - Get relationship type

**Parameters:**
- `friendFlags: EFriendFlags` (optional) - Flags to filter friends (default: `EFriendFlags.Immediate`)

**Returns:** `FriendInfo[]` - Array of friend information objects

**Type:**
```typescript
interface FriendInfo {
  steamId: string;            // Friend's Steam ID
  personaName: string;        // Friend's display name
  personaState: EPersonaState; // Friend's online status
  relationship: EFriendRelationship; // Relationship type
}
```

**Example:**
```typescript
// Get all regular friends
const friends = steam.friends.getAllFriends(EFriendFlags.Immediate);

console.log(`You have ${friends.length} friends:`);

friends.forEach((friend, index) => {
  const status = friend.personaState === EPersonaState.Online ? '🟢' : '⚫';
  console.log(`${index + 1}. ${status} ${friend.personaName}`);
  console.log(`   Steam ID: ${friend.steamId}`);
  console.log(`   Status: ${friend.personaState}`);
});

// Filter online friends
const onlineFriends = friends.filter(f => f.personaState !== EPersonaState.Offline);
console.log(`\n${onlineFriends.length} friends are online`);

// Sort by name
const sorted = friends.sort((a, b) => a.personaName.localeCompare(b.personaName));

// Find a specific friend
const findFriend = (name: string) => {
  return friends.find(f => f.personaName.toLowerCase().includes(name.toLowerCase()));
};

const friend = findFriend('john');
if (friend) {
  console.log(`Found: ${friend.personaName}`);
}
```

**Performance Note:** For large friends lists (100+), this method makes many API calls. Consider using `getFriendByIndex()` for manual iteration if you need to process incrementally.

---

### `getFriendRelationship(steamId)`

Gets the relationship status between you and another user.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_GetFriendRelationship()` - Get relationship type

**Parameters:**
- `steamId: string` - The other user's Steam ID

**Returns:** `EFriendRelationship` - Relationship type enum value

**Relationship Types:**
```typescript
enum EFriendRelationship {
  None = 0,               // No relationship
  Blocked = 1,            // User is blocked
  RequestRecipient = 2,   // Received friend request from this user
  Friend = 3,             // Users are friends
  RequestInitiator = 4,   // Sent friend request to this user
  Ignored = 5,            // User is ignored
  IgnoredFriend = 6,      // Was a friend but now ignored
  SuggestedFriend = 7     // Suggested by Steam
}
```

**Example:**
```typescript
const friends = steam.friends.getAllFriends();

friends.forEach(friend => {
  const relationship = steam.friends.getFriendRelationship(friend.steamId);
  
  if (relationship === EFriendRelationship.Friend) {
    console.log(`${friend.personaName} is your friend ✅`);
  } else if (relationship === EFriendRelationship.RequestRecipient) {
    console.log(`${friend.personaName} sent you a friend request 📬`);
  } else if (relationship === EFriendRelationship.Blocked) {
    console.log(`${friend.personaName} is blocked 🚫`);
  }
});

// Check specific user
const checkUser = (steamId: string) => {
  const relationship = steam.friends.getFriendRelationship(steamId);
  
  switch (relationship) {
    case EFriendRelationship.Friend:
      return 'Friend';
    case EFriendRelationship.Blocked:
      return 'Blocked';
    case EFriendRelationship.None:
      return 'No relationship';
    default:
      return 'Unknown';
  }
};
```

---

## Friend Information

Get detailed information about specific friends.

### `getFriendPersonaName(steamId)`

Gets a friend's persona name (Steam display name).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_GetFriendPersonaName()` - Get friend's display name

**Parameters:**
- `steamId: string` - Friend's Steam ID

**Returns:** `string` - Friend's display name, or empty string if unavailable

**Example:**
```typescript
const friends = steam.friends.getAllFriends();

friends.forEach((friend, index) => {
  const name = steam.friends.getFriendPersonaName(friend.steamId);
  console.log(`${index + 1}. ${name}`);
});

// Get name by Steam ID
const friendId = '76561198012345678';
const name = steam.friends.getFriendPersonaName(friendId);

if (name) {
  console.log(`Friend's name: ${name}`);
} else {
  console.log('Name not available yet');
}
```

**Note:** If a friend hasn't been seen recently, the name may not be immediately available and could return an empty string. The name will be populated after the next Steam update.

---

### `getFriendPersonaState(steamId)`

Gets a friend's persona state (online status).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_GetFriendPersonaState()` - Get friend's online status

**Parameters:**
- `steamId: string` - Friend's Steam ID

**Returns:** `EPersonaState` - Friend's current online status

**Example:**
```typescript
const friends = steam.friends.getAllFriends();

// Count online friends
let onlineCount = 0;
let awayCount = 0;
let offlineCount = 0;

friends.forEach(friend => {
  const state = steam.friends.getFriendPersonaState(friend.steamId);
  
  if (state === EPersonaState.Online) {
    onlineCount++;
  } else if (state === EPersonaState.Away || state === EPersonaState.Snooze) {
    awayCount++;
  } else if (state === EPersonaState.Offline) {
    offlineCount++;
  }
});

console.log(`Online: ${onlineCount}, Away: ${awayCount}, Offline: ${offlineCount}`);

// Find friends available to play
const availableFriends = friends.filter(friend => {
  const state = steam.friends.getFriendPersonaState(friend.steamId);
  return state === EPersonaState.Online || state === EPersonaState.LookingToPlay;
});

console.log(`${availableFriends.length} friends available to play`);

// Display with status indicators
friends.forEach(friend => {
  const state = steam.friends.getFriendPersonaState(friend.steamId);
  const indicator = state === EPersonaState.Online ? '🟢' :
                    state === EPersonaState.Away ? '🟡' : '⚫';
  
  console.log(`${indicator} ${friend.personaName}`);
});
```

---

### `getFriendSteamLevel(steamId)`

Gets a friend's current Steam level.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_GetFriendSteamLevel()` - Get friend's Steam level

**Parameters:**
- `steamId: string` - Friend's Steam ID

**Returns:** `number` - Friend's Steam level (1-5000+), or 0 if unavailable

**Example:**
```typescript
const friends = steam.friends.getAllFriends();

// Get levels for all friends
const friendsWithLevels = friends.map(friend => ({
  name: friend.personaName,
  level: steam.friends.getFriendSteamLevel(friend.steamId)
}));

// Sort by level (highest first)
friendsWithLevels.sort((a, b) => b.level - a.level);

console.log('🏆 Friends by Steam Level:');
friendsWithLevels.slice(0, 10).forEach((friend, index) => {
  console.log(`${index + 1}. ${friend.name} - Level ${friend.level}`);
});

// Find highest level friend
const highest = friendsWithLevels[0];
console.log(`\n👑 Highest level friend: ${highest.name} (Level ${highest.level})`);

// Calculate average level
const total = friendsWithLevels.reduce((sum, f) => sum + f.level, 0);
const average = (total / friendsWithLevels.length).toFixed(1);
console.log(`📊 Average level: ${average}`);

// Find friends with high levels
const highLevelFriends = friendsWithLevels.filter(f => f.level >= 100);
console.log(`💎 ${highLevelFriends.length} friends are level 100+`);
```

**Note:** Returns 0 if the friend's profile is private or the level hasn't been loaded yet.

---

## Friend Activity

Check what your friends are currently doing.

### `getFriendGamePlayed(steamId)`

Checks if a friend is currently playing a game and returns game information.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_GetFriendGamePlayed()` - Get friend's current game info

**Parameters:**
- `steamId: string` - Friend's Steam ID

**Returns:** `FriendGameInfo | null` - Game information if playing, `null` otherwise

**Type:**
```typescript
interface FriendGameInfo {
  gameId: string;      // Steam App ID of the game being played
  gameIP: number;      // IP address of game server (if applicable)
  gamePort: number;    // Port of game server
  queryPort: number;   // Query port for game server
  steamIDLobby: string; // Steam ID of lobby (if in a lobby)
}
```

**Example:**
```typescript
const friends = steam.friends.getAllFriends();

console.log('🎮 Friends Currently Playing:');

friends.forEach(friend => {
  const gameInfo = steam.friends.getFriendGamePlayed(friend.steamId);
  
  if (gameInfo) {
    console.log(`${friend.personaName}`);
    console.log(`  Game: ${gameInfo.gameId}`);
    
    if (gameInfo.gameIP && gameInfo.gamePort) {
      console.log(`  Server: ${gameInfo.gameIP}:${gameInfo.gamePort}`);
    }
    
    if (gameInfo.steamIDLobby !== '0') {
      console.log(`  In lobby: ${gameInfo.steamIDLobby}`);
    }
  }
});

// Find friends playing a specific game
const findPlayingGame = (appId: string) => {
  return friends.filter(friend => {
    const gameInfo = steam.friends.getFriendGamePlayed(friend.steamId);
    return gameInfo && gameInfo.gameId === appId;
  });
};

const playingCS2 = findPlayingGame('730'); // Counter-Strike 2
console.log(`\n${playingCS2.length} friends playing Counter-Strike 2`);

// Count friends in games
const inGameCount = friends.filter(friend => {
  return steam.friends.getFriendGamePlayed(friend.steamId) !== null;
}).length;

console.log(`\n📊 ${inGameCount}/${friends.length} friends are in games`);

// List popular games among friends
const gamesPlayed = new Map<string, number>();

friends.forEach(friend => {
  const gameInfo = steam.friends.getFriendGamePlayed(friend.steamId);
  if (gameInfo) {
    const count = gamesPlayed.get(gameInfo.gameId) || 0;
    gamesPlayed.set(gameInfo.gameId, count + 1);
  }
});

console.log('\n🔥 Popular games:');
Array.from(gamesPlayed.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .forEach(([gameId, count]) => {
    console.log(`  App ${gameId}: ${count} friends`);
  });
```

**Use Cases:**
- Show what games friends are playing
- Find friends to join in multiplayer
- Display "Join Game" buttons in UI
- Track gaming activity patterns
- Find friends on the same server

---

## Complete Usage Example

```typescript
import SteamworksSDK, { EFriendFlags, EPersonaState } from 'steamworks-ffi-node';

async function friendsExample() {
  const steam = SteamworksSDK.getInstance();
  
  // Initialize
  if (!steam.init({ appId: 480 })) {
    console.error('Failed to initialize Steam');
    return;
  }
  
  try {
    // ===== CURRENT USER =====
    console.log('=== CURRENT USER ===');
    const myName = steam.friends.getPersonaName();
    const myState = steam.friends.getPersonaState();
    console.log(`Logged in as: ${myName}`);
    console.log(`Status: ${myState === EPersonaState.Online ? 'Online' : 'Offline'}`);
    
    // ===== FRIENDS LIST =====
    console.log('\n=== FRIENDS LIST ===');
    const friendCount = steam.friends.getFriendCount(EFriendFlags.Immediate);
    console.log(`Total friends: ${friendCount}`);
    
    const friends = steam.friends.getAllFriends(EFriendFlags.Immediate);
    console.log(`Retrieved ${friends.length} friends`);
    
    // ===== FRIEND DETAILS =====
    console.log('\n=== ONLINE FRIENDS ===');
    const onlineFriends = friends.filter(f => 
      f.personaState !== EPersonaState.Offline
    );
    
    onlineFriends.forEach(friend => {
      const name = steam.friends.getFriendPersonaName(friend.steamId);
      const level = steam.friends.getFriendSteamLevel(friend.steamId);
      const gameInfo = steam.friends.getFriendGamePlayed(friend.steamId);
      
      console.log(`\n🟢 ${name} (Level ${level})`);
      
      if (gameInfo) {
        console.log(`   🎮 Playing: App ${gameInfo.gameId}`);
      } else {
        console.log(`   💬 Online but not in a game`);
      }
    });
    
    // ===== STATISTICS =====
    console.log('\n=== STATISTICS ===');
    const onlineCount = friends.filter(f => 
      f.personaState === EPersonaState.Online
    ).length;
    
    const inGameCount = friends.filter(f => 
      steam.friends.getFriendGamePlayed(f.steamId) !== null
    ).length;
    
    console.log(`Online: ${onlineCount}/${friends.length}`);
    console.log(`In games: ${inGameCount}/${friends.length}`);
    
    // ===== TOP FRIENDS BY LEVEL =====
    console.log('\n=== TOP FRIENDS BY LEVEL ===');
    const withLevels = friends.map(f => ({
      name: f.personaName,
      level: steam.friends.getFriendSteamLevel(f.steamId)
    })).sort((a, b) => b.level - a.level);
    
    withLevels.slice(0, 5).forEach((friend, i) => {
      console.log(`${i + 1}. ${friend.name} - Level ${friend.level}`);
    });
    
  } finally {
    steam.shutdown();
  }
}

friendsExample();
```

---

## Best Practices

### 1. Cache Friends List
```typescript
// ✅ Good - Fetch once
const friends = steam.friends.getAllFriends();
const onlineCount = friends.filter(f => f.personaState !== EPersonaState.Offline).length;
const friendNames = friends.map(f => f.personaName);

// ❌ Bad - Multiple fetches
const count = steam.friends.getFriendCount();
const friends = steam.friends.getAllFriends();
```

### 2. Check for Null/Empty Returns
```typescript
// ✅ Good
const name = steam.friends.getFriendPersonaName(steamId);
if (name) {
  console.log(name);
} else {
  console.log('Name not available');
}

// ❌ Bad - No check
const name = steam.friends.getFriendPersonaName(steamId);
console.log(name.toUpperCase()); // Might crash if empty
```

### 3. Use Consistent Friend Flags
```typescript
// ✅ Good - Same flags
const flags = EFriendFlags.Immediate;
const count = steam.friends.getFriendCount(flags);
for (let i = 0; i < count; i++) {
  const steamId = steam.friends.getFriendByIndex(i, flags);
}

// ❌ Bad - Different flags
const count = steam.friends.getFriendCount(EFriendFlags.All);
const steamId = steam.friends.getFriendByIndex(0, EFriendFlags.Immediate); // Wrong!
```

### 4. Filter Before Processing
```typescript
// ✅ Good - Filter first
const onlineFriends = friends.filter(f => f.personaState !== EPersonaState.Offline);
onlineFriends.forEach(friend => {
  const gameInfo = steam.friends.getFriendGamePlayed(friend.steamId);
  // Process game info
});

// ❌ Less efficient - Check all friends
friends.forEach(friend => {
  const gameInfo = steam.friends.getFriendGamePlayed(friend.steamId);
  if (gameInfo) {
    // Process game info
  }
});
```

### 5. Handle Large Friends Lists
```typescript
// ✅ Good - Limit displayed items
const friends = steam.friends.getAllFriends();
const displayLimit = 50;

friends.slice(0, displayLimit).forEach(friend => {
  console.log(friend.personaName);
});

if (friends.length > displayLimit) {
  console.log(`... and ${friends.length - displayLimit} more`);
}

// ❌ Bad - Process all without limits
friends.forEach(friend => {
  console.log(friend.personaName); // Might be thousands
});
```

---

## Common Patterns

### Find Friends Playing Same Game
```typescript
const myGameId = '730'; // Counter-Strike 2

const friendsInSameGame = steam.friends.getAllFriends()
  .filter(friend => {
    const gameInfo = steam.friends.getFriendGamePlayed(friend.steamId);
    return gameInfo && gameInfo.gameId === myGameId;
  })
  .map(friend => ({
    name: friend.personaName,
    steamId: friend.steamId,
    server: (() => {
      const gameInfo = steam.friends.getFriendGamePlayed(friend.steamId);
      return gameInfo ? `${gameInfo.gameIP}:${gameInfo.gamePort}` : 'N/A';
    })()
  }));

console.log(`${friendsInSameGame.length} friends playing ${myGameId}:`);
friendsInSameGame.forEach(f => {
  console.log(`  ${f.name} - Server: ${f.server}`);
});
```

### Friends Status Dashboard
```typescript
const friends = steam.friends.getAllFriends();

const stats = {
  total: friends.length,
  online: 0,
  away: 0,
  offline: 0,
  inGame: 0,
  highLevel: 0
};

friends.forEach(friend => {
  const state = friend.personaState;
  const level = steam.friends.getFriendSteamLevel(friend.steamId);
  const gameInfo = steam.friends.getFriendGamePlayed(friend.steamId);
  
  if (state === EPersonaState.Online) stats.online++;
  else if (state === EPersonaState.Away || state === EPersonaState.Snooze) stats.away++;
  else stats.offline++;
  
  if (gameInfo) stats.inGame++;
  if (level >= 100) stats.highLevel++;
});

console.log('📊 Friends Dashboard:');
console.log(`Total: ${stats.total}`);
console.log(`🟢 Online: ${stats.online}`);
console.log(`🟡 Away: ${stats.away}`);
console.log(`⚫ Offline: ${stats.offline}`);
console.log(`🎮 In games: ${stats.inGame}`);
console.log(`💎 Level 100+: ${stats.highLevel}`);
```

### Sort Friends by Activity
```typescript
const friends = steam.friends.getAllFriends()
  .map(friend => {
    const state = friend.personaState;
    const gameInfo = steam.friends.getFriendGamePlayed(friend.steamId);
    
    // Assign priority: in-game > online > away > offline
    let priority = 0;
    if (gameInfo) priority = 4;
    else if (state === EPersonaState.Online) priority = 3;
    else if (state === EPersonaState.Away) priority = 2;
    else if (state === EPersonaState.Snooze) priority = 1;
    
    return { ...friend, priority, gameInfo };
  })
  .sort((a, b) => b.priority - a.priority);

console.log('Friends by activity:');
friends.forEach(friend => {
  const icon = friend.gameInfo ? '🎮' : 
               friend.personaState === EPersonaState.Online ? '🟢' :
               friend.personaState === EPersonaState.Away ? '🟡' : '⚫';
  
  console.log(`${icon} ${friend.personaName}`);
  if (friend.gameInfo) {
    console.log(`   Playing: App ${friend.gameInfo.gameId}`);
  }
});
```

---