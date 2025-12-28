# Apps Manager API Documentation

Complete reference for Steam Apps/DLC functionality in Steamworks FFI.

## Overview

The `SteamAppsManager` provides **28 functions** covering DLC ownership, app verification, beta branches, and app metadata through the ISteamApps interface.

## Quick Reference

| Category | Functions | Description |
|----------|-----------|-------------|
| [Ownership Checks](#ownership-checks) | 9 | Verify app/DLC subscription status |
| [DLC Functions](#dlc-functions) | 8 | DLC ownership, installation, download |
| [App Information](#app-information) | 7 | Languages, build info, install paths |
| [Beta Branches](#beta-branches) | 5 | Query and switch beta branches |
| [Launch Parameters](#launch-parameters) | 2 | Steam URL launch parameters |
| [Timed Trial](#timed-trial) | 1 | Check trial status and time |
| [Miscellaneous](#miscellaneous) | 1 | Content verification |

---

## Ownership Checks

Functions for verifying app and DLC ownership status.

### `isSubscribed()`

Checks if the user has access to the current app.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_BIsSubscribed()` - Check current app subscription

**Returns:** `boolean` - `true` if user owns or has access to the app

**Example:**
```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

if (steam.apps.isSubscribed()) {
  console.log('User has access to this app');
}
```

**Notes:**
- Returns true for owned games, free weekends, Family Sharing, etc.
- Use more specific methods to determine the type of access

---

### `isSubscribedApp(appId)`

Checks if the user owns a specific app.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_BIsSubscribedApp()` - Check specific app subscription

**Parameters:**
- `appId: AppId` - App ID to check ownership for

**Returns:** `boolean` - `true` if user owns the specified app

**Example:**
```typescript
// Check if user owns the full game (for a demo)
const FULL_GAME_ID = 123456;
if (steam.apps.isSubscribedApp(FULL_GAME_ID)) {
  console.log('User owns the full game - hide purchase prompts');
}
```

**Notes:**
- Useful for checking if user owns related games (demos, sequels, etc.)
- For DLC, use `isDlcInstalled()` instead

---

### `isAppInstalled(appId)`

Checks if an app is installed (regardless of ownership).

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_BIsAppInstalled()` - Check if app is installed

**Parameters:**
- `appId: AppId` - App ID to check

**Returns:** `boolean` - `true` if app is installed on this machine

**Example:**
```typescript
if (steam.apps.isAppInstalled(480)) {
  console.log('Spacewar is installed');
}
```

---

### `isLowViolence()`

Checks if running in low violence mode.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_BIsLowViolence()` - Check low violence mode

**Returns:** `boolean` - `true` if low violence mode is active

**Notes:**
- Some regions require reduced violence content
- Use this to swap assets or disable violent content

---

### `isCybercafe()`

Checks if running on a cybercafe account.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_BIsCybercafe()` - Check cybercafe status

**Returns:** `boolean` - `true` if running on a cybercafe account

---

### `isVACBanned()`

Checks if user has a VAC ban.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_BIsVACBanned()` - Check VAC ban status

**Returns:** `boolean` - `true` if user has a VAC ban

---

### `isSubscribedFromFreeWeekend()`

Checks if playing through a free weekend.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_BIsSubscribedFromFreeWeekend()` - Check free weekend access

**Returns:** `boolean` - `true` if user is playing via free weekend

**Example:**
```typescript
if (steam.apps.isSubscribedFromFreeWeekend()) {
  showPurchasePrompt('Get 20% off during the free weekend!');
}
```

**Notes:**
- Use this to show purchase prompts to free weekend players
- Returns false for users with a retail or other license type

---

### `isSubscribedFromFamilySharing()`

Checks if playing through Steam Family Sharing.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_BIsSubscribedFromFamilySharing()` - Check Family Sharing

**Returns:** `boolean` - `true` if user is borrowing via Family Sharing

**Example:**
```typescript
if (steam.apps.isSubscribedFromFamilySharing()) {
  const ownerId = steam.apps.getAppOwner();
  console.log(`Playing via Family Sharing from ${ownerId}`);
}
```

**Notes:**
- If true, call `getAppOwner()` to get the lender's Steam ID
- Some games restrict features for borrowed copies

---

### `getOwnershipInfo()`

Gets comprehensive ownership information in one call.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_BIsSubscribed()` - Check subscription
- `SteamAPI_ISteamApps_BIsSubscribedFromFreeWeekend()` - Check free weekend
- `SteamAPI_ISteamApps_BIsSubscribedFromFamilySharing()` - Check Family Sharing
- `SteamAPI_ISteamApps_BIsAppInstalled()` - Check installation
- `SteamAPI_ISteamApps_GetEarliestPurchaseUnixTime()` - Get purchase time
- `SteamAPI_ISteamApps_GetAppOwner()` - Get owner Steam ID

**Returns:** `AppOwnershipInfo`

**Type:**
```typescript
interface AppOwnershipInfo {
  isSubscribed: boolean;
  isSubscribedFromFreeWeekend: boolean;
  isSubscribedFromFamilySharing: boolean;
  isInstalled: boolean;
  earliestPurchaseTime: number;  // Unix timestamp
  ownerId: bigint;               // Steam ID of actual owner
}
```

**Example:**
```typescript
const ownership = steam.apps.getOwnershipInfo();

console.log(`Subscribed: ${ownership.isSubscribed}`);
console.log(`Free Weekend: ${ownership.isSubscribedFromFreeWeekend}`);
console.log(`Family Sharing: ${ownership.isSubscribedFromFamilySharing}`);
console.log(`Owner: ${ownership.ownerId}`);
```

---

## DLC Functions

Functions for managing DLC content.

### `isDlcInstalled(dlcAppId)`

Checks if a DLC is owned AND installed.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_BIsDlcInstalled()` - Check DLC ownership and installation

**Parameters:**
- `dlcAppId: AppId` - App ID of the DLC

**Returns:** `boolean` - `true` if DLC is owned and installed

**Example:**
```typescript
const EXPANSION_DLC = 123456;
const SOUNDTRACK_DLC = 123457;

if (steam.apps.isDlcInstalled(EXPANSION_DLC)) {
  enableExpansionContent();
}

if (steam.apps.isDlcInstalled(SOUNDTRACK_DLC)) {
  enableMusicPlayer();
}
```

**Notes:**
- Checks both ownership AND installation status
- For optional DLC, user may own but not have downloaded

---

### `getDLCCount()`

Gets the number of DLC items for this app.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_GetDLCCount()` - Get DLC count

**Returns:** `number` - Number of DLC items available

**Example:**
```typescript
const dlcCount = steam.apps.getDLCCount();
console.log(`This game has ${dlcCount} DLC items`);
```

---

### `getDLCDataByIndex(index)`

Gets data about a DLC by index.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_BGetDLCDataByIndex()` - Get DLC metadata by index

**Parameters:**
- `index: number` - DLC index (0 to getDLCCount()-1)

**Returns:** `DLCData | null`

**Type:**
```typescript
interface DLCData {
  appId: AppId;       // DLC App ID
  available: boolean; // User owns this DLC
  name: string;       // Display name
}
```

**Example:**
```typescript
const dlc = steam.apps.getDLCDataByIndex(0);
if (dlc) {
  console.log(`DLC: ${dlc.name} (${dlc.appId})`);
  console.log(`Available: ${dlc.available}`);
}
```

---

### `getAllDLC()`

Gets all DLC data at once.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_GetDLCCount()` - Get count
- `SteamAPI_ISteamApps_BGetDLCDataByIndex()` - Get each DLC

**Returns:** `DLCData[]` - Array of all DLC data

**Example:**
```typescript
const allDlc = steam.apps.getAllDLC();

console.log(`This game has ${allDlc.length} DLC items:`);
allDlc.forEach(dlc => {
  const status = dlc.available ? '✓ Owned' : '✗ Not Owned';
  console.log(`  ${dlc.name}: ${status}`);
});
```

---

### `installDLC(dlcAppId)`

Triggers download/installation of optional DLC.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_InstallDLC()` - Start DLC installation

**Parameters:**
- `dlcAppId: AppId` - App ID of the DLC to install

**Returns:** `void`

**Example:**
```typescript
// User clicks "Download Expansion"
steam.apps.installDLC(EXPANSION_DLC);
showNotification('Expansion download started in Steam');
```

**Notes:**
- DLC must be owned by the user
- Download happens through Steam client
- Listen for DlcInstalled_t callback for completion

---

### `uninstallDLC(dlcAppId)`

Removes optional DLC files from disk.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_UninstallDLC()` - Remove DLC files

**Parameters:**
- `dlcAppId: AppId` - App ID of the DLC to remove

**Returns:** `void`

**Example:**
```typescript
steam.apps.uninstallDLC(EXPANSION_DLC);
console.log('DLC removed to free up disk space');
```

**Notes:**
- User still owns the DLC
- Only removes local files to free disk space
- Can be reinstalled anytime with `installDLC()`

---

### `getDlcDownloadProgress(dlcAppId)`

Gets download progress for a DLC.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_GetDlcDownloadProgress()` - Get download progress

**Parameters:**
- `dlcAppId: AppId` - App ID of the DLC

**Returns:** `DLCDownloadProgress | null`

**Type:**
```typescript
interface DLCDownloadProgress {
  bytesDownloaded: bigint;
  bytesTotal: bigint;
  percentComplete: number;  // 0-100
}
```

**Example:**
```typescript
function updateDownloadUI(dlcId: number) {
  const progress = steam.apps.getDlcDownloadProgress(dlcId);
  if (progress) {
    progressBar.setValue(progress.percentComplete);
    console.log(`${progress.bytesDownloaded}/${progress.bytesTotal} bytes`);
  }
}
```

**Notes:**
- Returns null if DLC is not currently downloading

---

### `setDlcContext(dlcAppId)`

Sets the current DLC context for usage tracking.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_SetDlcContext()` - Set DLC context for tracking

**Parameters:**
- `dlcAppId: AppId` - DLC App ID being played (0 to clear)

**Returns:** `boolean` - `true` if successful

**Example:**
```typescript
// Player entered expansion content
steam.apps.setDlcContext(EXPANSION_DLC);

// Player returned to base game
steam.apps.setDlcContext(0);
```

**Notes:**
- Allows Steam to track usage of major DLC extensions
- Set to 0 when player leaves DLC content

---

## App Information

Functions for retrieving app metadata.

### `getCurrentGameLanguage()`

Gets the current game language.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_GetCurrentGameLanguage()` - Get current language

**Returns:** `string` - Language code (e.g., 'english', 'german', 'french')

**Example:**
```typescript
const lang = steam.apps.getCurrentGameLanguage();
loadLocalization(`locales/${lang}.json`);
```

**Notes:**
- Returns the language the user has set for the game in Steam
- Common values: english, german, french, spanish, russian, etc.

---

### `getAvailableGameLanguages()`

Gets all available game languages.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_GetAvailableGameLanguages()` - Get supported languages

**Returns:** `string` - Comma-separated list of language codes

**Example:**
```typescript
const langs = steam.apps.getAvailableGameLanguages();
// "english,german,french,spanish,russian"
const langArray = langs.split(',');
console.log(`Supported languages: ${langArray.join(', ')}`);
```

---

### `getEarliestPurchaseUnixTime(appId)`

Gets the Unix timestamp of the earliest purchase.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_GetEarliestPurchaseUnixTime()` - Get purchase time

**Parameters:**
- `appId: AppId` - App ID (0 for current app)

**Returns:** `number` - Unix timestamp or 0 if not owned

**Example:**
```typescript
const purchaseTime = steam.apps.getEarliestPurchaseUnixTime(0);
const date = new Date(purchaseTime * 1000);
console.log(`You've owned this game since ${date.toLocaleDateString()}`);
```

---

### `getAppInstallDir(appId)`

Gets the installation directory for an app.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_GetAppInstallDir()` - Get install path

**Parameters:**
- `appId: AppId` - App ID to get path for

**Returns:** `string` - Full installation path or empty string

**Example:**
```typescript
const installPath = steam.apps.getAppInstallDir(480);
// "/home/user/.steam/steam/steamapps/common/Spacewar"
console.log(`Installed at: ${installPath}`);
```

---

### `getAppOwner()`

Gets the Steam ID of the app owner.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_GetAppOwner()` - Get owner Steam ID

**Returns:** `bigint` - Steam ID (may differ from current user if Family Sharing)

**Example:**
```typescript
const ownerId = steam.apps.getAppOwner();
if (steam.apps.isSubscribedFromFamilySharing()) {
  console.log(`Borrowed from: ${ownerId}`);
}
```

---

### `getAppBuildId()`

Gets the current build ID.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_GetAppBuildId()` - Get build ID

**Returns:** `number` - Build ID (may change with backend updates)

**Example:**
```typescript
const buildId = steam.apps.getAppBuildId();
console.log(`Running build: ${buildId}`);
```

---

### `getInstalledDepots(appId, maxDepots)`

Gets installed depot IDs for an app.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_GetInstalledDepots()` - Get installed depots

**Parameters:**
- `appId: AppId` - App ID to check
- `maxDepots: number` - Maximum number of depots to return (default 32)

**Returns:** `DepotId[]` - Array of installed depot IDs in mount order

**Example:**
```typescript
const depots = steam.apps.getInstalledDepots(480);
console.log(`Installed depots: ${depots.join(', ')}`);
```

---

### `getBuildInfo()`

Gets comprehensive build information.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_GetAppBuildId()` - Get build ID
- `SteamAPI_ISteamApps_GetCurrentBetaName()` - Get beta name
- `SteamAPI_ISteamApps_GetAppInstallDir()` - Get install path

**Returns:** `AppBuildInfo`

**Type:**
```typescript
interface AppBuildInfo {
  buildId: number;    // Current build ID
  betaName: string;   // Current beta branch ('public' if default)
  installDir: string; // Installation path
}
```

**Example:**
```typescript
const info = steam.apps.getBuildInfo();
console.log(`Build: ${info.buildId}`);
console.log(`Beta: ${info.betaName}`);
console.log(`Path: ${info.installDir}`);
```

---

## Beta Branches

Functions for managing beta branches.

### `getCurrentBetaName()`

Gets the name of the current beta branch.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_GetCurrentBetaName()` - Get current beta name

**Returns:** `string` - Beta name or 'public' if on default branch

**Example:**
```typescript
const beta = steam.apps.getCurrentBetaName();
console.log(`Current beta: ${beta}`);
```

---

### `getNumBetas()`

Gets counts of available beta branches.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_GetNumBetas()` - Get beta counts

**Returns:** `{ total: number; available: number; private: number }`

**Example:**
```typescript
const betas = steam.apps.getNumBetas();
console.log(`Total: ${betas.total}`);
console.log(`Available: ${betas.available}`);
console.log(`Private: ${betas.private}`);
```

---

### `getBetaInfo(index)`

Gets information about a beta branch.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_GetBetaInfo()` - Get beta details by index

**Parameters:**
- `index: number` - Beta index (0 to total-1)

**Returns:** `BetaInfo | null`

**Type:**
```typescript
interface BetaInfo {
  name: string;
  description: string;
  buildId: number;
  flags: number;  // EBetaBranchFlags
}
```

**Example:**
```typescript
const beta = steam.apps.getBetaInfo(0);
if (beta) {
  console.log(`${beta.name}: ${beta.description}`);
  console.log(`Build: ${beta.buildId}`);
}
```

---

### `getAllBetas()`

Gets all beta branch information.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_GetNumBetas()` - Get count
- `SteamAPI_ISteamApps_GetBetaInfo()` - Get each beta

**Returns:** `BetaInfo[]` - Array of all beta info

**Example:**
```typescript
const betas = steam.apps.getAllBetas();
betas.forEach(beta => {
  console.log(`${beta.name}: ${beta.description}`);
});
```

---

### `setActiveBeta(betaName)`

Switches to a different beta branch.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_SetActiveBeta()` - Set active beta

**Parameters:**
- `betaName: string` - Name of the beta to activate

**Returns:** `boolean` - `true` if successful

**Example:**
```typescript
const success = steam.apps.setActiveBeta('experimental');
if (success) {
  console.log('Please restart the game to apply beta');
}
```

**Notes:**
- May require game restart for Steam to update files

---

## Launch Parameters

Functions for accessing Steam URL launch parameters.

### `getLaunchQueryParam(key)`

Gets a specific launch query parameter.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_GetLaunchQueryParam()` - Get query parameter

**Parameters:**
- `key: string` - Parameter name to retrieve

**Returns:** `string` - Parameter value or empty string

**Example:**
```typescript
// Game launched via steam://run/480//?server=192.168.1.1&port=27015
const server = steam.apps.getLaunchQueryParam('server');
const port = steam.apps.getLaunchQueryParam('port');
connectToServer(server, parseInt(port));
```

**Notes:**
- Launched via: `steam://run/<appid>//?param1=value1&param2=value2`
- Parameter names starting with '@' are reserved for internal use
- Parameter names starting with '_' are reserved for Steam features

---

### `getLaunchCommandLine()`

Gets the full launch command line.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_GetLaunchCommandLine()` - Get command line

**Returns:** `string` - Command line string or empty string

**Example:**
```typescript
const cmdLine = steam.apps.getLaunchCommandLine();
console.log(`Launch command: ${cmdLine}`);
```

**Notes:**
- Launched via: `steam://run/<appid>//<command line>`
- More secure than OS command line
- Used for rich presence joins

---

## Timed Trial

Functions for checking timed trial status.

### `getTimedTrialStatus()`

Checks if running as a timed trial.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_BIsTimedTrial()` - Check timed trial status

**Returns:** `TimedTrialStatus | null`

**Type:**
```typescript
interface TimedTrialStatus {
  isTimedTrial: boolean;
  secondsAllowed: number;
  secondsPlayed: number;
  secondsRemaining: number;
}
```

**Example:**
```typescript
const trial = steam.apps.getTimedTrialStatus();
if (trial?.isTimedTrial) {
  const minutes = Math.floor(trial.secondsRemaining / 60);
  showTrialBanner(`${minutes} minutes remaining in trial`);
}
```

---

## Miscellaneous

### `markContentCorrupt(missingFilesOnly)`

Signals Steam to verify game files.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamApps_MarkContentCorrupt()` - Mark content for verification

**Parameters:**
- `missingFilesOnly: boolean` - If true, only check for missing files (default false)

**Returns:** `boolean` - `true` if request accepted

**Example:**
```typescript
// Game detected corrupted save file
if (detectCorruption()) {
  steam.apps.markContentCorrupt(false);
  showError('Game files may be corrupted. Please verify via Steam.');
}
```

**Notes:**
- Signals Steam to verify game files on next restart
- Use `missingFilesOnly=true` for faster verification

---

## Complete Example

```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Define DLC App IDs
const DLC = {
  EXPANSION: 480001,
  SOUNDTRACK: 480002,
  ARTBOOK: 480003
};

// Check all DLC
function checkDLCStatus() {
  const allDlc = steam.apps.getAllDLC();
  
  console.log('DLC Status:');
  allDlc.forEach(dlc => {
    const installed = steam.apps.isDlcInstalled(dlc.appId);
    console.log(`  ${dlc.name}: ${installed ? 'Ready' : 'Not Installed'}`);
  });
}

// Enable features based on ownership
function initializeFeatures() {
  if (steam.apps.isDlcInstalled(DLC.EXPANSION)) {
    enableExpansionMaps();
    enableExpansionCharacters();
  }
  
  if (steam.apps.isDlcInstalled(DLC.SOUNDTRACK)) {
    enableMusicPlayer();
  }
}

// Handle free weekend players
function checkAccessType() {
  if (steam.apps.isSubscribedFromFreeWeekend()) {
    showBanner('Free Weekend! Get 20% off the full game!');
    showPurchaseButton();
  }
  
  if (steam.apps.isSubscribedFromFamilySharing()) {
    // Some games restrict features for borrowed copies
    disableMultiplayerRanked();
  }
}

// Localization
function setupLocalization() {
  const lang = steam.apps.getCurrentGameLanguage();
  loadLanguage(lang);
}

// Run setup
checkDLCStatus();
initializeFeatures();
checkAccessType();
setupLocalization();

// Cleanup
steam.shutdown();
```

---

## See Also

- [Steam Apps Documentation](https://partner.steamgames.com/doc/api/ISteamApps)
- [DLC Best Practices](https://partner.steamgames.com/doc/store/application/dlc)
- [Workshop Manager](./WORKSHOP_MANAGER.md)
- [Cloud Manager](./CLOUD_MANAGER.md)
