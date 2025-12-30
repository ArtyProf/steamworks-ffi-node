# Networking Sockets Manager API Documentation

Complete reference for Steam Networking Sockets functionality in Steamworks FFI.

## Overview

The `SteamNetworkingSocketsManager` provides access to the ISteamNetworkingSockets API, enabling peer-to-peer (P2P) connections between Steam users using Steam's relay network. This is the primary interface for implementing multiplayer networking in your game.

This manager is useful for:
1. **P2P Connections**: Connect directly to other Steam users using their Steam ID
2. **Reliable Messaging**: Send messages with configurable reliability and ordering
3. **Connection Management**: Accept, close, and monitor connection states
4. **Poll Groups**: Efficiently receive messages from multiple connections
5. **Event Callbacks**: React to connection state changes in real-time

## Quick Reference

| Category | Functions | Description |
|----------|-----------|-------------|
| [P2P Listen Sockets](#p2p-listen-sockets) | 3 | Create, close, and list listen sockets |
| [P2P Connections](#p2p-connections) | 6 | Connect, accept, close, and track connections |
| [Messaging](#messaging) | 5 | Send (reliable/unreliable) and receive messages |
| [Connection Info](#connection-info) | 7 | Query state, status, names, and user data |
| [Poll Groups](#poll-groups) | 4 | Manage multiple connections efficiently |
| [Identity & Auth](#identity--auth) | 3 | Get identity, init and check authentication |
| [Callbacks](#callbacks) | 5 | Handle events and run callback loop |
| [Cleanup](#cleanup) | 1 | Close all resources |

**Total: 34 Functions**

---

## Connection States

Understanding connection states is crucial for P2P networking:

```typescript
enum ESteamNetworkingConnectionState {
  None = 0,                    // Not connected
  Connecting = 1,              // Attempting to connect
  FindingRoute = 2,            // Finding optimal route
  Connected = 3,               // Fully connected
  ClosedByPeer = 4,           // Remote peer closed
  ProblemDetectedLocally = 5  // Local error occurred
}
```

---

## P2P Listen Sockets

Functions for creating and managing P2P listen sockets.

### `createListenSocketP2P(virtualPort)`

Creates a P2P listen socket to accept incoming connections from other Steam users.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_CreateListenSocketP2P()` - Create P2P listen socket

**Parameters:**
- `virtualPort: number` - Virtual port number (0-based, default: 0)

**Returns:** `HSteamListenSocket` - Listen socket handle, or `k_HSteamListenSocket_Invalid` if failed

**Example:**
```typescript
import SteamworksSDK, { k_HSteamListenSocket_Invalid } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Create a P2P listen socket on virtual port 0
const listenSocket = steam.networkingSockets.createListenSocketP2P(0);
if (listenSocket !== k_HSteamListenSocket_Invalid) {
  console.log(`✅ Listening on socket: ${listenSocket}`);
  console.log(`Your Steam ID: ${steam.getStatus().steamId}`);
  console.log('Share this ID with other players to connect!');
}
```

---

### `closeListenSocket(listenSocket)`

Closes a P2P listen socket.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_CloseListenSocket()` - Close listen socket

**Parameters:**
- `listenSocket: HSteamListenSocket` - Listen socket handle

**Returns:** `boolean` - `true` if closed successfully

**Example:**
```typescript
const success = steam.networkingSockets.closeListenSocket(listenSocket);
if (success) {
  console.log('✅ Listen socket closed');
}
```

---

### `getActiveListenSockets()`

Gets all currently active listen sockets.

**Steamworks SDK Functions:**
- Internal tracking - No direct SDK call (managed by wrapper)

**Returns:** `HSteamListenSocket[]` - Array of active listen socket handles

**Example:**
```typescript
const sockets = steam.networkingSockets.getActiveListenSockets();
console.log(`Active listen sockets: ${sockets.length}`);
```

---

## P2P Connections

Functions for establishing and managing P2P connections.

### `connectP2P(remoteSteamId, virtualPort)`

Connects to another Steam user via P2P.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_ConnectP2P()` - Initiate P2P connection

**Parameters:**
- `remoteSteamId: string | bigint` - Steam ID of the user to connect to
- `virtualPort: number` - Virtual port number (must match host's listen port, default: 0)

**Returns:** `HSteamNetConnection` - Connection handle, or `k_HSteamNetConnection_Invalid` if failed

**Example:**
```typescript
import { k_HSteamNetConnection_Invalid, ESteamNetworkingConnectionState } from 'steamworks-ffi-node';

const hostSteamId = '76561198012345678';
const connection = steam.networkingSockets.connectP2P(hostSteamId, 0);

if (connection !== k_HSteamNetConnection_Invalid) {
  console.log(`✅ Connecting to ${hostSteamId}...`);
}
```

---

### `acceptConnection(connection)`

Accepts an incoming connection request.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_AcceptConnection()` - Accept incoming connection

**Parameters:**
- `connection: HSteamNetConnection` - Connection handle from connection request callback

**Returns:** `EResult` - Result code (`EResult.OK` on success)

**Example:**
```typescript
steam.networkingSockets.onConnectionStateChange((change) => {
  if (change.newState === ESteamNetworkingConnectionState.Connecting) {
    // Incoming connection - accept it
    const result = steam.networkingSockets.acceptConnection(change.connection);
    if (result === EResult.OK) {
      console.log('✅ Connection accepted');
    }
  }
});
```

---

### `closeConnection(connection, reason, debug, enableLinger)`

Closes a connection with an optional reason.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_CloseConnection()` - Close connection

**Parameters:**
- `connection: HSteamNetConnection` - Connection handle to close
- `reason: number` - Application-defined reason code (0 for normal)
- `debug: string` - Debug string (may be transmitted to remote)
- `enableLinger: boolean` - If true, waits for reliable messages to be delivered (default: false)

**Returns:** `boolean` - `true` if closed successfully

**Example:**
```typescript
// Normal close
steam.networkingSockets.closeConnection(connection, 0, 'Game ended', false);

// Close with linger to ensure all messages delivered
steam.networkingSockets.closeConnection(connection, 0, 'Disconnect', true);
```

---

### `getActiveConnections()`

Gets all currently active connections.

**Steamworks SDK Functions:**
- Internal tracking - No direct SDK call (managed by wrapper)

**Returns:** `HSteamNetConnection[]` - Array of active connection handles

**Example:**
```typescript
const connections = steam.networkingSockets.getActiveConnections();
console.log(`Active connections: ${connections.length}`);
for (const conn of connections) {
  const info = steam.networkingSockets.getConnectionInfo(conn);
  console.log(`  - ${info?.identityRemote}: ${info?.stateName}`);
}
```

---

### `isConnectionActive(connection)`

Checks if a connection is currently tracked as active.

**Steamworks SDK Functions:**
- Internal tracking - No direct SDK call (managed by wrapper)

**Parameters:**
- `connection: HSteamNetConnection` - Connection handle to check

**Returns:** `boolean` - `true` if the connection is active

**Example:**
```typescript
if (steam.networkingSockets.isConnectionActive(connection)) {
  // Safe to send messages
  steam.networkingSockets.sendReliable(connection, 'Hello!');
}
```

---

## Messaging

Functions for sending and receiving messages.

### `sendMessage(connection, data, flags)`

Sends a message to a connected peer with custom flags.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_SendMessageToConnection()` - Send message with flags

**Parameters:**
- `connection: HSteamNetConnection` - Connection handle
- `data: Buffer | string` - Message data to send
- `flags: number` - Send flags (see below)

**Send Flags:**
```typescript
const k_nSteamNetworkingSend_Unreliable = 0;      // May be dropped, fastest
const k_nSteamNetworkingSend_NoNagle = 1;         // Send immediately
const k_nSteamNetworkingSend_NoDelay = 4;         // Bypass queue
const k_nSteamNetworkingSend_Reliable = 8;        // Guaranteed delivery
const k_nSteamNetworkingSend_UseCurrentThread = 16;
```

**Returns:** `SendMessageResult`
```typescript
interface SendMessageResult {
  success: boolean;
  result: EResult;
  messageNumber: bigint;
}
```

**Example:**
```typescript
// Send with custom flags (reliable + no delay)
const result = steam.networkingSockets.sendMessage(
  connection,
  JSON.stringify({ type: 'critical', data: '...' }),
  8 | 4  // Reliable | NoDelay
);
```

---

### `sendReliable(connection, data)`

Convenience method to send a reliable message (guaranteed delivery, ordered).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_SendMessageToConnection()` - Send with reliable flag

**Parameters:**
- `connection: HSteamNetConnection` - Connection handle
- `data: Buffer | string` - Message data to send

**Returns:** `SendMessageResult`

**Example:**
```typescript
// Send reliable message - guaranteed delivery
const result = steam.networkingSockets.sendReliable(connection, JSON.stringify({
  type: 'chat',
  message: 'Hello!'
}));

if (result.success) {
  console.log(`Message sent, number: ${result.messageNumber}`);
}
```

---

### `sendUnreliable(connection, data)`

Convenience method to send an unreliable message (fastest, may be dropped).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_SendMessageToConnection()` - Send with unreliable flag

**Parameters:**
- `connection: HSteamNetConnection` - Connection handle
- `data: Buffer | string` - Message data to send

**Returns:** `SendMessageResult`

**Example:**
```typescript
// Send unreliable message - fastest, for position updates
steam.networkingSockets.sendUnreliable(connection, JSON.stringify({
  type: 'position',
  x: player.x,
  y: player.y,
  timestamp: Date.now()
}));
```

---

### `flushMessages(connection)`

Flushes any pending outgoing messages immediately.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_FlushMessagesOnConnection()` - Flush pending messages

**Parameters:**
- `connection: HSteamNetConnection` - Connection handle

**Returns:** `EResult` - Result code

**Example:**
```typescript
// Send critical message and flush immediately
steam.networkingSockets.sendReliable(connection, criticalData);
steam.networkingSockets.flushMessages(connection);
```

---

### `receiveMessages(connection, maxMessages)`

Receives pending messages from a specific connection.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_ReceiveMessagesOnConnection()` - Receive messages

**Parameters:**
- `connection: HSteamNetConnection` - Connection handle
- `maxMessages: number` - Maximum messages to retrieve (default: 16)

**Returns:** `NetworkMessage[]`

**Type:**
```typescript
interface NetworkMessage {
  data: Buffer;             // Message payload
  size: number;             // Size in bytes
  connection: HSteamNetConnection;  // Connection it came from
  identity: string;         // Sender's Steam ID
  channel: number;          // Lane/channel number
  flags: number;            // Message flags
  messageNumber: bigint;    // Sequence number
}
```

**Example:**
```typescript
// Receive loop
const messages = steam.networkingSockets.receiveMessages(connection, 50);

for (const msg of messages) {
  const text = msg.data.toString('utf8');
  console.log(`📨 Received from ${msg.identity}: ${text}`);
  
  try {
    const data = JSON.parse(text);
    handleGameMessage(data);
  } catch {
    handleTextMessage(text);
  }
}
```

---

## Connection Info

Functions for querying connection state and status.

### `getConnectionInfo(connection)`

Gets information about a connection's current state.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_GetConnectionInfo()` - Get connection info

**Parameters:**
- `connection: HSteamNetConnection` - Connection handle

**Returns:** `ConnectionInfo | null`

**Type:**
```typescript
interface ConnectionInfo {
  identityRemote: string;              // Remote peer's Steam ID
  userData: bigint;                    // Application user data
  listenSocket: HSteamListenSocket;    // Listen socket (if incoming)
  remoteAddress: string;               // Remote address
  popIdRemote: number;                 // Remote POP ID
  popIdRelay: number;                  // Relay POP ID
  state: ESteamNetworkingConnectionState;
  stateName: string;                   // Human-readable state
  endReason: number;                   // Close reason code
  endDebugMessage: string;             // Close reason message
  connectionDescription: string;       // Debug description
}
```

**Example:**
```typescript
const info = steam.networkingSockets.getConnectionInfo(connection);
if (info) {
  console.log(`Remote peer: ${info.identityRemote}`);
  console.log(`State: ${info.stateName} (${info.state})`);
  
  if (info.state === ESteamNetworkingConnectionState.ClosedByPeer) {
    console.log(`Closed: ${info.endDebugMessage}`);
  }
}
```

---

### `getConnectionRealTimeStatus(connection)`

Gets real-time connection status including quality metrics.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_GetConnectionRealTimeStatus()` - Get real-time status

**Parameters:**
- `connection: HSteamNetConnection` - Connection handle

**Returns:** `ConnectionRealTimeStatus | null`

**Type:**
```typescript
interface ConnectionRealTimeStatus {
  state: ESteamNetworkingConnectionState;
  ping: number;                        // Round-trip time in ms
  connectionQualityLocal: number;      // 0-1 quality estimate
  connectionQualityRemote: number;     // 0-1 quality estimate
  outPacketsPerSec: number;
  outBytesPerSec: number;
  inPacketsPerSec: number;
  inBytesPerSec: number;
  sendRateBytesPerSecond: number;
  pendingUnreliable: number;           // Unreliable bytes queued
  pendingReliable: number;             // Reliable bytes queued
  sentUnackedReliable: number;         // Sent but unacked bytes
  queueTime: bigint;                   // Microseconds in queue
}
```

**Example:**
```typescript
const status = steam.networkingSockets.getConnectionRealTimeStatus(connection);
if (status) {
  console.log(`Ping: ${status.ping}ms`);
  console.log(`Quality: ${(status.connectionQualityLocal * 100).toFixed(1)}%`);
  console.log(`In: ${status.inBytesPerSec} B/s, Out: ${status.outBytesPerSec} B/s`);
}
```

---

### `getDetailedConnectionStatus(connection)`

Gets detailed connection status as a human-readable string.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_GetDetailedConnectionStatus()` - Get detailed status

**Parameters:**
- `connection: HSteamNetConnection` - Connection handle

**Returns:** `string` - Detailed status text

**Example:**
```typescript
const details = steam.networkingSockets.getDetailedConnectionStatus(connection);
console.log('Connection Details:');
console.log(details);
// Shows ping, packet loss, bandwidth, route info, etc.
```

---

### `setConnectionUserData(connection, userData)`

Sets application-specific data on a connection.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_SetConnectionUserData()` - Set user data

**Parameters:**
- `connection: HSteamNetConnection` - Connection handle
- `userData: bigint` - Application-defined data

**Returns:** `boolean` - `true` if set successfully

**Example:**
```typescript
// Store player ID with connection
const playerId = BigInt(12345);
steam.networkingSockets.setConnectionUserData(connection, playerId);
```

---

### `getConnectionUserData(connection)`

Gets application-specific data from a connection.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_GetConnectionUserData()` - Get user data

**Parameters:**
- `connection: HSteamNetConnection` - Connection handle

**Returns:** `bigint` - User data value, or -1n if invalid

**Example:**
```typescript
const playerId = steam.networkingSockets.getConnectionUserData(connection);
if (playerId !== BigInt(-1)) {
  console.log(`Player ID: ${playerId}`);
}
```

---

### `setConnectionName(connection, name)`

Sets a debug name for a connection (useful for logging).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_SetConnectionName()` - Set connection name

**Parameters:**
- `connection: HSteamNetConnection` - Connection handle
- `name: string` - Debug name

**Example:**
```typescript
steam.networkingSockets.setConnectionName(connection, 'Player1-GameSession');
```

---

### `getConnectionName(connection)`

Gets the debug name for a connection.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_GetConnectionName()` - Get connection name

**Parameters:**
- `connection: HSteamNetConnection` - Connection handle

**Returns:** `string` - Connection name, or empty string

**Example:**
```typescript
const name = steam.networkingSockets.getConnectionName(connection);
console.log(`Connection: ${name}`);
```

---

## Poll Groups

Functions for efficiently managing multiple connections.

### `createPollGroup()`

Creates a poll group to receive messages from multiple connections at once.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_CreatePollGroup()` - Create poll group

**Returns:** `HSteamNetPollGroup` - Poll group handle, or `k_HSteamNetPollGroup_Invalid` if failed

**Example:**
```typescript
import { k_HSteamNetPollGroup_Invalid } from 'steamworks-ffi-node';

const pollGroup = steam.networkingSockets.createPollGroup();
if (pollGroup !== k_HSteamNetPollGroup_Invalid) {
  console.log(`✅ Created poll group: ${pollGroup}`);
}
```

---

### `destroyPollGroup(pollGroup)`

Destroys a poll group.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_DestroyPollGroup()` - Destroy poll group

**Parameters:**
- `pollGroup: HSteamNetPollGroup` - Poll group handle

**Returns:** `boolean` - `true` if destroyed successfully

---

### `setConnectionPollGroup(connection, pollGroup)`

Adds a connection to a poll group.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_SetConnectionPollGroup()` - Set poll group

**Parameters:**
- `connection: HSteamNetConnection` - Connection handle
- `pollGroup: HSteamNetPollGroup` - Poll group handle

**Returns:** `boolean` - `true` if added successfully

**Example:**
```typescript
// Add all connections to a poll group for efficient message receiving
const pollGroup = steam.networkingSockets.createPollGroup();

steam.networkingSockets.onConnectionStateChange((change) => {
  if (change.newState === ESteamNetworkingConnectionState.Connected) {
    steam.networkingSockets.setConnectionPollGroup(change.connection, pollGroup);
  }
});
```

---

### `receiveMessagesOnPollGroup(pollGroup, maxMessages)`

Receives messages from all connections in a poll group.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_ReceiveMessagesOnPollGroup()` - Receive from poll group

**Parameters:**
- `pollGroup: HSteamNetPollGroup` - Poll group handle
- `maxMessages: number` - Maximum messages to retrieve (default: 64)

**Returns:** `NetworkMessage[]` - Array of messages with connection info

**Example:**
```typescript
// Efficient multi-connection receive loop
const messages = steam.networkingSockets.receiveMessagesOnPollGroup(pollGroup, 100);

for (const msg of messages) {
  console.log(`📨 From connection ${msg.connection}: ${msg.data.toString()}`);
  handleMessage(msg.connection, msg.data);
}
```

---

## Identity & Auth

Functions for identity and authentication.

### `getIdentity()`

Gets the local user's networking identity (Steam ID).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_GetIdentity()` - Get local identity

**Returns:** `string | null` - Steam ID as string, or null if not available

**Example:**
```typescript
const identity = steam.networkingSockets.getIdentity();
if (identity) {
  console.log(`Local Steam ID: ${identity}`);
}
```

---

### `initAuthentication()`

Initializes authentication for networking.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_InitAuthentication()` - Initialize auth

**Returns:** `number` - Status code (ESteamNetworkingAvailability)

**Example:**
```typescript
const status = steam.networkingSockets.initAuthentication();
console.log(`Authentication init status: ${status}`);
```

---

### `getAuthenticationStatus()`

Gets the current authentication status.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_GetAuthenticationStatus()` - Get auth status

**Returns:** `number` - Status code (ESteamNetworkingAvailability)

**Example:**
```typescript
const status = steam.networkingSockets.getAuthenticationStatus();
console.log(`Authentication status: ${status}`);
```

---

## Callbacks

Functions for handling events and running the callback loop.

### `runCallbacks()`

Processes pending networking callbacks. **Must be called regularly** (e.g., every frame).

**Steamworks SDK Functions:**
- Internal callback processing - Polls `SteamNetConnectionStatusChangedCallback_t`

**Example:**
```typescript
// Game loop - call frequently
setInterval(() => {
  steam.runCallbacks();                    // Steam callbacks
  steam.networkingSockets.runCallbacks();  // Networking callbacks
}, 16); // ~60 FPS
```

---

### `onConnectionStateChange(handler)`

Registers a handler for connection state changes.

**Steamworks SDK Functions:**
- Callback: `SteamNetConnectionStatusChangedCallback_t`

**Parameters:**
- `handler: (change: ConnectionStateChange) => void`

**Type:**
```typescript
interface ConnectionStateChange {
  connection: HSteamNetConnection;
  oldState: ESteamNetworkingConnectionState;
  newState: ESteamNetworkingConnectionState;
  info: ConnectionInfo;
}
```

**Returns:** `() => void` - Unregister function

**Example:**
```typescript
const unregister = steam.networkingSockets.onConnectionStateChange((change) => {
  console.log(`Connection ${change.connection}: ${change.info.stateName}`);
  
  if (change.newState === ESteamNetworkingConnectionState.Connecting) {
    // Incoming connection on listen socket - accept it
    steam.networkingSockets.acceptConnection(change.connection);
  }
  
  if (change.newState === ESteamNetworkingConnectionState.Connected) {
    console.log('✅ Connected!');
  }
  
  if (change.newState === ESteamNetworkingConnectionState.ClosedByPeer ||
      change.newState === ESteamNetworkingConnectionState.ProblemDetectedLocally) {
    console.log(`❌ Disconnected: ${change.info.endDebugMessage}`);
  }
});

// Later: stop handling
unregister();
```

---

### `onConnectionRequest(handler)`

Registers a handler for incoming connection requests (on listen sockets).

**Steamworks SDK Functions:**
- Callback: `SteamNetConnectionStatusChangedCallback_t` (when state is `Connecting`)

**Parameters:**
- `handler: (request: P2PConnectionRequest) => void`

**Type:**
```typescript
interface P2PConnectionRequest {
  connection: HSteamNetConnection;
  identityRemote: string;
  listenSocket: HSteamListenSocket;
}
```

**Returns:** `() => void` - Unregister function

**Example:**
```typescript
const unregister = steam.networkingSockets.onConnectionRequest((request) => {
  console.log(`Connection request from: ${request.identityRemote}`);
  // Note: You still need to accept via onConnectionStateChange
});
```

---

### `getPendingStateChanges()`

Gets and clears pending state changes (alternative to callback handler).

**Steamworks SDK Functions:**
- Internal queue - Collects `SteamNetConnectionStatusChangedCallback_t` events

**Returns:** `ConnectionStateChange[]`

**Example:**
```typescript
// Poll-based approach (alternative to onConnectionStateChange)
const changes = steam.networkingSockets.getPendingStateChanges();
for (const change of changes) {
  handleStateChange(change);
}
```

---

### `getPendingConnectionRequests()`

Gets and clears pending connection requests.

**Steamworks SDK Functions:**
- Internal queue - Filters incoming connection events from callbacks

**Returns:** `P2PConnectionRequest[]`

---

## Cleanup

### `closeAll()`

Closes all connections, listen sockets, and poll groups.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_CloseConnection()` - For each connection
- `SteamAPI_ISteamNetworkingSockets_CloseListenSocket()` - For each listen socket
- `SteamAPI_ISteamNetworkingSockets_DestroyPollGroup()` - For each poll group

**Example:**
```typescript
// Cleanup on shutdown
process.on('SIGINT', () => {
  steam.networkingSockets.closeAll();
  steam.shutdown();
  process.exit(0);
});
```

---

## Complete P2P Example

### Host (Server)

```typescript
import SteamworksSDK, {
  ESteamNetworkingConnectionState,
  ESteamNetworkingAvailability,
  k_HSteamListenSocket_Invalid,
  k_HSteamNetPollGroup_Invalid,
  EResult,
  getConnectionStateName,
} from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Initialize relay network
steam.networkingUtils.initRelayNetworkAccess();

// Wait for relay network to be ready
async function waitForRelay() {
  while (true) {
    steam.runCallbacks();
    const status = steam.networkingUtils.getRelayNetworkStatus();
    if (status.availability === ESteamNetworkingAvailability.Current) break;
    await new Promise(r => setTimeout(r, 100));
  }
}

await waitForRelay();

// Create listen socket and poll group
const listenSocket = steam.networkingSockets.createListenSocketP2P(0);
const pollGroup = steam.networkingSockets.createPollGroup();

console.log(`🎮 Host Steam ID: ${steam.getStatus().steamId}`);
console.log('Share this ID with players to connect!');

// Handle connections
steam.networkingSockets.onConnectionStateChange((change) => {
  console.log(`State: ${getConnectionStateName(change.oldState)} -> ${getConnectionStateName(change.newState)}`);
  
  if (change.newState === ESteamNetworkingConnectionState.Connecting) {
    steam.networkingSockets.acceptConnection(change.connection);
    steam.networkingSockets.setConnectionPollGroup(change.connection, pollGroup);
  }
  
  if (change.newState === ESteamNetworkingConnectionState.Connected) {
    console.log(`✅ Player connected: ${change.info.identityRemote}`);
    steam.networkingSockets.sendReliable(change.connection, 'Welcome!');
  }
});

// Main loop
setInterval(() => {
  steam.runCallbacks();
  steam.networkingSockets.runCallbacks();
  
  const messages = steam.networkingSockets.receiveMessagesOnPollGroup(pollGroup, 100);
  for (const msg of messages) {
    console.log(`📨 ${msg.identity}: ${msg.data.toString()}`);
  }
}, 16);
```

### Client (Joiner)

```typescript
import SteamworksSDK, {
  ESteamNetworkingConnectionState,
  ESteamNetworkingAvailability,
  k_HSteamNetConnection_Invalid,
  getConnectionStateName,
} from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

const hostSteamId = process.argv[2];
if (!hostSteamId) {
  console.error('Usage: node client.js <host-steam-id>');
  process.exit(1);
}

// Initialize relay network
steam.networkingUtils.initRelayNetworkAccess();

// Wait for relay, then connect
setTimeout(async () => {
  const connection = steam.networkingSockets.connectP2P(hostSteamId, 0);
  let connected = false;
  
  steam.networkingSockets.onConnectionStateChange((change) => {
    console.log(`State: ${getConnectionStateName(change.oldState)} -> ${getConnectionStateName(change.newState)}`);
    
    if (change.newState === ESteamNetworkingConnectionState.Connected) {
      connected = true;
      console.log('✅ Connected to host!');
      steam.networkingSockets.sendReliable(connection, 'Hello from client!');
    }
  });

  // Main loop
  setInterval(() => {
    steam.runCallbacks();
    steam.networkingSockets.runCallbacks();
    
    if (connected) {
      const messages = steam.networkingSockets.receiveMessages(connection, 50);
      for (const msg of messages) {
        console.log(`📨 Host: ${msg.data.toString()}`);
      }
    }
  }, 16);
}, 2000);
```

---

## Testing

Run the P2P networking tests:

**Terminal 1 (Host):**
```bash
npm run test:sockets:host:ts   # TypeScript
npm run test:sockets:host:js   # JavaScript  
```

**Terminal 2 (Client):**
```bash
# Pass host's Steam ID, or run without args to enter manually
npm run test:sockets:join:ts -- 76561198012345678
npm run test:sockets:join:js -- 76561198012345678
```

---

## Best Practices

1. **Always initialize relay network** - Call `networkingUtils.initRelayNetworkAccess()` and wait for it to be ready
2. **Run callbacks frequently** - Call both `steam.runCallbacks()` and `steam.networkingSockets.runCallbacks()` at least 60 times per second
3. **Use poll groups for servers** - More efficient than polling each connection individually
4. **Use event handlers** - `onConnectionStateChange()` is cleaner than polling `getPendingStateChanges()`
5. **Choose appropriate send methods**:
   - `sendUnreliable()` for position updates, inputs (fast, may drop)
   - `sendReliable()` for chat, game events, important state (guaranteed)
6. **Clean up properly** - Call `closeAll()` on shutdown

---

## Error Handling

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection returns 0 | Invalid Steam ID or network not ready | Wait for relay network, verify Steam ID format |
| Messages not received | Not calling runCallbacks | Add both `runCallbacks()` calls to game loop |
| High latency | Using reliable for frequent updates | Use `sendUnreliable()` for position/input |
| Connection drops | Peer disconnected or network issue | Check connection state in callback |

---

## Related Documentation

- [Networking Utils Manager](./NETWORKING_UTILS_MANAGER.md) - Relay network status and ping estimation
- [Matchmaking Manager](./MATCHMAKING_MANAGER.md) - Steam lobbies for player discovery
- [Friends Manager](./FRIENDS_MANAGER.md) - Friend list for invites
