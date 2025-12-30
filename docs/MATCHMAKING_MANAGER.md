# Matchmaking Manager API Documentation

Complete reference for Steam Matchmaking (Lobby) functionality in Steamworks FFI.

## Overview

The `SteamMatchmakingManager` provides access to Steam's ISteamMatchmaking API, enabling multiplayer lobby functionality for peer-to-peer matchmaking. This allows you to create, search, join, and manage game lobbies.

This manager is useful for:
1. **Creating lobbies**: Host multiplayer sessions with configurable privacy
2. **Searching lobbies**: Find and filter lobbies based on metadata
3. **Managing lobby data**: Store game state and searchable metadata
4. **Lobby chat**: Send and receive messages between members
5. **Player management**: Track members, ready states, and ownership

## Quick Reference

| Category | Functions | Description |
|----------|-----------|-------------|
| [Lobby Creation](#lobby-creation) | 1 | Create new lobbies |
| [Lobby Joining](#lobby-joining) | 3 | Join, leave, invite |
| [Lobby Searching](#lobby-searching) | 8 | Search with filters |
| [Lobby Data](#lobby-data) | 5 | Get/set metadata |
| [Lobby Members](#lobby-members) | 8 | Member management |
| [Lobby Chat](#lobby-chat) | 7 | Messaging system |
| [Lobby Management](#lobby-management) | 2 | Type and joinability |
| [Game Server](#game-server) | 2 | Server association |

**Total: 36 Functions**

---

## Lobby Types

Understanding lobby types is important for matchmaking:

```typescript
enum ELobbyType {
  Private = 0,        // Only joinable via invite
  FriendsOnly = 1,    // Joinable by friends of members
  Public = 2,         // Visible in search, anyone can join
  Invisible = 3,      // Returned by search, not visible in friend list
  PrivateUnique = 4   // Private lobby with unique key
}
```

---

## Lobby Creation

### `createLobby(lobbyType, maxMembers)`

Creates a new lobby asynchronously.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_CreateLobby()` - Create lobby

**Parameters:**
- `lobbyType: ELobbyType` - Visibility type of the lobby
- `maxMembers: number` - Maximum number of players (1-250)

**Returns:** `Promise<LobbyCreateResult>`

**Type:**
```typescript
interface LobbyCreateResult {
  success: boolean;    // Whether creation succeeded
  lobbyId?: string;    // Steam ID of the created lobby
  error?: string;      // Error message if failed
}
```

**Example:**
```typescript
import SteamworksSDK, { ELobbyType } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Create a public lobby for 4 players
const result = await steam.matchmaking.createLobby(ELobbyType.Public, 4);

if (result.success) {
  const lobbyId = result.lobbyId!;
  console.log(`✅ Lobby created: ${lobbyId}`);
  
  // Set searchable metadata
  steam.matchmaking.setLobbyData(lobbyId, 'gameMode', 'deathmatch');
  steam.matchmaking.setLobbyData(lobbyId, 'map', 'arena');
  steam.matchmaking.setLobbyData(lobbyId, 'version', '1.0.0');
} else {
  console.error(`❌ Failed to create lobby: ${result.error}`);
}
```

**Notes:**
- You automatically join the lobby you create
- Set lobby data immediately after creation for searchability
- The creator becomes the lobby owner

---

## Lobby Joining

Functions for joining and leaving lobbies.

### `joinLobby(lobbyId)`

Joins an existing lobby asynchronously.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_JoinLobby()` - Join lobby

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby to join

**Returns:** `Promise<LobbyJoinResult>`

**Type:**
```typescript
interface LobbyJoinResult {
  success: boolean;                    // Whether join succeeded
  lobbyId?: string;                    // Steam ID of the joined lobby
  response: EChatRoomEnterResponse;    // Detailed response code
  locked: boolean;                     // Whether the lobby is locked
  error?: string;                      // Error message if failed
}

enum EChatRoomEnterResponse {
  Success = 1,
  DoesntExist = 2,
  NotAllowed = 3,
  Full = 4,
  Error = 5,
  Banned = 6,
  Limited = 7,
  ClanDisabled = 8,
  CommunityBan = 9,
  MemberBlockedYou = 10,
  YouBlockedMember = 11,
  RateLimited = 12
}
```

**Example:**
```typescript
const result = await steam.matchmaking.joinLobby(lobbyId);

if (result.success) {
  console.log(`✅ Joined lobby: ${result.lobbyId}`);
  
  // Start receiving chat messages
  steam.matchmaking.startChatPolling(result.lobbyId!);
} else {
  console.error(`❌ Failed to join: ${result.error}`);
  
  // Handle specific errors
  if (result.response === 4) {
    console.log('Lobby is full');
  } else if (result.response === 6) {
    console.log('You are banned from this lobby');
  }
}
```

---

### `leaveLobby(lobbyId)`

Leaves a lobby you are currently in.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_LeaveLobby()` - Leave lobby

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby to leave

**Returns:** `void`

**Example:**
```typescript
// Stop chat polling before leaving
steam.matchmaking.stopChatPolling(lobbyId);

// Leave the lobby
steam.matchmaking.leaveLobby(lobbyId);
console.log('Left lobby');
```

---

### `inviteUserToLobby(lobbyId, steamIdInvitee)`

Invites a user to the lobby via Steam.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_InviteUserToLobby()` - Send invite

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby
- `steamIdInvitee: string` - Steam ID of the user to invite

**Returns:** `boolean` - `true` if invite was sent

**Example:**
```typescript
// Invite a friend to the lobby
const friendSteamId = '76561198012345678';
const invited = steam.matchmaking.inviteUserToLobby(lobbyId, friendSteamId);

if (invited) {
  console.log('✅ Invite sent!');
}
```

---

## Lobby Searching

Functions for finding lobbies with filters.

### `requestLobbyList()`

Searches for lobbies matching previously set filters.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_RequestLobbyList()` - Request lobby list

**Returns:** `Promise<LobbyListResult>`

**Type:**
```typescript
interface LobbyListResult {
  success: boolean;      // Whether search succeeded
  lobbies: string[];     // Array of lobby Steam IDs
  error?: string;        // Error message if failed
}
```

**Example:**
```typescript
// Set filters before searching
steam.matchmaking.addRequestLobbyListStringFilter(
  'gameMode', 'deathmatch', ELobbyComparison.Equal
);
steam.matchmaking.addRequestLobbyListResultCountFilter(20);

// Search for lobbies
const result = await steam.matchmaking.requestLobbyList();

if (result.success) {
  console.log(`Found ${result.lobbies.length} lobbies`);
  
  for (const lobbyId of result.lobbies) {
    const members = steam.matchmaking.getNumLobbyMembers(lobbyId);
    const maxMembers = steam.matchmaking.getLobbyMemberLimit(lobbyId);
    const gameMode = steam.matchmaking.getLobbyData(lobbyId, 'gameMode');
    console.log(`Lobby ${lobbyId}: ${members}/${maxMembers} - ${gameMode}`);
  }
}
```

---

### `addRequestLobbyListStringFilter(key, value, comparison)`

Adds a string-based filter for lobby search.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_AddRequestLobbyListStringFilter()` - Add string filter

**Parameters:**
- `key: string` - Lobby data key to filter on
- `value: string` - Value to compare against
- `comparison: ELobbyComparison` - Comparison type

**Comparison Types:**
```typescript
enum ELobbyComparison {
  EqualToOrLessThan = -2,
  LessThan = -1,
  Equal = 0,
  GreaterThan = 1,
  EqualToOrGreaterThan = 2,
  NotEqual = 3
}
```

**Returns:** `void`

**Example:**
```typescript
import { ELobbyComparison } from 'steamworks-ffi-node';

// Only find lobbies with matching game mode
steam.matchmaking.addRequestLobbyListStringFilter(
  'gameMode', 'coop', ELobbyComparison.Equal
);

// Only find lobbies with matching version
steam.matchmaking.addRequestLobbyListStringFilter(
  'version', '1.0.0', ELobbyComparison.Equal
);
```

---

### `addRequestLobbyListNumericalFilter(key, value, comparison)`

Adds a numerical filter for lobby search.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_AddRequestLobbyListNumericalFilter()` - Add numerical filter

**Parameters:**
- `key: string` - Lobby data key to filter on
- `value: number` - Numeric value to compare against
- `comparison: ELobbyComparison` - Comparison type

**Returns:** `void`

**Example:**
```typescript
// Find lobbies with at least 2 players
steam.matchmaking.addRequestLobbyListNumericalFilter(
  'playerCount', 2, ELobbyComparison.EqualToOrGreaterThan
);

// Find lobbies with skill rating within range
steam.matchmaking.addRequestLobbyListNumericalFilter(
  'skillRating', 1500, ELobbyComparison.EqualToOrGreaterThan
);
```

---

### `addRequestLobbyListNearValueFilter(key, valueToBeCloseTo)`

Sorts results by proximity to a target value.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_AddRequestLobbyListNearValueFilter()` - Add near value filter

**Parameters:**
- `key: string` - Lobby data key to filter on
- `valueToBeCloseTo: number` - Target value to sort by proximity

**Returns:** `void`

**Example:**
```typescript
// Find lobbies with skill rating closest to player's rating
const mySkillRating = 1200;
steam.matchmaking.addRequestLobbyListNearValueFilter('skillRating', mySkillRating);
```

---

### `addRequestLobbyListFilterSlotsAvailable(slotsAvailable)`

Filters lobbies by available slots.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_AddRequestLobbyListFilterSlotsAvailable()` - Add slots filter

**Parameters:**
- `slotsAvailable: number` - Minimum open slots required

**Returns:** `void`

**Example:**
```typescript
// Only find lobbies with at least 2 open slots (for party of 2)
steam.matchmaking.addRequestLobbyListFilterSlotsAvailable(2);
```

---

### `addRequestLobbyListDistanceFilter(distanceFilter)`

Filters lobbies by geographic distance.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_AddRequestLobbyListDistanceFilter()` - Add distance filter

**Parameters:**
- `distanceFilter: ELobbyDistanceFilter` - Distance preference

**Distance Filter Types:**
```typescript
enum ELobbyDistanceFilter {
  Close = 0,      // Same immediate region
  Default = 1,    // Same or nearby regions
  Far = 2,        // Same continent
  Worldwide = 3   // No distance filtering
}
```

**Returns:** `void`

**Example:**
```typescript
import { ELobbyDistanceFilter } from 'steamworks-ffi-node';

// Prefer nearby lobbies for lower latency
steam.matchmaking.addRequestLobbyListDistanceFilter(ELobbyDistanceFilter.Close);

// Search worldwide if no local lobbies found
steam.matchmaking.addRequestLobbyListDistanceFilter(ELobbyDistanceFilter.Worldwide);
```

---

### `addRequestLobbyListResultCountFilter(maxResults)`

Limits the number of lobbies returned.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_AddRequestLobbyListResultCountFilter()` - Add result count filter

**Parameters:**
- `maxResults: number` - Maximum number of lobbies to return

**Returns:** `void`

**Example:**
```typescript
// Only get top 20 lobbies
steam.matchmaking.addRequestLobbyListResultCountFilter(20);
```

---

### `addRequestLobbyListCompatibleMembersFilter(steamId)`

Filters lobbies to only return those where the specified user can join.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_AddRequestLobbyListCompatibleMembersFilter()` - Add compatible members filter

**Parameters:**
- `steamId: string` - Steam ID to check compatibility for

**Returns:** `void`

**Example:**
```typescript
// Only show lobbies my friend can also join
steam.matchmaking.addRequestLobbyListCompatibleMembersFilter(friendSteamId);
```

---

## Lobby Data

Functions for getting and setting lobby metadata.

### `getLobbyData(lobbyId, key)`

Gets a specific metadata value from a lobby.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_GetLobbyData()` - Get lobby data

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby
- `key: string` - Metadata key to retrieve

**Returns:** `string` - Value for the key, or empty string if not found

**Example:**
```typescript
const gameMode = steam.matchmaking.getLobbyData(lobbyId, 'gameMode');
const map = steam.matchmaking.getLobbyData(lobbyId, 'map');
const version = steam.matchmaking.getLobbyData(lobbyId, 'version');

console.log(`Game Mode: ${gameMode}`);
console.log(`Map: ${map}`);
console.log(`Version: ${version}`);
```

---

### `setLobbyData(lobbyId, key, value)`

Sets lobby metadata (owner only).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_SetLobbyData()` - Set lobby data

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby
- `key: string` - Metadata key to set
- `value: string` - Value to set

**Returns:** `boolean` - `true` if successfully set

**Example:**
```typescript
// Set game configuration data
steam.matchmaking.setLobbyData(lobbyId, 'gameMode', 'deathmatch');
steam.matchmaking.setLobbyData(lobbyId, 'map', 'arena');
steam.matchmaking.setLobbyData(lobbyId, 'status', 'waiting');
steam.matchmaking.setLobbyData(lobbyId, 'version', '1.0.0');

// Update status when game starts
steam.matchmaking.setLobbyData(lobbyId, 'status', 'in_game');
```

**Notes:**
- Only the lobby owner can set lobby data
- Data is automatically synced to all members
- Use for searchable metadata and game state

---

### `deleteLobbyData(lobbyId, key)`

Removes a metadata key from the lobby.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_DeleteLobbyData()` - Delete lobby data

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby
- `key: string` - Metadata key to delete

**Returns:** `boolean` - `true` if successfully deleted

**Example:**
```typescript
steam.matchmaking.deleteLobbyData(lobbyId, 'tempKey');
```

---

### `getAllLobbyData(lobbyId)`

Gets all lobby metadata as an object.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_GetLobbyDataCount()` - Get data count
- `SteamAPI_ISteamMatchmaking_GetLobbyDataByIndex()` - Get data by index

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby

**Returns:** `Record<string, string>` - All key-value pairs

**Example:**
```typescript
const allData = steam.matchmaking.getAllLobbyData(lobbyId);
console.log('Lobby Data:', allData);
// { gameMode: 'deathmatch', map: 'arena', status: 'waiting', version: '1.0.0' }

// Iterate over all data
for (const [key, value] of Object.entries(allData)) {
  console.log(`  ${key}: ${value}`);
}
```

---

### `getLobbyDataCount(lobbyId)`

Gets the number of metadata entries.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_GetLobbyDataCount()` - Get data count

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby

**Returns:** `number` - Number of metadata entries

**Example:**
```typescript
const count = steam.matchmaking.getLobbyDataCount(lobbyId);
console.log(`Lobby has ${count} metadata entries`);
```

---

## Lobby Members

Functions for managing lobby members.

### `getNumLobbyMembers(lobbyId)`

Gets the current number of members in the lobby.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_GetNumLobbyMembers()` - Get member count

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby

**Returns:** `number` - Current member count

**Example:**
```typescript
const memberCount = steam.matchmaking.getNumLobbyMembers(lobbyId);
const maxMembers = steam.matchmaking.getLobbyMemberLimit(lobbyId);
console.log(`Players: ${memberCount}/${maxMembers}`);
```

---

### `getLobbyMemberLimit(lobbyId)`

Gets the maximum member limit.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_GetLobbyMemberLimit()` - Get member limit

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby

**Returns:** `number` - Maximum member limit

---

### `setLobbyMemberLimit(lobbyId, maxMembers)`

Sets the maximum member limit (owner only).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_SetLobbyMemberLimit()` - Set member limit

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby
- `maxMembers: number` - New maximum member limit

**Returns:** `boolean` - `true` if successfully set

**Example:**
```typescript
// Expand lobby for more players
steam.matchmaking.setLobbyMemberLimit(lobbyId, 8);
```

---

### `getLobbyMemberByIndex(lobbyId, memberIndex)`

Gets a member's Steam ID by index.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_GetLobbyMemberByIndex()` - Get member by index

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby
- `memberIndex: number` - Index of the member (0-based)

**Returns:** `string` - Steam ID of the member

**Example:**
```typescript
// List all lobby members
const memberCount = steam.matchmaking.getNumLobbyMembers(lobbyId);
console.log('Lobby Members:');

for (let i = 0; i < memberCount; i++) {
  const memberId = steam.matchmaking.getLobbyMemberByIndex(lobbyId, i);
  const name = steam.friends.getFriendPersonaName(memberId);
  const isReady = steam.matchmaking.getLobbyMemberData(lobbyId, memberId, 'ready');
  console.log(`  ${i + 1}. ${name} - ${isReady === 'true' ? '✅ Ready' : '⏳ Not Ready'}`);
}
```

---

### `getLobbyOwner(lobbyId)`

Gets the lobby owner's Steam ID.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_GetLobbyOwner()` - Get owner

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby

**Returns:** `string` - Steam ID of the lobby owner

**Example:**
```typescript
const ownerId = steam.matchmaking.getLobbyOwner(lobbyId);
const ownerName = steam.friends.getFriendPersonaName(ownerId);
console.log(`Host: ${ownerName}`);

// Check if current user is the owner
const myId = steam.core.getSteamId();
const isHost = ownerId === myId;
```

---

### `setLobbyOwner(lobbyId, newOwnerId)`

Transfers lobby ownership (owner only).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_SetLobbyOwner()` - Set owner

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby
- `newOwnerId: string` - Steam ID of the new owner

**Returns:** `boolean` - `true` if successfully transferred

**Example:**
```typescript
// Transfer ownership before leaving
const memberCount = steam.matchmaking.getNumLobbyMembers(lobbyId);
if (memberCount > 1) {
  const newOwner = steam.matchmaking.getLobbyMemberByIndex(lobbyId, 1);
  steam.matchmaking.setLobbyOwner(lobbyId, newOwner);
}
```

---

### `getLobbyMemberData(lobbyId, steamIdUser, key)`

Gets a member's personal data.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_GetLobbyMemberData()` - Get member data

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby
- `steamIdUser: string` - Steam ID of the member
- `key: string` - Data key to retrieve

**Returns:** `string` - Value for the key

**Example:**
```typescript
// Check if a member is ready
const isReady = steam.matchmaking.getLobbyMemberData(lobbyId, memberId, 'ready');
const character = steam.matchmaking.getLobbyMemberData(lobbyId, memberId, 'character');

console.log(`Player ready: ${isReady === 'true'}`);
console.log(`Selected character: ${character}`);
```

---

### `setLobbyMemberData(lobbyId, key, value)`

Sets your own member data that others can read.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_SetLobbyMemberData()` - Set member data

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby
- `key: string` - Data key to set
- `value: string` - Value to set

**Returns:** `void`

**Example:**
```typescript
// Set ready status
steam.matchmaking.setLobbyMemberData(lobbyId, 'ready', 'true');

// Set character selection
steam.matchmaking.setLobbyMemberData(lobbyId, 'character', 'warrior');

// Set team preference
steam.matchmaking.setLobbyMemberData(lobbyId, 'team', 'red');
```

---

## Lobby Chat

Functions for sending and receiving messages in lobbies.

### `startChatPolling(lobbyId)`

Starts tracking chat messages for a lobby.

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby

**Returns:** `void`

**Example:**
```typescript
// Call after joining a lobby
await steam.matchmaking.joinLobby(lobbyId);
steam.matchmaking.startChatPolling(lobbyId);
```

**Notes:**
- Call this immediately after joining a lobby
- Required for receiving chat messages

---

### `stopChatPolling(lobbyId)`

Stops tracking chat messages for a lobby.

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby

**Returns:** `void`

**Example:**
```typescript
// Call before leaving a lobby
steam.matchmaking.stopChatPolling(lobbyId);
steam.matchmaking.leaveLobby(lobbyId);
```

---

### `pollChatMessages()`

Polls for new chat messages in all tracked lobbies.

**Returns:** `number` - Number of new messages found

**Example:**
```typescript
// In your game loop
function gameLoop() {
  steam.runCallbacks();
  steam.matchmaking.pollChatMessages();
  // ... other game logic
}

setInterval(gameLoop, 16); // ~60 FPS
```

---

### `onChatMessage(handler)`

Subscribes to chat message events.

**Parameters:**
- `handler: (event: LobbyChatMessageEvent) => void` - Event handler

**Returns:** `() => void` - Unsubscribe function

**Type:**
```typescript
interface LobbyChatMessageEvent {
  lobbyId: string;           // Lobby where message was sent
  senderId: string;          // Steam ID of sender
  chatId: number;            // Message index
  entryType: EChatEntryType; // Type of chat entry
  message?: string;          // Message content
}

enum EChatEntryType {
  Invalid = 0,
  ChatMsg = 1,        // Regular chat message
  Typing = 2,         // User is typing
  InviteGame = 3,     // Game invite
  Emote = 4,          // Emote
  LeftConversation = 6,
  Entered = 7,        // User entered
  WasKicked = 8,
  WasBanned = 9,
  Disconnected = 10,
  HistoricalChat = 11,
  LinkBlocked = 14
}
```

**Example:**
```typescript
// Subscribe to chat messages
const unsubscribe = steam.matchmaking.onChatMessage((event) => {
  if (event.entryType === 1) { // ChatMsg
    const senderName = steam.friends.getFriendPersonaName(event.senderId);
    console.log(`[${senderName}]: ${event.message}`);
  } else if (event.entryType === 7) { // Entered
    console.log(`Player joined the lobby`);
  }
});

// Later, stop receiving events
unsubscribe();
```

---

### `getPendingChatMessages()`

Gets and clears all queued chat messages.

**Returns:** `LobbyChatMessageEvent[]` - Array of pending messages

**Example:**
```typescript
// Alternative to event handlers
steam.matchmaking.pollChatMessages();
const messages = steam.matchmaking.getPendingChatMessages();

for (const msg of messages) {
  if (msg.message) {
    console.log(`${msg.senderId}: ${msg.message}`);
  }
}
```

---

### `sendLobbyChatMsg(lobbyId, message)`

Sends a text message to the lobby.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_SendLobbyChatMsg()` - Send chat message

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby
- `message: string` - Message text to send

**Returns:** `boolean` - `true` if sent successfully

**Example:**
```typescript
// Send a chat message
const sent = steam.matchmaking.sendLobbyChatMsg(lobbyId, 'Hello everyone!');

if (sent) {
  console.log('Message sent');
}
```

---

### `getLobbyChatEntry(lobbyId, chatId)`

Reads a specific chat message by index.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_GetLobbyChatEntry()` - Get chat entry

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby
- `chatId: number` - Chat message index

**Returns:** `LobbyChatEntry | null`

**Type:**
```typescript
interface LobbyChatEntry {
  senderId: string;       // Steam ID of sender
  message: string;        // Message text
  chatEntryType: number;  // Type of chat entry
}
```

**Notes:**
- Usually called internally by `pollChatMessages()`
- Chat IDs start at 0 and increment

---

## Lobby Management

Functions for configuring lobby settings.

### `setLobbyType(lobbyId, lobbyType)`

Changes the lobby type (owner only).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_SetLobbyType()` - Set lobby type

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby
- `lobbyType: ELobbyType` - New lobby type

**Returns:** `boolean` - `true` if successfully changed

**Example:**
```typescript
import { ELobbyType } from 'steamworks-ffi-node';

// Make lobby friends-only after enough players join
if (memberCount >= 2) {
  steam.matchmaking.setLobbyType(lobbyId, ELobbyType.FriendsOnly);
}

// Make private when game starts
steam.matchmaking.setLobbyType(lobbyId, ELobbyType.Private);
```

---

### `setLobbyJoinable(lobbyId, joinable)`

Sets whether the lobby can be joined (owner only).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_SetLobbyJoinable()` - Set joinable

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby
- `joinable: boolean` - Whether to allow new joins

**Returns:** `boolean` - `true` if successfully set

**Example:**
```typescript
// Lock the lobby when game starts
steam.matchmaking.setLobbyJoinable(lobbyId, false);
console.log('🔒 Lobby locked');

// Unlock when returning to lobby
steam.matchmaking.setLobbyJoinable(lobbyId, true);
console.log('🔓 Lobby unlocked');
```

---

## Game Server

Functions for associating dedicated servers with lobbies.

### `setLobbyGameServer(lobbyId, gameServerIP, gameServerPort, steamIdGameServer)`

Associates a game server with the lobby.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_SetLobbyGameServer()` - Set game server

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby
- `gameServerIP: number` - Server IP as 32-bit integer
- `gameServerPort: number` - Server port
- `steamIdGameServer: string` - Server's Steam ID (or "0" if none)

**Returns:** `void`

**Example:**
```typescript
// Convert IP string to integer
function ipToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

// Set game server info
const serverIP = ipToInt('192.168.1.100');
steam.matchmaking.setLobbyGameServer(lobbyId, serverIP, 27015, serverSteamId);
```

---

### `getLobbyGameServer(lobbyId)`

Gets the game server associated with a lobby.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamMatchmaking_GetLobbyGameServer()` - Get game server

**Parameters:**
- `lobbyId: string` - Steam ID of the lobby

**Returns:** `LobbyGameServer | null`

**Type:**
```typescript
interface LobbyGameServer {
  ip: number;        // Server IP as 32-bit integer
  port: number;      // Server port
  steamId: string;   // Server's Steam ID
}
```

**Example:**
```typescript
const server = steam.matchmaking.getLobbyGameServer(lobbyId);

if (server) {
  // Convert IP integer to string
  function intToIP(int: number): string {
    return [
      (int >> 24) & 255,
      (int >> 16) & 255,
      (int >> 8) & 255,
      int & 255
    ].join('.');
  }
  
  console.log(`Server: ${intToIP(server.ip)}:${server.port}`);
  console.log(`Steam ID: ${server.steamId}`);
}
```

---

## Complete Example

### Host (Server)

```typescript
import SteamworksSDK, { ELobbyType } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

let lobbyId: string | null = null;

async function createLobby() {
  const result = await steam.matchmaking.createLobby(ELobbyType.Public, 4);
  
  if (result.success) {
    lobbyId = result.lobbyId!;
    console.log(`✅ Lobby created: ${lobbyId}`);
    
    // Set lobby metadata
    steam.matchmaking.setLobbyData(lobbyId, 'gameMode', 'coop');
    steam.matchmaking.setLobbyData(lobbyId, 'map', 'forest');
    steam.matchmaking.setLobbyData(lobbyId, 'version', '1.0.0');
    steam.matchmaking.setLobbyData(lobbyId, 'status', 'waiting');
    
    // Start chat polling
    steam.matchmaking.startChatPolling(lobbyId);
    
    // Subscribe to chat
    steam.matchmaking.onChatMessage((event) => {
      if (event.message) {
        const name = steam.friends.getFriendPersonaName(event.senderId);
        console.log(`[${name}]: ${event.message}`);
      }
    });
    
    // Set host as ready
    steam.matchmaking.setLobbyMemberData(lobbyId, 'ready', 'true');
    
    return lobbyId;
  }
  return null;
}

// Game loop
function gameLoop() {
  steam.runCallbacks();
  steam.matchmaking.pollChatMessages();
  
  if (lobbyId) {
    const members = steam.matchmaking.getNumLobbyMembers(lobbyId);
    console.log(`Players: ${members}/4`);
  }
}

// Main
createLobby().then(() => {
  setInterval(gameLoop, 1000);
});

// Cleanup
process.on('SIGINT', () => {
  if (lobbyId) {
    steam.matchmaking.stopChatPolling(lobbyId);
    steam.matchmaking.leaveLobby(lobbyId);
  }
  steam.shutdown();
  process.exit(0);
});
```

### Client (Joiner)

```typescript
import SteamworksSDK, { ELobbyComparison, ELobbyDistanceFilter } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

let currentLobby: string | null = null;

async function findAndJoinLobby() {
  // Set search filters
  steam.matchmaking.addRequestLobbyListStringFilter(
    'gameMode', 'coop', ELobbyComparison.Equal
  );
  steam.matchmaking.addRequestLobbyListDistanceFilter(ELobbyDistanceFilter.Default);
  steam.matchmaking.addRequestLobbyListResultCountFilter(10);
  
  // Search
  const result = await steam.matchmaking.requestLobbyList();
  
  if (!result.success || result.lobbies.length === 0) {
    console.log('No lobbies found');
    return null;
  }
  
  console.log(`Found ${result.lobbies.length} lobbies`);
  
  // Display lobbies
  for (const lobbyId of result.lobbies) {
    const members = steam.matchmaking.getNumLobbyMembers(lobbyId);
    const max = steam.matchmaking.getLobbyMemberLimit(lobbyId);
    const map = steam.matchmaking.getLobbyData(lobbyId, 'map');
    console.log(`  ${lobbyId}: ${members}/${max} - ${map}`);
  }
  
  // Join first lobby
  const joinResult = await steam.matchmaking.joinLobby(result.lobbies[0]);
  
  if (joinResult.success) {
    currentLobby = joinResult.lobbyId!;
    console.log(`✅ Joined lobby: ${currentLobby}`);
    
    // Start chat
    steam.matchmaking.startChatPolling(currentLobby);
    steam.matchmaking.onChatMessage((event) => {
      if (event.message) {
        const name = steam.friends.getFriendPersonaName(event.senderId);
        console.log(`[${name}]: ${event.message}`);
      }
    });
    
    // Set ready
    steam.matchmaking.setLobbyMemberData(currentLobby, 'ready', 'true');
    
    // Say hello
    steam.matchmaking.sendLobbyChatMsg(currentLobby, 'Hello!');
    
    return currentLobby;
  }
  
  return null;
}

// Game loop
function gameLoop() {
  steam.runCallbacks();
  steam.matchmaking.pollChatMessages();
}

// Main
findAndJoinLobby().then(() => {
  setInterval(gameLoop, 100);
});

// Cleanup
process.on('SIGINT', () => {
  if (currentLobby) {
    steam.matchmaking.stopChatPolling(currentLobby);
    steam.matchmaking.leaveLobby(currentLobby);
  }
  steam.shutdown();
  process.exit(0);
});
```

---

## Testing

Run the matchmaking tests using two Steam accounts:

**Terminal 1 (Host):**
```bash
# TypeScript
npm run test:matchmaking:host:ts

# JavaScript
npm run test:matchmaking:host:js
```

**Terminal 2 (Client):**
```bash
# TypeScript
npm run test:matchmaking:join:ts

# JavaScript
npm run test:matchmaking:join:js
```

**Direct join with lobby ID:**
```bash
npx ts-node tests/ts/test-matchmaking-join.ts <lobbyId>
```

---

## Best Practices

1. **Always set metadata** - Set searchable data immediately after creating a lobby
2. **Use version filtering** - Filter by game version to prevent incompatible matches
3. **Limit search results** - Use `addRequestLobbyListResultCountFilter()` to cap results
4. **Poll callbacks regularly** - Call `runCallbacks()` and `pollChatMessages()` frequently
5. **Clean up properly** - Stop chat polling and leave lobbies before shutdown
6. **Handle all join responses** - Check `EChatRoomEnterResponse` for specific errors

---

## Error Handling

| Response Code | Value | Meaning | Solution |
|---------------|-------|---------|----------|
| Success | 1 | Joined successfully | - |
| DoesntExist | 2 | Lobby no longer exists | Refresh lobby list |
| NotAllowed | 3 | Permission denied | Check lobby type |
| Full | 4 | Lobby is full | Find another lobby |
| Error | 5 | Unexpected error | Retry |
| Banned | 6 | User is banned | Cannot join |
| Limited | 7 | Limited account | Full Steam account required |
| RateLimited | 12 | Too many requests | Wait and retry |

---

## Related Documentation

- [Friends Manager](./FRIENDS_MANAGER.md) - For inviting friends
- [Overlay Manager](./OVERLAY_MANAGER.md) - For invite dialogs
- [Networking Sockets Manager](./NETWORKING_SOCKETS_MANAGER.md) - For P2P connections after matchmaking
- [Networking Utils Manager](./NETWORKING_UTILS_MANAGER.md) - For ping estimation
