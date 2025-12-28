# Matchmaking Manager API

The Matchmaking Manager provides comprehensive access to Steam's ISteamMatchmaking interface, enabling multiplayer lobby functionality for peer-to-peer matchmaking.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Lobby Types](#lobby-types)
- [API Reference](#api-reference)
  - [Lobby Creation](#lobby-creation)
  - [Lobby Joining](#lobby-joining)
  - [Lobby Searching](#lobby-searching)
  - [Lobby Data](#lobby-data)
  - [Lobby Members](#lobby-members)
  - [Lobby Chat](#lobby-chat)
  - [Lobby Management](#lobby-management)
  - [Game Server](#game-server)
- [Testing](#testing)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The Matchmaking Manager allows you to:

- **Create lobbies** - Host multiplayer sessions with configurable privacy settings
- **Search for lobbies** - Find and filter lobbies based on metadata
- **Join lobbies** - Connect to existing lobbies
- **Manage lobby data** - Store and retrieve key-value metadata
- **Handle lobby chat** - Send and receive messages between members
- **Configure game servers** - Associate dedicated servers with lobbies

## Quick Start

### Creating a Lobby (Host)

```typescript
import { SteamworksSDK, ELobbyType } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Create a public lobby for 4 players
const result = await steam.matchmaking.createLobby(ELobbyType.Public, 4);

if (result.success) {
  const lobbyId = result.lobbyId!;
  console.log(`Lobby created: ${lobbyId}`);
  
  // Set searchable metadata
  steam.matchmaking.setLobbyData(lobbyId, 'gameMode', 'deathmatch');
  steam.matchmaking.setLobbyData(lobbyId, 'map', 'arena');
}
```

### Searching and Joining (Client)

```typescript
import { SteamworksSDK, ELobbyComparison } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Add search filters
steam.matchmaking.addRequestLobbyListStringFilter(
  'gameMode', 
  'deathmatch', 
  ELobbyComparison.Equal
);
steam.matchmaking.addRequestLobbyListResultCountFilter(20);

// Search for lobbies
const result = await steam.matchmaking.requestLobbyList();

if (result.success && result.lobbies.length > 0) {
  // Join the first lobby
  const joinResult = await steam.matchmaking.joinLobby(result.lobbies[0]);
  
  if (joinResult.success) {
    console.log('Joined lobby successfully!');
  }
}
```

## Lobby Types

| Type | Value | Description |
|------|-------|-------------|
| `Private` | 0 | Only joinable via invite |
| `FriendsOnly` | 1 | Joinable by friends of members |
| `Public` | 2 | Visible in search, anyone can join |
| `Invisible` | 3 | Returned by search, but not visible in friend list |
| `PrivateUnique` | 4 | Private lobby with unique key |

```typescript
import { ELobbyType } from 'steamworks-ffi-node';

// Create different lobby types
await steam.matchmaking.createLobby(ELobbyType.Public, 8);
await steam.matchmaking.createLobby(ELobbyType.FriendsOnly, 4);
await steam.matchmaking.createLobby(ELobbyType.Private, 2);
```

## API Reference

### Lobby Creation

#### `createLobby(lobbyType: ELobbyType, maxMembers: number): Promise<LobbyCreateResult>`

Creates a new lobby asynchronously.

```typescript
const result = await steam.matchmaking.createLobby(ELobbyType.Public, 4);

if (result.success) {
  console.log(`Lobby ID: ${result.lobbyId}`);
} else {
  console.error(`Failed: ${result.error}`);
}
```

**Returns:**
- `success: boolean` - Whether creation succeeded
- `lobbyId?: string` - Steam ID of the created lobby
- `error?: string` - Error message if failed

### Lobby Joining

#### `joinLobby(lobbyId: LobbyId): Promise<LobbyJoinResult>`

Joins an existing lobby asynchronously.

```typescript
const result = await steam.matchmaking.joinLobby(lobbyId);

if (result.success) {
  console.log(`Joined lobby: ${result.lobbyId}`);
  console.log(`Locked: ${result.locked}`);
} else {
  console.error(`Failed: ${result.error}`);
  console.error(`Response: ${result.response}`);
}
```

**Returns:**
- `success: boolean` - Whether join succeeded
- `lobbyId?: string` - Steam ID of the joined lobby
- `response: EChatRoomEnterResponse` - Detailed response code
- `locked: boolean` - Whether the lobby is locked
- `error?: string` - Error message if failed

#### `leaveLobby(lobbyId: LobbyId): void`

Leaves a lobby you are currently in.

```typescript
steam.matchmaking.leaveLobby(lobbyId);
```

#### `inviteUserToLobby(lobbyId: LobbyId, steamIdInvitee: string): boolean`

Invites a user to the lobby via Steam.

```typescript
const invited = steam.matchmaking.inviteUserToLobby(lobbyId, friendSteamId);
```

### Lobby Searching

#### `requestLobbyList(): Promise<LobbyListResult>`

Searches for lobbies matching previously set filters.

```typescript
// Set filters before searching
steam.matchmaking.addRequestLobbyListStringFilter('gameMode', 'coop', ELobbyComparison.Equal);
steam.matchmaking.addRequestLobbyListResultCountFilter(20);

const result = await steam.matchmaking.requestLobbyList();

if (result.success) {
  console.log(`Found ${result.lobbies.length} lobbies`);
  for (const lobbyId of result.lobbies) {
    const members = steam.matchmaking.getNumLobbyMembers(lobbyId);
    const maxMembers = steam.matchmaking.getLobbyMemberLimit(lobbyId);
    console.log(`Lobby ${lobbyId}: ${members}/${maxMembers}`);
  }
}
```

#### Filter Methods

**String Filter:**
```typescript
steam.matchmaking.addRequestLobbyListStringFilter(
  key: string,
  value: string,
  comparison: ELobbyComparison
);
```

**Numerical Filter:**
```typescript
steam.matchmaking.addRequestLobbyListNumericalFilter(
  key: string,
  value: number,
  comparison: ELobbyComparison
);
```

**Near Value Filter:**
```typescript
steam.matchmaking.addRequestLobbyListNearValueFilter(
  key: string,
  valueToBeCloseTo: number
);
```

**Slots Available Filter:**
```typescript
steam.matchmaking.addRequestLobbyListFilterSlotsAvailable(
  slotsAvailable: number
);
```

**Distance Filter:**
```typescript
import { ELobbyDistanceFilter } from 'steamworks-ffi-node';

steam.matchmaking.addRequestLobbyListDistanceFilter(
  ELobbyDistanceFilter.Default
);
```

**Result Count Filter:**
```typescript
steam.matchmaking.addRequestLobbyListResultCountFilter(maxResults: number);
```

**Compatible Members Filter:**
```typescript
steam.matchmaking.addRequestLobbyListCompatibleMembersFilter(steamId: string);
```

### Lobby Data

Lobby data is key-value metadata stored on the lobby. All members can read it, but only the owner can modify it.

#### `getLobbyData(lobbyId: LobbyId, key: string): string`

Gets a specific metadata value.

```typescript
const gameMode = steam.matchmaking.getLobbyData(lobbyId, 'gameMode');
const map = steam.matchmaking.getLobbyData(lobbyId, 'map');
```

#### `setLobbyData(lobbyId: LobbyId, key: string, value: string): boolean`

Sets lobby metadata (owner only).

```typescript
steam.matchmaking.setLobbyData(lobbyId, 'gameMode', 'deathmatch');
steam.matchmaking.setLobbyData(lobbyId, 'map', 'arena');
steam.matchmaking.setLobbyData(lobbyId, 'status', 'waiting');
```

#### `deleteLobbyData(lobbyId: LobbyId, key: string): boolean`

Removes a metadata key.

```typescript
steam.matchmaking.deleteLobbyData(lobbyId, 'tempKey');
```

#### `getAllLobbyData(lobbyId: LobbyId): Record<string, string>`

Gets all lobby metadata as an object.

```typescript
const allData = steam.matchmaking.getAllLobbyData(lobbyId);
console.log(allData);
// { gameMode: 'deathmatch', map: 'arena', status: 'waiting' }
```

#### `getLobbyDataCount(lobbyId: LobbyId): number`

Gets the number of metadata entries.

```typescript
const count = steam.matchmaking.getLobbyDataCount(lobbyId);
```

### Lobby Members

#### `getNumLobbyMembers(lobbyId: LobbyId): number`

Gets the current number of members in the lobby.

```typescript
const memberCount = steam.matchmaking.getNumLobbyMembers(lobbyId);
```

#### `getLobbyMemberLimit(lobbyId: LobbyId): number`

Gets the maximum member limit.

```typescript
const maxMembers = steam.matchmaking.getLobbyMemberLimit(lobbyId);
```

#### `setLobbyMemberLimit(lobbyId: LobbyId, maxMembers: number): boolean`

Sets the maximum member limit (owner only).

```typescript
steam.matchmaking.setLobbyMemberLimit(lobbyId, 8);
```

#### `getLobbyMemberByIndex(lobbyId: LobbyId, memberIndex: number): string`

Gets a member's Steam ID by index.

```typescript
const memberCount = steam.matchmaking.getNumLobbyMembers(lobbyId);
for (let i = 0; i < memberCount; i++) {
  const memberId = steam.matchmaking.getLobbyMemberByIndex(lobbyId, i);
  console.log(`Member ${i}: ${memberId}`);
}
```

#### `getLobbyOwner(lobbyId: LobbyId): string`

Gets the lobby owner's Steam ID.

```typescript
const ownerId = steam.matchmaking.getLobbyOwner(lobbyId);
```

#### `setLobbyOwner(lobbyId: LobbyId, newOwnerId: string): boolean`

Transfers lobby ownership (owner only).

```typescript
steam.matchmaking.setLobbyOwner(lobbyId, newOwnerId);
```

#### Member Data

Members can store their own metadata that other members can read.

```typescript
// Set your own member data
steam.matchmaking.setLobbyMemberData(lobbyId, 'ready', 'true');
steam.matchmaking.setLobbyMemberData(lobbyId, 'character', 'warrior');

// Read another member's data
const isReady = steam.matchmaking.getLobbyMemberData(lobbyId, memberId, 'ready');
```

### Lobby Chat

#### `sendLobbyChatMsg(lobbyId: LobbyId, message: string): boolean`

Sends a text message to the lobby.

```typescript
const sent = steam.matchmaking.sendLobbyChatMsg(lobbyId, 'Hello everyone!');
```

#### `getLobbyChatEntry(lobbyId: LobbyId, chatId: number): LobbyChatEntry | null`

Reads a chat message by ID.

```typescript
const entry = steam.matchmaking.getLobbyChatEntry(lobbyId, chatId);
if (entry) {
  console.log(`[${entry.senderId}]: ${entry.message}`);
}
```

**Returns:**
- `senderId: string` - Steam ID of the sender
- `message: string` - Message text
- `chatEntryType: number` - Type of chat entry

### Lobby Management

#### `setLobbyType(lobbyId: LobbyId, lobbyType: ELobbyType): boolean`

Changes the lobby type (owner only).

```typescript
steam.matchmaking.setLobbyType(lobbyId, ELobbyType.FriendsOnly);
```

#### `setLobbyJoinable(lobbyId: LobbyId, joinable: boolean): boolean`

Sets whether the lobby can be joined (owner only).

```typescript
// Lock the lobby
steam.matchmaking.setLobbyJoinable(lobbyId, false);

// Unlock the lobby
steam.matchmaking.setLobbyJoinable(lobbyId, true);
```

### Game Server

Associate a dedicated game server with the lobby.

#### `setLobbyGameServer(lobbyId: LobbyId, gameServerIP: number, gameServerPort: number, steamIdGameServer: string): void`

```typescript
// IP as 32-bit integer (192.168.1.1 = 3232235777)
steam.matchmaking.setLobbyGameServer(lobbyId, 3232235777, 27015, serverSteamId);
```

#### `getLobbyGameServer(lobbyId: LobbyId): LobbyGameServer | null`

```typescript
const server = steam.matchmaking.getLobbyGameServer(lobbyId);
if (server) {
  console.log(`Server: ${server.ip}:${server.port}`);
  console.log(`Steam ID: ${server.steamId}`);
}
```

## Testing

The matchmaking system requires at least two Steam accounts to test fully.

### Test Setup

1. **Machine 1 (Host):** Run the host test script
2. **Machine 2 (Join):** Run the join test script with a different Steam account

### Running Tests

**Host (first machine):**
```bash
npm run test:matchmaking:host:ts
```

**Join (second machine):**
```bash
npm run test:matchmaking:join:ts
```

**Direct join with lobby ID:**
```bash
npx ts-node tests/ts/test-matchmaking-join.ts <lobbyId>
```

### Testing Options

- **Two physical machines** - Easiest, each logged into different Steam accounts
- **Virtual machine** - Run one instance in a VM with different Steam account
- **Same machine, different accounts** - Launch Steam with `-login` argument for second instance

## Best Practices

### Lobby Creation

1. **Always set metadata** - Help players find your lobbies with descriptive data
2. **Use appropriate lobby types** - Public for matchmaking, Friends-only for social play
3. **Set reasonable limits** - Match your game's actual player count

```typescript
const result = await steam.matchmaking.createLobby(ELobbyType.Public, maxPlayers);
if (result.success) {
  steam.matchmaking.setLobbyData(result.lobbyId!, 'version', gameVersion);
  steam.matchmaking.setLobbyData(result.lobbyId!, 'gameMode', selectedMode);
  steam.matchmaking.setLobbyData(result.lobbyId!, 'region', playerRegion);
}
```

### Lobby Searching

1. **Use filters** - Don't request all lobbies; filter by game mode, version, etc.
2. **Limit results** - Use `addRequestLobbyListResultCountFilter()` to cap results
3. **Handle empty results** - Provide feedback when no lobbies are found

```typescript
// Filter by game version to avoid incompatible matches
steam.matchmaking.addRequestLobbyListStringFilter('version', '1.0.0', ELobbyComparison.Equal);
steam.matchmaking.addRequestLobbyListResultCountFilter(20);
```

### Member Management

1. **Track member changes** - Poll `getNumLobbyMembers()` regularly
2. **Use member data** - Store player-specific info like ready status
3. **Handle host migration** - Owner can change if original owner leaves

### Resource Cleanup

Always leave lobbies when done:

```typescript
// On game exit or returning to menu
steam.matchmaking.leaveLobby(lobbyId);
```

## Troubleshooting

### Common Issues

**Lobby creation fails:**
- Ensure Steam API is initialized
- Check that you're logged into Steam
- Verify the app ID is correct

**Can't find lobbies:**
- Lobbies are app-specific; both clients need the same app ID
- Check that filters match the lobby's data
- Lobbies may have expired (default ~5 minutes of inactivity)

**Can't join lobby:**
- Lobby may be full (`EChatRoomEnterResponse.Full`)
- Lobby may be locked (`setLobbyJoinable(false)`)
- You may be banned (`EChatRoomEnterResponse.Banned`)

**Chat messages not received:**
- Must call `steam.runCallbacks()` in your game loop
- Chat entry IDs increment; track the last received ID

### Error Codes

`EChatRoomEnterResponse` values:
| Value | Meaning |
|-------|---------|
| 1 | Success |
| 2 | Lobby doesn't exist |
| 3 | Not allowed (permissions) |
| 4 | Lobby is full |
| 5 | Unexpected error |
| 6 | User is banned |
| 7 | Limited user account |
| 8 | Clan disabled |
| 9 | Community ban |
| 10 | Member blocked you |
| 11 | You blocked member |
| 12 | Rate limited |

## See Also

- [Steam Matchmaking Documentation](https://partner.steamgames.com/doc/api/ISteamMatchmaking)
- [Friends Manager](./FRIENDS_MANAGER.md) - For inviting friends
- [Overlay Manager](./OVERLAY_MANAGER.md) - For invite dialogs
