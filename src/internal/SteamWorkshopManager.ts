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
// Steam uses #pragma pack causing tight packing - Koffi can't handle this properly
// Layout: [int32:0-3][uint64:4-11][uint8:12] = 13 bytes, padded to 16
const CreateItemResult_t = koffi.struct('CreateItemResult_t', {
  rawBytes: koffi.array('uint8', 16)
});

// Manual buffer parsing for SubmitItemUpdateResult_t callback
// Steam uses #pragma pack causing tight packing - Koffi can't handle this properly
// Layout: [int32:0-3][bool:4][padding:5-7][uint64:8-15] = 16 bytes
const SubmitItemUpdateResult_t = koffi.struct('SubmitItemUpdateResult_t', {
  rawBytes: koffi.array('uint8', 16)
});

// Koffi struct for RemoteStorageSubscribePublishedFileResult_t callback
const RemoteStorageSubscribePublishedFileResult_t = koffi.struct('RemoteStorageSubscribePublishedFileResult_t', {
  m_eResult: 'int',                     // EResult (4 bytes)
  _padding: 'int',                      // Padding for alignment (4 bytes)
  m_nPublishedFileId: 'uint64'          // PublishedFileId_t (8 bytes)
});

// Koffi struct for RemoteStorageUnsubscribePublishedFileResult_t callback
const RemoteStorageUnsubscribePublishedFileResult_t = koffi.struct('RemoteStorageUnsubscribePublishedFileResult_t', {
  m_eResult: 'int',                     // EResult (4 bytes)
  _padding: 'int',                      // Padding for alignment (4 bytes)
  m_nPublishedFileId: 'uint64'          // PublishedFileId_t (8 bytes)
});

// Koffi struct for SteamUGCQueryCompleted_t callback
const SteamUGCQueryCompleted_t = koffi.struct('SteamUGCQueryCompleted_t', {
  m_handle: 'uint64',                   // UGCQueryHandle_t
  m_eResult: 'int',                     // EResult
  m_unNumResultsReturned: 'uint32',
  m_unTotalMatchingResults: 'uint32',
  m_bCachedData: 'bool'
});

// Koffi struct for SetUserItemVoteResult_t callback
const SetUserItemVoteResult_t = koffi.struct('SetUserItemVoteResult_t', {
  m_nPublishedFileId: 'uint64',         // PublishedFileId_t (8 bytes)
  m_eResult: 'int',                     // EResult (4 bytes)
  m_bVoteUp: 'bool'                     // bool (1 byte)
});

// Koffi struct for GetUserItemVoteResult_t callback
const GetUserItemVoteResult_t = koffi.struct('GetUserItemVoteResult_t', {
  m_nPublishedFileId: 'uint64',         // PublishedFileId_t (8 bytes)
  m_eResult: 'int',                     // EResult (4 bytes)
  m_bVotedUp: 'bool',                   // bool (1 byte)
  m_bVotedDown: 'bool',                 // bool (1 byte)
  m_bVoteSkipped: 'bool'                // bool (1 byte)
});

