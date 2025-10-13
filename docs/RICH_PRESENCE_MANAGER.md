# Rich Presence Manager API Documentation

Complete reference for Steam Rich Presence functionality in Steamworks FFI.

## Overview

The `SteamRichPresenceManager` allows games to set custom status information that appears in the Steam friends list and chat. This provides players with context about what their friends are doing in your game.

Rich Presence is automatically shared between friends who are in the same game. Each user has a set of key/value pairs that can be queried by other players.

## Quick Reference

| Function | Description |
|----------|-------------|
| [`setRichPresence()`](#setrichpresencekey-value) | Set a rich presence key/value pair |
| [`clearRichPresence()`](#clearrichpresence) | Clear all rich presence data |
| [`getFriendRichPresence()`](#getfriendrichpresencesteamid-key) | Get friend's rich presence value |
| [`getFriendRichPresenceKeyCount()`](#getfriendrichpresencekeycountsteamid) | Get number of keys friend has set |
| [`getFriendRichPresenceKeyByIndex()`](#getfriendrichpresencekeybyindexsteamid-index) | Get key name by index |
| [`requestFriendRichPresence()`](#requestfriendrichpresencesteamid) | Request friend's rich presence data |

---

## Special Keys

Steam recognizes these special keys with automatic handling:

| Key | Description | Example |
|-----|-------------|---------|
| `status` | UTF-8 string shown in 'view game info' dialog | `"Playing Capture the Flag"` |
| `connect` | Command-line for how friends can connect | `"+connect 192.168.1.100:27015"` |
| `steam_display` | Localization token for display in user's language | `"#Status_InGame"` |
| `steam_player_group` | Group identifier for organizing players | `"lobby_12345"` |
| `steam_player_group_size` | Total number of players in the group | `"4"` |

---

## Limits

- **Maximum Keys**: 30 keys per user
- **Key Length**: 64 characters maximum
- **Value Length**: 256 characters maximum

---

## Setting Rich Presence

### `setRichPresence(key, value)`

Sets a Rich Presence key/value pair for the current user.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_SetRichPresence()` - Set rich presence data

**Parameters:**
- `key: string` - The rich presence key (max 64 characters)
- `value: string | null` - The value (max 256 characters), or null/empty to delete

**Returns:** `boolean` - True if successful, false otherwise

**Example:**
```typescript
import SteamworksSDK, { RichPresenceKeys } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Set basic status
steam.richPresence.setRichPresence(RichPresenceKeys.STATUS, 'In Main Menu');

// Set connect string for join functionality
steam.richPresence.setRichPresence(
  RichPresenceKeys.CONNECT, 
  '+connect 192.168.1.100:27015'
);

// Set player group
steam.richPresence.setRichPresence(RichPresenceKeys.STEAM_PLAYER_GROUP, 'squad_alpha');
steam.richPresence.setRichPresence(RichPresenceKeys.STEAM_PLAYER_GROUP_SIZE, '4');

// Delete a key
steam.richPresence.setRichPresence(RichPresenceKeys.CONNECT, '');
```

**Use Cases:**
- Display game mode/map to friends
- Enable "Join Game" functionality
- Show party/squad information
- Display competitive rank or level

---

### `clearRichPresence()`

Clears all Rich Presence data for the current user.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_ClearRichPresence()` - Clear all rich presence

**Example:**
```typescript
// Set rich presence during gameplay
steam.richPresence.setRichPresence('status', 'Playing Deathmatch');
steam.richPresence.setRichPresence('connect', '+connect server:27015');

// Clear when exiting match
steam.richPresence.clearRichPresence();

// Or update to new status
steam.richPresence.setRichPresence('status', 'In Main Menu');
```

---

## Reading Friend Rich Presence

### `getFriendRichPresence(steamId, key)`

Gets a Rich Presence value for a specific friend.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_GetFriendRichPresence()` - Get friend's rich presence value

**Parameters:**
- `steamId: string` - The friend's Steam ID
- `key: string` - The rich presence key to retrieve

**Returns:** `string` - The value, or empty string if not set

**Example:**
```typescript
const friends = steam.friends.getAllFriends();

friends.forEach(friend => {
  // Request data first
  steam.richPresence.requestFriendRichPresence(friend.steamId);
  
  // Wait for data, then read it
  setTimeout(() => {
    const status = steam.richPresence.getFriendRichPresence(
      friend.steamId, 
      RichPresenceKeys.STATUS
    );
    
    const connect = steam.richPresence.getFriendRichPresence(
      friend.steamId,
      RichPresenceKeys.CONNECT
    );
    
    if (status) {
      console.log(`${friend.personaName}: ${status}`);
      
      if (connect) {
        console.log(`  Join with: ${connect}`);
      }
    }
  }, 1000);
});
```

---

### `getFriendRichPresenceKeyCount(steamId)`

Gets the number of Rich Presence keys set for a specific friend.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_GetFriendRichPresenceKeyCount()` - Get key count

**Parameters:**
- `steamId: string` - The friend's Steam ID

**Returns:** `number` - Number of keys, or 0 if none

**Example:**
```typescript
const friend = friends[0];

steam.richPresence.requestFriendRichPresence(friend.steamId);

setTimeout(() => {
  const keyCount = steam.richPresence.getFriendRichPresenceKeyCount(friend.steamId);
  console.log(`${friend.personaName} has ${keyCount} rich presence keys`);
}, 1000);
```

---

### `getFriendRichPresenceKeyByIndex(steamId, index)`

Gets a Rich Presence key name by index for a specific friend.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_GetFriendRichPresenceKeyByIndex()` - Get key by index

**Parameters:**
- `steamId: string` - The friend's Steam ID
- `index: number` - Index (0 to keyCount - 1)

**Returns:** `string` - The key name, or empty string if invalid

**Example:**
```typescript
const friend = friends[0];

steam.richPresence.requestFriendRichPresence(friend.steamId);

setTimeout(() => {
  const keyCount = steam.richPresence.getFriendRichPresenceKeyCount(friend.steamId);
  
  console.log(`${friend.personaName}'s Rich Presence:`);
  for (let i = 0; i < keyCount; i++) {
    const key = steam.richPresence.getFriendRichPresenceKeyByIndex(friend.steamId, i);
    const value = steam.richPresence.getFriendRichPresence(friend.steamId, key);
    console.log(`  ${key}: ${value}`);
  }
}, 1000);
```

---

### `requestFriendRichPresence(steamId)`

Requests Rich Presence data for a specific friend.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_RequestFriendRichPresence()` - Request data download

**Parameters:**
- `steamId: string` - The friend's Steam ID

**Remarks:**
This asynchronously downloads rich presence data. Allow a short delay before reading the data.

**Example:**
```typescript
const friends = steam.friends.getAllFriends();

// Request all friends' rich presence
friends.forEach(friend => {
  steam.richPresence.requestFriendRichPresence(friend.steamId);
});

// Wait for data
setTimeout(() => {
  friends.forEach(friend => {
    const status = steam.richPresence.getFriendRichPresence(
      friend.steamId,
      RichPresenceKeys.STATUS
    );
    
    if (status) {
      console.log(`${friend.personaName}: ${status}`);
    }
  });
}, 1000);
```

---

## Complete Usage Example

```typescript
import SteamworksSDK, { RichPresenceKeys } from 'steamworks-ffi-node';

async function richPresenceExample() {
  const steam = SteamworksSDK.getInstance();
  steam.init({ appId: 480 });
  
  try {
    // ===== SET YOUR RICH PRESENCE =====
    console.log('Setting rich presence...');
    
    steam.richPresence.setRichPresence(
      RichPresenceKeys.STATUS,
      'Playing Team Deathmatch on Dust2'
    );
    
    steam.richPresence.setRichPresence(
      RichPresenceKeys.CONNECT,
      '+connect 192.168.1.100:27015'
    );
    
    steam.richPresence.setRichPresence(
      RichPresenceKeys.STEAM_PLAYER_GROUP,
      'match_12345'
    );
    
    steam.richPresence.setRichPresence(
      RichPresenceKeys.STEAM_PLAYER_GROUP_SIZE,
      '10'
    );
    
    console.log('✅ Rich presence set');
    
    // ===== READ FRIENDS' RICH PRESENCE =====
    console.log('\nReading friends rich presence...');
    
    const friends = steam.friends.getAllFriends();
    
    // Request data for all friends
    friends.forEach(friend => {
      steam.richPresence.requestFriendRichPresence(friend.steamId);
    });
    
    // Wait for data to arrive
    await new Promise(resolve => setTimeout(resolve, 1000));
    steam.runCallbacks();
    
    // Display friends with rich presence
    friends.forEach(friend => {
      const keyCount = steam.richPresence.getFriendRichPresenceKeyCount(friend.steamId);
      
      if (keyCount > 0) {
        console.log(`\n${friend.personaName}:`);
        
        for (let i = 0; i < keyCount; i++) {
          const key = steam.richPresence.getFriendRichPresenceKeyByIndex(friend.steamId, i);
          const value = steam.richPresence.getFriendRichPresence(friend.steamId, key);
          console.log(`  ${key}: ${value}`);
        }
      }
    });
    
    // ===== CLEAR ON EXIT =====
    console.log('\nClearing rich presence...');
    steam.richPresence.clearRichPresence();
    console.log('✅ Rich presence cleared');
    
  } finally {
    steam.shutdown();
  }
}

richPresenceExample();
```

---

## Best Practices

### 1. Update Rich Presence on State Changes
```typescript
// ✅ Good - Update when game state changes
function onGameStateChange(newState: GameState) {
  switch (newState) {
    case GameState.MENU:
      steam.richPresence.setRichPresence('status', 'In Main Menu');
      steam.richPresence.setRichPresence('connect', '');
      break;
      
    case GameState.IN_MATCH:
      steam.richPresence.setRichPresence('status', `Playing ${currentMode}`);
      steam.richPresence.setRichPresence('connect', `+connect ${serverIP}`);
      break;
      
    case GameState.LOBBY:
      steam.richPresence.setRichPresence('status', 'In Lobby');
      steam.richPresence.setRichPresence('steam_player_group', lobbyId);
      break;
  }
}

// ❌ Bad - Not updating rich presence
// Friends see stale "In Match" status even after you quit
```

### 2. Clear Rich Presence on Exit
```typescript
// ✅ Good - Clear on shutdown
window.addEventListener('beforeunload', () => {
  steam.richPresence.clearRichPresence();
  steam.shutdown();
});

// ❌ Bad - Leaving rich presence set
// Status remains after game closes
```

### 3. Request Before Reading
```typescript
// ✅ Good - Request first, wait, then read
steam.richPresence.requestFriendRichPresence(friendId);

setTimeout(() => {
  const status = steam.richPresence.getFriendRichPresence(friendId, 'status');
  console.log(status);
}, 1000);

// ❌ Bad - Read immediately without requesting
const status = steam.richPresence.getFriendRichPresence(friendId, 'status');
// Returns empty string - data not loaded yet
```

### 4. Use Standard Keys
```typescript
// ✅ Good - Use RichPresenceKeys constants
steam.richPresence.setRichPresence(RichPresenceKeys.STATUS, 'Playing');
steam.richPresence.setRichPresence(RichPresenceKeys.CONNECT, '+connect server');

// ❌ Bad - Magic strings prone to typos
steam.richPresence.setRichPresence('stauts', 'Playing'); // Typo!
```

---

## Common Patterns

### Display "Join Game" Functionality
```typescript
// Set connect string for your server
const serverIP = '192.168.1.100';
const serverPort = 27015;

steam.richPresence.setRichPresence(
  RichPresenceKeys.STATUS,
  `Playing on ${serverIP}`
);

steam.richPresence.setRichPresence(
  RichPresenceKeys.CONNECT,
  `+connect ${serverIP}:${serverPort}`
);

// Friends can now click "Join Game" in Steam
```

### Show Party/Squad Status
```typescript
function updatePartyStatus(partyId: string, currentSize: number, maxSize: number) {
  steam.richPresence.setRichPresence(
    RichPresenceKeys.STATUS,
    `In Party (${currentSize}/${maxSize})`
  );
  
  steam.richPresence.setRichPresence(
    RichPresenceKeys.STEAM_PLAYER_GROUP,
    partyId
  );
  
  steam.richPresence.setRichPresence(
    RichPresenceKeys.STEAM_PLAYER_GROUP_SIZE,
    maxSize.toString()
  );
}

// Usage
updatePartyStatus('party_abc123', 3, 4);
```

### Display Game Mode and Map
```typescript
function updateGameModeStatus(mode: string, map: string) {
  steam.richPresence.setRichPresence(
    RichPresenceKeys.STATUS,
    `Playing ${mode} on ${map}`
  );
}

// Usage
updateGameModeStatus('Capture the Flag', 'Dust2');
updateGameModeStatus('Deathmatch', 'Aztec');
```

### Find Friends Playing Same Game
```typescript
async function findFriendsInGame(): Promise<FriendInfo[]> {
  const friends = steam.friends.getAllFriends();
  
  // Request rich presence for all
  friends.forEach(f => steam.richPresence.requestFriendRichPresence(f.steamId));
  
  // Wait for data
  await new Promise(resolve => setTimeout(resolve, 1000));
  steam.runCallbacks();
  
  // Filter friends who have status set
  return friends.filter(friend => {
    const status = steam.richPresence.getFriendRichPresence(
      friend.steamId,
      RichPresenceKeys.STATUS
    );
    return status.length > 0;
  });
}

// Usage
const friendsPlaying = await findFriendsInGame();
console.log(`${friendsPlaying.length} friends are playing`);
```

---

## Localization

Rich Presence supports localization tokens for the `steam_display` key. This allows Steam to display status in each user's language.

**Setup:**
1. Define localization tokens in your Steamworks app settings
2. Use tokens in `steam_display` key
3. Steam automatically translates for each user

**Example:**
```typescript
// In your app's Steam localization config:
// #Status_MainMenu = "In Main Menu"
// #Status_Playing = "Playing {#GameMode} on {#Map}"

// In your code:
steam.richPresence.setRichPresence('steam_display', '#Status_MainMenu');

// Or with substitutions:
steam.richPresence.setRichPresence('steam_display', '#Status_Playing');
steam.richPresence.setRichPresence('GameMode', 'Deathmatch');
steam.richPresence.setRichPresence('Map', 'Dust2');
```

See [Steam Rich Presence Localization](https://partner.steamgames.com/doc/api/ISteamFriends#richpresencelocalization) for details.

---

## Troubleshooting

### Rich Presence Not Showing
- Make sure you've set the `status` key
- Verify Steam client is running
- Check that friends are online
- Rich presence only shows for friends in same game

### Friends Can't Join
- Ensure `connect` key is set correctly
- Verify server/IP is accessible
- Test connect string manually
- Check firewall settings

### Data Not Loading
- Call `requestFriendRichPresence()` first
- Wait at least 1 second before reading
- Call `steam.runCallbacks()` to process updates
- Friend must be online and playing same game

---
