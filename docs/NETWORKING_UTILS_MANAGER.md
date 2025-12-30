# Networking Utils Manager API Documentation

Complete reference for Steam Networking Utils functionality in Steamworks FFI.

## Overview

The `SteamNetworkingUtilsManager` provides access to the Steam Networking Utils API, enabling you to monitor Steam Relay Network status, estimate ping times between locations, query data center information (POPs), and configure debug output.

This manager is useful for:
1. **Network diagnostics**: Check relay network availability and connection status
2. **Latency estimation**: Estimate ping between players using Steam's relay infrastructure
3. **Data center info**: Query available Steam data centers (POPs) and ping times
4. **Debug output**: Configure Steam networking debug verbosity

## Quick Reference

| Category | Functions | Description |
|----------|-----------|-------------|
| [Relay Network](#relay-network) | 3 | Initialize and monitor relay network |
| [Ping Location](#ping-location) | 3 | Get and estimate ping locations |
| [Data Centers (POPs)](#data-centers-pops) | 4 | Query POP info and ping times |
| [Utilities](#utilities) | 2 | Timestamps and debug output |

**Total: 12 Functions**

---

## Relay Network

Functions for initializing and monitoring the Steam Relay Network.

### `initRelayNetworkAccess()`

Starts the process of initializing access to the Steam Relay Network.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingUtils_InitRelayNetworkAccess()` - Initialize relay network

**Returns:** `boolean` - `true` if initialization started successfully

**Example:**
```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Start relay network initialization
const started = steam.networkingUtils.initRelayNetworkAccess();
if (started) {
  console.log('✅ Relay network initialization started');
}

// Check status after some time
setTimeout(() => {
  const status = steam.networkingUtils.getRelayNetworkStatus();
  console.log('Relay availability:', status.availabilityName);
}, 2000);
```

**Notes:**
- This is an asynchronous operation - check `getRelayNetworkStatus()` for completion
- Call early in your application to reduce latency when connecting

---

### `getRelayNetworkStatus()`

Gets the current status of the Steam Relay Network connection.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingUtils_GetRelayNetworkStatus()` - Get network status

**Returns:** `RelayNetworkStatus`

**Type:**
```typescript
interface RelayNetworkStatus {
  availability: ESteamNetworkingAvailability;  // Numeric status code
  availabilityName: string;                     // Human-readable status
  pingMeasurementInProgress: boolean;           // Whether ping measurement is active
  availableConfig: ESteamNetworkingAvailability;
  availableRelay: ESteamNetworkingAvailability;
  debugMessage: string;                         // Status/error message from Steam
}

enum ESteamNetworkingAvailability {
  Unknown = 0,
  CannotTry = -102,
  Failed = -101,
  Previously = -100,
  Retrying = -10,
  NeverTried = 1,
  Waiting = 2,
  Attempting = 3,
  Current = 100
}
```

**Example:**
```typescript
const status = steam.networkingUtils.getRelayNetworkStatus();

console.log('Network Status:');
console.log('  Availability:', status.availabilityName);
console.log('  Ping in progress:', status.pingMeasurementInProgress);
console.log('  Debug message:', status.debugMessage);

if (status.availability === 100) { // Current
  console.log('✅ Relay network is ready');
}
```

---

### `checkPingDataUpToDate(maxAgeSeconds)`

Checks if cached ping data is recent enough or triggers a refresh.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingUtils_CheckPingDataUpToDate()` - Check/refresh ping data

**Parameters:**
- `maxAgeSeconds: number` - Maximum age of ping data in seconds before refresh is needed

**Returns:** `boolean` - `true` if ping data is fresh, `false` if refresh was triggered

**Example:**
```typescript
// Check if ping data is less than 5 minutes old
const isUpToDate = steam.networkingUtils.checkPingDataUpToDate(300);

if (isUpToDate) {
  console.log('✅ Ping data is current');
} else {
  console.log('🔄 Refreshing ping data...');
  // Wait for ping data to update
}
```

---

## Ping Location

Functions for working with ping locations and latency estimation.

### `getLocalPingLocation()`

Gets the local user's ping location for latency estimation.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingUtils_GetLocalPingLocation()` - Get local ping location

**Returns:** `PingLocation | null` - Ping location data or null if not available

**Type:**
```typescript
interface PingLocation {
  data: number[];  // Internal location data (array of numbers)
}
```

**Example:**
```typescript
const location = steam.networkingUtils.getLocalPingLocation();

if (location) {
  console.log('✅ Got local ping location');
  console.log('  Location data:', location.data.slice(0, 4), '...');
  
  // Can be used to estimate ping to other players
} else {
  console.log('❌ Ping location not available yet');
  console.log('  Make sure relay network is initialized');
}
```

**Notes:**
- Returns null if relay network is not initialized
- The location data can be shared with other players for ping estimation

---

### `estimatePingBetweenLocations(location1, location2)`

Estimates the ping time between two ping locations.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingUtils_EstimatePingTimeBetweenTwoLocations()` - Estimate ping

**Parameters:**
- `location1: PingLocation` - First player's ping location
- `location2: PingLocation` - Second player's ping location

**Returns:** `PingEstimate`

**Type:**
```typescript
interface PingEstimate {
  pingMs: number;  // Estimated ping in milliseconds (-1 if cannot estimate)
  isValid: boolean;
}
```

**Example:**
```typescript
// Get locations from two players
const myLocation = steam.networkingUtils.getLocalPingLocation();
const theirLocation = receivedFromOtherPlayer; // PingLocation from another user

if (myLocation && theirLocation) {
  const estimate = steam.networkingUtils.estimatePingBetweenLocations(
    myLocation,
    theirLocation
  );
  
  if (estimate.isValid) {
    console.log(`Estimated ping to player: ${estimate.pingMs}ms`);
  } else {
    console.log('Could not estimate ping');
  }
}
```

---

### `estimatePingFromString(locationString)`

Estimates ping to a location encoded as a string.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingUtils_ParsePingLocationString()` - Parse location string
- `SteamAPI_ISteamNetworkingUtils_EstimatePingTimeBetweenTwoLocations()` - Estimate ping

**Parameters:**
- `locationString: string` - Encoded ping location string

**Returns:** `PingEstimate`

**Example:**
```typescript
// Location string received from another player or server
const locationString = 'abc123...'; // Encoded location

const estimate = steam.networkingUtils.estimatePingFromString(locationString);

if (estimate.isValid) {
  console.log(`Estimated ping: ${estimate.pingMs}ms`);
} else {
  console.log('Invalid location string or ping unavailable');
}
```

---

## Data Centers (POPs)

Functions for querying Steam data center information.

### `getPOPCount()`

Gets the number of available Steam Points of Presence (data centers).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingUtils_GetPOPCount()` - Get POP count

**Returns:** `number` - Number of available POPs

**Example:**
```typescript
const popCount = steam.networkingUtils.getPOPCount();
console.log(`Steam has ${popCount} data centers available`);
```

---

### `getPOPList()`

Gets a list of all available Steam Points of Presence (data centers).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingUtils_GetPOPList()` - Get list of POPs

**Returns:** `POPInfo[]` - Array of POP information

**Type:**
```typescript
interface POPInfo {
  popId: number;    // Numeric POP identifier
  popCode: string;  // Human-readable POP code (e.g., 'ams', 'iad', 'sea')
}
```

**Example:**
```typescript
const pops = steam.networkingUtils.getPOPList();

console.log(`Available Steam Data Centers (${pops.length}):`);
pops.forEach(pop => {
  console.log(`  ${pop.popCode} (ID: ${pop.popId})`);
});

// Example output:
// Available Steam Data Centers (24):
//   ams4 (ID: 1634558260)
//   sto2 (ID: 1937006642)
//   lhr (ID: 7499634)
//   ...
```

---

### `getPingToDataCenter(popId)`

Gets the ping time to a specific data center.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingUtils_GetPingToDataCenter()` - Get ping to POP

**Parameters:**
- `popId: number` - The POP ID to query

**Returns:** `number` - Ping time in milliseconds (-1 if unavailable)

**Example:**
```typescript
const pops = steam.networkingUtils.getPOPList();

console.log('Ping to data centers:');
pops.forEach(pop => {
  const ping = steam.networkingUtils.getPingToDataCenter(pop.popId);
  if (ping >= 0) {
    console.log(`  ${pop.popCode}: ${ping}ms`);
  } else {
    console.log(`  ${pop.popCode}: unavailable`);
  }
});
```

---

### `getDirectPingToPOP(popId)`

Gets the direct (non-relayed) ping to a specific POP.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingUtils_GetDirectPingToPOP()` - Get direct ping to POP

**Parameters:**
- `popId: number` - The POP ID to query

**Returns:** `number` - Direct ping time in milliseconds (-1 if unavailable)

**Example:**
```typescript
const pops = steam.networkingUtils.getPOPList();

console.log('Direct ping to data centers:');
pops.slice(0, 5).forEach(pop => {
  const directPing = steam.networkingUtils.getDirectPingToPOP(pop.popId);
  const relayPing = steam.networkingUtils.getPingToDataCenter(pop.popId);
  
  console.log(`  ${pop.popCode}:`);
  console.log(`    Direct: ${directPing >= 0 ? directPing + 'ms' : 'N/A'}`);
  console.log(`    Relay:  ${relayPing >= 0 ? relayPing + 'ms' : 'N/A'}`);
});
```

---

## Utilities

General utility functions for networking.

### `getLocalTimestamp()`

Gets the current Steam networking timestamp.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingUtils_GetLocalTimestamp()` - Get local timestamp

**Returns:** `bigint` - Timestamp in microseconds

**Example:**
```typescript
const timestamp = steam.networkingUtils.getLocalTimestamp();
console.log(`Steam networking timestamp: ${timestamp}`);

// Can be used for timing measurements
const start = steam.networkingUtils.getLocalTimestamp();
// ... do some work ...
const end = steam.networkingUtils.getLocalTimestamp();
const elapsedUs = end - start;
console.log(`Elapsed: ${elapsedUs} microseconds`);
```

---

### `setDebugOutputLevel(detailLevel)`

Sets the debug output verbosity level for Steam Networking.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamNetworkingUtils_SetDebugOutputFunction()` - Set debug output level and handler

**Parameters:**
- `detailLevel: ESteamNetworkingSocketsDebugOutputType` - The verbosity level

**Type:**
```typescript
enum ESteamNetworkingSocketsDebugOutputType {
  None = 0,      // No output
  Bug = 1,       // Only critical bugs
  Error = 2,     // Errors
  Important = 3, // Important messages
  Warning = 4,   // Warnings
  Msg = 5,       // General messages
  Verbose = 6,   // Verbose output
  Debug = 7,     // Debug info
  Everything = 8 // All possible output
}
```

**Returns:** `void`

**Example:**
```typescript
import { ESteamNetworkingSocketsDebugOutputType } from 'steamworks-ffi-node';

// Enable verbose logging for debugging
steam.networkingUtils.setDebugOutputLevel(
  ESteamNetworkingSocketsDebugOutputType.Verbose
);

// Or use numeric value directly
steam.networkingUtils.setDebugOutputLevel(6); // Verbose

// Disable debug output
steam.networkingUtils.setDebugOutputLevel(
  ESteamNetworkingSocketsDebugOutputType.None
);
```

**Notes:**
- Higher levels include all messages from lower levels
- Use `Verbose` or `Debug` when troubleshooting networking issues
- Set to `None` or `Error` for production builds

---

## Helper Functions

The module also exports helper functions for working with POP identifiers.

### `popIdToString(popId)`

Converts a numeric POP ID to its string code.

**Parameters:**
- `popId: number` - Numeric POP identifier

**Returns:** `string` - POP code (e.g., 'ams', 'iad', 'sea')

**Example:**
```typescript
import { popIdToString } from 'steamworks-ffi-node';

const popCode = popIdToString(1634558260);
console.log(popCode); // 'ams4'
```

---

### `stringToPopId(str)`

Converts a POP string code to its numeric ID.

**Parameters:**
- `str: string` - POP code string

**Returns:** `number` - Numeric POP identifier

**Example:**
```typescript
import { stringToPopId } from 'steamworks-ffi-node';

const popId = stringToPopId('ams');
console.log(popId); // 7561569
```

---

### `getAvailabilityName(availability)`

Converts an availability enum value to a human-readable name.

**Parameters:**
- `availability: ESteamNetworkingAvailability` - Availability value

**Returns:** `string` - Human-readable name

**Example:**
```typescript
import { getAvailabilityName, ESteamNetworkingAvailability } from 'steamworks-ffi-node';

console.log(getAvailabilityName(100));  // 'Current'
console.log(getAvailabilityName(2));    // 'Waiting'
console.log(getAvailabilityName(-101)); // 'Failed'
```

---

## Complete Example

```typescript
import SteamworksSDK, { 
  ESteamNetworkingSocketsDebugOutputType 
} from 'steamworks-ffi-node';

async function networkingUtilsDemo() {
  const steam = SteamworksSDK.getInstance();
  steam.init({ appId: 480 });

  // Enable debug output
  steam.networkingUtils.setDebugOutputLevel(
    ESteamNetworkingSocketsDebugOutputType.Verbose
  );

  // Initialize relay network
  console.log('Initializing relay network...');
  steam.networkingUtils.initRelayNetworkAccess();

  // Wait for network to be ready
  await new Promise<void>((resolve) => {
    const check = setInterval(() => {
      const status = steam.networkingUtils.getRelayNetworkStatus();
      console.log('Status:', status.availabilityName);
      
      if (status.availability === 100) { // Current
        clearInterval(check);
        resolve();
      }
    }, 500);
  });

  console.log('✅ Relay network ready!');

  // Get local ping location
  const myLocation = steam.networkingUtils.getLocalPingLocation();
  if (myLocation) {
    console.log('Local ping location acquired');
  }

  // List data centers
  const pops = steam.networkingUtils.getPOPList();
  console.log(`\nAvailable data centers: ${pops.length}`);

  // Show ping to first 5 POPs
  console.log('\nPing to data centers:');
  for (const pop of pops.slice(0, 5)) {
    const ping = steam.networkingUtils.getPingToDataCenter(pop.popId);
    console.log(`  ${pop.popCode}: ${ping >= 0 ? ping + 'ms' : 'N/A'}`);
  }

  // Get timestamp
  const timestamp = steam.networkingUtils.getLocalTimestamp();
  console.log(`\nNetworking timestamp: ${timestamp}`);

  steam.shutdown();
}

networkingUtilsDemo().catch(console.error);
```

---

## See Also

- [Matchmaking Manager](./MATCHMAKING_MANAGER.md) - Lobby and matchmaking functionality
- [Steam API Core](./STEAM_API_CORE.md) - Core initialization and callbacks
- [Steamworks SDK Setup](./STEAMWORKS_SDK_SETUP.md) - SDK installation guide