// Koffi struct for UserFavoriteItemsListChanged_t callback
const UserFavoriteItemsListChanged_t = koffi.struct('UserFavoriteItemsListChanged_t', {
  m_nPublishedFileId: 'uint64',         // PublishedFileId_t (8 bytes)
  m_eResult: 'int',                     // EResult (4 bytes)
  m_bWasAddRequest: 'bool'              // bool (1 byte)
});

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
   * Sends a UGC query to Steam and waits for results
   * 
   * @param queryHandle - Handle from createQueryUserUGCRequest or createQueryAllUGCRequest
   * @returns Query result with number of results and metadata, or null if failed
   * 
   * @remarks
   * After processing results, call releaseQueryUGCRequest to free memory
   * Use getQueryUGCResult to retrieve individual item details
   * 
   * @example
   * ```typescript
   * const query = steam.workshop.createQueryAllUGCRequest(...);
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
        50, // max retries (5 seconds total)
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
   *     console.log(`Votes: ${item.votesUp} up, ${item.votesDown} down`);
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
      // Struct size: ~10KB (8KB description + 1KB tags + other fields)
      const detailsBuffer = Buffer.alloc(10240);
      
      const success = this.libraryLoader.SteamAPI_ISteamUGC_GetQueryUGCResult(
        ugc,
        queryHandle,
        index,
        detailsBuffer
      );

      if (!success) {
        return null;
      }

      // Parse the SteamUGCDetails_t struct
      let offset = 0;

      // PublishedFileId_t m_nPublishedFileId (uint64)
      const publishedFileId = detailsBuffer.readBigUInt64LE(offset);
      offset += 8;

      // EResult m_eResult (int32)
      const result = detailsBuffer.readInt32LE(offset);
      offset += 4;

      // EWorkshopFileType m_eFileType (int32)
      const fileType = detailsBuffer.readInt32LE(offset);
      offset += 4;

      // AppId_t m_nCreatorAppID (uint32)
      const creatorAppId = detailsBuffer.readUInt32LE(offset);
      offset += 4;

      // AppId_t m_nConsumerAppID (uint32)
      const consumerAppId = detailsBuffer.readUInt32LE(offset);
      offset += 4;

      // char m_rgchTitle[k_cchPublishedDocumentTitleMax] (129 bytes)
      const titleEnd = detailsBuffer.indexOf(0, offset);
      const title = detailsBuffer.toString('utf8', offset, titleEnd > offset ? titleEnd : offset + 129);
      offset += 129;

      // char m_rgchDescription[k_cchPublishedDocumentDescriptionMax] (8000 bytes)
      const descEnd = detailsBuffer.indexOf(0, offset);
      const description = detailsBuffer.toString('utf8', offset, descEnd > offset ? descEnd : offset + 8000);
      offset += 8000;

      // uint64 m_ulSteamIDOwner
      const steamIdOwner = detailsBuffer.readBigUInt64LE(offset);
      offset += 8;

      // uint32 m_rtimeCreated
      const timeCreated = detailsBuffer.readUInt32LE(offset);
      offset += 4;

      // uint32 m_rtimeUpdated
      const timeUpdated = detailsBuffer.readUInt32LE(offset);
      offset += 4;

      // uint32 m_rtimeAddedToUserList
      const timeAddedToUserList = detailsBuffer.readUInt32LE(offset);
      offset += 4;

      // ERemoteStoragePublishedFileVisibility m_eVisibility (int32)
      const visibility = detailsBuffer.readInt32LE(offset);
      offset += 4;

      // bool m_bBanned
      const banned = detailsBuffer.readUInt8(offset) !== 0;
      offset += 1;

      // bool m_bAcceptedForUse
      const acceptedForUse = detailsBuffer.readUInt8(offset) !== 0;
      offset += 1;

      // bool m_bTagsTruncated
      const tagsTruncated = detailsBuffer.readUInt8(offset) !== 0;
      offset += 1;

      // Padding alignment (structs are aligned)
      offset += 1; // Align to 4 bytes

      // char m_rgchTags[k_cchTagListMax] (1025 bytes)
      const tagsEnd = detailsBuffer.indexOf(0, offset);
      const tagsString = detailsBuffer.toString('utf8', offset, tagsEnd > offset ? tagsEnd : offset + 1025);
      const tags = tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
      offset += 1025;

      // Padding alignment
      offset += 3; // Align to 8 bytes

      // UGCHandle_t m_hFile (uint64)
      const fileHandle = detailsBuffer.readBigUInt64LE(offset);
      offset += 8;

      // UGCHandle_t m_hPreviewFile (uint64)
      const previewFileHandle = detailsBuffer.readBigUInt64LE(offset);
      offset += 8;

      // char m_pchFileName[k_cchFilenameMax] (260 bytes)
      const fileNameEnd = detailsBuffer.indexOf(0, offset);
      const fileName = detailsBuffer.toString('utf8', offset, fileNameEnd > offset ? fileNameEnd : offset + 260);
      offset += 260;

      // int32 m_nFileSize
      const fileSize = detailsBuffer.readInt32LE(offset);
      offset += 4;

      // int32 m_nPreviewFileSize
      const previewFileSize = detailsBuffer.readInt32LE(offset);
      offset += 4;

      // char m_rgchURL[k_cchPublishedFileURLMax] (256 bytes)
      const urlEnd = detailsBuffer.indexOf(0, offset);
      const url = detailsBuffer.toString('utf8', offset, urlEnd > offset ? urlEnd : offset + 256);
      offset += 256;

      // uint32 m_unVotesUp
      const votesUp = detailsBuffer.readUInt32LE(offset);
      offset += 4;

      // uint32 m_unVotesDown
      const votesDown = detailsBuffer.readUInt32LE(offset);
      offset += 4;

      // float m_flScore
      const score = detailsBuffer.readFloatLE(offset);
      offset += 4;

      // uint32 m_unNumChildren
      const numChildren = detailsBuffer.readUInt32LE(offset);
      offset += 4;

      // uint64 m_ulTotalFilesSize
      const totalFilesSize = detailsBuffer.readBigUInt64LE(offset);

      return {
        publishedFileId,
        result,
        fileType,
        creatorAppID: creatorAppId,
        consumerAppID: consumerAppId,
        title,
        description,
        steamIDOwner: steamIdOwner,
        timeCreated,
        timeUpdated,
        timeAddedToUserList,
        visibility,
        banned,
        acceptedForUse,
        tagsTruncated,
        tags,
        file: fileHandle,
        previewFile: previewFileHandle,
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
        300, // max retries (30 seconds total - item creation can be slow)
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
