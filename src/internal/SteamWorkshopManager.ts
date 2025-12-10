import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import { SteamCallbackPoller } from './SteamCallbackPoller';
import {
  PublishedFileId,
  UGCQueryHandle,
  UGCUpdateHandle,
  WorkshopItem,
  ItemInstallInfo,
  ItemDownloadInfo,
  ItemUpdateProgress,
  EUGCMatchingUGCType,
  EUserUGCList,
  EUserUGCListSortOrder,
  EUGCQuery,
  EItemState,
  EItemUpdateStatus,
  EItemStatistic,
  EWorkshopFileType,
  ERemoteStoragePublishedFileVisibility,
  K_UGC_QUERY_HANDLE_INVALID,
  K_UGC_UPDATE_HANDLE_INVALID
} from '../types';
import {
  K_I_STEAM_UGC_QUERY_COMPLETED,
  K_I_CREATE_ITEM_RESULT,
  K_I_SUBMIT_ITEM_UPDATE_RESULT,
  K_I_USER_FAVORITE_ITEMS_LIST_CHANGED,
  K_I_SET_USER_ITEM_VOTE_RESULT,
  K_I_GET_USER_ITEM_VOTE_RESULT,
  K_I_REMOTE_STORAGE_SUBSCRIBE_PUBLISHED_FILE_RESULT,
  K_I_REMOTE_STORAGE_UNSUBSCRIBE_PUBLISHED_FILE_RESULT,
  CreateItemResultType,
  SubmitItemUpdateResultType,
  RemoteStorageSubscribePublishedFileResultType,
  RemoteStorageUnsubscribePublishedFileResultType,
  SteamUGCQueryCompletedType,
  SetUserItemVoteResultType,
  GetUserItemVoteResultType,
  UserFavoriteItemsListChangedType
} from './callbackTypes';
import * as koffi from 'koffi';

// Manual buffer parsing for CreateItemResult_t callback
// Steam uses #pragma pack causing different alignment on Windows vs Mac/Linux:
// - Windows (MSVC, pack(8)): [int32:0-3][padding:4-7][uint64:8-15][uint8:16] = 24 bytes
// - Mac/Linux (GCC/Clang, pack(4)): [int32:0-3][uint64:4-11][uint8:12] = 16 bytes
// We allocate 24 bytes to handle both cases
const CreateItemResult_t = koffi.struct('CreateItemResult_t', {
  rawBytes: koffi.array('uint8', 24)
});

// Manual buffer parsing for SubmitItemUpdateResult_t callback
// Steam uses #pragma pack causing tight packing - Koffi can't handle this properly
// Layout: [int32:0-3][bool:4][padding:5-7][uint64:8-15] = 16 bytes
const SubmitItemUpdateResult_t = koffi.struct('SubmitItemUpdateResult_t', {
  rawBytes: koffi.array('uint8', 16)
});

// Manual buffer parsing for RemoteStorageSubscribePublishedFileResult_t callback
// Steam uses #pragma pack causing tight packing - Koffi can't handle this properly
// Layout: [int32:0-3][uint64:4-11] = 12 bytes (NO padding!)
const RemoteStorageSubscribePublishedFileResult_t = koffi.struct('RemoteStorageSubscribePublishedFileResult_t', {
  rawBytes: koffi.array('uint8', 12)
});

// Manual buffer parsing for RemoteStorageUnsubscribePublishedFileResult_t callback
// Steam uses #pragma pack causing tight packing - Koffi can't handle this properly
// Layout: [int32:0-3][uint64:4-11] = 12 bytes (NO padding!)
const RemoteStorageUnsubscribePublishedFileResult_t = koffi.struct('RemoteStorageUnsubscribePublishedFileResult_t', {
  rawBytes: koffi.array('uint8', 12)
});

// Koffi struct for SteamUGCQueryCompleted_t callback
const SteamUGCQueryCompleted_t = koffi.struct('SteamUGCQueryCompleted_t', {
  m_handle: 'uint64',                   // UGCQueryHandle_t
  m_eResult: 'int',                     // EResult
  m_unNumResultsReturned: 'uint32',
  m_unTotalMatchingResults: 'uint32',
  m_bCachedData: 'bool'
});

// Manual buffer parsing for SetUserItemVoteResult_t callback
// Steam uses #pragma pack causing tight packing - Koffi can't handle this properly
// Layout: [uint64:0-7][int32:8-11][bool:12] = 13 bytes
const SetUserItemVoteResult_t = koffi.struct('SetUserItemVoteResult_t', {
  rawBytes: koffi.array('uint8', 13)
});

// Manual buffer parsing for GetUserItemVoteResult_t callback
// Steam uses #pragma pack causing tight packing - Koffi can't handle this properly
// Layout: [uint64:0-7][int32:8-11][bool×3:12-14] = 15 bytes
const GetUserItemVoteResult_t = koffi.struct('GetUserItemVoteResult_t', {
  rawBytes: koffi.array('uint8', 15)
});

// Koffi struct for UserFavoriteItemsListChanged_t callback
const UserFavoriteItemsListChanged_t = koffi.struct('UserFavoriteItemsListChanged_t', {
  m_nPublishedFileId: 'uint64',         // PublishedFileId_t (8 bytes)
  m_eResult: 'int',                     // EResult (4 bytes)
  m_bWasAddRequest: 'bool'              // bool (1 byte)
});

// Manual buffer parsing for SteamUGCDetails_t
// Steam uses different struct packing on Windows vs Mac/Linux:
// - Windows (MSVC): #pragma pack(push, 8) - 8-byte alignment for uint64
// - Mac/Linux (GCC/Clang): #pragma pack(push, 4) - 4-byte alignment
// 
// Key differences:
// - After m_rgchDescription (offset 8153), Windows adds 7 bytes padding to align uint64
// - This shifts all subsequent fields by different amounts
//
// Constants from isteamremotestorage.h:
// k_cchPublishedDocumentTitleMax = 128 + 1 = 129
// k_cchPublishedDocumentDescriptionMax = 8000
// k_cchTagListMax = 1024 + 1 = 1025
// k_cchFilenameMax = 260
// k_cchPublishedFileURLMax = 256
//
// We use a larger buffer to accommodate Windows layout
const STEAM_UGC_DETAILS_SIZE = 9800; // Extra space for Windows alignment

/**
 * Manager for Steam Workshop / User Generated Content (UGC) operations
 * 
 * The SteamWorkshopManager provides comprehensive access to Steam's Workshop system,
 * allowing you to browse, subscribe to, create, and manage user-generated content.
 * 
 * Key Features:
 * - Query and browse Workshop items
 * - Subscribe/unsubscribe to Workshop content
 * - Download and install Workshop items
 * - Create and update your own Workshop items
 * - Vote on and favorite Workshop content
 * - Track download and installation progress
 * 
 * @remarks
 * All methods require the Steam API to be initialized.
 * Workshop items are automatically downloaded and installed when subscribed.
 * 
 * @example Basic subscription
 * ```typescript
 * const steam = SteamworksSDK.getInstance();
 * steam.init({ appId: 480 });
 * 
 * // Subscribe to a Workshop item
 * const itemId = BigInt('123456789');
 * await steam.workshop.subscribeItem(itemId);
 * 
 * // Check if subscribed
 * const subscribed = steam.workshop.getSubscribedItems();
 * console.log(`Subscribed to ${subscribed.length} items`);
 * 
 * // Get installation info
 * const info = steam.workshop.getItemInstallInfo(itemId);
 * if (info) {
 *   console.log(`Installed at: ${info.folder}`);
 * }
 * ```
 * 
 * @example Query Workshop items
 * ```typescript
 * // Query popular items
 * const query = steam.workshop.createQueryAllUGCRequest(
 *   EUGCQuery.RankedByVote,
 *   EUGCMatchingUGCType.Items,
 *   1 // page 1
 * );
 * 
 * // Results come through callbacks
 * // Listen for query completion in your callback handler
 * ```
 * 
 * @see {@link https://partner.steamgames.com/doc/api/ISteamUGC ISteamUGC Documentation}
 */
