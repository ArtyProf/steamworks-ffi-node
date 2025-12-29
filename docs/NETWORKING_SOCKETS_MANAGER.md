# Networking Sockets Manager API Documentation

Complete reference for Steam Networking Sockets functionality in Steamworks FFI.

## Overview

The `SteamNetworkingSocketsManager` provides access to the ISteamNetworkingSockets API, enabling peer-to-peer (P2P) connections between Steam users using Steam's relay network. This is the primary interface for implementing multiplayer networking in your game.

This manager is useful for:
1. **P2P Connections**: Connect directly to other Steam users using their Steam ID
2. **Reliable Messaging**: Send messages with configurable reliability and ordering
3. **Connection Management**: Accept, close, and monitor connection states
4. **Poll Groups**: Efficiently receive messages from multiple connections

## Quick Reference

| Category | Functions | Description |
|----------|-----------|-------------|
| [P2P Listen Sockets](#p2p-listen-sockets) | 2 | Create and close listen sockets |
| [P2P Connections](#p2p-connections) | 4 | Connect, accept, and close connections |
| [Messaging](#messaging) | 3 | Send and receive messages |
| [Connection Info](#connection-info) | 3 | Query connection state and status |
| [Poll Groups](#poll-groups) | 4 | Manage multiple connections |
| [Configuration](#configuration) | 2 | Configure connection options |
| [Identity](#identity) | 1 | Get local identity |

**Total: 19 Functions**

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
- `SteamAPI_ISteamNetworkingSockets_CreateListenSocketP2P()` - Create P2P listener

**Parameters:**
- `virtualPort: number` - Virtual port number (0-based, for multiple services)

**Returns:** `number` - Listen socket handle, or 0 if failed

**Example:**
```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Create a P2P listen socket on virtual port 0
const listenSocket = steam.networkingSockets.createListenSocketP2P(0);
if (listenSocket !== 0) {
  console.log(`✅ Listening on socket: ${listenSocket}`);
  console.log(`Your Steam ID: ${steam.core.getSteamId()}`);
  console.log('Share this ID with other players to connect!');
}
```

**Notes:**
- Virtual ports allow multiple services on the same Steam ID
- Call `runCallbacks()` in a loop to receive connection requests

---

### `closeListenSocket(listenSocket)`

Closes a P2P listen socket.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_CloseListenSocket()` - Close listener

**Parameters:**
- `listenSocket: number` - Listen socket handle from `createListenSocketP2P()`

**Returns:** `boolean` - `true` if closed successfully

**Example:**
```typescript
const success = steam.networkingSockets.closeListenSocket(listenSocket);
if (success) {
  console.log('✅ Listen socket closed');
}
```

---

## P2P Connections

Functions for establishing and managing P2P connections.

### `connectP2P(steamIdRemote, virtualPort)`

Connects to another Steam user via P2P.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_ConnectP2P()` - Initiate P2P connection

**Parameters:**
- `steamIdRemote: string` - Steam ID of the user to connect to
- `virtualPort: number` - Virtual port number (must match host's listen port)

**Returns:** `number` - Connection handle, or 0 if failed

**Example:**
```typescript
// Connect to another player's Steam ID
const hostSteamId = '76561198012345678'; // Get from host player
const connection = steam.networkingSockets.connectP2P(hostSteamId, 0);

if (connection !== 0) {
  console.log(`✅ Connecting to ${hostSteamId}...`);
  
  // Poll for connection state changes
  const checkConnection = setInterval(() => {
    steam.runCallbacks();
    const info = steam.networkingSockets.getConnectionInfo(connection);
    if (info) {
      console.log(`Connection state: ${info.stateName}`);
      if (info.state === 3) { // Connected
        console.log('✅ Connected!');
        clearInterval(checkConnection);
      }
    }
  }, 100);
}
```

---

### `acceptConnection(connection)`

Accepts an incoming connection request.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_AcceptConnection()` - Accept connection

**Parameters:**
- `connection: number` - Connection handle from connection request callback

**Returns:** `boolean` - `true` if accepted successfully

**Example:**
```typescript
// In your connection callback handler:
function handleNewConnection(connectionHandle: number) {
  const info = steam.networkingSockets.getConnectionInfo(connectionHandle);
  if (info) {
    console.log(`Connection request from: ${info.identityRemote}`);
    
    // Accept the connection
    if (steam.networkingSockets.acceptConnection(connectionHandle)) {
      console.log('✅ Connection accepted');
    }
  }
}
```

---

### `closeConnection(connection, reason, debug, enableLinger)`

Closes a connection with an optional reason.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_CloseConnection()` - Close connection

**Parameters:**
- `connection: number` - Connection handle to close
- `reason: number` - Application-defined reason code (0 for normal)
- `debug: string` - Debug string (may be transmitted to remote)
- `enableLinger: boolean` - If true, waits for reliable messages to be delivered

**Returns:** `boolean` - `true` if closed successfully

**Example:**
```typescript
// Normal close
steam.networkingSockets.closeConnection(connection, 0, 'Game ended', false);

// Close with linger to ensure all messages delivered
steam.networkingSockets.closeConnection(connection, 0, 'Disconnect', true);
```

---

### `getConnectionUserData(connection)`

Gets application-specific data associated with a connection.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_GetConnectionUserData()` - Get user data

**Parameters:**
- `connection: number` - Connection handle

**Returns:** `bigint` - User data value, or -1n if invalid

---

## Messaging

Functions for sending and receiving messages.

### `sendMessage(connection, data, flags)`

Sends a message to a connected peer.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_SendMessageToConnection()` - Send message

**Parameters:**
- `connection: number` - Connection handle
- `data: string | Buffer` - Message data to send
- `flags: number` - Send flags (see below)

**Send Flags:**
```typescript
enum ESteamNetworkingSendFlags {
  Unreliable = 0,           // May be dropped, fastest
  NoNagle = 1,              // Send immediately (don't batch)
  NoDelay = 4,              // Skip Nagle, bypass queue
  Reliable = 8,             // Guaranteed delivery, ordered
  UseCurrentThread = 16     // Send on current thread
}
```

**Returns:** `EResult` - Result code (1 = success)

**Example:**
```typescript
// Send reliable message (guaranteed delivery)
const result = steam.networkingSockets.sendMessage(
  connection,
  'Hello, peer!',
  8 // Reliable
);

if (result === 1) {
  console.log('✅ Message sent');
}

// Send unreliable message (fastest, may be dropped)
steam.networkingSockets.sendMessage(
  connection,
  JSON.stringify({ type: 'position', x: 100, y: 200 }),
  0 // Unreliable
);

// Send reliable + no delay (for critical messages)
steam.networkingSockets.sendMessage(
  connection,
  JSON.stringify({ type: 'chat', text: 'Hello!' }),
  8 | 4 // Reliable | NoDelay
);
```

---

### `receiveMessages(connection, maxMessages)`

Receives pending messages from a specific connection.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_ReceiveMessagesOnConnection()` - Receive messages

**Parameters:**
- `connection: number` - Connection handle
- `maxMessages: number` - Maximum messages to retrieve (default: 100)

**Returns:** `NetworkingMessage[]` - Array of received messages

**Type:**
```typescript
interface NetworkingMessage {
  data: Buffer;          // Message payload
  size: number;          // Size in bytes
  connection: number;    // Connection it came from
  identity: string;      // Sender's Steam ID
  channel: number;       // Lane/channel number
  flags: number;         // Message flags
  messageNumber: bigint; // Sequence number
}
```

**Example:**
```typescript
// Receive loop
function pollMessages(connection: number) {
  const messages = steam.networkingSockets.receiveMessages(connection, 50);
  
  for (const msg of messages) {
    const text = msg.data.toString('utf8');
    console.log(`📨 Received from ${msg.identity}: ${text}`);
    
    // Parse JSON if applicable
    try {
      const data = JSON.parse(text);
      handleGameMessage(data);
    } catch {
      handleTextMessage(text);
    }
  }
}

// Call in game loop
setInterval(() => {
  steam.runCallbacks();
  pollMessages(connection);
}, 16); // ~60 FPS
```

---

### `flushMessagesOnConnection(connection)`

Flushes any pending outgoing messages immediately.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_FlushMessagesOnConnection()` - Flush messages

**Parameters:**
- `connection: number` - Connection handle

**Returns:** `EResult` - Result code (1 = success)

**Example:**
```typescript
// Send critical message and flush immediately
steam.networkingSockets.sendMessage(connection, criticalData, 8);
steam.networkingSockets.flushMessagesOnConnection(connection);
```

---

## Connection Info

Functions for querying connection state and status.

### `getConnectionInfo(connection)`

Gets information about a connection's current state.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_GetConnectionInfo()` - Get connection info

**Parameters:**
- `connection: number` - Connection handle

**Returns:** `ConnectionInfo | null`

**Type:**
```typescript
interface ConnectionInfo {
  identityRemote: string;          // Remote peer's Steam ID
  state: ESteamNetworkingConnectionState;
  stateName: string;               // Human-readable state
  endReason: number;               // Close reason code
  endDebug: string;                // Close reason message
  connectionDescription: string;   // Debug description
  addrRemote: string;              // Remote address (if available)
}
```

**Example:**
```typescript
const info = steam.networkingSockets.getConnectionInfo(connection);
if (info) {
  console.log(`Remote peer: ${info.identityRemote}`);
  console.log(`State: ${info.stateName} (${info.state})`);
  
  if (info.state === 4 || info.state === 5) {
    console.log(`Closed: ${info.endDebug}`);
  }
}
```

---

### `getDetailedConnectionStatus(connection)`

Gets detailed connection status including quality metrics.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_GetDetailedConnectionStatus()` - Get detailed status

**Parameters:**
- `connection: number` - Connection handle

**Returns:** `string` - Detailed status text

**Example:**
```typescript
const details = steam.networkingSockets.getDetailedConnectionStatus(connection);
console.log('Connection Details:');
console.log(details);
// Shows ping, packet loss, bandwidth, route info, etc.
```

---

### `getQuickConnectionStatus(connection)`

Gets quick connection status metrics.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_GetConnectionRealTimeStatus()` - Get quick status

**Parameters:**
- `connection: number` - Connection handle

**Returns:** `QuickConnectionStatus | null`

**Type:**
```typescript
interface QuickConnectionStatus {
  state: ESteamNetworkingConnectionState;
  ping: number;                    // Round-trip time in ms
  connectionQualityLocal: number;  // 0-1 quality estimate
  connectionQualityRemote: number;
  outPacketsPerSec: number;
  outBytesPerSec: number;
  inPacketsPerSec: number;
  inBytesPerSec: number;
  sendRateBytesPerSecond: number;
  pendingUnreliable: number;       // Unreliable bytes queued
  pendingReliable: number;         // Reliable bytes queued
  sentUnackedReliable: number;     // Sent but unacked bytes
}
```

**Example:**
```typescript
const status = steam.networkingSockets.getQuickConnectionStatus(connection);
if (status) {
  console.log(`Ping: ${status.ping}ms`);
  console.log(`Quality: ${(status.connectionQualityLocal * 100).toFixed(1)}%`);
  console.log(`In: ${status.inBytesPerSec} B/s, Out: ${status.outBytesPerSec} B/s`);
}
```

---

## Poll Groups

Functions for efficiently managing multiple connections.

### `createPollGroup()`

Creates a poll group to receive messages from multiple connections at once.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_CreatePollGroup()` - Create poll group

**Returns:** `number` - Poll group handle, or 0 if failed

**Example:**
```typescript
const pollGroup = steam.networkingSockets.createPollGroup();
if (pollGroup !== 0) {
  console.log(`✅ Created poll group: ${pollGroup}`);
}
```

---

### `destroyPollGroup(pollGroup)`

Destroys a poll group.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_DestroyPollGroup()` - Destroy poll group

**Parameters:**
- `pollGroup: number` - Poll group handle

**Returns:** `boolean` - `true` if destroyed successfully

---

### `setConnectionPollGroup(connection, pollGroup)`

Adds a connection to a poll group.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_SetConnectionPollGroup()` - Add to poll group

**Parameters:**
- `connection: number` - Connection handle
- `pollGroup: number` - Poll group handle

**Returns:** `boolean` - `true` if added successfully

**Example:**
```typescript
// Create poll group and add connections
const pollGroup = steam.networkingSockets.createPollGroup();

// When a new connection is accepted:
steam.networkingSockets.setConnectionPollGroup(connection1, pollGroup);
steam.networkingSockets.setConnectionPollGroup(connection2, pollGroup);
```

---

### `receiveMessagesOnPollGroup(pollGroup, maxMessages)`

Receives messages from all connections in a poll group.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_ReceiveMessagesOnPollGroup()` - Receive from group

**Parameters:**
- `pollGroup: number` - Poll group handle
- `maxMessages: number` - Maximum messages to retrieve (default: 100)

**Returns:** `NetworkingMessage[]` - Array of messages with connection info

**Example:**
```typescript
// Efficient multi-connection receive loop
function pollAllConnections(pollGroup: number) {
  const messages = steam.networkingSockets.receiveMessagesOnPollGroup(pollGroup, 100);
  
  for (const msg of messages) {
    console.log(`📨 From connection ${msg.connection}: ${msg.data.toString()}`);
    handleMessage(msg.connection, msg.data);
  }
}

// Game loop
setInterval(() => {
  steam.runCallbacks();
  pollAllConnections(pollGroup);
}, 16);
```

---

## Configuration

Functions for configuring connection options.

### `setConnectionConfigValue(connection, configKey, value)`

Sets a configuration value on a connection.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_SetConnectionConfigValueInt32()` - Set int32 config
- `SteamAPI_ISteamNetworkingSockets_SetConnectionConfigValueFloat()` - Set float config
- `SteamAPI_ISteamNetworkingSockets_SetConnectionConfigValueString()` - Set string config

**Parameters:**
- `connection: number` - Connection handle
- `configKey: number` - Configuration key
- `value: number | string` - Configuration value

**Returns:** `boolean` - `true` if set successfully

---

### `getConnectionConfigValue(connection, configKey, isFloat)`

Gets a configuration value from a connection.

**Parameters:**
- `connection: number` - Connection handle
- `configKey: number` - Configuration key
- `isFloat: boolean` - Whether the value is a float (default: false)

**Returns:** `number | null` - Configuration value, or null if not found

---

## Identity

### `getIdentity()`

Gets the local user's networking identity.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingSockets_GetIdentity()` - Get identity

**Returns:** `{ steamId: string; type: number } | null`

**Example:**
```typescript
const identity = steam.networkingSockets.getIdentity();
if (identity) {
  console.log(`Local Steam ID: ${identity.steamId}`);
}
```

---

## Complete P2P Example

### Host (Server)

```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Initialize networking
steam.networkingUtils.initRelayNetworkAccess();

// Create listen socket
const listenSocket = steam.networkingSockets.createListenSocketP2P(0);
const pollGroup = steam.networkingSockets.createPollGroup();
const connections: number[] = [];

console.log(`🎮 Host Steam ID: ${steam.core.getSteamId()}`);
console.log('Waiting for players to connect...');

// Main loop
setInterval(() => {
  steam.runCallbacks();
  
  // Check for new connections by polling
  // (In a real app, use connection state change callbacks)
  
  // Receive messages from all clients
  const messages = steam.networkingSockets.receiveMessagesOnPollGroup(pollGroup, 100);
  for (const msg of messages) {
    const text = msg.data.toString();
    console.log(`📨 Player ${msg.identity}: ${text}`);
    
    // Broadcast to all other players
    for (const conn of connections) {
      if (conn !== msg.connection) {
        steam.networkingSockets.sendMessage(conn, `${msg.identity}: ${text}`, 8);
      }
    }
  }
}, 16);

// Handle new connection
function onNewConnection(connection: number) {
  steam.networkingSockets.acceptConnection(connection);
  steam.networkingSockets.setConnectionPollGroup(connection, pollGroup);
  connections.push(connection);
  
  const info = steam.networkingSockets.getConnectionInfo(connection);
  console.log(`✅ Player joined: ${info?.identityRemote}`);
}

// Cleanup on exit
process.on('SIGINT', () => {
  for (const conn of connections) {
    steam.networkingSockets.closeConnection(conn, 0, 'Server shutdown', true);
  }
  steam.networkingSockets.destroyPollGroup(pollGroup);
  steam.networkingSockets.closeListenSocket(listenSocket);
  steam.shutdown();
  process.exit(0);
});
```

### Client (Joiner)

```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

const hostSteamId = process.argv[2]; // Pass host Steam ID as argument
if (!hostSteamId) {
  console.error('Usage: npm run test:sockets:join:ts -- <host-steam-id>');
  process.exit(1);
}

// Initialize networking
steam.networkingUtils.initRelayNetworkAccess();

// Wait for relay network
setTimeout(() => {
  // Connect to host
  const connection = steam.networkingSockets.connectP2P(hostSteamId, 0);
  if (connection === 0) {
    console.error('❌ Failed to initiate connection');
    process.exit(1);
  }

  console.log(`🔌 Connecting to ${hostSteamId}...`);

  // Main loop
  setInterval(() => {
    steam.runCallbacks();
    
    const info = steam.networkingSockets.getConnectionInfo(connection);
    if (info?.state === 3) { // Connected
      // Send and receive messages
      const messages = steam.networkingSockets.receiveMessages(connection, 50);
      for (const msg of messages) {
        console.log(`📨 ${msg.data.toString()}`);
      }
    }
  }, 16);

  // Send test message when connected
  const waitForConnection = setInterval(() => {
    const info = steam.networkingSockets.getConnectionInfo(connection);
    if (info?.state === 3) {
      steam.networkingSockets.sendMessage(connection, 'Hello from client!', 8);
      clearInterval(waitForConnection);
    } else if (info?.state === 4 || info?.state === 5) {
      console.error('❌ Connection failed:', info.endDebug);
      clearInterval(waitForConnection);
      process.exit(1);
    }
  }, 100);

}, 2000);
```

---

## Testing

Run the P2P networking tests using two terminals:

**Terminal 1 (Host):**
```bash
# TypeScript
npm run test:sockets:host:ts

# JavaScript  
npm run test:sockets:host:js
```

**Terminal 2 (Client):**
```bash
# TypeScript - pass host's Steam ID from Terminal 1
npm run test:sockets:join:ts -- 76561198012345678

# JavaScript
npm run test:sockets:join:js -- 76561198012345678
```

---

## Best Practices

1. **Always initialize relay network** - Call `networkingUtils.initRelayNetworkAccess()` early
2. **Use poll groups for multiple connections** - More efficient than polling each connection
3. **Handle connection state changes** - Monitor `getConnectionInfo()` for disconnections
4. **Choose appropriate send flags**:
   - Use `Unreliable` (0) for position updates, inputs
   - Use `Reliable` (8) for important events, chat, game state
   - Add `NoDelay` (4) for time-critical reliable messages
5. **Clean up properly** - Close connections and listen sockets on shutdown
6. **Run callbacks frequently** - Call `steam.runCallbacks()` at least 60 times per second

---

## Error Handling

Common issues and solutions:

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection returns 0 | Invalid Steam ID or network not ready | Wait for relay network, verify Steam ID format |
| Messages not received | Not calling runCallbacks | Add runCallbacks to game loop |
| High latency | Using wrong send flags | Use Unreliable for frequent updates |
| Connection drops | Peer disconnected or network issue | Check getConnectionInfo state |

---

## Related Documentation

- [Networking Utils Manager](./NETWORKING_UTILS_MANAGER.md) - Relay network status and ping estimation
- [Matchmaking Manager](./MATCHMAKING_MANAGER.md) - Steam lobbies for player discovery
- [Friends Manager](./FRIENDS_MANAGER.md) - Friend list for invites
