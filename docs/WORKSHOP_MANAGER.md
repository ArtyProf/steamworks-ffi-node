# Workshop Manager API Documentation

Complete reference for all Workshop/UGC (User Generated Content) functionality in Steamworks FFI.

## Overview

The `SteamWorkshopManager` provides comprehensive access to the Steam Workshop API, enabling you to browse, subscribe to, create, and manage user-generated content. The Workshop system allows players to share mods, maps, items, and other creative content with the community.

## Quick Reference

| Category | Functions | Description |
|----------|-----------|-------------|
| [Subscription Management](#subscription-management) | 4 | Subscribe, unsubscribe, and list Workshop items |
| [Item State & Information](#item-state--information) | 4 | Get item state, installation info, and download progress |
| [Query Operations](#query-operations) | 7 | Search and browse Workshop content |
| [Item Creation & Update](#item-creation--update) | 9 | Create and update your own Workshop items |
| [Voting & Favorites](#voting--favorites) | 4 | Vote on items and manage favorites |

**Total: 28 Functions**

---

## Subscription Management

Functions for subscribing to and managing Workshop items.

### `subscribeItem(publishedFileId)`

Subscribe to a Workshop item. The item will be automatically downloaded and installed.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_SubscribeItem()` - Subscribe to item

**Parameters:**
- `publishedFileId: PublishedFileId` - The Workshop item ID (BigInt)

**Returns:** `Promise<boolean>` - `true` if subscription successful, `false` otherwise

**Example:**
```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Subscribe to a Workshop item
const itemId = BigInt('123456789');
const success = await steam.workshop.subscribeItem(itemId);

if (success) {
  console.log('Successfully subscribed!');
  
  // Check if it's downloading
  const state = steam.workshop.getItemState(itemId);
  if (state & EItemState.Downloading) {
    console.log('Item is downloading...');
  }
}

steam.shutdown();
```

**Notes:**
- Item downloads automatically after subscription
- Use `getItemDownloadInfo()` to track download progress
- Use `getItemInstallInfo()` to get installation location
- Waits up to 5 seconds for Steam server response

---

### `unsubscribeItem(publishedFileId)`

Unsubscribe from a Workshop item. The item will be uninstalled when the game quits.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_UnsubscribeItem()` - Unsubscribe from item

**Parameters:**
- `publishedFileId: PublishedFileId` - The Workshop item ID (BigInt)

**Returns:** `Promise<boolean>` - `true` if unsubscription successful, `false` otherwise

**Example:**
```typescript
const itemId = BigInt('123456789');
const success = await steam.workshop.unsubscribeItem(itemId);

if (success) {
  console.log('Successfully unsubscribed');
  console.log('Item will be uninstalled when game quits');
}
```

**Notes:**
- Item files remain until application restarts
- Item is marked for deletion but not immediately removed
- Waits up to 5 seconds for Steam server response

---

### `getNumSubscribedItems()`

Get the total number of subscribed Workshop items.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_GetNumSubscribedItems()` - Get subscription count

**Returns:** `number` - Number of subscribed items

**Example:**
```typescript
const count = steam.workshop.getNumSubscribedItems();
console.log(`Subscribed to ${count} Workshop items`);
```

---

### `getSubscribedItems()`

Get all subscribed Workshop item IDs.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_GetSubscribedItems()` - Get subscribed item IDs

**Returns:** `PublishedFileId[]` - Array of Workshop item IDs

**Example:**
```typescript
const items = steam.workshop.getSubscribedItems();

console.log(`You have ${items.length} subscribed items:`);
items.forEach(itemId => {
  console.log(`Item ID: ${itemId}`);
  
  // Get installation info for each
  const info = steam.workshop.getItemInstallInfo(itemId);
  if (info) {
    console.log(`  Location: ${info.folder}`);
    console.log(`  Size: ${(Number(info.sizeOnDisk) / 1024 / 1024).toFixed(2)} MB`);
  }
});
```

---

## Item State & Information

Functions for checking Workshop item status and getting detailed information.

### `getItemState(publishedFileId)`

Get the state flags for a Workshop item.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_GetItemState()` - Get item state flags

**Parameters:**
- `publishedFileId: PublishedFileId` - The Workshop item ID

**Returns:** `number` - Bit flags indicating item state (combination of `EItemState` values)

**Type:**
```typescript
enum EItemState {
  None = 0,
  Subscribed = 1,
  LegacyItem = 2,
  Installed = 4,
  NeedsUpdate = 8,
  Downloading = 16,
  DownloadPending = 32
}
```

**Example:**
```typescript
import { EItemState } from 'steamworks-ffi-node';

const itemId = BigInt('123456789');
const state = steam.workshop.getItemState(itemId);

if (state & EItemState.Subscribed) {
  console.log('✓ Subscribed');
}
if (state & EItemState.Installed) {
  console.log('✓ Installed');
}
if (state & EItemState.Downloading) {
  console.log('⬇ Downloading...');
}
if (state & EItemState.NeedsUpdate) {
  console.log('🔄 Update available');
}
if (state & EItemState.DownloadPending) {
  console.log('⏳ Download pending');
}
```

**Notes:**
- Multiple flags can be set simultaneously using bitwise OR
- Check flags using bitwise AND (`&`)
- `None` means item is not subscribed

---

### `getItemInstallInfo(publishedFileId)`

Get installation information for a Workshop item.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_GetItemInstallInfo()` - Get installation details

**Parameters:**
- `publishedFileId: PublishedFileId` - The Workshop item ID

**Returns:** `ItemInstallInfo | null` - Installation info or null if not installed

**Type:**
```typescript
interface ItemInstallInfo {
  sizeOnDisk: bigint;    // Size in bytes
  folder: string;        // Installation folder path
  timestamp: number;     // Unix timestamp of installation
}
```

**Example:**
```typescript
const itemId = BigInt('123456789');
const info = steam.workshop.getItemInstallInfo(itemId);

if (info) {
  console.log(`Installed at: ${info.folder}`);
  console.log(`Size: ${(Number(info.sizeOnDisk) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Installed: ${new Date(info.timestamp * 1000).toLocaleString()}`);
  
  // Load the mod files
  const fs = require('fs');
  const files = fs.readdirSync(info.folder);
  console.log('Files:', files);
} else {
  console.log('Item not installed');
}
```

**Notes:**
- Only returns data if item has `EItemState.Installed` flag
- Folder path is the location where item files are stored
- Typical locations:
  - **Windows**: `C:\Program Files (x86)\Steam\steamapps\workshop\content\<appid>\<publishedfileid>`
  - **macOS**: `~/Library/Application Support/Steam/steamapps/workshop/content/<appid>/<publishedfileid>`
  - **Linux**: `~/.local/share/Steam/steamapps/workshop/content/<appid>/<publishedfileid>`

---

### `getItemDownloadInfo(publishedFileId)`

Get download progress for a Workshop item.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_GetItemDownloadInfo()` - Get download progress

**Parameters:**
- `publishedFileId: PublishedFileId` - The Workshop item ID

**Returns:** `ItemDownloadInfo | null` - Download info or null if not downloading

**Type:**
```typescript
interface ItemDownloadInfo {
  bytesDownloaded: bigint;    // Bytes downloaded so far
  bytesTotal: bigint;         // Total bytes to download
  percentComplete: number;    // Percentage complete (0-100)
}
```

**Example:**
```typescript
const itemId = BigInt('123456789');

// Start monitoring download
const interval = setInterval(() => {
  steam.runCallbacks(); // Process Steam callbacks
  
  const progress = steam.workshop.getItemDownloadInfo(itemId);
  
  if (progress) {
    const mb = Number(progress.bytesDownloaded) / 1024 / 1024;
    const totalMb = Number(progress.bytesTotal) / 1024 / 1024;
    
    console.log(`Downloading: ${progress.percentComplete.toFixed(1)}%`);
    console.log(`${mb.toFixed(2)} MB / ${totalMb.toFixed(2)} MB`);
  } else {
    console.log('Download complete!');
    clearInterval(interval);
  }
}, 1000);
```

**Notes:**
- Only returns data if item has `EItemState.Downloading` flag
- Returns null when download is complete
- Call `runCallbacks()` regularly to update progress

---

### `downloadItem(publishedFileId, highPriority?)`

Force download of a Workshop item.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_DownloadItem()` - Initiate download

**Parameters:**
- `publishedFileId: PublishedFileId` - The Workshop item ID
- `highPriority?: boolean` - If true, prioritizes this download (default: false)

**Returns:** `boolean` - `true` if download started, `false` otherwise

**Example:**
```typescript
const itemId = BigInt('123456789');

// Force download with high priority
const started = steam.workshop.downloadItem(itemId, true);

if (started) {
  console.log('Download started');
  
  // Monitor progress
  const checkProgress = setInterval(() => {
    steam.runCallbacks();
    const progress = steam.workshop.getItemDownloadInfo(itemId);
    
    if (progress) {
      console.log(`Progress: ${progress.percentComplete.toFixed(1)}%`);
    } else {
      console.log('Download complete!');
      clearInterval(checkProgress);
    }
  }, 500);
}
```

**Notes:**
- High priority suspends other downloads
- Useful for forcing re-download of already installed items
- If not subscribed, item will be cached temporarily

---

## Query Operations

Functions for searching and browsing Workshop content.

### `createQueryUserUGCRequest(accountId, listType, matchingType, sortOrder, creatorAppId, consumerAppId, page)`

Create a query for a specific user's Workshop items.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_CreateQueryUserUGCRequest()` - Create user query

**Parameters:**
- `accountId: number` - Steam account ID (32-bit, lower part of SteamID)
- `listType: EUserUGCList` - Type of list to query
- `matchingType: EUGCMatchingUGCType` - Type of UGC to match
- `sortOrder: EUserUGCListSortOrder` - How to sort results
- `creatorAppId: number` - App that created the items
- `consumerAppId: number` - App that will consume the items
- `page: number` - Page number (1-based)

**Returns:** `UGCQueryHandle` - Query handle for use with `sendQueryUGCRequest()`

**Types:**
```typescript
enum EUserUGCList {
  Published = 0,          // Items user has published
  VotedOn = 1,           // Items user has voted on
  VotedUp = 2,           // Items user voted up
  VotedDown = 3,         // Items user voted down
  Favorited = 5,         // Items user favorited
  Subscribed = 6,        // Items user is subscribed to
  UsedOrPlayed = 7,      // Items user has used
  Followed = 8           // Items user follows
}

enum EUserUGCListSortOrder {
  CreationOrderDesc = 0,      // Newest first
  CreationOrderAsc = 1,       // Oldest first
  TitleAsc = 2,              // A-Z
  LastUpdatedDesc = 3,       // Recently updated first
  SubscriptionDateDesc = 4,  // Recently subscribed first
  VoteScoreDesc = 5,         // Highest rated first
  ForModeration = 6          // For moderation tools
}

enum EUGCMatchingUGCType {
  Items = 0,                    // Standard Workshop items
  ItemsMtx = 1,                // Microtransaction items
  ItemsReadyToUse = 2,         // Items ready to use
  Collections = 3,             // Collections
  Artwork = 4,                 // Artwork
  Videos = 5,                  // Videos
  Screenshots = 6,             // Screenshots
  AllGuides = 7,              // All guides
  WebGuides = 8,              // Web guides
  IntegratedGuides = 9,       // Integrated guides
  UsableInGame = 10,          // Usable in game
  ControllerBindings = 11,    // Controller configs
  GameManagedItems = 12       // Game-managed items
}
```

**Example:**
```typescript
import { EUserUGCList, EUserUGCListSortOrder, EUGCMatchingUGCType } from 'steamworks-ffi-node';

// Query current user's published items
const accountId = 12345678; // From user's SteamID
const query = steam.workshop.createQueryUserUGCRequest(
  accountId,
  EUserUGCList.Published,
  EUGCMatchingUGCType.Items,
  EUserUGCListSortOrder.CreationOrderDesc,
  480,  // App ID
  480,
  1     // First page
);

// Send query and get results
const result = await steam.workshop.sendQueryUGCRequest(query);
if (result) {
  console.log(`Found ${result.numResults} items`);
}
```

---

### `createQueryAllUGCRequest(queryType, matchingType, creatorAppId, consumerAppId, page)`

Create a query for all Workshop items with various sorting options.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_CreateQueryAllUGCRequestPage()` - Create general query

**Parameters:**
- `queryType: EUGCQuery` - Type of query/sorting
- `matchingType: EUGCMatchingUGCType` - Type of UGC to match
- `creatorAppId: number` - App that created the items
- `consumerAppId: number` - App that will consume the items
- `page: number` - Page number (1-based)

**Returns:** `UGCQueryHandle` - Query handle for use with `sendQueryUGCRequest()`

**Type:**
```typescript
enum EUGCQuery {
  RankedByVote = 0,                    // Most popular
  RankedByPublicationDate = 1,         // Newest
  AcceptedForGameRankedByAcceptanceDate = 2,
  RankedByTrend = 3,                   // Trending
  FavoritedByFriendsRankedByPublicationDate = 4,
  CreatedByFriendsRankedByPublicationDate = 5,
  RankedByNumTimesReported = 6,
  CreatedByFollowedUsersRankedByPublicationDate = 7,
  NotYetRated = 8,
  RankedByTotalVotesAsc = 9,
  RankedByVotesUp = 10,
  RankedByTextSearch = 11,             // Text search
  RankedByTotalUniqueSubscriptions = 12,
  RankedByPlaytimeTrend = 13,
  RankedByTotalPlaytime = 14,
  RankedByAveragePlaytimeTrend = 15,
  RankedByLifetimeAveragePlaytime = 16,
  RankedByPlaytimeSessionsTrend = 17,
  RankedByLifetimePlaytimeSessions = 18,
  RankedByLastUpdatedDate = 19         // Recently updated
}
```

**Example:**
```typescript
import { EUGCQuery, EUGCMatchingUGCType } from 'steamworks-ffi-node';

// Query most popular Workshop items
const query = steam.workshop.createQueryAllUGCRequest(
  EUGCQuery.RankedByVote,
  EUGCMatchingUGCType.Items,
  480,  // Spacewar
  480,
  1     // First page
);

const result = await steam.workshop.sendQueryUGCRequest(query);
if (result) {
  console.log(`Found ${result.totalResults} total items`);
  console.log(`Showing ${result.numResults} results`);
  
  // Get individual items
  for (let i = 0; i < result.numResults; i++) {
    const item = steam.workshop.getQueryUGCResult(query, i);
    if (item) {
      console.log(`${i + 1}. ${item.title}`);
      console.log(`   Votes: 👍 ${item.votesUp} | Score: ${item.score.toFixed(2)}`);
    }
  }
  
  // Clean up
  steam.workshop.releaseQueryUGCRequest(query);
}
```

---

### `sendQueryUGCRequest(queryHandle)`

Send a UGC query to Steam and wait for results.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_SendQueryUGCRequest()` - Send query

**Parameters:**
- `queryHandle: UGCQueryHandle` - Query handle from create query functions

**Returns:** `Promise<{ numResults: number; totalResults: number; cachedData: boolean } | null>`

**Example:**
```typescript
const query = steam.workshop.createQueryAllUGCRequest(
  EUGCQuery.RankedByPublicationDate,
  EUGCMatchingUGCType.Items,
  480, 480, 1
);

const result = await steam.workshop.sendQueryUGCRequest(query);

if (result) {
  console.log(`Page contains ${result.numResults} items`);
  console.log(`Total available: ${result.totalResults} items`);
  console.log(`Cached: ${result.cachedData ? 'Yes' : 'No'}`);
  
  // Process results...
  
  // Always release when done
  steam.workshop.releaseQueryUGCRequest(query);
} else {
  console.error('Query failed');
}
```

**Notes:**
- Waits up to 60 seconds for Steam server response
- After processing results, always call `releaseQueryUGCRequest()`
- Use `getQueryUGCResult()` to retrieve individual items
- Query returns up to 50 items per page

---

### `setReturnPlaytimeStats(queryHandle, days)`

Enable returning playtime statistics for UGC query results.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_SetReturnPlaytimeStats()` - Enable statistics

**Parameters:**
- `queryHandle: UGCQueryHandle` - Query handle to configure
- `days: number` - Number of days of playtime stats to return (0 = lifetime)

**Returns:** `boolean` - `true` if successful

**Example:**
```typescript
// Create query
const query = steam.workshop.createQueryAllUGCRequest(
  EUGCQuery.RankedByVote,
  EUGCMatchingUGCType.Items,
  480, 480, 1
);

// Enable lifetime playtime statistics
steam.workshop.setReturnPlaytimeStats(query, 0);

// Now send the query
const result = await steam.workshop.sendQueryUGCRequest(query);

// Statistics will be available in query results
```

**Notes:**
- Call this BEFORE `sendQueryUGCRequest()`
- Enables additional statistics in WorkshopItem results
- Use 0 for lifetime stats, or specific number of days
- Allows tracking item popularity by playtime

---

### `getQueryUGCResult(queryHandle, index)`

Get a single result from a completed UGC query.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_GetQueryUGCResult()` - Get query result

**Parameters:**
- `queryHandle: UGCQueryHandle` - Query handle from completed query
- `index: number` - Index of result (0-based)

**Returns:** `WorkshopItem | null` - Workshop item details or null

**Type:**
```typescript
interface WorkshopItem {
  publishedFileId: bigint;         // Unique item ID
  result: number;                  // EResult code
  fileType: number;                // EWorkshopFileType
  creatorAppID: number;            // App that created it
  consumerAppID: number;           // App that uses it
  title: string;                   // Item title
  description: string;             // Item description
  steamIDOwner: bigint;            // Creator's Steam ID
  timeCreated: number;             // Unix timestamp
  timeUpdated: number;             // Unix timestamp
  timeAddedToUserList: number;     // Unix timestamp
  visibility: number;              // ERemoteStoragePublishedFileVisibility
  banned: boolean;                 // Is banned
  acceptedForUse: boolean;         // Accepted for use
  tagsTruncated: boolean;          // Tags were truncated
  tags: string[];                  // Item tags
  file: bigint;                    // File handle
  previewFile: bigint;             // Preview file handle
  fileName: string;                // File name
  fileSize: number;                // File size in bytes
  previewFileSize: number;         // Preview size in bytes
  url: string;                     // Workshop URL
  votesUp: number;                 // Upvotes (subscriptions)
  score: number;                   // Score (0-1)
  numChildren: number;             // Number of children
  totalFilesSize: bigint;          // Total size
}
```

**Example:**
```typescript
const query = steam.workshop.createQueryAllUGCRequest(
  EUGCQuery.RankedByVote,
  EUGCMatchingUGCType.Items,
  480, 480, 1
);

const result = await steam.workshop.sendQueryUGCRequest(query);

if (result) {
  console.log('Top Workshop Items:');
  
  for (let i = 0; i < result.numResults; i++) {
    const item = steam.workshop.getQueryUGCResult(query, i);
    
    if (item) {
      console.log(`\n${i + 1}. ${item.title}`);
      console.log(`   ID: ${item.publishedFileId}`);
      console.log(`   By: ${item.steamIDOwner}`);
      console.log(`   Votes: 👍 ${item.votesUp} | Score: ${item.score.toFixed(2)}`);
      console.log(`   Size: ${(item.fileSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Tags: ${item.tags.join(', ')}`);
      console.log(`   URL: ${item.url}`);
      console.log(`   Created: ${new Date(item.timeCreated * 1000).toLocaleString()}`);
      console.log(`   Updated: ${new Date(item.timeUpdated * 1000).toLocaleString()}`);
      
      // Subscribe to item
      // await steam.workshop.subscribeItem(item.publishedFileId);
    }
  }
  
  steam.workshop.releaseQueryUGCRequest(query);
}
```

---

### `getQueryUGCNumTags(queryHandle, index)`

Get the number of tags for a specific query result.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_GetQueryUGCNumTags()` - Get tag count

**Parameters:**
- `queryHandle: UGCQueryHandle` - Query handle from completed query
- `index: number` - Index of result (0-based)

**Returns:** `number` - Number of tags, or 0 if failed

**Example:**
```typescript
const query = steam.workshop.createQueryAllUGCRequest(
  EUGCQuery.RankedByVote,
  EUGCMatchingUGCType.Items,
  480, 480, 1
);

const result = await steam.workshop.sendQueryUGCRequest(query);

if (result) {
  for (let i = 0; i < result.numResults; i++) {
    const numTags = steam.workshop.getQueryUGCNumTags(query, i);
    const item = steam.workshop.getQueryUGCResult(query, i);
    
    if (item) {
      console.log(`${item.title} has ${numTags} tags`);
      console.log(`Tags: ${item.tags.join(', ')}`);
    }
  }
  
  steam.workshop.releaseQueryUGCRequest(query);
}
```

**Notes:**
- Returns 0 if index is out of range
- Tags are also available in the `tags` array of WorkshopItem
- Useful for validation before processing tags

---

### `getQueryUGCPreviewURL(queryHandle, index)`

Get the preview image URL for a specific query result.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_GetQueryUGCPreviewURL()` - Get preview URL

**Parameters:**
- `queryHandle: UGCQueryHandle` - Query handle from completed query
- `index: number` - Index of result (0-based)

**Returns:** `string | null` - Preview image URL, or null if failed

**Example:**
```typescript
const query = steam.workshop.createQueryAllUGCRequest(
  EUGCQuery.RankedByVote,
  EUGCMatchingUGCType.Items,
  480, 480, 1
);

const result = await steam.workshop.sendQueryUGCRequest(query);

if (result) {
  for (let i = 0; i < result.numResults; i++) {
    const item = steam.workshop.getQueryUGCResult(query, i);
    const previewURL = steam.workshop.getQueryUGCPreviewURL(query, i);
    
    if (item && previewURL) {
      console.log(`${item.title}`);
      console.log(`Preview: ${previewURL}`);
      
      // Download preview image for your UI
      // await downloadImage(previewURL, `./previews/${item.publishedFileId}.jpg`);
    }
  }
  
  steam.workshop.releaseQueryUGCRequest(query);
}
```

**Notes:**
- Returns null if no preview available or index out of range
- URL is hosted on Steam's CDN
- Image is typically 512x512 or 256x256
- Useful for displaying item previews in custom UI

---

### `getQueryUGCMetadata(queryHandle, index)`

Get the metadata string for a specific query result.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_GetQueryUGCMetadata()` - Get metadata

**Parameters:**
- `queryHandle: UGCQueryHandle` - Query handle from completed query
- `index: number` - Index of result (0-based)

**Returns:** `string | null` - Metadata string, or null if none

**Example:**
```typescript
const query = steam.workshop.createQueryAllUGCRequest(
  EUGCQuery.RankedByVote,
  EUGCMatchingUGCType.Items,
  480, 480, 1
);

const result = await steam.workshop.sendQueryUGCRequest(query);

if (result) {
  for (let i = 0; i < result.numResults; i++) {
    const item = steam.workshop.getQueryUGCResult(query, i);
    const metadata = steam.workshop.getQueryUGCMetadata(query, i);
    
    if (item) {
      console.log(`\n${item.title}`);
      
      if (metadata) {
        // Parse JSON metadata (if your mod uses it)
        try {
          const data = JSON.parse(metadata);
          console.log(`Version: ${data.version}`);
          console.log(`Author: ${data.author}`);
          console.log(`Compatible: ${data.gameVersion}`);
        } catch {
          console.log(`Metadata: ${metadata}`);
        }
      } else {
        console.log('No metadata available');
      }
    }
  }
  
  steam.workshop.releaseQueryUGCRequest(query);
}
```

**Notes:**
- Returns null if no metadata or index out of range
- Max size: 5000 characters
- Can store JSON, XML, or any text format
- Set via `SetItemMetadata()` during item update
- Useful for version info, compatibility data, mod settings

---

### `releaseQueryUGCRequest(queryHandle)`

Release a query handle and free associated memory.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_ReleaseQueryUGCRequest()` - Release query

**Parameters:**
- `queryHandle: UGCQueryHandle` - Query handle to release

**Returns:** `boolean` - `true` if released successfully

**Example:**
```typescript
const query = steam.workshop.createQueryAllUGCRequest(/*...*/);
const result = await steam.workshop.sendQueryUGCRequest(query);

// Process results...

// Always release when done
steam.workshop.releaseQueryUGCRequest(query);
```

**Notes:**
- Always call this after processing query results
- Prevents memory leaks
- Required for every successful query

---

## Item Creation & Update

Functions for creating and updating your own Workshop items.

### `createItem(consumerAppId, fileType)`

Create a new Workshop item and wait for the result.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_CreateItem()` - Create Workshop item

**Parameters:**
- `consumerAppId: number` - App ID that will consume this item
- `fileType: EWorkshopFileType` - Type of Workshop file

**Returns:** `Promise<PublishedFileId | null>` - New item ID or null if failed

**Type:**
```typescript
enum EWorkshopFileType {
  Community = 0,              // Standard community item
  Microtransaction = 1,       // Microtransaction item
  Collection = 2,             // Collection of items
  Art = 3,                    // Artwork
  Video = 4,                  // Video
  Screenshot = 5,             // Screenshot
  Game = 6,                   // Managed by game
  Software = 7,               // Software
  Concept = 8,                // Concept
  WebGuide = 9,               // Web guide
  IntegratedGuide = 10,       // Integrated guide
  Merch = 11,                 // Merchandise
  ControllerBinding = 12,     // Controller binding
  SteamworksAccessInvite = 13,
  SteamVideo = 14,            // Steam video
  GameManagedItem = 15        // Game-managed item
}
```

**Example:**
```typescript
import { EWorkshopFileType } from 'steamworks-ffi-node';

// Create a new Workshop item
const itemId = await steam.workshop.createItem(
  480,  // Spacewar
  EWorkshopFileType.Community
);

if (itemId) {
  console.log(`Created Workshop item: ${itemId}`);
  console.log(`URL: https://steamcommunity.com/sharedfiles/filedetails/?id=${itemId}`);
  
  // Now update it with content
  const updateHandle = steam.workshop.startItemUpdate(480, itemId);
  steam.workshop.setItemTitle(updateHandle, 'My Awesome Mod');
  steam.workshop.setItemDescription(updateHandle, 'A cool new mod!');
  
  await steam.workshop.submitItemUpdate(updateHandle, 'Initial release');
} else {
  console.error('Failed to create item');
}
```

**Notes:**
- User must accept Workshop Legal Agreement first
- Check console for legal agreement URL if creation fails
- Item is created but has no content until updated
- Waits up to 60 seconds for Steam server response

---

### `startItemUpdate(consumerAppId, publishedFileId)`

Start an update for a Workshop item.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_StartItemUpdate()` - Begin item update

**Parameters:**
- `consumerAppId: number` - App ID
- `publishedFileId: PublishedFileId` - Workshop item ID to update

**Returns:** `UGCUpdateHandle` - Update handle for use with set* functions

**Example:**
```typescript
const itemId = BigInt('123456789');
const updateHandle = steam.workshop.startItemUpdate(480, itemId);

// Now use set* functions to modify properties
steam.workshop.setItemTitle(updateHandle, 'Updated Title');
steam.workshop.setItemDescription(updateHandle, 'Updated description');

// Submit changes
await steam.workshop.submitItemUpdate(updateHandle, 'Updated description');
```

---

### `setItemTitle(updateHandle, title)`

Set the title of a Workshop item being updated.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_SetItemTitle()` - Set title

**Parameters:**
- `updateHandle: UGCUpdateHandle` - Handle from `startItemUpdate()`
- `title: string` - New title (max 129 characters)

**Returns:** `boolean` - `true` if set successfully

**Example:**
```typescript
const updateHandle = steam.workshop.startItemUpdate(480, itemId);
const success = steam.workshop.setItemTitle(updateHandle, 'My Epic Mod v2.0');

if (success) {
  console.log('Title updated');
}
```

---

### `setItemDescription(updateHandle, description)`

Set the description of a Workshop item being updated.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_SetItemDescription()` - Set description

**Parameters:**
- `updateHandle: UGCUpdateHandle` - Handle from `startItemUpdate()`
- `description: string` - New description (max 8000 characters)

**Returns:** `boolean` - `true` if set successfully

**Example:**
```typescript
const description = `
This mod adds:
- New weapons
- New maps
- Bug fixes

Installation:
1. Subscribe to this item
2. Launch the game
3. Enable the mod in settings

Changelog:
v2.0 - Added new weapons
v1.0 - Initial release
`;

steam.workshop.setItemDescription(updateHandle, description);
```

---

### `setItemVisibility(updateHandle, visibility)`

Set the visibility of a Workshop item being updated.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_SetItemVisibility()` - Set visibility

**Parameters:**
- `updateHandle: UGCUpdateHandle` - Handle from `startItemUpdate()`
- `visibility: ERemoteStoragePublishedFileVisibility` - Visibility setting

**Returns:** `boolean` - `true` if set successfully

**Type:**
```typescript
enum ERemoteStoragePublishedFileVisibility {
  Public = 0,         // Everyone can see
  FriendsOnly = 1,    // Only friends can see
  Private = 2,        // Only you can see
  Unlisted = 3        // Anyone with link can see
}
```

**Example:**
```typescript
import { ERemoteStoragePublishedFileVisibility } from 'steamworks-ffi-node';

// Set to public for everyone to see
steam.workshop.setItemVisibility(
  updateHandle,
  ERemoteStoragePublishedFileVisibility.Public
);

// Set to private for testing
steam.workshop.setItemVisibility(
  updateHandle,
  ERemoteStoragePublishedFileVisibility.Private
);
```

---

### `setItemContent(updateHandle, contentFolder)`

Set the content folder for a Workshop item being updated.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_SetItemContent()` - Set content folder

**Parameters:**
- `updateHandle: UGCUpdateHandle` - Handle from `startItemUpdate()`
- `contentFolder: string` - Path to folder containing item files

**Returns:** `boolean` - `true` if set successfully

**Example:**
```typescript
const contentPath = '/path/to/my/mod/files';
const success = steam.workshop.setItemContent(updateHandle, contentPath);

if (success) {
  console.log('Content folder set');
  console.log('All files in folder will be uploaded');
}
```

**Notes:**
- All files in the folder will be uploaded
- Folder structure is preserved
- Use relative paths in your mod code
- Maximum 1GB per item

---

### `setItemPreview(updateHandle, previewFile)`

Set the preview image for a Workshop item being updated.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_SetItemPreview()` - Set preview image

**Parameters:**
- `updateHandle: UGCUpdateHandle` - Handle from `startItemUpdate()`
- `previewFile: string` - Path to preview image file

**Returns:** `boolean` - `true` if set successfully

**Example:**
```typescript
const previewPath = '/path/to/preview.jpg';
const success = steam.workshop.setItemPreview(updateHandle, previewPath);

if (success) {
  console.log('Preview image set');
}
```

**Notes:**
- Image must be under 1MB
- Supported formats: JPG, PNG, GIF
- Recommended size: 512x512 or 256x256
- Shown in Workshop browser

---

### `submitItemUpdate(updateHandle, changeNote)`

Submit an item update to Steam Workshop and wait for completion.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_SubmitItemUpdate()` - Submit update

**Parameters:**
- `updateHandle: UGCUpdateHandle` - Handle from `startItemUpdate()`
- `changeNote: string` - Description of changes (shown in update history)

**Returns:** `Promise<boolean>` - `true` if update submitted successfully

**Example:**
```typescript
const updateHandle = steam.workshop.startItemUpdate(480, itemId);

// Set all properties
steam.workshop.setItemTitle(updateHandle, 'My Mod v2.0');
steam.workshop.setItemDescription(updateHandle, 'Updated with new features!');
steam.workshop.setItemContent(updateHandle, '/path/to/mod/files');
steam.workshop.setItemPreview(updateHandle, '/path/to/preview.jpg');

// Submit with changelog
const success = await steam.workshop.submitItemUpdate(
  updateHandle,
  'v2.0 - Added new weapons, fixed bugs, improved performance'
);

if (success) {
  console.log('Workshop item updated successfully!');
  
  // Track upload progress
  const checkProgress = setInterval(() => {
    steam.runCallbacks();
    const progress = steam.workshop.getItemUpdateProgress(updateHandle);
    
    console.log(`Status: ${EItemUpdateStatus[progress.status]}`);
    console.log(`Progress: ${progress.percentComplete.toFixed(1)}%`);
    
    if (progress.status === EItemUpdateStatus.Invalid) {
      console.log('Upload complete!');
      clearInterval(checkProgress);
    }
  }, 1000);
}
```

**Notes:**
- Waits up to 30 seconds for initial submission
- Use `getItemUpdateProgress()` to track upload
- Change note is visible to subscribers
- Large files may take time to upload

---

### `getItemUpdateProgress(updateHandle)`

Get the progress of an item update submission.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_GetItemUpdateProgress()` - Get progress

**Parameters:**
- `updateHandle: UGCUpdateHandle` - Handle from `startItemUpdate()`

**Returns:** `ItemUpdateProgress` - Update progress info

**Type:**
```typescript
interface ItemUpdateProgress {
  status: EItemUpdateStatus;     // Current status
  bytesProcessed: bigint;        // Bytes uploaded
  bytesTotal: bigint;            // Total bytes
  percentComplete: number;       // Percentage (0-100)
}

enum EItemUpdateStatus {
  Invalid = 0,                   // No update in progress
  PreparingConfig = 1,           // Preparing configuration
  PreparingContent = 2,          // Preparing content files
  UploadingContent = 3,          // Uploading to Steam
  UploadingPreviewFile = 4,      // Uploading preview
  CommittingChanges = 5          // Committing to database
}
```

**Example:**
```typescript
import { EItemUpdateStatus } from 'steamworks-ffi-node';

const updateHandle = steam.workshop.startItemUpdate(480, itemId);
// ... set properties ...
await steam.workshop.submitItemUpdate(updateHandle, 'Changelog');

// Monitor upload progress
const monitor = setInterval(() => {
  steam.runCallbacks();
  const progress = steam.workshop.getItemUpdateProgress(updateHandle);
  
  const statusName = EItemUpdateStatus[progress.status];
  const percent = progress.percentComplete.toFixed(1);
  const mb = Number(progress.bytesProcessed) / 1024 / 1024;
  const totalMb = Number(progress.bytesTotal) / 1024 / 1024;
  
  console.log(`[${statusName}] ${percent}% - ${mb.toFixed(2)}/${totalMb.toFixed(2)} MB`);
  
  if (progress.status === EItemUpdateStatus.Invalid) {
    console.log('Upload finished!');
    clearInterval(monitor);
  }
}, 1000);
```

---

## Voting & Favorites

Functions for voting on Workshop items and managing favorites.

### `setUserItemVote(publishedFileId, voteUp)`

Vote on a Workshop item.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_SetUserItemVote()` - Set vote

**Parameters:**
- `publishedFileId: PublishedFileId` - Workshop item ID
- `voteUp: boolean` - `true` to vote up, `false` to vote down

**Returns:** `Promise<boolean>` - `true` if vote registered successfully

**Example:**
```typescript
const itemId = BigInt('123456789');

// Vote up
const success = await steam.workshop.setUserItemVote(itemId, true);

if (success) {
  console.log('Voted up!');
}

// Vote down
await steam.workshop.setUserItemVote(itemId, false);
```

**Notes:**
- Can change vote at any time
- Waits up to 5 seconds for Steam server response

---

### `getUserItemVote(publishedFileId)`

Get the user's vote on a Workshop item.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_GetUserItemVote()` - Get vote status

**Parameters:**
- `publishedFileId: PublishedFileId` - Workshop item ID

**Returns:** `Promise<{ votedUp: boolean; votedDown: boolean; voteSkipped: boolean } | null>`

**Example:**
```typescript
const itemId = BigInt('123456789');
const vote = await steam.workshop.getUserItemVote(itemId);

if (vote) {
  if (vote.votedUp) {
    console.log('You voted up 👍');
  } else if (vote.votedDown) {
    console.log('You voted down 👎');
  } else if (vote.voteSkipped) {
    console.log('You skipped voting');
  } else {
    console.log('You have not voted');
  }
}
```

**Notes:**
- Returns current vote status
- Waits up to 5 seconds for Steam server response

---

### `addItemToFavorites(appId, publishedFileId)`

Add a Workshop item to the user's favorites.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_AddItemToFavorites()` - Add to favorites

**Parameters:**
- `appId: number` - App ID
- `publishedFileId: PublishedFileId` - Workshop item ID

**Returns:** `Promise<boolean>` - `true` if added successfully

**Example:**
```typescript
const itemId = BigInt('123456789');
const success = await steam.workshop.addItemToFavorites(480, itemId);

if (success) {
  console.log('Added to favorites! ⭐');
}
```

**Notes:**
- Favorites are per-app
- Waits up to 5 seconds for Steam server response

---

### `removeItemFromFavorites(appId, publishedFileId)`

Remove a Workshop item from the user's favorites.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUGC_RemoveItemFromFavorites()` - Remove from favorites

**Parameters:**
- `appId: number` - App ID
- `publishedFileId: PublishedFileId` - Workshop item ID

**Returns:** `Promise<boolean>` - `true` if removed successfully

**Example:**
```typescript
const itemId = BigInt('123456789');
const success = await steam.workshop.removeItemFromFavorites(480, itemId);

if (success) {
  console.log('Removed from favorites');
}
```

**Notes:**
- Waits up to 5 seconds for Steam server response

---

## Configuration

### Steamworks Partner Setup

Before using Workshop, configure it in the Steamworks Partner portal.

**Steps:**
1. Log in to [Steamworks Partner](https://partner.steamgames.com/)
2. Select your app
3. Go to **Workshop** → **Configuration**
4. Enable Workshop for your app
5. Configure:
   - **Workshop Type**: Community or Microtransaction
   - **Allowed File Types**: What types of content are allowed
   - **Max File Size**: Maximum size per item (up to 1GB)
   - **Preview Image Requirements**
   - **Content Folder Structure**
6. Set up Workshop tags and categories
7. Publish changes

**Important:**
- Workshop must be enabled before items can be created
- Test with Spacewar (AppID 480) first
- Review [Workshop Guidelines](https://partner.steamgames.com/doc/features/workshop/implementation)

---

## TypeScript Types

Complete type definitions for Workshop functionality.

```typescript
// Enums
enum EWorkshopFileType {
  Community = 0,
  Microtransaction = 1,
  Collection = 2,
  Art = 3,
  Video = 4,
  Screenshot = 5,
  Game = 6,
  Software = 7,
  Concept = 8,
  WebGuide = 9,
  IntegratedGuide = 10,
  Merch = 11,
  ControllerBinding = 12,
  SteamworksAccessInvite = 13,
  SteamVideo = 14,
  GameManagedItem = 15
}

enum EItemState {
  None = 0,
  Subscribed = 1,
  LegacyItem = 2,
  Installed = 4,
  NeedsUpdate = 8,
  Downloading = 16,
  DownloadPending = 32
}

enum ERemoteStoragePublishedFileVisibility {
  Public = 0,
  FriendsOnly = 1,
  Private = 2,
  Unlisted = 3
}

enum EUGCQuery {
  RankedByVote = 0,
  RankedByPublicationDate = 1,
  AcceptedForGameRankedByAcceptanceDate = 2,
  RankedByTrend = 3,
  FavoritedByFriendsRankedByPublicationDate = 4,
  CreatedByFriendsRankedByPublicationDate = 5,
  RankedByNumTimesReported = 6,
  CreatedByFollowedUsersRankedByPublicationDate = 7,
  NotYetRated = 8,
  RankedByTotalVotesAsc = 9,
  RankedByVotesUp = 10,
  RankedByTextSearch = 11,
  RankedByTotalUniqueSubscriptions = 12,
  RankedByPlaytimeTrend = 13,
  RankedByTotalPlaytime = 14,
  RankedByAveragePlaytimeTrend = 15,
  RankedByLifetimeAveragePlaytime = 16,
  RankedByPlaytimeSessionsTrend = 17,
  RankedByLifetimePlaytimeSessions = 18,
  RankedByLastUpdatedDate = 19
}

enum EUGCMatchingUGCType {
  Items = 0,
  ItemsMtx = 1,
  ItemsReadyToUse = 2,
  Collections = 3,
  Artwork = 4,
  Videos = 5,
  Screenshots = 6,
  AllGuides = 7,
  WebGuides = 8,
  IntegratedGuides = 9,
  UsableInGame = 10,
  ControllerBindings = 11,
  GameManagedItems = 12
}

enum EItemUpdateStatus {
  Invalid = 0,
  PreparingConfig = 1,
  PreparingContent = 2,
  UploadingContent = 3,
  UploadingPreviewFile = 4,
  CommittingChanges = 5
}

// Interfaces
interface ItemInstallInfo {
  sizeOnDisk: bigint;
  folder: string;
  timestamp: number;
}

interface ItemDownloadInfo {
  bytesDownloaded: bigint;
  bytesTotal: bigint;
  percentComplete: number;
}

interface ItemUpdateProgress {
  status: EItemUpdateStatus;
  bytesProcessed: bigint;
  bytesTotal: bigint;
  percentComplete: number;
}

interface WorkshopItem {
  publishedFileId: bigint;
  result: number;
  fileType: number;
  creatorAppID: number;
  consumerAppID: number;
  title: string;
  description: string;
  steamIDOwner: bigint;
  timeCreated: number;
  timeUpdated: number;
  timeAddedToUserList: number;
  visibility: number;
  banned: boolean;
  acceptedForUse: boolean;
  tagsTruncated: boolean;
  tags: string[];
  file: bigint;
  previewFile: bigint;
  fileName: string;
  fileSize: number;
  previewFileSize: number;
  url: string;
  votesUp: number;
  score: number;
  numChildren: number;
  totalFilesSize: bigint;
}

// Type Aliases
type PublishedFileId = bigint;
type UGCQueryHandle = bigint;
type UGCUpdateHandle = bigint;
```

---

## Complete Examples

### Example 1: Subscribe and Monitor Download

```typescript
import SteamworksSDK, { EItemState } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();

async function subscribeAndDownload() {
  steam.init({ appId: 480 });

  const itemId = BigInt('123456789');

  // Subscribe
  console.log('Subscribing to item...');
  const subscribed = await steam.workshop.subscribeItem(itemId);

  if (!subscribed) {
    console.error('Failed to subscribe');
    return;
  }

  console.log('✓ Subscribed successfully');

  // Monitor download
  const monitor = setInterval(() => {
    steam.runCallbacks();

    const state = steam.workshop.getItemState(itemId);

    if (state & EItemState.Downloading) {
      const progress = steam.workshop.getItemDownloadInfo(itemId);
      if (progress) {
        console.log(`Downloading: ${progress.percentComplete.toFixed(1)}%`);
      }
    } else if (state & EItemState.Installed) {
      console.log('✓ Download complete and installed!');

      const info = steam.workshop.getItemInstallInfo(itemId);
      if (info) {
        console.log(`Location: ${info.folder}`);
        console.log(`Size: ${(Number(info.sizeOnDisk) / 1024 / 1024).toFixed(2)} MB`);
      }

      clearInterval(monitor);
    }
  }, 500);

  steam.shutdown();
}

subscribeAndDownload();
```

### Example 2: Browse Popular Mods

```typescript
import SteamworksSDK, {
  EUGCQuery,
  EUGCMatchingUGCType
} from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();

async function browsePopularMods() {
  steam.init({ appId: 480 });

  // Query top 50 popular items
  const query = steam.workshop.createQueryAllUGCRequest(
    EUGCQuery.RankedByVote,
    EUGCMatchingUGCType.Items,
    480,
    480,
    1  // Page 1
  );

  const result = await steam.workshop.sendQueryUGCRequest(query);

  if (!result) {
    console.error('Query failed');
    return;
  }

  console.log(`\nTop ${result.numResults} Most Popular Mods:`);
  console.log('='.repeat(60));

  for (let i = 0; i < result.numResults; i++) {
    const item = steam.workshop.getQueryUGCResult(query, i);

    if (item) {
      console.log(`\n${i + 1}. ${item.title}`);
      console.log(`   ID: ${item.publishedFileId}`);
      console.log(`   Rating: 👍 ${item.votesUp} | Score: ${item.score.toFixed(2)}`);
      console.log(`   Size: ${(item.fileSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Tags: ${item.tags.join(', ')}`);
      console.log(`   URL: ${item.url}`);

      // Check if subscribed
      const state = steam.workshop.getItemState(item.publishedFileId);
      if (state & EItemState.Subscribed) {
        console.log(`   Status: ✓ Subscribed`);
      }
    }
  }

  steam.workshop.releaseQueryUGCRequest(query);
  steam.shutdown();
}

browsePopularMods();
```

### Example 3: Create and Publish a Mod

```typescript
import SteamworksSDK, {
  EWorkshopFileType,
  ERemoteStoragePublishedFileVisibility,
  EItemUpdateStatus
} from 'steamworks-ffi-node';
import * as fs from 'fs';
import * as path from 'path';

const steam = SteamworksSDK.getInstance();

async function publishMod() {
  steam.init({ appId: 480 });

  // Step 1: Create the Workshop item
  console.log('Creating Workshop item...');
  const itemId = await steam.workshop.createItem(
    480,
    EWorkshopFileType.Community
  );

  if (!itemId) {
    console.error('Failed to create item');
    return;
  }

  console.log(`✓ Created item: ${itemId}`);
  console.log(`  URL: https://steamcommunity.com/sharedfiles/filedetails/?id=${itemId}`);

  // Step 2: Prepare content
  const contentDir = '/tmp/my-mod';
  const previewPath = '/tmp/my-mod-preview.jpg';

  // Create mod files
  if (!fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(contentDir, 'mod.json'),
    JSON.stringify({
      name: 'My Awesome Mod',
      version: '1.0',
      author: 'Me'
    })
  );

  // Step 3: Update item with content
  console.log('\nUpdating item...');
  const updateHandle = steam.workshop.startItemUpdate(480, itemId);

  steam.workshop.setItemTitle(updateHandle, 'My Awesome Mod');
  steam.workshop.setItemDescription(updateHandle, `
# My Awesome Mod

This mod adds amazing features!

## Features
- Cool feature 1
- Awesome feature 2
- Amazing feature 3

## Installation
1. Subscribe to this mod
2. Launch the game
3. Enjoy!

## Changelog
v1.0 - Initial release
  `);

  steam.workshop.setItemVisibility(
    updateHandle,
    ERemoteStoragePublishedFileVisibility.Public
  );

  steam.workshop.setItemContent(updateHandle, contentDir);
  steam.workshop.setItemPreview(updateHandle, previewPath);

  // Step 4: Submit update
  console.log('Submitting update...');
  const submitted = await steam.workshop.submitItemUpdate(
    updateHandle,
    'v1.0 - Initial release'
  );

  if (!submitted) {
    console.error('Failed to submit update');
    return;
  }

  console.log('✓ Update submitted');

  // Step 5: Monitor upload progress
  console.log('\nUploading...');
  const monitor = setInterval(() => {
    steam.runCallbacks();

    const progress = steam.workshop.getItemUpdateProgress(updateHandle);
    const statusName = EItemUpdateStatus[progress.status];
    const percent = progress.percentComplete.toFixed(1);

    console.log(`[${statusName}] ${percent}%`);

    if (progress.status === EItemUpdateStatus.Invalid) {
      console.log('\n✓ Upload complete!');
      console.log(`View your mod: https://steamcommunity.com/sharedfiles/filedetails/?id=${itemId}`);
      clearInterval(monitor);
    }
  }, 1000);

  steam.shutdown();
}

publishMod();
```

### Example 4: List Subscribed Mods

```typescript
import SteamworksSDK, { EItemState } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();

function listSubscribedMods() {
  steam.init({ appId: 480 });

  const items = steam.workshop.getSubscribedItems();

  console.log(`\nYou have ${items.length} subscribed Workshop items:\n`);

  items.forEach((itemId, index) => {
    const state = steam.workshop.getItemState(itemId);
    const info = steam.workshop.getItemInstallInfo(itemId);

    console.log(`${index + 1}. Item ${itemId}`);

    // Status
    const status = [];
    if (state & EItemState.Subscribed) status.push('Subscribed');
    if (state & EItemState.Installed) status.push('Installed');
    if (state & EItemState.Downloading) status.push('Downloading');
    if (state & EItemState.NeedsUpdate) status.push('Needs Update');
    console.log(`   Status: ${status.join(', ')}`);

    // Installation info
    if (info) {
      console.log(`   Location: ${info.folder}`);
      console.log(`   Size: ${(Number(info.sizeOnDisk) / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Installed: ${new Date(info.timestamp * 1000).toLocaleString()}`);
    }

    // Download progress
    if (state & EItemState.Downloading) {
      const progress = steam.workshop.getItemDownloadInfo(itemId);
      if (progress) {
        console.log(`   Progress: ${progress.percentComplete.toFixed(1)}%`);
      }
    }

    console.log();
  });

  steam.shutdown();
}

listSubscribedMods();
```

---

## Best Practices

### 1. Always Clean Up Queries
```typescript
// ✅ Good: Always release queries
const query = steam.workshop.createQueryAllUGCRequest(/*...*/);
const result = await steam.workshop.sendQueryUGCRequest(query);
// ... process results ...
steam.workshop.releaseQueryUGCRequest(query);

// ❌ Bad: Memory leak
const query = steam.workshop.createQueryAllUGCRequest(/*...*/);
await steam.workshop.sendQueryUGCRequest(query);
// Forgot to release!
```

### 2. Handle Async Operations Properly
```typescript
// ✅ Good: Wait for operations to complete
const success = await steam.workshop.subscribeItem(itemId);
if (success) {
  console.log('Subscribed');
}

// ❌ Bad: Not waiting
steam.workshop.subscribeItem(itemId);  // Promise ignored
```

### 3. Call runCallbacks() Regularly
```typescript
// ✅ Good: Process callbacks for download progress
const interval = setInterval(() => {
  steam.runCallbacks();  // Process Steam callbacks
  const progress = steam.workshop.getItemDownloadInfo(itemId);
  // ...
}, 500);

// ❌ Bad: Not calling runCallbacks()
const interval = setInterval(() => {
  const progress = steam.workshop.getItemDownloadInfo(itemId);
  // Won't update without runCallbacks()
}, 500);
```

### 4. Check Item State Before Operations
```typescript
// ✅ Good: Check state first
const state = steam.workshop.getItemState(itemId);
if (state & EItemState.Installed) {
  const info = steam.workshop.getItemInstallInfo(itemId);
  // Use installed files
}

// ❌ Bad: Assume item is installed
const info = steam.workshop.getItemInstallInfo(itemId);
// Might be null!
```

### 5. Use Appropriate Visibility for Testing
```typescript
// ✅ Good: Private during development
steam.workshop.setItemVisibility(
  updateHandle,
  ERemoteStoragePublishedFileVisibility.Private
);

// When ready for release
steam.workshop.setItemVisibility(
  updateHandle,
  ERemoteStoragePublishedFileVisibility.Public
);
```

---

## Common Issues & Solutions

### Issue: "User needs to accept Workshop Legal Agreement"

**Problem:** `createItem()` fails with legal agreement message

**Solution:**
1. Visit the URL shown in the console
2. Accept the Workshop Legal Agreement
3. Try creating the item again

```typescript
const itemId = await steam.workshop.createItem(480, EWorkshopFileType.Community);
if (!itemId) {
  console.log('Check console for Workshop Legal Agreement URL');
}
```

### Issue: Item Not Downloading After Subscribe

**Problem:** Subscribed but item doesn't download

**Solutions:**
1. Check item state for download status
2. Force download manually
3. Ensure enough disk space

```typescript
await steam.workshop.subscribeItem(itemId);

// Force download
steam.workshop.downloadItem(itemId, true);
```

### Issue: Query Returns No Results

**Problem:** `sendQueryUGCRequest()` returns 0 results

**Solutions:**
1. Check if Workshop items exist for your app
2. Try different query types
3. Test with Spacewar (AppID 480) first

```typescript
// Try ranked by publication date
const query = steam.workshop.createQueryAllUGCRequest(
  EUGCQuery.RankedByPublicationDate,
  EUGCMatchingUGCType.Items,
  480, 480, 1
);
```

### Issue: Upload Stuck or Timing Out

**Problem:** `submitItemUpdate()` takes too long

**Solutions:**
1. Check internet connection
2. Reduce content size
3. Check Steam server status
4. Monitor upload progress

```typescript
const submitted = await steam.workshop.submitItemUpdate(updateHandle, 'Update');

if (submitted) {
  // Monitor progress
  const interval = setInterval(() => {
    steam.runCallbacks();
    const progress = steam.workshop.getItemUpdateProgress(updateHandle);
    console.log(`${EItemUpdateStatus[progress.status]}: ${progress.percentComplete}%`);
  }, 1000);
}
```

---

## Testing

### Test with Spacewar (AppID 480)

```typescript
// Test Workshop without a published game
const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });  // Spacewar

// Browse existing Workshop items
const query = steam.workshop.createQueryAllUGCRequest(
  EUGCQuery.RankedByVote,
  EUGCMatchingUGCType.Items,
  480, 480, 1
);

const result = await steam.workshop.sendQueryUGCRequest(query);
// ... test subscribing, voting, etc. ...

steam.workshop.releaseQueryUGCRequest(query);
steam.shutdown();
```

---

## Additional Resources

- [Steam Workshop Documentation](https://partner.steamgames.com/doc/features/workshop)
- [Workshop Implementation Guide](https://partner.steamgames.com/doc/features/workshop/implementation)
- [ISteamUGC API Reference](https://partner.steamgames.com/doc/api/ISteamUGC)
- [Workshop Best Practices](https://partner.steamgames.com/doc/features/workshop/best_practices)

---

**Questions or Issues?** Visit the [GitHub Issues](https://github.com/ArtyProf/steamworks-ffi-node/issues) page.