export class SteamWorkshopManager {
  /** Steam library loader for FFI function calls */
  private libraryLoader: SteamLibraryLoader;
  
  /** Steam API core for accessing interfaces */
  private apiCore: SteamAPICore;
  
  /** Callback poller for async operations */
  private callbackPoller: SteamCallbackPoller;
  
  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
    this.callbackPoller = new SteamCallbackPoller(libraryLoader, apiCore);
  }

  // ========================================
  // Subscription Management
  // ========================================

  /**
   * Subscribes to a Workshop item
   * 
   * @param publishedFileId - The Workshop item ID to subscribe to
   * @returns True if subscription was successful, false otherwise
   * 
   * @remarks
   * - Item will be automatically downloaded and installed
   * - Use getItemInstallInfo() to check installation status
   * - Use getItemDownloadInfo() to track download progress
   * 
   * @example
   * ```typescript
   * const itemId = BigInt('123456789');
   * const success = await steam.workshop.subscribeItem(itemId);
   * 
   * if (success) {
   *   console.log('Successfully subscribed!');
   *   // Check download progress
   *   const progress = steam.workshop.getItemDownloadInfo(itemId);
   *   if (progress) {
   *     console.log(`Downloading: ${progress.percentComplete}%`);
   *   }
   * }
   * ```
   */
  async subscribeItem(publishedFileId: PublishedFileId): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.error('[Steamworks] Steam API not initialized');
      return false;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      console.error('[Steamworks] ISteamUGC interface not available');
      return false;
    }

    try {
      const callHandle = this.libraryLoader.SteamAPI_ISteamUGC_SubscribeItem(ugc, publishedFileId);
      
      if (callHandle === BigInt(0)) {
        console.error('[Steamworks] Failed to initiate item subscription');
        return false;
      }

      // Wait for the callback result
      const result = await this.callbackPoller.poll<RemoteStorageSubscribePublishedFileResultType>(
        BigInt(callHandle),
        RemoteStorageSubscribePublishedFileResult_t,
        K_I_REMOTE_STORAGE_SUBSCRIBE_PUBLISHED_FILE_RESULT,
        50, // max retries (5 seconds total)
        100 // delay ms
      );

      if (result && result.m_eResult === 1) { // k_EResultOK = 1
        return true;
      }

      console.error(`[Steamworks] Subscribe item failed with result: ${result?.m_eResult || 'unknown'}`);
      return false;
    } catch (error) {
      console.error('[Steamworks] Error subscribing to item:', error);
      return false;
    }
  }  /**
   * Unsubscribes from a Workshop item
   * 
   * @param publishedFileId - The Workshop item ID to unsubscribe from
   * @returns True if unsubscription was successful, false otherwise
   * 
   * @remarks
   * - Item will be uninstalled after the game quits
   * 
   * @example
   * ```typescript
   * const itemId = BigInt('123456789');
   * const success = await steam.workshop.unsubscribeItem(itemId);
   * 
   * if (success) {
   *   console.log('Successfully unsubscribed!');
   * }
   * ```
   */
  async unsubscribeItem(publishedFileId: PublishedFileId): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.error('[Steamworks] Steam API not initialized');
      return false;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      console.error('[Steamworks] ISteamUGC interface not available');
      return false;
    }

    try {
      const callHandle = this.libraryLoader.SteamAPI_ISteamUGC_UnsubscribeItem(ugc, publishedFileId);
      
      if (callHandle === BigInt(0)) {
        console.error('[Steamworks] Failed to initiate item unsubscription');
        return false;
      }

      // Wait for the callback result
      const result = await this.callbackPoller.poll<RemoteStorageUnsubscribePublishedFileResultType>(
        BigInt(callHandle),
        RemoteStorageUnsubscribePublishedFileResult_t,
        K_I_REMOTE_STORAGE_UNSUBSCRIBE_PUBLISHED_FILE_RESULT,
        50, // max retries (5 seconds total)
        100 // delay ms
      );

      if (result && result.m_eResult === 1) { // k_EResultOK = 1
        return true;
      }

      console.error(`[Steamworks] Unsubscribe item failed with result: ${result?.m_eResult || 'unknown'}`);
      return false;
    } catch (error) {
      console.error('[Steamworks] Error unsubscribing from item:', error);
      return false;
    }
  }

  /**
   * Gets the number of subscribed Workshop items
   * 
   * @returns Number of subscribed items
   * 
   * @example
   * ```typescript
   * const count = steam.workshop.getNumSubscribedItems();
   * console.log(`Subscribed to ${count} Workshop items`);
   * ```
   */
  getNumSubscribedItems(): number {
    if (!this.apiCore.isInitialized()) {
      return 0;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return 0;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamUGC_GetNumSubscribedItems(ugc);
    } catch (error) {
      console.error('[Steamworks] Error getting subscribed items count:', error);
      return 0;
    }
  }

  /**
   * Gets all subscribed Workshop item IDs
   * 
   * @returns Array of subscribed Workshop item IDs
   * 
   * @example
   * ```typescript
   * const items = steam.workshop.getSubscribedItems();
   * items.forEach(itemId => {
   *   console.log(`Subscribed to item: ${itemId}`);
   *   const info = steam.workshop.getItemInstallInfo(itemId);
   *   if (info) {
   *     console.log(`  Installed at: ${info.folder}`);
   *   }
   * });
   * ```
   */
  getSubscribedItems(): PublishedFileId[] {
    if (!this.apiCore.isInitialized()) {
      return [];
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return [];
    }

    try {
      const count = this.getNumSubscribedItems();
      if (count === 0) {
        return [];
      }

      // Allocate array for item IDs
      const itemsBuffer = Buffer.alloc(count * 8); // uint64 array
      
      const numReturned = this.libraryLoader.SteamAPI_ISteamUGC_GetSubscribedItems(
        ugc,
        itemsBuffer,
        count
      );

      // Read the item IDs from buffer
      const items: PublishedFileId[] = [];
      for (let i = 0; i < numReturned; i++) {
        items.push(itemsBuffer.readBigUInt64LE(i * 8));
      }

      return items;
    } catch (error) {
      console.error('[Steamworks] Error getting subscribed items:', error);
      return [];
    }
  }

  // ========================================
  // Item State and Information
  // ========================================

  /**
   * Gets the state flags for a Workshop item
   * 
   * @param publishedFileId - The Workshop item ID
   * @returns State flags (combination of EItemState values)
   * 
   * @remarks
   * Use bitwise operations to check for specific states:
   * - EItemState.Subscribed - User is subscribed
   * - EItemState.Installed - Item is installed
   * - EItemState.Downloading - Currently downloading
   * - EItemState.NeedsUpdate - Update available
   * 
   * @example
   * ```typescript
   * const itemId = BigInt('123456789');
   * const state = steam.workshop.getItemState(itemId);
   * 
   * if (state & EItemState.Subscribed) {
   *   console.log('Subscribed');
   * }
   * if (state & EItemState.Installed) {
   *   console.log('Installed');
   * }
   * if (state & EItemState.Downloading) {
   *   console.log('Downloading...');
   * }
   * if (state & EItemState.NeedsUpdate) {
   *   console.log('Update available');
   * }
   * ```
   */
  getItemState(publishedFileId: PublishedFileId): number {
    if (!this.apiCore.isInitialized()) {
      return EItemState.None;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return EItemState.None;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamUGC_GetItemState(ugc, publishedFileId);
    } catch (error) {
      console.error('[Steamworks] Error getting item state:', error);
      return EItemState.None;
    }
  }

  /**
   * Gets installation information for a Workshop item
   * 
   * @param publishedFileId - The Workshop item ID
   * @returns Installation info or null if not installed
   * 
   * @remarks
   * Only returns data if item has EItemState.Installed flag set
   * 
   * @example
   * ```typescript
   * const itemId = BigInt('123456789');
   * const info = steam.workshop.getItemInstallInfo(itemId);
   * 
   * if (info) {
   *   console.log(`Installed at: ${info.folder}`);
   *   console.log(`Size on disk: ${info.sizeOnDisk} bytes`);
   *   console.log(`Install time: ${new Date(info.timestamp * 1000)}`);
   * }
   * ```
   */
  getItemInstallInfo(publishedFileId: PublishedFileId): ItemInstallInfo | null {
    if (!this.apiCore.isInitialized()) {
      return null;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return null;
    }

    try {
      const sizeBuffer = Buffer.alloc(8); // uint64
      const folderBuffer = Buffer.alloc(4096); // path buffer
      const timestampBuffer = Buffer.alloc(4); // uint32

      const success = this.libraryLoader.SteamAPI_ISteamUGC_GetItemInstallInfo(
        ugc,
        publishedFileId,
        sizeBuffer,
        folderBuffer,
        4096,
        timestampBuffer
      );

      if (!success) {
        return null;
      }

      // Read folder path (null-terminated string)
      const folderEnd = folderBuffer.indexOf(0);
      const folder = folderBuffer.toString('utf8', 0, folderEnd > 0 ? folderEnd : 4096);

      return {
        sizeOnDisk: sizeBuffer.readBigUInt64LE(0),
        folder: folder,
        timestamp: timestampBuffer.readUInt32LE(0)
      };
    } catch (error) {
      console.error('[Steamworks] Error getting item install info:', error);
      return null;
    }
  }

  /**
   * Gets download progress for a Workshop item
   * 
   * @param publishedFileId - The Workshop item ID
   * @returns Download info or null if not downloading
   * 
   * @remarks
   * Only returns data if item has EItemState.Downloading flag set
   * 
   * @example
   * ```typescript
   * const itemId = BigInt('123456789');
   * const progress = steam.workshop.getItemDownloadInfo(itemId);
   * 
   * if (progress) {
   *   console.log(`Download: ${progress.percentComplete.toFixed(1)}%`);
   *   console.log(`${progress.bytesDownloaded} / ${progress.bytesTotal} bytes`);
   * }
   * ```
   */
  getItemDownloadInfo(publishedFileId: PublishedFileId): ItemDownloadInfo | null {
    if (!this.apiCore.isInitialized()) {
      return null;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return null;
    }

    try {
      const downloadedBuffer = Buffer.alloc(8); // uint64
      const totalBuffer = Buffer.alloc(8); // uint64

      const success = this.libraryLoader.SteamAPI_ISteamUGC_GetItemDownloadInfo(
        ugc,
        publishedFileId,
        downloadedBuffer,
        totalBuffer
      );

      if (!success) {
        return null;
      }

      const bytesDownloaded = downloadedBuffer.readBigUInt64LE(0);
      const bytesTotal = totalBuffer.readBigUInt64LE(0);
      const percentComplete = bytesTotal > BigInt(0) 
        ? Number((bytesDownloaded * BigInt(100)) / bytesTotal)
        : 0;

      return {
        bytesDownloaded,
        bytesTotal,
        percentComplete
      };
    } catch (error) {
      console.error('[Steamworks] Error getting item download info:', error);
      return null;
    }
  }

  /**
   * Downloads a Workshop item (forces download if not subscribed)
   * 
   * @param publishedFileId - The Workshop item ID
   * @param highPriority - If true, suspends other downloads and prioritizes this one
   * @returns True if download started, false otherwise
   * 
   * @remarks
   * - If item is already installed, files should not be used until callback received
   * - Listen for DownloadItemResult_t callback for completion
   * - If not subscribed, item will be cached temporarily
   * 
   * @example
   * ```typescript
   * const itemId = BigInt('123456789');
   * const started = steam.workshop.downloadItem(itemId, true);
   * 
   * if (started) {
   *   console.log('Download started');
   *   // Poll getItemDownloadInfo() for progress
   * }
   * ```
   */
  downloadItem(publishedFileId: PublishedFileId, highPriority: boolean = false): boolean {
    if (!this.apiCore.isInitialized()) {
      return false;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamUGC_DownloadItem(ugc, publishedFileId, highPriority);
    } catch (error) {
      console.error('[Steamworks] Error downloading item:', error);
      return false;
    }
  }

  // ========================================
  // Query Operations
  // ========================================

  /**
   * Creates a query for a user's Workshop items
   * 
   * @param accountId - Steam account ID (32-bit, lower part of SteamID)
   * @param listType - Type of list to query
   * @param matchingType - Type of UGC to match
   * @param sortOrder - How to sort results
   * @param creatorAppId - App that created the items
   * @param consumerAppId - App that will consume the items
   * @param page - Page number (1-based)
   * @returns Query handle for use with sendQueryUGCRequest
   * 
   * @example
   * ```typescript
   * // Query current user's published items
   * const accountId = 12345678; // Get from user's SteamID
   * const query = steam.workshop.createQueryUserUGCRequest(
   *   accountId,
   *   EUserUGCList.Published,
   *   EUGCMatchingUGCType.Items,
   *   EUserUGCListSortOrder.CreationOrderDesc,
   *   480, // Spacewar
   *   480,
   *   1    // First page
   * );
   * 
   * steam.workshop.sendQueryUGCRequest(query);
   * // Wait for SteamUGCQueryCompleted_t callback
   * ```
   */
  createQueryUserUGCRequest(
    accountId: number,
    listType: EUserUGCList,
    matchingType: EUGCMatchingUGCType,
    sortOrder: EUserUGCListSortOrder,
    creatorAppId: number,
    consumerAppId: number,
    page: number
  ): UGCQueryHandle {
    if (!this.apiCore.isInitialized()) {
      return K_UGC_QUERY_HANDLE_INVALID;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return K_UGC_QUERY_HANDLE_INVALID;
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamUGC_CreateQueryUserUGCRequest(
        ugc,
        accountId,
        listType,
        matchingType,
        sortOrder,
        creatorAppId,
        consumerAppId,
        page
      );
      return BigInt(handle);
    } catch (error) {
      console.error('[Steamworks] Error creating user UGC query:', error);
      return K_UGC_QUERY_HANDLE_INVALID;
    }
  }

  /**
   * Creates a query for all Workshop items
   * 
   * @param queryType - Type of query/sorting
   * @param matchingType - Type of UGC to match
   * @param creatorAppId - App that created the items
   * @param consumerAppId - App that will consume the items
   * @param page - Page number (1-based)
   * @returns Query handle for use with sendQueryUGCRequest
   * 
   * @example
   * ```typescript
   * // Query most popular items
   * const query = steam.workshop.createQueryAllUGCRequest(
   *   EUGCQuery.RankedByVote,
   *   EUGCMatchingUGCType.Items,
   *   480, // Spacewar
   *   480,
   *   1    // First page
   * );
   * 
   * steam.workshop.sendQueryUGCRequest(query);
   * // Wait for SteamUGCQueryCompleted_t callback
   * ```
   */
  createQueryAllUGCRequest(
    queryType: EUGCQuery,
    matchingType: EUGCMatchingUGCType,
    creatorAppId: number,
    consumerAppId: number,
    page: number
  ): UGCQueryHandle {
    if (!this.apiCore.isInitialized()) {
      return K_UGC_QUERY_HANDLE_INVALID;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return K_UGC_QUERY_HANDLE_INVALID;
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamUGC_CreateQueryAllUGCRequestPage(
        ugc,
        queryType,
        matchingType,
        creatorAppId,
        consumerAppId,
        page
      );
      return BigInt(handle);
    } catch (error) {
      console.error('[Steamworks] Error creating all UGC query:', error);
      return K_UGC_QUERY_HANDLE_INVALID;
    }
  }

  /**
   * Set the search text for a UGC query to filter by text in the title or description
   * 
   * @param queryHandle - Query handle to configure
   * @param searchText - Text to search for in item titles and descriptions
   * @returns True if successful
   * 
   * @remarks
   * Call this BEFORE sendQueryUGCRequest to enable text search filtering.
   * The query type should be set to RankedByTextSearch (11) for best results.
   * 
   * @example
   * ```typescript
   * const query = steam.workshop.createQueryAllUGCRequest(
   *   EUGCQuery.RankedByTextSearch, // Use text search query type
   *   EUGCMatchingUGCType.Items,
   *   appId,
   *   appId,
   *   1
   * );
   * steam.workshop.setSearchText(query, "dragon"); // Search for "dragon"
   * const result = await steam.workshop.sendQueryUGCRequest(query);
   * ```
   */
  setSearchText(queryHandle: UGCQueryHandle, searchText: string): boolean {
    if (!this.apiCore.isInitialized()) {
      return false;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return false;
    }

    try {
      console.log(`[Steamworks] Setting search text: "${searchText}"`);
      const success = this.libraryLoader.SteamAPI_ISteamUGC_SetSearchText(ugc, queryHandle, searchText);
      console.log(`[Steamworks] SetSearchText result: ${success}`);
      return success;
    } catch (error) {
      console.error('[Steamworks] Error setting search text:', error);
      return false;
    }
  }

  /**
   * Enable returning statistics for UGC query results
   * 
   * @param queryHandle - Query handle to configure
   * @param days - Number of days of playtime stats to return (0 = lifetime)
   * @returns True if successful
   * 
   * @remarks
   * Call this BEFORE sendQueryUGCRequest to enable statistics in results.
   * This allows GetQueryUGCStatistic to return valid data.
   * 
   * @example
   * ```typescript
   * const query = steam.workshop.createQueryAllUGCRequest(...);
   * steam.workshop.setReturnPlaytimeStats(query, 0); // Enable lifetime stats
   * const result = await steam.workshop.sendQueryUGCRequest(query);
   * ```
   */
  setReturnPlaytimeStats(queryHandle: UGCQueryHandle, days: number = 0): boolean {
    if (!this.apiCore.isInitialized()) {
      return false;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return false;
    }

    try {
      const success = this.libraryLoader.SteamAPI_ISteamUGC_SetReturnPlaytimeStats(ugc, queryHandle, days);
      return success;
    } catch (error) {
      console.error('[Steamworks] Error setting return playtime stats:', error);
      return false;
    }
  }

  /**
   * Sends a UGC query to Steam and waits for results
   * 
   * @param queryHandle - Handle from createQueryUserUGCRequest or createQueryAllUGCRequest
   * @returns Query result with number of results and metadata, or null if failed
   * 
   * @remarks
   * After processing results, call releaseQueryUGCRequest to free memory
   * Use getQueryUGCResult to retrieve individual item details
   * For statistics to be available, call setReturnPlaytimeStats before this method
   * 
   * @example
   * ```typescript
   * const query = steam.workshop.createQueryAllUGCRequest(...);
   * steam.workshop.setReturnPlaytimeStats(query, 0); // Enable statistics
   * const result = await steam.workshop.sendQueryUGCRequest(query);
   * 
   * if (result) {
   *   console.log(`Found ${result.numResults} items (${result.totalResults} total)`);
   *   
   *   // Get individual results
   *   for (let i = 0; i < result.numResults; i++) {
   *     const item = steam.workshop.getQueryUGCResult(query, i);
   *     if (item) {
   *       console.log(`Item: ${item.title}`);
   *     }
   *   }
   *   
   *   // Clean up
   *   steam.workshop.releaseQueryUGCRequest(query);
   * }
   * ```
   */
  async sendQueryUGCRequest(queryHandle: UGCQueryHandle): Promise<{
    numResults: number;
    totalResults: number;
    cachedData: boolean;
  } | null> {
    if (!this.apiCore.isInitialized()) {
      console.error('[Steamworks] Steam API not initialized');
      return null;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      console.error('[Steamworks] ISteamUGC interface not available');
      return null;
    }

    try {
      // Enable statistics before sending query
      // This is required for GetQueryUGCStatistic to return valid data
      this.setReturnPlaytimeStats(queryHandle, 0); // 0 = lifetime stats
      
      const callHandle = this.libraryLoader.SteamAPI_ISteamUGC_SendQueryUGCRequest(ugc, queryHandle);
      
      if (callHandle === BigInt(0)) {
        console.error('[Steamworks] Failed to initiate UGC query');
        return null;
      }

      // Wait for the callback result
      const result = await this.callbackPoller.poll<SteamUGCQueryCompletedType>(
        BigInt(callHandle),
        SteamUGCQueryCompleted_t,
        K_I_STEAM_UGC_QUERY_COMPLETED,
        600, // max retries (60 seconds total)
        100 // delay ms
      );

      if (result && result.m_eResult === 1) { // k_EResultOK = 1
        return {
          numResults: result.m_unNumResultsReturned,
          totalResults: result.m_unTotalMatchingResults,
          cachedData: result.m_bCachedData
        };
      }

      console.error(`[Steamworks] UGC query failed with result: ${result?.m_eResult || 'unknown'}`);
      return null;
    } catch (error) {
      console.error('[Steamworks] Error sending UGC query:', error);
      return null;
    }
  }

  /**
   * Gets a single result from a completed UGC query
   * 
   * @param queryHandle - Handle from a completed query
   * @param index - Index of the result to retrieve (0-based)
   * @returns Workshop item details or null if failed
   * 
   * @remarks
   * Call this after receiving SteamUGCQueryCompleted_t callback
   * Index must be less than the number of results returned in callback
   * 
   * @example
   * ```typescript
   * // After query completes via callback:
   * const query = steam.workshop.createQueryAllUGCRequest(...);
   * steam.workshop.sendQueryUGCRequest(query);
   * 
   * // In callback handler when query completes:
   * // Get first 10 results
   * for (let i = 0; i < 10; i++) {
   *   const item = steam.workshop.getQueryUGCResult(query, i);
   *   if (item) {
   *     console.log(`${item.title} by ${item.steamIdOwner}`);
   *     console.log(`Votes: 👍 ${item.votesUp} | Score: ${item.score.toFixed(2)}`);
   *   }
   * }
   * 
   * steam.workshop.releaseQueryUGCRequest(query);
   * ```
   */
  getQueryUGCResult(queryHandle: UGCQueryHandle, index: number): WorkshopItem | null {
    if (!this.apiCore.isInitialized()) {
      return null;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return null;
    }

    try {
      // Allocate buffer for SteamUGCDetails_t struct
      const detailsBuffer = Buffer.alloc(STEAM_UGC_DETAILS_SIZE);
      
      const success = this.libraryLoader.SteamAPI_ISteamUGC_GetQueryUGCResult(
        ugc,
        queryHandle,
        index,
        detailsBuffer
      );

      if (!success) {
        return null;
      }

      // CRITICAL FINDING: GetQueryUGCResult only populates fields up to offset 8184!
      // After the 3 bools (at 8181-8183), all remaining fields are uninitialized memory.
      // The tags, file handles, sizes, votes, etc. are NOT populated by this API call.
      // 
      // To get additional metadata, use these separate API calls:
      // - ISteamUGC::GetQueryUGCMetadata() for tags
      // - ISteamUGC::GetQueryUGCStatistics() for votes
      // - ISteamRemoteStorage functions for file info
      //
      // For now, return safe defaults for unpopulated fields.

      // Manually parse the struct with proper 8-byte alignment (#pragma pack(8))
      let offset = 0;
      
      // uint64 m_nPublishedFileId (8 bytes, offset 0)
      const publishedFileId = detailsBuffer.readBigUInt64LE(offset);
      offset += 8; // Now at 8
      
      // int32 m_eResult (4 bytes, offset 8)
      const result = detailsBuffer.readInt32LE(offset);
      offset += 4; // Now at 12
      
      // int32 m_eFileType (4 bytes, offset 12)
      const fileType = detailsBuffer.readInt32LE(offset);
      offset += 4; // Now at 16
      
      // uint32 m_nCreatorAppID (4 bytes, offset 16)
      const creatorAppID = detailsBuffer.readUInt32LE(offset);
      offset += 4; // Now at 20
      
      // uint32 m_nConsumerAppID (4 bytes, offset 20)
      const consumerAppID = detailsBuffer.readUInt32LE(offset);
      offset += 4; // Now at 24
      
      // char[129] m_rgchTitle (129 bytes, offset 24, char has 1-byte alignment, no padding before)
      const titleEnd = detailsBuffer.indexOf(0, offset);
      const title = detailsBuffer.toString('utf8', offset, titleEnd > offset ? titleEnd : offset + 129);
      offset += 129; // Now at 153
      
      // NO PADDING - char arrays don't cause alignment padding with #pragma pack(8)
      // char[8000] m_rgchDescription (8000 bytes, offset 153)
      const descEnd = detailsBuffer.indexOf(0, offset);
      const description = detailsBuffer.toString('utf8', offset, descEnd > offset ? descEnd : offset + 8000);
      offset += 8000; // Now at 8153
      
      // PLATFORM-SPECIFIC ALIGNMENT:
      // After the description char array, we need to align for uint64 m_ulSteamIDOwner
      // - Windows (MSVC pack(8)): Pad to 8-byte boundary: 8153 -> 8160 (7 bytes padding)
      // - Mac/Linux (GCC pack(4)): Pad to 4-byte boundary: 8153 -> 8156 (3 bytes padding)
      if (process.platform === 'win32') {
        offset = Math.ceil(offset / 8) * 8; // Windows: align to 8 bytes -> 8160
      } else {
        offset += 3; // Mac/Linux: 3 bytes padding -> 8156
      }
      
      // uint64 m_ulSteamIDOwner (8 bytes)
      const steamIDOwner = detailsBuffer.readBigUInt64LE(offset);
      offset += 8; // Now at 8164
      
      // uint32 m_rtimeCreated (4 bytes, offset 8164)
      const timeCreated = detailsBuffer.readUInt32LE(offset);
      offset += 4; // Now at 8168
      
      // uint32 m_rtimeUpdated (4 bytes, offset 8168)
      const timeUpdated = detailsBuffer.readUInt32LE(offset);
      offset += 4; // Now at 8172
      
      // uint32 m_rtimeAddedToUserList (4 bytes, offset 8172)
      const timeAddedToUserList = detailsBuffer.readUInt32LE(offset);
      offset += 4; // Now at 8176
      
      // int32 m_eVisibility (4 bytes, offset 8176)
      const visibility = detailsBuffer.readInt32LE(offset);
      offset += 4; // Now at 8180
      
      // bool m_bBanned (1 byte, offset 8180)
      const banned = detailsBuffer.readUInt8(offset) !== 0;
      offset += 1; // Now at 8181
      
      // bool m_bAcceptedForUse (1 byte, offset 8181)
      const acceptedForUse = detailsBuffer.readUInt8(offset) !== 0;
      offset += 1; // Now at 8182
      
      // bool m_bTagsTruncated (1 byte, offset 8182)
      const tagsTruncated = detailsBuffer.readUInt8(offset) !== 0;
      offset += 1; // Now at 8183
      
      // Padding to align next field (char array doesn't need padding with pack(8))
      // char[1025] m_rgchTags (1025 bytes, offset 8183)
      const tagsEnd = detailsBuffer.indexOf(0, offset);
      const tagsString = detailsBuffer.toString('utf8', offset, tagsEnd > offset ? tagsEnd : offset + 1025);
      offset += 1025; // Mac/Linux: Now at 9208, Windows: Now at 9212
      
      // PLATFORM-SPECIFIC ALIGNMENT before uint64:
      // - Windows (MSVC pack(8)): Pad to 8-byte boundary
      // - Mac/Linux: offset 9208 is already 8-byte aligned
      if (process.platform === 'win32') {
        offset = Math.ceil(offset / 8) * 8; // Windows: align to 8 bytes
      }
      
      // UGCHandle_t m_hFile (uint64, 8 bytes)
      const file = detailsBuffer.readBigUInt64LE(offset);
      offset += 8; // Now at 9216
      
      // UGCHandle_t m_hPreviewFile (uint64, 8 bytes, offset 9216)
      const previewFile = detailsBuffer.readBigUInt64LE(offset);
      offset += 8; // Now at 9224
      
      // char[260] m_pchFileName (260 bytes, offset 9224)
      const fileNameEnd = detailsBuffer.indexOf(0, offset);
      const fileName = detailsBuffer.toString('utf8', offset, fileNameEnd > offset ? fileNameEnd : offset + 260);
      offset += 260; // Now at 9484
      
      // Padding before int32 (9484 is 4-byte aligned, good for int32)
      // int32 m_nFileSize (4 bytes, offset 9484)
      const fileSize = detailsBuffer.readInt32LE(offset);
      offset += 4; // Now at 9488
      
      // int32 m_nPreviewFileSize (4 bytes, offset 9488)
      const previewFileSize = detailsBuffer.readInt32LE(offset);
      offset += 4; // Now at 9492
      
      // char[256] m_rgchURL (256 bytes, offset 9492)
      const urlEnd = detailsBuffer.indexOf(0, offset);
      const urlFromStruct = detailsBuffer.toString('utf8', offset, urlEnd > offset ? urlEnd : offset + 256);
      offset += 256; // Now at 9748
      
      // uint32 m_unVotesUp (4 bytes, offset 9748)
      const votesUpFromStruct = detailsBuffer.readUInt32LE(offset);
      offset += 4; // Now at 9752
      
      // uint32 m_unVotesDown (4 bytes, offset 9752)
      const votesDownFromStruct = detailsBuffer.readUInt32LE(offset);
      offset += 4; // Now at 9756
      
      // float m_flScore (4 bytes, offset 9756)
      const scoreFromStruct = detailsBuffer.readFloatLE(offset);
      offset += 4; // Now at 9760
      
      // uint32 m_unNumChildren (4 bytes, offset 9760)
      const numChildren = detailsBuffer.readUInt32LE(offset);
      offset += 4; // Now at 9764
      
      // uint64 m_ulTotalFilesSize (8 bytes, offset 9764)
      // Padding needed for 8-byte alignment (9764 -> 9768)
      offset = Math.ceil(offset / 8) * 8; // Now at 9768
      const totalFilesSize = detailsBuffer.readBigUInt64LE(offset);
      offset += 8; // Now at 9776
      
      // Parse tags from comma-separated string in struct
      // m_rgchTags contains a comma-separated list of tags
      const tags: string[] = tagsString
        ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];
      
      // Fetch preview URL using GetQueryUGCPreviewURL (more reliable than struct URL)
      const url = this.getQueryUGCPreviewURL(queryHandle, index) || urlFromStruct || '';
      
      // Use votes from struct (these are the real vote counts!)
      const votesUp = votesUpFromStruct;
      const votesDown = votesDownFromStruct;
      const score = scoreFromStruct;
      
      return {
        publishedFileId,
        result,
        fileType,
        creatorAppID,
        consumerAppID,
        title,
        description,
        steamIDOwner,
        timeCreated,
        timeUpdated,
        timeAddedToUserList,
        visibility,
        banned,
        acceptedForUse,
        tagsTruncated,
        tags,
        file,
        previewFile,
        fileName,
        fileSize,
        previewFileSize,
        url,
        votesUp,
        votesDown,
        score,
        numChildren,
        totalFilesSize
      };
    } catch (error) {
      console.error('[Steamworks] Error getting query UGC result:', error);
      return null;
    }
  }

  /**
   * Releases a query handle and frees associated memory
   * 
   * @param queryHandle - Handle to release
   * @returns True if released successfully
   * 
   * @remarks
   * Always call this after processing query results to prevent memory leaks
   * 
   * @example
   * ```typescript
   * const query = steam.workshop.createQueryAllUGCRequest(...);
   * steam.workshop.sendQueryUGCRequest(query);
   * // After callback and processing results:
   * steam.workshop.releaseQueryUGCRequest(query);
   * ```
   */
  releaseQueryUGCRequest(queryHandle: UGCQueryHandle): boolean {
    if (!this.apiCore.isInitialized()) {
      return false;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamUGC_ReleaseQueryUGCRequest(ugc, queryHandle);
    } catch (error) {
      console.error('[Steamworks] Error releasing UGC query:', error);
      return false;
    }
  }

  /**
   * Get number of tags for a UGC query result
   * 
   * @param queryHandle - Query handle from sendQueryUGCRequest
   * @param index - Index of the result (0 to numResults-1)
   * @returns Number of tags, or 0 if failed
   * 
   * @example
   * ```typescript
   * const numTags = steam.workshop.getQueryUGCNumTags(query, i);
   * ```
   */
  getQueryUGCNumTags(queryHandle: UGCQueryHandle, index: number): number {
    if (!this.apiCore.isInitialized()) {
      return 0;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return 0;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamUGC_GetQueryUGCNumTags(ugc, queryHandle, index);
    } catch (error) {
      console.error('[Steamworks] Error getting UGC tag count:', error);
      return 0;
    }
  }

  /**
   * Get a specific tag for a UGC query result
   * 
   * @param queryHandle - Query handle from sendQueryUGCRequest
   * @param index - Index of the result (0 to numResults-1)
   * @param tagIndex - Index of the tag (0 to numTags-1)
   * @returns The tag string, or null if failed
   * 
   * @example
   * ```typescript
   * const numTags = steam.workshop.getQueryUGCNumTags(query, i);
   * for (let t = 0; t < numTags; t++) {
   *   const tag = steam.workshop.getQueryUGCTag(query, i, t);
   *   console.log(`Tag: ${tag}`);
   * }
   * ```
   */
  getQueryUGCTag(
    queryHandle: UGCQueryHandle,
    index: number,
    tagIndex: number
  ): string | null {
    if (!this.apiCore.isInitialized()) {
      return null;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return null;
    }

    try {
      const tagBuffer = Buffer.alloc(256);
      const success = this.libraryLoader.SteamAPI_ISteamUGC_GetQueryUGCTag(
        ugc,
        queryHandle,
        index,
        tagIndex,
        tagBuffer,
        256
      );

      if (!success) {
        return null;
      }

      // Find null terminator
      const nullIndex = tagBuffer.indexOf(0);
      return nullIndex >= 0 ? tagBuffer.toString('utf8', 0, nullIndex) : tagBuffer.toString('utf8');
    } catch (error) {
      console.error('[Steamworks] Error getting UGC tag:', error);
      return null;
    }
  }

  /**
   * Get preview URL for a UGC query result
   * 
   * @param queryHandle - Query handle from sendQueryUGCRequest
   * @param index - Index of the result (0 to numResults-1)
   * @returns The preview URL, or null if failed
   * 
   * @example
   * ```typescript
   * const previewUrl = steam.workshop.getQueryUGCPreviewURL(query, i);
   * ```
   */
  getQueryUGCPreviewURL(queryHandle: UGCQueryHandle, index: number): string | null {
    if (!this.apiCore.isInitialized()) {
      return null;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return null;
    }

    try {
      const urlBuffer = Buffer.alloc(1024);
      const success = this.libraryLoader.SteamAPI_ISteamUGC_GetQueryUGCPreviewURL(
        ugc,
        queryHandle,
        index,
        urlBuffer,
        1024
      );

      if (!success) {
        return null;
      }

      // Find null terminator
      const nullIndex = urlBuffer.indexOf(0);
      return nullIndex >= 0 ? urlBuffer.toString('utf8', 0, nullIndex) : urlBuffer.toString('utf8');
    } catch (error) {
      console.error('[Steamworks] Error getting UGC preview URL:', error);
      return null;
    }
  }

  /**
   * Get metadata for a UGC query result
   * 
   * @param queryHandle - Query handle from sendQueryUGCRequest
   * @param index - Index of the result (0 to numResults-1)
   * @returns The metadata string, or null if failed
   * 
   * @example
   * ```typescript
   * const metadata = steam.workshop.getQueryUGCMetadata(query, i);
   * ```
   */
  getQueryUGCMetadata(queryHandle: UGCQueryHandle, index: number): string | null {
    if (!this.apiCore.isInitialized()) {
      return null;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return null;
    }

    try {
      const metadataBuffer = Buffer.alloc(5000);
      const success = this.libraryLoader.SteamAPI_ISteamUGC_GetQueryUGCMetadata(
        ugc,
        queryHandle,
        index,
        metadataBuffer,
        5000
      );

      if (!success) {
        return null;
      }

      // Find null terminator
      const nullIndex = metadataBuffer.indexOf(0);
      return nullIndex >= 0 ? metadataBuffer.toString('utf8', 0, nullIndex) : metadataBuffer.toString('utf8');
    } catch (error) {
      console.error('[Steamworks] Error getting UGC metadata:', error);
      return null;
    }
  }

  // ========================================
  // Item Creation and Update
  // ========================================

  /**
   * Creates a new Workshop item and waits for the result
   * 
   * @param consumerAppId - App ID that will consume this item
   * @param fileType - Type of Workshop file
   * @returns The published file ID of the newly created item, or null if failed
   * 
   * @remarks
   * This method automatically waits for the CreateItemResult_t callback.
   * Once created, use startItemUpdate to set content and properties.
   * Blocks until result is ready or times out (default 5 seconds).
   * 
   * @example
   * ```typescript
   * const publishedFileId = await steam.workshop.createItem(
   *   480,
   *   EWorkshopFileType.Community
   * );
   * 
   * if (publishedFileId) {
   *   console.log(`Created item with ID: ${publishedFileId}`);
   *   
   *   // Now you can update the item
   *   const updateHandle = steam.workshop.startItemUpdate(480, publishedFileId);
   *   steam.workshop.setItemTitle(updateHandle, 'My Awesome Mod');
   *   steam.workshop.setItemContent(updateHandle, '/path/to/content');
   *   steam.workshop.submitItemUpdate(updateHandle, 'Initial release');
   * }
   * ```
   */
  async createItem(consumerAppId: number, fileType: EWorkshopFileType): Promise<PublishedFileId | null> {
    if (!this.apiCore.isInitialized()) {
      console.error('[Steamworks] Steam API not initialized');
      return null;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      console.error('[Steamworks] ISteamUGC interface not available');
      return null;
    }

    try {
      // Call Steam API to create the item
      const callHandle = this.libraryLoader.SteamAPI_ISteamUGC_CreateItem(ugc, consumerAppId, fileType);
      
      if (callHandle === BigInt(0)) {
        console.error('[Steamworks] Failed to initiate item creation');
        return null;
      }

      // Wait for the callback result (longer timeout for item creation)
      const result = await this.callbackPoller.poll<CreateItemResultType>(
        BigInt(callHandle),
        CreateItemResult_t,
        K_I_CREATE_ITEM_RESULT,
        600, // max retries (60 seconds total - item creation can be slow)
        100 // delay ms
      );

      if (result && result.m_eResult === 1) { // k_EResultOK = 1
        if (result.m_bUserNeedsToAcceptWorkshopLegalAgreement) {
          console.warn('[Steamworks] User needs to accept Workshop Legal Agreement');
          console.warn('[Steamworks] Visit: https://steamcommunity.com/sharedfiles/workshoplegalagreement');
        }
        return BigInt(result.m_nPublishedFileId);
      }

      console.error(`[Steamworks] Create item failed with result: ${result?.m_eResult || 'unknown'}`);
      return null;
    } catch (error) {
      console.error('[Steamworks] Error creating item:', error);
      return null;
    }
  }

  /**
   * Starts an update for a Workshop item
   * 
   * @param consumerAppId - App ID
   * @param publishedFileId - Workshop item ID to update
   * @returns Update handle for use with set* functions
   * 
   * @remarks
   * Call set* functions to modify properties, then submitItemUpdate to commit
   * 
   * @example
   * ```typescript
   * const itemId = BigInt('123456789');
   * const updateHandle = steam.workshop.startItemUpdate(480, itemId);
   * 
   * steam.workshop.setItemTitle(updateHandle, 'My Awesome Mod v2.0');
   * steam.workshop.setItemDescription(updateHandle, 'Updated with new features!');
   * steam.workshop.setItemContent(updateHandle, '/path/to/mod/folder');
   * 
   * steam.workshop.submitItemUpdate(updateHandle, 'Version 2.0 changelog');
   * ```
   */
  startItemUpdate(consumerAppId: number, publishedFileId: PublishedFileId): UGCUpdateHandle {
    if (!this.apiCore.isInitialized()) {
      return K_UGC_UPDATE_HANDLE_INVALID;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return K_UGC_UPDATE_HANDLE_INVALID;
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamUGC_StartItemUpdate(ugc, consumerAppId, publishedFileId);
      return BigInt(handle);
    } catch (error) {
      console.error('[Steamworks] Error starting item update:', error);
      return K_UGC_UPDATE_HANDLE_INVALID;
    }
  }

  /**
   * Sets the title of a Workshop item being updated
   * 
   * @param updateHandle - Handle from startItemUpdate
   * @param title - New title for the item
   * @returns True if set successfully
   */
  setItemTitle(updateHandle: UGCUpdateHandle, title: string): boolean {
    if (!this.apiCore.isInitialized()) {
      return false;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamUGC_SetItemTitle(ugc, updateHandle, title);
    } catch (error) {
      console.error('[Steamworks] Error setting item title:', error);
      return false;
    }
  }

  /**
   * Sets the description of a Workshop item being updated
   * 
   * @param updateHandle - Handle from startItemUpdate
   * @param description - New description for the item
   * @returns True if set successfully
   */
  setItemDescription(updateHandle: UGCUpdateHandle, description: string): boolean {
    if (!this.apiCore.isInitialized()) {
      return false;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamUGC_SetItemDescription(ugc, updateHandle, description);
    } catch (error) {
      console.error('[Steamworks] Error setting item description:', error);
      return false;
    }
  }

  /**
   * Sets the visibility of a Workshop item being updated
   * 
   * @param updateHandle - Handle from startItemUpdate
   * @param visibility - Visibility setting
   * @returns True if set successfully
   */
  setItemVisibility(updateHandle: UGCUpdateHandle, visibility: ERemoteStoragePublishedFileVisibility): boolean {
    if (!this.apiCore.isInitialized()) {
      return false;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamUGC_SetItemVisibility(ugc, updateHandle, visibility);
    } catch (error) {
      console.error('[Steamworks] Error setting item visibility:', error);
      return false;
    }
  }

  /**
   * Sets the content folder for a Workshop item being updated
   * 
   * @param updateHandle - Handle from startItemUpdate
   * @param contentFolder - Path to folder containing item content
   * @returns True if set successfully
   * 
   * @remarks
   * All files in the folder will be uploaded to Workshop
   */
  setItemContent(updateHandle: UGCUpdateHandle, contentFolder: string): boolean {
    if (!this.apiCore.isInitialized()) {
      return false;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamUGC_SetItemContent(ugc, updateHandle, contentFolder);
    } catch (error) {
      console.error('[Steamworks] Error setting item content:', error);
      return false;
    }
  }

  /**
   * Sets the preview image for a Workshop item being updated
   * 
   * @param updateHandle - Handle from startItemUpdate
   * @param previewFile - Path to preview image file (must be under 1MB)
   * @returns True if set successfully
   */
  setItemPreview(updateHandle: UGCUpdateHandle, previewFile: string): boolean {
    if (!this.apiCore.isInitialized()) {
      return false;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamUGC_SetItemPreview(ugc, updateHandle, previewFile);
    } catch (error) {
      console.error('[Steamworks] Error setting item preview:', error);
      return false;
    }
  }

  /**
   * Submits an item update to Steam Workshop and waits for completion
   * 
   * @param updateHandle - Handle from startItemUpdate
   * @param changeNote - Description of changes (shown in update history)
   * @returns True if update was submitted successfully, false otherwise
   * 
   * @remarks
   * Use getItemUpdateProgress to track upload progress
   * 
   * @example
   * ```typescript
   * const updateHandle = steam.workshop.startItemUpdate(480, itemId);
   * steam.workshop.setItemTitle(updateHandle, 'Updated Title');
   * const success = await steam.workshop.submitItemUpdate(updateHandle, 'Fixed bugs');
   * 
   * if (success) {
   *   console.log('Update submitted successfully!');
   * }
   * ```
   */
  async submitItemUpdate(updateHandle: UGCUpdateHandle, changeNote: string): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.error('[Steamworks] Steam API not initialized');
      return false;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      console.error('[Steamworks] ISteamUGC interface not available');
      return false;
    }

    try {
      const callHandle = this.libraryLoader.SteamAPI_ISteamUGC_SubmitItemUpdate(ugc, updateHandle, changeNote);
      
      if (callHandle === BigInt(0)) {
        console.error('[Steamworks] Failed to initiate item update submission');
        return false;
      }

      // Wait for the callback result (longer timeout for uploads)
      const result = await this.callbackPoller.poll<SubmitItemUpdateResultType>(
        BigInt(callHandle),
        SubmitItemUpdateResult_t,
        K_I_SUBMIT_ITEM_UPDATE_RESULT,
        300, // max retries (30 seconds total - uploads can be slow)
        100 // delay ms
      );

      if (result && result.m_eResult === 1) { // k_EResultOK = 1
        if (result.m_bUserNeedsToAcceptWorkshopLegalAgreement) {
          console.warn('[Steamworks] User needs to accept Workshop Legal Agreement');
          console.warn('[Steamworks] Visit: https://steamcommunity.com/sharedfiles/workshoplegalagreement');
        }
        return true;
      }

      console.error(`[Steamworks] Submit item update failed with result: ${result?.m_eResult || 'timeout'}`);
      return false;
    } catch (error) {
      console.error('[Steamworks] Error submitting item update:', error);
      return false;
    }
  }

  /**
   * Gets the progress of an item update submission
   * 
   * @param updateHandle - Handle from startItemUpdate
   * @returns Update progress info
   * 
   * @example
   * ```typescript
   * const updateHandle = steam.workshop.startItemUpdate(480, itemId);
   * // ... set properties and submit ...
   * 
   * // Poll for progress
   * const progress = steam.workshop.getItemUpdateProgress(updateHandle);
   * console.log(`Status: ${EItemUpdateStatus[progress.status]}`);
   * console.log(`Progress: ${progress.percentComplete.toFixed(1)}%`);
   * ```
   */
  getItemUpdateProgress(updateHandle: UGCUpdateHandle): ItemUpdateProgress {
    const result: ItemUpdateProgress = {
      status: EItemUpdateStatus.Invalid,
      bytesProcessed: BigInt(0),
      bytesTotal: BigInt(0),
      percentComplete: 0
    };

    if (!this.apiCore.isInitialized()) {
      return result;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return result;
    }

    try {
      const processedBuffer = Buffer.alloc(8); // uint64
      const totalBuffer = Buffer.alloc(8); // uint64

      const status = this.libraryLoader.SteamAPI_ISteamUGC_GetItemUpdateProgress(
        ugc,
        updateHandle,
        processedBuffer,
        totalBuffer
      );

      const bytesProcessed = processedBuffer.readBigUInt64LE(0);
      const bytesTotal = totalBuffer.readBigUInt64LE(0);
      const percentComplete = bytesTotal > BigInt(0)
        ? Number((bytesProcessed * BigInt(100)) / bytesTotal)
        : 0;

      result.status = status;
      result.bytesProcessed = bytesProcessed;
      result.bytesTotal = bytesTotal;
      result.percentComplete = percentComplete;

      return result;
    } catch (error) {
      console.error('[Steamworks] Error getting item update progress:', error);
      return result;
    }
  }

  // ========================================
  // Voting and Favorites
  // ========================================

  /**
   * Votes on a Workshop item
   * 
   * @param publishedFileId - Workshop item ID
   * @param voteUp - True to vote up, false to vote down
   * @returns True if vote was successful, false otherwise
   * 
   * @example
   * ```typescript
   * const itemId = BigInt('123456789');
   * const success = await steam.workshop.setUserItemVote(itemId, true); // Vote up
   * 
   * if (success) {
   *   console.log('Vote registered!');
   * }
   * ```
   */
  async setUserItemVote(publishedFileId: PublishedFileId, voteUp: boolean): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.error('[Steamworks] Steam API not initialized');
      return false;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      console.error('[Steamworks] ISteamUGC interface not available');
      return false;
    }

    try {
      const callHandle = this.libraryLoader.SteamAPI_ISteamUGC_SetUserItemVote(ugc, publishedFileId, voteUp);
      
      if (callHandle === BigInt(0)) {
        console.error('[Steamworks] Failed to initiate vote');
        return false;
      }

      // Wait for the callback result
      const result = await this.callbackPoller.poll<SetUserItemVoteResultType>(
        BigInt(callHandle),
        SetUserItemVoteResult_t,
        K_I_SET_USER_ITEM_VOTE_RESULT,
        50, // max retries (5 seconds total)
        100 // delay ms
      );

      if (result && result.m_eResult === 1) { // k_EResultOK = 1
        return true;
      }

      console.error(`[Steamworks] Set user item vote failed with result: ${result?.m_eResult || 'unknown'}`);
      return false;
    } catch (error) {
      console.error('[Steamworks] Error setting item vote:', error);
      return false;
    }
  }

  /**
   * Gets the user's vote on a Workshop item
   * 
   * @param publishedFileId - Workshop item ID
   * @returns Vote status object, or null if failed
   * 
   * @example
   * ```typescript
   * const itemId = BigInt('123456789');
   * const vote = await steam.workshop.getUserItemVote(itemId);
   * 
   * if (vote) {
   *   if (vote.votedUp) {
   *     console.log('You voted up');
   *   } else if (vote.votedDown) {
   *     console.log('You voted down');
   *   } else {
   *     console.log('You have not voted');
   *   }
   * }
   * ```
   */
  async getUserItemVote(publishedFileId: PublishedFileId): Promise<{
    votedUp: boolean;
    votedDown: boolean;
    voteSkipped: boolean;
  } | null> {
    if (!this.apiCore.isInitialized()) {
      console.error('[Steamworks] Steam API not initialized');
      return null;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      console.error('[Steamworks] ISteamUGC interface not available');
      return null;
    }

    try {
      const callHandle = this.libraryLoader.SteamAPI_ISteamUGC_GetUserItemVote(ugc, publishedFileId);
      
      if (callHandle === BigInt(0)) {
        console.error('[Steamworks] Failed to initiate get vote');
        return null;
      }

      // Wait for the callback result
      const result = await this.callbackPoller.poll<GetUserItemVoteResultType>(
        BigInt(callHandle),
        GetUserItemVoteResult_t,
        K_I_GET_USER_ITEM_VOTE_RESULT,
        50, // max retries (5 seconds total)
        100 // delay ms
      );

      if (result && result.m_eResult === 1) { // k_EResultOK = 1
        return {
          votedUp: result.m_bVotedUp,
          votedDown: result.m_bVotedDown,
          voteSkipped: result.m_bVoteSkipped
        };
      }

      console.error(`[Steamworks] Get user item vote failed with result: ${result?.m_eResult || 'unknown'}`);
      return null;
    } catch (error) {
      console.error('[Steamworks] Error getting item vote:', error);
      return null;
    }
  }

  /**
   * Adds a Workshop item to the user's favorites
   * 
   * @param appId - App ID
   * @param publishedFileId - Workshop item ID
   * @returns True if added successfully, false otherwise
   * 
   * @example
   * ```typescript
   * const itemId = BigInt('123456789');
   * const success = await steam.workshop.addItemToFavorites(480, itemId);
   * 
   * if (success) {
   *   console.log('Added to favorites!');
   * }
   * ```
   */
  async addItemToFavorites(appId: number, publishedFileId: PublishedFileId): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.error('[Steamworks] Steam API not initialized');
      return false;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      console.error('[Steamworks] ISteamUGC interface not available');
      return false;
    }

    try {
      const callHandle = this.libraryLoader.SteamAPI_ISteamUGC_AddItemToFavorites(ugc, appId, publishedFileId);
      
      if (callHandle === BigInt(0)) {
        console.error('[Steamworks] Failed to initiate add to favorites');
        return false;
      }

      // Wait for the callback result
      const result = await this.callbackPoller.poll<UserFavoriteItemsListChangedType>(
        BigInt(callHandle),
        UserFavoriteItemsListChanged_t,
        K_I_USER_FAVORITE_ITEMS_LIST_CHANGED,
        50, // max retries (5 seconds total)
        100 // delay ms
      );

      if (result && result.m_eResult === 1) { // k_EResultOK = 1
        return true;
      }

      console.error(`[Steamworks] Add item to favorites failed with result: ${result?.m_eResult || 'unknown'}`);
      return false;
    } catch (error) {
      console.error('[Steamworks] Error adding item to favorites:', error);
      return false;
    }
  }

  /**
   * Removes a Workshop item from the user's favorites
   * 
   * @param appId - App ID
   * @param publishedFileId - Workshop item ID
   * @returns True if removed successfully, false otherwise
   * 
   * @example
   * ```typescript
   * const itemId = BigInt('123456789');
   * const success = await steam.workshop.removeItemFromFavorites(480, itemId);
   * 
   * if (success) {
   *   console.log('Removed from favorites!');
   * }
   * ```
   */
  async removeItemFromFavorites(appId: number, publishedFileId: PublishedFileId): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.error('[Steamworks] Steam API not initialized');
      return false;
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      console.error('[Steamworks] ISteamUGC interface not available');
      return false;
    }

    try {
      const callHandle = this.libraryLoader.SteamAPI_ISteamUGC_RemoveItemFromFavorites(ugc, appId, publishedFileId);
      
      if (callHandle === BigInt(0)) {
        console.error('[Steamworks] Failed to initiate remove from favorites');
        return false;
      }

      // Wait for the callback result
      const result = await this.callbackPoller.poll<UserFavoriteItemsListChangedType>(
        BigInt(callHandle),
        UserFavoriteItemsListChanged_t,
        K_I_USER_FAVORITE_ITEMS_LIST_CHANGED,
        50, // max retries (5 seconds total)
        100 // delay ms
      );

      if (result && result.m_eResult === 1) { // k_EResultOK = 1
        return true;
      }

      console.error(`[Steamworks] Remove item from favorites failed with result: ${result?.m_eResult || 'unknown'}`);
      return false;
    } catch (error) {
      console.error('[Steamworks] Error removing item from favorites:', error);
      return false;
    }
  }
}
