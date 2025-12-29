# Networking Utils Manager

The Networking Utils Manager provides access to Steam's network utilities through the `ISteamNetworkingUtils` interface. It enables ping location estimation, relay network monitoring, data center information, and high-precision timestamps.

## Table of Contents

- [Quick Start](#quick-start)
- [Relay Network](#relay-network)
- [Ping Location](#ping-location)
- [Ping Estimation](#ping-estimation)
- [Data Centers (POPs)](#data-centers-pops)
- [Timestamps](#timestamps)
- [API Reference](#api-reference)
- [Testing](#testing)

## Quick Start

```typescript
import { SteamworksSDK, ESteamNetworkingAvailability } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: YOUR_APP_ID });

// Initialize relay network (required for ping features)
steam.networkingUtils.initRelayNetworkAccess();

// Wait for network to be ready
while (true) {
  steam.runCallbacks();
  const status = steam.networkingUtils.getRelayNetworkStatus();
  
  if (status.availability === ESteamNetworkingAvailability.Current) {
    console.log('Relay network ready!');
    break;
  }
  
  if (status.availability < 0) {
    console.error('Relay network failed:', status.availabilityName);
    break;
  }
  
  await new Promise(r => setTimeout(r, 100));
}

// Get your ping location (share with other players)
const myLocation = steam.networkingUtils.getLocalPingLocation();
console.log('My ping location:', myLocation?.locationString);

// Estimate ping to another player
const theirLocation = "waw=35+3,fra=43+4,..."; // received from matchmaking
const estimate = steam.networkingUtils.estimatePingFromString(theirLocation);
console.log('Estimated ping:', estimate.pingMs, 'ms');
```

## Relay Network

Steam's relay network provides the infrastructure for ping estimation and P2P networking. You must initialize it before using most networking features.

### Initializing the Network

```typescript
// Start relay network initialization
steam.networkingUtils.initRelayNetworkAccess();

// Poll until ready (usually takes 2-10 seconds)
const waitForNetwork = async (): Promise<boolean> => {
  const startTime = Date.now();
  const timeout = 30000; // 30 second timeout
  
  while (Date.now() - startTime < timeout) {
    steam.runCallbacks();
    
    const status = steam.networkingUtils.getRelayNetworkStatus();
    console.log(`Status: ${status.availabilityName}`);
    
    if (status.availability === ESteamNetworkingAvailability.Current) {
      return true; // Ready!
    }
    
    if (status.availability < 0) {
      console.error('Failed:', status.availabilityName);
      return false;
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  return false; // Timeout
};
```

### Network Status Values

| Value | Name | Description |
|-------|------|-------------|
| 100 | Current | Network is available and ready |
| 3 | Attempting | Currently connecting |
| 2 | Waiting | Waiting for dependencies |
| 1 | NeverTried | Haven't tried connecting yet |
| 0 | Unknown | Status unknown |
| -10 | Retrying | Previously failed, retrying |
| -100 | Previously | Was working, now failing |
| -101 | Failed | Failed to connect |
| -102 | CannotTry | Missing dependencies |

## Ping Location

Ping locations encode your network position relative to Steam's data centers. They can be shared with other players to estimate ping times without sending actual packets.

### Getting Your Ping Location

```typescript
const location = steam.networkingUtils.getLocalPingLocation();

if (location) {
  console.log('Location string:', location.locationString);
  console.log('Data age:', location.dataAge, 'seconds');
  
  // Send this string to other players via your matchmaking system
  matchmaking.setPlayerData('pingLocation', location.locationString);
} else {
  console.log('Ping location not available (network not ready?)');
}
```

### Ping Location Format

The location string looks like:
```
waw=35+3,fra=43+4,lhr=45+4,ams4=46+4,vie=53+5/47+3
```

Each entry is `datacenter=ping+uncertainty` or `datacenter=ping+uncertainty/altping+altuncertainty`. This is an opaque string - just pass it as-is for ping estimation.

### Checking Data Freshness

```typescript
// Check if ping data was measured within the last 60 seconds
if (!steam.networkingUtils.checkPingDataUpToDate(60)) {
  console.log('Ping data is stale, refreshing...');
  steam.networkingUtils.initRelayNetworkAccess();
}
```

## Ping Estimation

Estimate network latency between players without sending actual ping packets.

### Estimate From Local Host

```typescript
// When you receive another player's ping location from matchmaking:
const theirLocation = matchmaking.getPlayerData(playerId, 'pingLocation');

const estimate = steam.networkingUtils.estimatePingFromString(theirLocation);

if (estimate.valid) {
  console.log(`Estimated ping to player: ${estimate.pingMs}ms`);
  
  if (estimate.pingMs < 50) {
    console.log('Excellent connection!');
  } else if (estimate.pingMs < 100) {
    console.log('Good connection');
  } else if (estimate.pingMs < 150) {
    console.log('Acceptable connection');
  } else {
    console.log('High latency - may affect gameplay');
  }
} else {
  console.log('Could not estimate ping:', estimate.error);
}
```

### Estimate Between Two Locations

Useful for server-side matchmaking where you have both players' locations:

```typescript
const player1Location = "waw=35+3,fra=43+4,...";
const player2Location = "iad=20+2,ord=35+3,...";

const estimate = steam.networkingUtils.estimatePingBetweenLocations(
  player1Location,
  player2Location
);

if (estimate.valid) {
  console.log(`Estimated ping between players: ${estimate.pingMs}ms`);
}
```

## Data Centers (POPs)

POPs (Points of Presence) are Steam's data centers around the world. You can query ping times to each one.

### Getting the POP List

```typescript
const pops = steam.networkingUtils.getPOPList();

console.log(`${pops.length} data centers available:`);

// Sort by direct ping
const sortedPops = [...pops]
  .filter(p => p.directPing > 0)
  .sort((a, b) => a.directPing - b.directPing);

for (const pop of sortedPops.slice(0, 10)) {
  console.log(`  ${pop.popCode}: ${pop.directPing}ms direct, ${pop.pingViaRelay}ms via relay`);
}
```

### POP Information

Each POP includes:

| Property | Type | Description |
|----------|------|-------------|
| `popId` | number | Internal uint32 ID |
| `popCode` | string | Human-readable code (e.g., 'waw', 'iad', 'ams4') |
| `directPing` | number | Direct ping in ms (-1 if unavailable) |
| `pingViaRelay` | number | Ping via relay network in ms |
| `viaRelayPOP` | number | ID of relay POP used |
| `viaRelayPOPCode` | string | Code of relay POP used |

### Common POP Codes

| Code | Location |
|------|----------|
| waw | Warsaw, Poland |
| fra | Frankfurt, Germany |
| lhr | London, UK |
| ams, ams4 | Amsterdam, Netherlands |
| par | Paris, France |
| vie | Vienna, Austria |
| sto, sto2 | Stockholm, Sweden |
| iad | Ashburn, Virginia, USA |
| ord | Chicago, USA |
| lax | Los Angeles, USA |
| sea, eat | Seattle, USA |
| sgp | Singapore |
| tyo | Tokyo, Japan |
| syd | Sydney, Australia |

### Getting Ping to Specific Data Center

```typescript
import { stringToPopId, popIdToString } from 'steamworks-ffi-node';

// Convert code to ID
const iadId = stringToPopId('iad');

// Get ping info
const pingInfo = steam.networkingUtils.getPingToDataCenter(iadId);
if (pingInfo) {
  console.log(`Ping to IAD: ${pingInfo.pingMs}ms`);
  console.log(`Via relay: ${popIdToString(pingInfo.viaRelayPOP)}`);
}

// Get direct ping only
const directPing = steam.networkingUtils.getDirectPingToPOP(iadId);
console.log(`Direct ping to IAD: ${directPing}ms`);
```

## Timestamps

High-precision local timestamps for measuring time intervals.

```typescript
// Measure operation duration with microsecond precision
const start = steam.networkingUtils.getLocalTimestamp();

// ... do some work ...

const end = steam.networkingUtils.getLocalTimestamp();
const elapsedMicroseconds = end - start;
const elapsedMs = Number(elapsedMicroseconds) / 1000;

console.log(`Operation took ${elapsedMs.toFixed(3)}ms`);
```

Note: The timestamp is relative to an arbitrary reference point and uses BigInt for precision.

## API Reference

### `initRelayNetworkAccess(): void`

Starts initializing the relay network. Call this before using ping features.

### `getRelayNetworkStatus(): RelayNetworkStatus`

Returns current relay network status including availability and debug info.

### `getLocalPingLocation(): PingLocation | null`

Gets your local ping location data for sharing with other players.

### `estimatePingFromString(remoteLocation: string): PingEstimate`

Estimates ping from your location to a remote player's location string.

### `estimatePingBetweenLocations(location1: string, location2: string): PingEstimate`

Estimates ping between two ping location strings.

### `checkPingDataUpToDate(maxAgeSeconds: number): boolean`

Checks if ping data has been refreshed within the specified time.

### `getPOPCount(): number`

Returns the number of available data centers.

### `getPOPList(): POPInfo[]`

Returns detailed information about all data centers including ping times.

### `getPingToDataCenter(popId: number): { pingMs: number; viaRelayPOP: number } | null`

Gets ping time to a specific data center via the relay network.

### `getDirectPingToPOP(popId: number): number`

Gets direct ping time to a specific POP (-1 if unavailable).

### `getLocalTimestamp(): bigint`

Returns a high-precision local timestamp in microseconds.

### `setDebugOutputLevel(level: ESteamNetworkingSocketsDebugOutputType): void`

Sets the debug output verbosity level.

## Testing

Run the test files to verify functionality:

```bash
# TypeScript tests
npm run test:networking:host:ts  # Shows your ping location and POP info
npm run test:networking:join:ts  # Estimates ping to a remote location

# JavaScript tests
npm run test:networking:host:js
npm run test:networking:join:js
```

### Host/Join Test Pattern

1. Run the host test on one machine:
   ```bash
   npm run test:networking:host:ts
   ```
   Copy the ping location string that's displayed.

2. Run the join test on another machine:
   ```bash
   npm run test:networking:join:ts "paste_ping_location_here"
   ```
   Or run it and paste the string when prompted.

This demonstrates cross-machine ping estimation using Steam's relay network.

## See Also

- [Steam ISteamNetworkingUtils Documentation](https://partner.steamgames.com/doc/api/ISteamNetworkingUtils)
- [Matchmaking Manager](./MATCHMAKING_MANAGER.md) - For lobby-based matchmaking
- [Friends Manager](./FRIENDS_MANAGER.md) - For social features
