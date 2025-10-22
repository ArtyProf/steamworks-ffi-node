import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
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
  
  /** Steam API core for initialization and callback management */
  private apiCore: SteamAPICore;

  /**
   * Creates a new SteamWorkshopManager instance
   * 
   * @param libraryLoader - The Steam library loader for FFI calls
   * @param apiCore - The Steam API core for lifecycle management
   */
  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
  }

  // ========================================
  // Subscription Management
  // ========================================

  /**
   * Subscribes to a Workshop item
   * 
   * @param publishedFileId - The Workshop item ID to subscribe to
   * @returns API call handle (for tracking callback completion)
   * 
   * @remarks
   * - Item will be downloaded and installed automatically
   * - Listen for DownloadItemResult_t callback for completion
   * - Item will stay subscribed across game sessions
   * 
   * @example
   * ```typescript
   * const itemId = BigInt('123456789');
   * const callHandle = steam.workshop.subscribeItem(itemId);
   * // Wait for callback to confirm subscription
   * ```
   */
  subscribeItem(publishedFileId: PublishedFileId): bigint {
    if (!this.apiCore.isInitialized()) {
      console.error('Steam API not initialized');
      return BigInt(0);
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      console.error('ISteamUGC interface not available');
      return BigInt(0);
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamUGC_SubscribeItem(ugc, publishedFileId);
      return BigInt(handle);
    } catch (error) {
      console.error('Error subscribing to item:', error);
      return BigInt(0);
    }
  }

  /**
   * Unsubscribes from a Workshop item
   * 
   * @param publishedFileId - The Workshop item ID to unsubscribe from
   * @returns API call handle (for tracking callback completion)
   * 
   * @remarks
   * - Item will be uninstalled after the game quits
   * - Listen for RemoteStorageUnsubscribePublishedFileResult_t callback
   * 
   * @example
   * ```typescript
   * const itemId = BigInt('123456789');
   * steam.workshop.unsubscribeItem(itemId);
   * ```
   */
  unsubscribeItem(publishedFileId: PublishedFileId): bigint {
    if (!this.apiCore.isInitialized()) {
      console.error('Steam API not initialized');
      return BigInt(0);
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      console.error('ISteamUGC interface not available');
      return BigInt(0);
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamUGC_UnsubscribeItem(ugc, publishedFileId);
      return BigInt(handle);
    } catch (error) {
      console.error('Error unsubscribing from item:', error);
      return BigInt(0);
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
      console.error('Error getting subscribed items count:', error);
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
      console.error('Error getting subscribed items:', error);
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
      console.error('Error getting item state:', error);
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
      console.error('Error getting item install info:', error);
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
      console.error('Error getting item download info:', error);
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
      console.error('Error downloading item:', error);
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
      console.error('Error creating user UGC query:', error);
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
      console.error('Error creating all UGC query:', error);
      return K_UGC_QUERY_HANDLE_INVALID;
    }
  }

  /**
   * Sends a UGC query to Steam
   * 
   * @param queryHandle - Handle from createQueryUserUGCRequest or createQueryAllUGCRequest
   * @returns API call handle (for tracking callback completion)
   * 
   * @remarks
   * Listen for SteamUGCQueryCompleted_t callback for results
   * After processing results, call releaseQueryUGCRequest to free memory
   * 
   * @example
   * ```typescript
   * const query = steam.workshop.createQueryAllUGCRequest(...);
   * const callHandle = steam.workshop.sendQueryUGCRequest(query);
   * // Wait for callback, then call getQueryUGCResult and releaseQueryUGCRequest
   * ```
   */
  sendQueryUGCRequest(queryHandle: UGCQueryHandle): bigint {
    if (!this.apiCore.isInitialized()) {
      return BigInt(0);
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return BigInt(0);
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamUGC_SendQueryUGCRequest(ugc, queryHandle);
      return BigInt(handle);
    } catch (error) {
      console.error('Error sending UGC query:', error);
      return BigInt(0);
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
      // The struct is quite large, allocating 2KB to be safe
      const detailsBuffer = Buffer.alloc(2048);
      
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
      console.error('Error getting query UGC result:', error);
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
      console.error('Error releasing UGC query:', error);
      return false;
    }
  }

  // ========================================
  // Item Creation and Update
  // ========================================

  /**
   * Creates a new Workshop item
   * 
   * @param consumerAppId - App ID that will consume this item
   * @param fileType - Type of Workshop file
   * @returns API call handle (for tracking callback completion)
   * 
   * @remarks
   * Listen for CreateItemResult_t callback for the new item's Published File ID
   * Once created, use startItemUpdate to set content and properties
   * 
   * @example
   * ```typescript
   * const callHandle = steam.workshop.createItem(
   *   480,
   *   EWorkshopFileType.Community
   * );
   * // Wait for CreateItemResult_t callback to get publishedFileId
   * ```
   */
  createItem(consumerAppId: number, fileType: EWorkshopFileType): bigint {
    if (!this.apiCore.isInitialized()) {
      return BigInt(0);
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return BigInt(0);
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamUGC_CreateItem(ugc, consumerAppId, fileType);
      return BigInt(handle);
    } catch (error) {
      console.error('Error creating item:', error);
      return BigInt(0);
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
      console.error('Error starting item update:', error);
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
      console.error('Error setting item title:', error);
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
      console.error('Error setting item description:', error);
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
      console.error('Error setting item visibility:', error);
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
      console.error('Error setting item content:', error);
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
      console.error('Error setting item preview:', error);
      return false;
    }
  }

  /**
   * Submits an item update to Steam Workshop
   * 
   * @param updateHandle - Handle from startItemUpdate
   * @param changeNote - Description of changes (shown in update history)
   * @returns API call handle (for tracking callback completion)
   * 
   * @remarks
   * Listen for SubmitItemUpdateResult_t callback for completion
   * Use getItemUpdateProgress to track upload progress
   * 
   * @example
   * ```typescript
   * const updateHandle = steam.workshop.startItemUpdate(480, itemId);
   * steam.workshop.setItemTitle(updateHandle, 'Updated Title');
   * const callHandle = steam.workshop.submitItemUpdate(updateHandle, 'Fixed bugs');
   * // Wait for SubmitItemUpdateResult_t callback
   * ```
   */
  submitItemUpdate(updateHandle: UGCUpdateHandle, changeNote: string): bigint {
    if (!this.apiCore.isInitialized()) {
      return BigInt(0);
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return BigInt(0);
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamUGC_SubmitItemUpdate(ugc, updateHandle, changeNote);
      return BigInt(handle);
    } catch (error) {
      console.error('Error submitting item update:', error);
      return BigInt(0);
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
      console.error('Error getting item update progress:', error);
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
   * @returns API call handle (for tracking callback completion)
   * 
   * @remarks
   * Listen for SetUserItemVoteResult_t callback
   * 
   * @example
   * ```typescript
   * const itemId = BigInt('123456789');
   * steam.workshop.setUserItemVote(itemId, true); // Vote up
   * ```
   */
  setUserItemVote(publishedFileId: PublishedFileId, voteUp: boolean): bigint {
    if (!this.apiCore.isInitialized()) {
      return BigInt(0);
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return BigInt(0);
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamUGC_SetUserItemVote(ugc, publishedFileId, voteUp);
      return BigInt(handle);
    } catch (error) {
      console.error('Error setting item vote:', error);
      return BigInt(0);
    }
  }

  /**
   * Gets the user's vote on a Workshop item
   * 
   * @param publishedFileId - Workshop item ID
   * @returns API call handle (for tracking callback completion)
   * 
   * @remarks
   * Listen for GetUserItemVoteResult_t callback for vote status
   * 
   * @example
   * ```typescript
   * const itemId = BigInt('123456789');
   * steam.workshop.getUserItemVote(itemId);
   * // Wait for GetUserItemVoteResult_t callback
   * ```
   */
  getUserItemVote(publishedFileId: PublishedFileId): bigint {
    if (!this.apiCore.isInitialized()) {
      return BigInt(0);
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return BigInt(0);
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamUGC_GetUserItemVote(ugc, publishedFileId);
      return BigInt(handle);
    } catch (error) {
      console.error('Error getting item vote:', error);
      return BigInt(0);
    }
  }

  /**
   * Adds a Workshop item to the user's favorites
   * 
   * @param appId - App ID
   * @param publishedFileId - Workshop item ID
   * @returns API call handle (for tracking callback completion)
   * 
   * @remarks
   * Listen for UserFavoriteItemsListChanged_t callback
   * 
   * @example
   * ```typescript
   * const itemId = BigInt('123456789');
   * steam.workshop.addItemToFavorites(480, itemId);
   * ```
   */
  addItemToFavorites(appId: number, publishedFileId: PublishedFileId): bigint {
    if (!this.apiCore.isInitialized()) {
      return BigInt(0);
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return BigInt(0);
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamUGC_AddItemToFavorites(ugc, appId, publishedFileId);
      return BigInt(handle);
    } catch (error) {
      console.error('Error adding item to favorites:', error);
      return BigInt(0);
    }
  }

  /**
   * Removes a Workshop item from the user's favorites
   * 
   * @param appId - App ID
   * @param publishedFileId - Workshop item ID
   * @returns API call handle (for tracking callback completion)
   * 
   * @remarks
   * Listen for UserFavoriteItemsListChanged_t callback
   * 
   * @example
   * ```typescript
   * const itemId = BigInt('123456789');
   * steam.workshop.removeItemFromFavorites(480, itemId);
   * ```
   */
  removeItemFromFavorites(appId: number, publishedFileId: PublishedFileId): bigint {
    if (!this.apiCore.isInitialized()) {
      return BigInt(0);
    }

    const ugc = this.apiCore.getUGCInterface();
    if (!ugc) {
      return BigInt(0);
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamUGC_RemoveItemFromFavorites(ugc, appId, publishedFileId);
      return BigInt(handle);
    } catch (error) {
      console.error('Error removing item from favorites:', error);
      return BigInt(0);
    }
  }
}
