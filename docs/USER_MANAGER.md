# User Manager API Documentation

Complete reference for Steam User functionality in Steamworks FFI.

## Overview

The `SteamUserManager` provides **100% coverage** of the ISteamUser interface with 28 functions for authentication, session tickets, license verification, voice recording, and user information.

## Quick Reference

| Category | Functions | Description |
|----------|-----------|-------------|
| [Login State](#login-state) | 1 | Check Steam login status |
| [Session Tickets](#session-tickets) | 3 | P2P/game server authentication tickets |
| [Auth Sessions](#auth-sessions) | 2 | Validate incoming auth tickets |
| [License Verification](#license-verification) | 1 | Check app/DLC ownership |
| [Encrypted Tickets](#encrypted-tickets) | 2 | Secure backend authentication |
| [Security Info](#security-info) | 2 | User security settings and NAT status |
| [User Info](#user-info) | 3 | Steam level, badges, data folder |
| [Market Eligibility](#market-eligibility) | 1 | Steam Market access status |
| [Store Auth URL](#store-auth-url) | 1 | In-game browser authentication |
| [Duration Control](#duration-control) | 2 | Anti-indulgence compliance (China) |
| [Game Advertising](#game-advertising) | 1 | Advertise game server to friends |
| [Voice Recording](#voice-recording) | 6 | Record and transmit voice chat |
| [Cleanup](#cleanup) | 1 | Cancel all active tickets |

---

## Login State

Check if the user is logged into Steam.

### `isLoggedOn()`

Check if the user is logged into Steam.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_BLoggedOn()` - Check login status

**Returns:** `boolean` - `true` if user is logged in

**Example:**
```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();

if (steam.user.isLoggedOn()) {
  console.log('User is logged into Steam');
} else {
  console.log('User is offline or not logged in');
}
```

---

## Session Tickets

Generate authentication tickets for P2P or game server authentication.

### `getAuthSessionTicket(steamNetworkingIdentity?)`

Get an auth session ticket for P2P or game server authentication.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_GetAuthSessionTicket()` - Create session ticket

**Parameters:**
- `steamNetworkingIdentity?: string` - Optional: restrict ticket to specific Steam ID or IP

**Returns:** `GetAuthSessionTicketResult`

**Type:**
```typescript
interface GetAuthSessionTicketResult {
  success: boolean;      // Whether the operation was successful
  authTicket: number;    // The auth ticket handle (0 if failed)
  ticketData: Buffer;    // The ticket data as a Buffer
  ticketSize: number;    // The actual ticket size in bytes
  error?: string;        // Error message if failed
}
```

**Example:**
```typescript
// Get a ticket for game server authentication
const result = steam.user.getAuthSessionTicket();
if (result.success) {
  console.log(`Got ticket handle: ${result.authTicket}`);
  console.log(`Ticket size: ${result.ticketSize} bytes`);
  
  // Send to server for validation
  sendToServer({
    ticket: result.ticketData,
    steamId: steam.getSteamId()
  });
}
```

---

### `getAuthTicketForWebApi(identity)`

Get an auth ticket for Steam Web API authentication.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_GetAuthTicketForWebApi()` - Create web API ticket

**Parameters:**
- `identity: string` - Service identifier (e.g., 'my-game-service')

**Returns:** `Promise<GetAuthTicketForWebApiResult>`

**Type:**
```typescript
interface GetAuthTicketForWebApiResult {
  success: boolean;      // Whether the operation was successful
  authTicket: number;    // The auth ticket handle (0 if failed)
  ticketData: Buffer;    // The ticket data as a Buffer
  ticketSize: number;    // The actual ticket size in bytes
  ticketHex: string;     // The ticket as a hex string (for web API usage)
  error?: string;        // Error message if failed
}
```

**Example:**
```typescript
// Get a web API ticket
const result = await steam.user.getAuthTicketForWebApi('my-backend');
if (result.success) {
  // Use hex string for API authentication
  const response = await fetch('https://api.example.com/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Steam-Auth-Ticket': result.ticketHex
    },
    body: JSON.stringify({ steamId: steam.getSteamId() })
  });
}
```

---

### `cancelAuthTicket(authTicket)`

Cancel an auth ticket previously obtained.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_CancelAuthTicket()` - Cancel auth ticket

**Parameters:**
- `authTicket: number` - The ticket handle to cancel

**Returns:** `void`

**Example:**
```typescript
// Get a ticket
const ticket = steam.user.getAuthSessionTicket();

// ... use the ticket ...

// Clean up when done
steam.user.cancelAuthTicket(ticket.authTicket);
```

---

## Auth Sessions

Validate incoming authentication tickets from other players.

### `beginAuthSession(ticketData, steamId)`

Begin validating an auth session ticket.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_BeginAuthSession()` - Start auth session validation

**Parameters:**
- `ticketData: Buffer` - The raw ticket data received from the client
- `steamId: string` - The Steam ID of the user who sent the ticket

**Returns:** `BeginAuthSessionResult`

**Type:**
```typescript
interface BeginAuthSessionResult {
  success: boolean;                     // Whether the initial validation passed
  result: EBeginAuthSessionResult;      // The result code from BeginAuthSession
  error?: string;                       // Error message if failed
}

enum EBeginAuthSessionResult {
  OK = 0,                  // Ticket is valid for this game and this steamID
  InvalidTicket = 1,       // Ticket is not valid
  DuplicateRequest = 2,    // A ticket has already been submitted for this steamID
  InvalidVersion = 3,      // Ticket is from an incompatible interface version
  GameMismatch = 4,        // Ticket is not for this game
  ExpiredTicket = 5,       // Ticket has expired
}
```

**Example:**
```typescript
// Server receives ticket from client
function onClientConnect(ticketData: Buffer, clientSteamId: string) {
  const result = steam.user.beginAuthSession(ticketData, clientSteamId);
  
  if (result.success) {
    console.log(`Auth session started for ${clientSteamId}`);
  } else {
    console.log(`Auth failed: ${result.error}`);
    disconnectClient(clientSteamId, result.result);
  }
}
```

---

### `endAuthSession(steamId)`

End an auth session previously started with beginAuthSession().

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_EndAuthSession()` - End auth session

**Parameters:**
- `steamId: string` - The Steam ID of the user whose session to end

**Returns:** `void`

**Example:**
```typescript
function onClientDisconnect(clientSteamId: string) {
  steam.user.endAuthSession(clientSteamId);
  console.log(`Ended auth session for ${clientSteamId}`);
}
```

---

## License Verification

Check if a user owns specific apps or DLC.

### `userHasLicenseForApp(steamId, appId)`

Check if a user has a license for a specific app.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_UserHasLicenseForApp()` - Check license ownership

**Parameters:**
- `steamId: string` - The Steam ID of the user to check
- `appId: number` - The App ID to check ownership for

**Returns:** `EUserHasLicenseForAppResult`

**Type:**
```typescript
enum EUserHasLicenseForAppResult {
  HasLicense = 0,        // User has a license for specified app
  DoesNotHaveLicense = 1, // User does not have a license for the specified app
  NoAuth = 2,            // User has not been authenticated
}
```

**Example:**
```typescript
// Check if user owns a DLC
const dlcResult = steam.user.userHasLicenseForApp(clientSteamId, 12345);

if (dlcResult === EUserHasLicenseForAppResult.HasLicense) {
  console.log('User owns the DLC');
  grantDLCContent(clientSteamId);
} else if (dlcResult === EUserHasLicenseForAppResult.DoesNotHaveLicense) {
  console.log('User does not own the DLC');
} else {
  console.log('User not authenticated');
}
```

---

## Encrypted Tickets

Request and retrieve encrypted app tickets for secure backend authentication.

### `requestEncryptedAppTicket(dataToInclude?)`

Request an encrypted app ticket from Steam.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_RequestEncryptedAppTicket()` - Request encrypted ticket

**Parameters:**
- `dataToInclude?: Buffer` - Optional data to include in the ticket (max 128 bytes)

**Returns:** `Promise<RequestEncryptedAppTicketResult>`

**Type:**
```typescript
interface RequestEncryptedAppTicketResult {
  success: boolean;    // Whether the request was successful
  error?: string;      // Error message if failed
}
```

**Example:**
```typescript
// Request an encrypted ticket
const result = await steam.user.requestEncryptedAppTicket();
if (result.success) {
  // Now retrieve the ticket
  const ticket = steam.user.getEncryptedAppTicket();
  if (ticket.success) {
    // Send to your backend for verification
    sendToBackend(ticket.ticketData);
  }
}
```

---

### `getEncryptedAppTicket()`

Get the encrypted app ticket after requesting it.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_GetEncryptedAppTicket()` - Retrieve encrypted ticket

**Returns:** `GetEncryptedAppTicketResult`

**Type:**
```typescript
interface GetEncryptedAppTicketResult {
  success: boolean;      // Whether the operation was successful
  ticketData: Buffer;    // The encrypted ticket data
  ticketSize: number;    // The actual ticket size in bytes
  ticketHex: string;     // The ticket as a hex string
  error?: string;        // Error message if failed
}
```

**Example:**
```typescript
const result = steam.user.getEncryptedAppTicket();
if (result.success) {
  console.log(`Got encrypted ticket (${result.ticketSize} bytes)`);
  // Send ticketHex to your backend
  authenticateWithBackend(result.ticketHex);
}
```

---

## Security Info

Get user security settings and network status.

### `getUserSecurityInfo()`

Get the user's security settings.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_BIsPhoneVerified()` - Check phone verification
- `SteamAPI_ISteamUser_BIsTwoFactorEnabled()` - Check 2FA status
- `SteamAPI_ISteamUser_BIsPhoneIdentifying()` - Check phone identifying
- `SteamAPI_ISteamUser_BIsPhoneRequiringVerification()` - Check phone verification requirement

**Returns:** `UserSecurityInfo`

**Type:**
```typescript
interface UserSecurityInfo {
  phoneVerified: boolean;             // Whether the user's phone number is verified
  twoFactorEnabled: boolean;          // Whether the user has 2FA enabled
  phoneIdentifying: boolean;          // Whether the user's phone number is identifying
  phoneRequiringVerification: boolean; // Whether the user's phone number needs verification
}
```

**Example:**
```typescript
const security = steam.user.getUserSecurityInfo();

if (security.twoFactorEnabled) {
  console.log('User has 2FA enabled');
}

if (security.phoneVerified) {
  console.log('Phone number is verified');
}
```

---

### `isBehindNAT()`

Check if the user appears to be behind a NAT.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_BIsBehindNAT()` - Check NAT status

**Returns:** `boolean` - `true` if user is behind NAT

**Example:**
```typescript
if (steam.user.isBehindNAT()) {
  console.log('User is behind NAT - may need relay');
}
```

---

## User Info

Get information about the current user.

### `getPlayerSteamLevel()`

Get the user's Steam level.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_GetPlayerSteamLevel()` - Get Steam level

**Returns:** `number` - The user's Steam level, or 0 if not available

**Example:**
```typescript
const level = steam.user.getPlayerSteamLevel();
console.log(`Steam Level: ${level}`);
```

---

### `getGameBadgeLevel(series, foil)`

Get the user's game badge level.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_GetGameBadgeLevel()` - Get badge level

**Parameters:**
- `series: number` - The badge series (usually 1 for games with one badge set)
- `foil: boolean` - Whether to get the foil badge (true) or regular badge (false)

**Returns:** `number` - The badge level, or 0 if none

**Example:**
```typescript
// Get regular badge level
const regularLevel = steam.user.getGameBadgeLevel(1, false);
console.log(`Regular badge level: ${regularLevel}`);

// Get foil badge level
const foilLevel = steam.user.getGameBadgeLevel(1, true);
console.log(`Foil badge level: ${foilLevel}`);
```

---

### `getUserDataFolder()`

Get the path to the local user data folder.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_GetUserDataFolder()` - Get user data path

**Returns:** `string | null` - The path to the user data folder, or null if not available

**Example:**
```typescript
const folder = steam.user.getUserDataFolder();
if (folder) {
  console.log(`User data folder: ${folder}`);
  // Typically: C:\Program Files\Steam\userdata\<steamid>\<appid>\local
}
```

---

## Market Eligibility

Check if the user can use the Steam Community Market.

### `getMarketEligibility()`

Get the user's Steam Community Market eligibility.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_GetMarketEligibility()` - Get market eligibility

**Returns:** `Promise<MarketEligibilityResult>`

**Type:**
```typescript
interface MarketEligibilityResult {
  allowed: boolean;             // Whether the user is allowed to use the market
  notAllowedReason: number;     // The reason why the user is not allowed (if not allowed)
  allowedAtTime: number;        // When the user will be allowed (Unix timestamp)
  steamGuardRequiredDays: number; // Days of Steam Guard required
  newDeviceCooldownDays: number;  // New device cooldown days
}
```

**Example:**
```typescript
const eligibility = await steam.user.getMarketEligibility();
if (eligibility.allowed) {
  console.log('User can use the Steam Market');
} else {
  console.log(`Market restricted: reason ${eligibility.notAllowedReason}`);
}
```

---

## Store Auth URL

Generate authenticated URLs for in-game browser checkout.

### `requestStoreAuthURL(redirectURL)`

Request an authenticated URL for in-game browser store checkout.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_RequestStoreAuthURL()` - Request authenticated URL

**Parameters:**
- `redirectURL: string` - The URL to redirect to after authentication

**Returns:** `Promise<StoreAuthURLResult>`

**Type:**
```typescript
interface StoreAuthURLResult {
  success: boolean;    // Whether the request was successful
  url: string | null;  // The authenticated URL for in-game browser checkout
  error?: string;      // Error message if failed
}
```

**Example:**
```typescript
const result = await steam.user.requestStoreAuthURL('https://store.steampowered.com/');
if (result.success && result.url) {
  // Open in-game browser immediately (URL has short lifetime)
  openBrowser(result.url);
}
```

**Remarks:**
- The URL has a very short lifetime (~seconds) to prevent history-snooping attacks
- The resulting auth cookie lasts ~1 day; consider refreshing every 12 hours

---

## Duration Control

Support for anti-indulgence compliance (primarily for China region).

### `getDurationControl()`

Get duration control status for the current user.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_GetDurationControl()` - Get duration control status

**Returns:** `Promise<DurationControlResult>`

**Type:**
```typescript
interface DurationControlResult {
  success: boolean;        // Whether the call was successful
  appId: number;           // App ID generating playtime
  applicable: boolean;     // Whether duration control applies to this user + game
  secondsLast5Hours: number; // Seconds of playtime in last 5 hours
  progress: number;        // Recommended progress (0 = ok, 1 = exit game)
  notification: number;    // Notification to show (0 = none)
  secondsToday: number;    // Playtime on current calendar day in seconds
  secondsRemaining: number; // Playtime remaining until regulatory limit in seconds
}
```

**Example:**
```typescript
const duration = await steam.user.getDurationControl();
if (duration.applicable) {
  console.log(`Time remaining: ${duration.secondsRemaining} seconds`);
  if (duration.progress === 1) {
    console.log('Player should exit the game');
  }
}
```

---

### `setDurationControlOnlineState(state)`

Set the duration control online state.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_BSetDurationControlOnlineState()` - Set online state

**Parameters:**
- `state: EDurationControlOnlineState` - The online state to set

**Type:**
```typescript
enum EDurationControlOnlineState {
  Invalid = 0,       // Default state
  Offline = 1,       // Player is in offline mode
  Online = 2,        // Player is online
  OnlineHighPri = 3, // Player is online in high priority mode (competitive match)
}
```

**Returns:** `boolean` - `true` if successful

**Example:**
```typescript
// Player is in an online match
steam.user.setDurationControlOnlineState(EDurationControlOnlineState.Online);

// Player is in an important competitive match
steam.user.setDurationControlOnlineState(EDurationControlOnlineState.OnlineHighPri);

// Player is playing offline
steam.user.setDurationControlOnlineState(EDurationControlOnlineState.Offline);
```

---

## Game Advertising

Advertise game server information to friends.

### `advertiseGame(serverSteamId, serverIP, serverPort)`

Advertise the game server to friends for joining.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_AdvertiseGame()` - Advertise game server

**Parameters:**
- `serverSteamId: string` - The Steam ID of the game server (use '0' for none)
- `serverIP: number` - The IP address of the server (in host byte order)
- `serverPort: number` - The port of the server

**Returns:** `void`

**Example:**
```typescript
// Advertise that the user is on a game server
steam.user.advertiseGame('90071234567890', ipToInt('192.168.1.100'), 27015);

// Clear the advertisement
steam.user.advertiseGame('0', 0, 0);
```

---

## Voice Recording

Record and transmit voice chat audio.

### `startVoiceRecording()`

Start voice recording.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_StartVoiceRecording()` - Start recording

**Returns:** `void`

**Example:**
```typescript
// Start recording when push-to-talk key is pressed
steam.user.startVoiceRecording();

// In your game loop, retrieve and send voice data
const voice = steam.user.getVoice();
if (voice.result === EVoiceResult.OK) {
  sendToOtherPlayers(voice.voiceData);
}
```

---

### `stopVoiceRecording()`

Stop voice recording.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_StopVoiceRecording()` - Stop recording

**Returns:** `void`

**Example:**
```typescript
// Stop recording when push-to-talk key is released
steam.user.stopVoiceRecording();

// Keep fetching voice data until recording fully stops
let voice = steam.user.getVoice();
while (voice.result !== EVoiceResult.NotRecording) {
  if (voice.result === EVoiceResult.OK) {
    sendToOtherPlayers(voice.voiceData);
  }
  voice = steam.user.getVoice();
}
```

---

### `getAvailableVoice()`

Get the amount of voice data available.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_GetAvailableVoice()` - Get available voice data size

**Returns:** `GetAvailableVoiceResult`

**Type:**
```typescript
interface GetAvailableVoiceResult {
  result: EVoiceResult;    // Voice result code
  compressedBytes: number; // Number of compressed bytes available
}

enum EVoiceResult {
  OK = 0,                // Voice call was successful
  NotInitialized = 1,    // Steam voice chat has not been initialized
  NotRecording = 2,      // Voice recording is not active
  NoData = 3,            // No data is available (microphone may be off or silent)
  BufferTooSmall = 4,    // The provided buffer was too small
  DataCorrupted = 5,     // Voice data is corrupted
  Restricted = 6,        // Voice chat is restricted for this user
  UnsupportedCodec = 7,  // The voice codec is not supported
  ReceiverOutOfDate = 8, // The receiver is using an outdated voice codec
  ReceiverDidNotAnswer = 9, // The receiver did not answer
}
```

**Example:**
```typescript
const available = steam.user.getAvailableVoice();
if (available.result === EVoiceResult.OK && available.compressedBytes > 0) {
  console.log(`${available.compressedBytes} bytes of voice data ready`);
}
```

---

### `getVoice(bufferSize?)`

Get recorded voice data.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_GetVoice()` - Get recorded voice data

**Parameters:**
- `bufferSize?: number` - Size of the buffer to allocate for voice data (default: 8192)

**Returns:** `GetVoiceResult`

**Type:**
```typescript
interface GetVoiceResult {
  result: EVoiceResult;        // Voice result code
  voiceData: Buffer | null;    // Buffer containing compressed voice data (if successful)
  bytesWritten: number;        // Number of bytes written to the buffer
}
```

**Example:**
```typescript
// In your game loop:
const voice = steam.user.getVoice();

switch (voice.result) {
  case EVoiceResult.OK:
    // Send compressed voice data to other players
    network.broadcast(voice.voiceData);
    break;
  case EVoiceResult.NoData:
    // Microphone is silent, nothing to do
    break;
  case EVoiceResult.NotRecording:
    // Recording has stopped
    break;
}
```

---

### `decompressVoice(compressedData, sampleRate, bufferSize?)`

Decompress voice data.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_DecompressVoice()` - Decompress voice data

**Parameters:**
- `compressedData: Buffer` - The compressed voice data to decompress
- `sampleRate: number` - The desired output sample rate (11025-48000)
- `bufferSize?: number` - Size of the output buffer (default: 20480)

**Returns:** `DecompressVoiceResult`

**Type:**
```typescript
interface DecompressVoiceResult {
  result: EVoiceResult;       // Voice result code
  audioData: Buffer | null;   // Buffer containing decompressed PCM audio data
  bytesWritten: number;       // Number of bytes written to the buffer
}
```

**Example:**
```typescript
// Receive compressed voice data from another player
const compressedData = network.receiveVoiceData();

// Decompress at optimal sample rate
const sampleRate = steam.user.getVoiceOptimalSampleRate();
const audio = steam.user.decompressVoice(compressedData, sampleRate);

if (audio.result === EVoiceResult.OK) {
  // Play the PCM audio through your audio system
  audioPlayer.playPCM(audio.audioData, sampleRate);
}
```

---

### `getVoiceOptimalSampleRate()`

Get the optimal sample rate for voice decompression.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUser_GetVoiceOptimalSampleRate()` - Get optimal sample rate

**Returns:** `number` - The optimal sample rate (typically 11025, 22050, or 44100)

**Example:**
```typescript
const optimalRate = steam.user.getVoiceOptimalSampleRate();
console.log(`Optimal sample rate: ${optimalRate} Hz`);

// Use for decompression
const audio = steam.user.decompressVoice(voiceData, optimalRate);
```

---

## Cleanup

Clean up resources when shutting down.

### `cancelAllTickets()`

Cancel all active auth tickets.

**Returns:** `void`

**Example:**
```typescript
// Clean up when shutting down
steam.user.cancelAllTickets();
```

---

## Test Files

Test files are available in the repository:

- **TypeScript tests:** `tests/ts/test-user.ts`
- **JavaScript tests:** `tests/js/test-user.js`

Run tests using npm:
```bash
# TypeScript tests
npm run test:user:ts

# JavaScript tests
npm run test:user:js
```
