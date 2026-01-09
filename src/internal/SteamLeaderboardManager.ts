import * as koffi from 'koffi';
import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import { SteamCallbackPoller } from './SteamCallbackPoller';
import { SteamLogger } from './SteamLogger';
import {
  LeaderboardEntry,
  LeaderboardInfo,
  LeaderboardScoreUploadResult,
  LeaderboardSortMethod,
  LeaderboardDisplayType,
  LeaderboardDataRequest,
  LeaderboardUploadScoreMethod,
  LeaderboardFindResultType,
  LeaderboardScoreUploadedType,
  LeaderboardScoresDownloadedType,
  LeaderboardUGCSetType
} from '../types';

/**
 * LeaderboardFindResult_t - Result of FindOrCreateLeaderboard/FindLeaderboard
 * Callback ID: k_iSteamUserStatsCallbacks + 4 = 1104
 */
const LeaderboardFindResult_t = koffi.struct('LeaderboardFindResult_t', {
  m_hSteamLeaderboard: 'uint64',  // Leaderboard handle (0 if not found)
  m_bLeaderboardFound: 'uint8'     // 1 if found, 0 otherwise
});

/**
 * LeaderboardScoreUploaded_t - Result of UploadLeaderboardScore
 * Callback ID: k_iSteamUserStatsCallbacks + 6 = 1106
 */
const LeaderboardScoreUploaded_t = koffi.struct('LeaderboardScoreUploaded_t', {
  m_bSuccess: 'uint8',               // 1 if successful
  m_hSteamLeaderboard: 'uint64',     // Leaderboard handle
  m_nScore: 'int32',                 // Score that was uploaded
  m_bScoreChanged: 'uint8',          // 1 if score changed
  m_nGlobalRankNew: 'int',           // New global rank
  m_nGlobalRankPrevious: 'int'       // Previous global rank (0 if no existing entry)
});

/**
 * LeaderboardScoresDownloaded_t - Result of DownloadLeaderboardEntries
 * Callback ID: k_iSteamUserStatsCallbacks + 5 = 1105
 */
const LeaderboardScoresDownloaded_t = koffi.struct('LeaderboardScoresDownloaded_t', {
  m_hSteamLeaderboard: 'uint64',         // Leaderboard handle
  m_hSteamLeaderboardEntries: 'uint64',  // Handle for GetDownloadedLeaderboardEntry
  m_cEntryCount: 'int'                   // Number of entries downloaded
});

/**
 * LeaderboardUGCSet_t - Result of AttachLeaderboardUGC
 * Callback ID: k_iSteamUserStatsCallbacks + 11 = 1111
 */
const LeaderboardUGCSet_t = koffi.struct('LeaderboardUGCSet_t', {
  m_eResult: 'int',               // EResult value
  m_hSteamLeaderboard: 'uint64'   // Leaderboard handle
});

/**
 * LeaderboardEntry_t - Individual leaderboard entry data
 * Used with GetDownloadedLeaderboardEntry
 */
const LeaderboardEntry_t = koffi.struct('LeaderboardEntry_t', {
  m_steamIDUser: 'uint64',  // Steam ID of the user
  m_nGlobalRank: 'int32',   // Global rank [1..N]
  m_nScore: 'int32',        // Score value
  m_cDetails: 'int32',      // Number of details available
  m_hUGC: 'uint64'          // UGC handle attached to entry
});

// Callback IDs (k_iSteamUserStatsCallbacks = 1100)
const k_iCallback_LeaderboardFindResult = 1104;
const k_iCallback_LeaderboardScoresDownloaded = 1105;
const k_iCallback_LeaderboardScoreUploaded = 1106;
const k_iCallback_LeaderboardUGCSet = 1111;

/**
 * SteamLeaderboardManager
 * 
 * Manages all Steam leaderboard operations including:
 * - Finding and creating leaderboards
 * - Uploading scores with optional details
 * - Downloading leaderboard entries (global, friends, around user)
 * - Retrieving leaderboard metadata
 * 
 * Leaderboards are persistent scoreboards stored on Steam servers that allow
 * players to compete globally or with friends. Each entry can include a score
 * and up to 64 int32 detail values for additional game-specific data.
 * 
 * ✅ IMPLEMENTATION NOTE:
 * This implementation uses ISteamUtils polling to retrieve callback results
 * synchronously after async operations complete. This provides full access to
 * Steam callback data without requiring a C++ addon:
 * 
 * 1. Initiates the async operation (returns SteamAPICall_t handle)
 * 2. Polls ISteamUtils::IsAPICallCompleted() to check completion
 * 3. Calls ISteamUtils::GetAPICallResult() to retrieve result struct
 * 4. Returns complete callback data (handles, ranks, scores, etc.)
 * 
 * All async operations now return actual results:
 * - findOrCreateLeaderboard/findLeaderboard: Returns LeaderboardInfo with handle
 * - uploadScore: Returns upload result with ranks and success status
 * - downloadLeaderboardEntries: Returns array of LeaderboardEntry objects
 * - attachLeaderboardUGC: Returns true/false based on actual result
 * 
 * @example
 * ```typescript
 * const leaderboardManager = new SteamLeaderboardManager(libraryLoader, apiCore);
 * 
 * // Find or create a leaderboard
 * const leaderboard = await leaderboardManager.findOrCreateLeaderboard(
 *   'HighScores',
 *   LeaderboardSortMethod.Descending,
 *   LeaderboardDisplayType.Numeric
 * );
 * 
 * // Upload a score and get rank information
 * const result = await leaderboardManager.uploadScore(
 *   leaderboard.handle,
 *   1000,
 *   LeaderboardUploadScoreMethod.KeepBest
 * );
 * console.log(`New rank: ${result.globalRankNew}`);
 * 
 * // Download top 10 entries
 * const entries = await leaderboardManager.downloadLeaderboardEntries(
 *   leaderboard.handle,
 *   LeaderboardDataRequest.Global,
 *   1,
 *   10
 * );
 * entries.forEach(entry => {
 *   console.log(`${entry.globalRank}. Score: ${entry.score}`);
 * });
 * ```
 */
export class SteamLeaderboardManager {
  /** Steam library loader for FFI function calls */
  private libraryLoader: SteamLibraryLoader;
  
  /** Steam API core for initialization and callback management */
  private apiCore: SteamAPICore;
  
  /** Callback poller for retrieving async operation results */
  private callbackPoller: SteamCallbackPoller;

  /**
   * Creates a new SteamLeaderboardManager instance
   * 
   * @param libraryLoader - The Steam library loader for FFI calls
   * @param apiCore - The Steam API core for lifecycle management
   */
  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
    this.callbackPoller = new SteamCallbackPoller(libraryLoader, apiCore);
  }

  // ========================================
  // Leaderboard Discovery
  // ========================================

  /**
   * Find or create a leaderboard
   * 
   * Searches for a leaderboard by name, and creates it if it doesn't exist.
   * This is an asynchronous operation that communicates with Steam servers.
   * 
   * @param name - Name of the leaderboard (max 128 UTF-8 bytes)
   * @param sortMethod - How entries should be sorted
   * @param displayType - How scores should be displayed
   * @returns Promise resolving to leaderboard info, or null on error
   * 
   * @example
   * ```typescript
   * // Create a high score leaderboard
   * const leaderboard = await leaderboardManager.findOrCreateLeaderboard(
   *   'HighScores',
   *   LeaderboardSortMethod.Descending,  // Highest is best
   *   LeaderboardDisplayType.Numeric
   * );
   * 
   * // Create a speedrun leaderboard
   * const speedrun = await leaderboardManager.findOrCreateLeaderboard(
   *   'FastestTime',
   *   LeaderboardSortMethod.Ascending,   // Lowest is best
   *   LeaderboardDisplayType.TimeMilliseconds
   * );
   * ```
   * 
   * @remarks
   * - Leaderboard names must be unique per game
   * - Maximum name length is 128 UTF-8 bytes
   * - Waits up to 5 seconds for Steam server response
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_FindOrCreateLeaderboard()` - Find/create leaderboard
   * - `SteamAPI_ISteamUserStats_GetLeaderboardName()` - Get leaderboard name
   * - `SteamAPI_ISteamUserStats_GetLeaderboardEntryCount()` - Get entry count
   * - `SteamAPI_ISteamUserStats_GetLeaderboardSortMethod()` - Get sort method
   * - `SteamAPI_ISteamUserStats_GetLeaderboardDisplayType()` - Get display type
   */
  async findOrCreateLeaderboard(
    name: string,
    sortMethod: LeaderboardSortMethod,
    displayType: LeaderboardDisplayType
  ): Promise<LeaderboardInfo | null> {
    if (!this.apiCore.isInitialized()) {
      SteamLogger.warn('[Steamworks] Steam API not initialized');
      return null;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      SteamLogger.warn('[Steamworks] UserStats interface not available');
      return null;
    }

    try {
      console.log(`[Steamworks] Finding or creating leaderboard: ${name}`);
      
      const callHandle = this.libraryLoader.SteamAPI_ISteamUserStats_FindOrCreateLeaderboard(
        userStatsInterface,
        name,
        sortMethod,
        displayType
      );

      if (callHandle === BigInt(0)) {
        SteamLogger.error(`[Steamworks] Failed to request leaderboard: ${name}`);
        return null;
      }

      const result = await this.callbackPoller.poll<LeaderboardFindResultType>(
        callHandle,
        LeaderboardFindResult_t,
        k_iCallback_LeaderboardFindResult
      );

      if (!result) {
        SteamLogger.error(`[Steamworks] Failed to get leaderboard result for: ${name}`);
        return null;
      }

      if (!result.m_bLeaderboardFound) {
        SteamLogger.warn(`[Steamworks] Leaderboard not found/created: ${name}`);
        return null;
      }

      // Successfully got the leaderboard handle! Get full info
      console.log(`[Steamworks] Leaderboard found/created: ${name} (handle: ${result.m_hSteamLeaderboard})`);
      return this.getLeaderboardInfo(result.m_hSteamLeaderboard);
      
    } catch (error: any) {
      SteamLogger.error(`[Steamworks] Error finding/creating leaderboard "${name}":`, error.message);
      return null;
    }
  }

  /**
   * Find an existing leaderboard
   * 
   * Searches for a leaderboard by name. Unlike findOrCreateLeaderboard(),
   * this will not create the leaderboard if it doesn't exist.
   * 
   * @param name - Name of the leaderboard to find
   * @returns Promise resolving to leaderboard info, or null if not found
   * 
   * @example
   * ```typescript
   * const leaderboard = await leaderboardManager.findLeaderboard('HighScores');
   * if (leaderboard) {
   *   console.log(`[Steamworks] Found leaderboard with ${leaderboard.entryCount} entries`);
   * } else {
   *   console.log('[Steamworks] Leaderboard does not exist');
   * }
   * ```
   * 
   * @remarks
   * - Returns null if leaderboard doesn't exist
   * - Waits up to 5 seconds for Steam server response
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_FindLeaderboard()` - Find existing leaderboard
   */
  async findLeaderboard(name: string): Promise<LeaderboardInfo | null> {
    if (!this.apiCore.isInitialized()) {
      SteamLogger.warn('[Steamworks] Steam API not initialized');
      return null;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      SteamLogger.warn('[Steamworks] UserStats interface not available');
      return null;
    }

    try {
      console.log(`[Steamworks] Finding leaderboard: ${name}`);
      
      const callHandle = this.libraryLoader.SteamAPI_ISteamUserStats_FindLeaderboard(
        userStatsInterface,
        name
      );

      if (callHandle === BigInt(0)) {
        SteamLogger.error(`[Steamworks] Failed to request leaderboard: ${name}`);
        return null;
      }

      const result = await this.callbackPoller.poll<LeaderboardFindResultType>(
        callHandle,
        LeaderboardFindResult_t,
        k_iCallback_LeaderboardFindResult
      );

      if (!result) {
        SteamLogger.error(`[Steamworks] Failed to get leaderboard result for: ${name}`);
        return null;
      }

      if (!result.m_bLeaderboardFound) {
        console.log(`[Steamworks] Leaderboard does not exist: ${name}`);
        return null;
      }

      // Successfully got the leaderboard handle! Get full info
      console.log(`[Steamworks] Leaderboard found: ${name} (handle: ${result.m_hSteamLeaderboard})`);
      return this.getLeaderboardInfo(result.m_hSteamLeaderboard);
      
    } catch (error: any) {
      SteamLogger.error(`[Steamworks] Error finding leaderboard "${name}":`, error.message);
      return null;
    }
  }

  /**
   * Get information about a leaderboard
   * 
   * Retrieves metadata for a leaderboard using its handle.
   * 
   * @param handle - Leaderboard handle
   * @returns Leaderboard information, or null on error
   * 
   * @remarks
   * - Synchronous operation, no Steam server communication needed
   * - Handle must be from a previous find/create operation
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetLeaderboardName()` - Get leaderboard name
   * - `SteamAPI_ISteamUserStats_GetLeaderboardEntryCount()` - Get entry count
   * - `SteamAPI_ISteamUserStats_GetLeaderboardSortMethod()` - Get sort method
   * - `SteamAPI_ISteamUserStats_GetLeaderboardDisplayType()` - Get display type
   */
  getLeaderboardInfo(handle: bigint): LeaderboardInfo | null {
    if (!this.apiCore.isInitialized()) {
      return null;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      return null;
    }

    try {
      const name = this.libraryLoader.SteamAPI_ISteamUserStats_GetLeaderboardName(
        userStatsInterface,
        handle
      );
      
      const entryCount = this.libraryLoader.SteamAPI_ISteamUserStats_GetLeaderboardEntryCount(
        userStatsInterface,
        handle
      );
      
      const sortMethod = this.libraryLoader.SteamAPI_ISteamUserStats_GetLeaderboardSortMethod(
        userStatsInterface,
        handle
      );
      
      const displayType = this.libraryLoader.SteamAPI_ISteamUserStats_GetLeaderboardDisplayType(
        userStatsInterface,
        handle
      );

      return {
        handle,
        name,
        entryCount,
        sortMethod,
        displayType
      };
    } catch (error: any) {
      SteamLogger.error(`[Steamworks] Error getting leaderboard info:`, error.message);
      return null;
    }
  }

  // ========================================
  // Score Upload
  // ========================================

  /**
   * Upload a score to a leaderboard
   * 
   * Submits a score for the current user to the specified leaderboard.
   * Can optionally include up to 64 int32 detail values.
   * 
   * @param leaderboardHandle - Handle to the leaderboard
   * @param score - Score value to upload
   * @param uploadMethod - How to handle the score (keep best or force update)
   * @param details - Optional array of detail values (max 64)
   * @returns Promise resolving to upload result, or null on error
   * 
   * @example
   * ```typescript
   * // Upload simple score (keep best)
   * await leaderboardManager.uploadScore(
   *   leaderboard.handle,
   *   1000,
   *   LeaderboardUploadScoreMethod.KeepBest
   * );
   * 
   * // Upload score with details (e.g., level, time, difficulty)
   * await leaderboardManager.uploadScore(
   *   leaderboard.handle,
   *   5000,
   *   LeaderboardUploadScoreMethod.KeepBest,
   *   [10, 300, 2] // level 10, 300 seconds, difficulty 2
   * );
   * 
   * // Force update score (even if worse)
   * await leaderboardManager.uploadScore(
   *   leaderboard.handle,
   *   750,
   *   LeaderboardUploadScoreMethod.ForceUpdate
   * );
   * ```
   * 
   * @remarks
   * - KeepBest: Only updates if new score is better
   * - ForceUpdate: Always updates to new score
   * - Details array is limited to 64 int32 values
   * - Waits up to 3 seconds for Steam server response
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_UploadLeaderboardScore()` - Upload score to leaderboard
   */
  async uploadScore(
    leaderboardHandle: bigint,
    score: number,
    uploadMethod: LeaderboardUploadScoreMethod,
    details?: number[]
  ): Promise<LeaderboardScoreUploadResult | null> {
    if (!this.apiCore.isInitialized()) {
      SteamLogger.warn('[Steamworks] Steam API not initialized');
      return null;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      SteamLogger.warn('[Steamworks] UserStats interface not available');
      return null;
    }

    try {
      const detailsArray = details || [];
      const detailsCount = Math.min(detailsArray.length, 64);
      
      console.log(`[Steamworks] Uploading score: ${score} (details: ${detailsCount})`);
      
      // Properly allocate and populate the details array for Steamworks SDK
      let detailsPtr = null;
      let actualDetailsCount = 0;
      
      if (detailsCount > 0) {
          // Allocate koffi array
          detailsPtr = koffi.alloc('int32', detailsCount);
          
          // Encode with explicit array length in the type specification
          const arrayType = `int32[${detailsCount}]`;
          koffi.encode(detailsPtr, arrayType, detailsArray.slice(0, detailsCount));
          
          actualDetailsCount = detailsCount;
          console.log(`[Steamworks] Encoded ${detailsCount} int32 value(s) successfully: [${detailsArray.slice(0, 10).join(', ')}${detailsCount > 10 ? '...' : ''}]`);
      }
      
      const callHandle = this.libraryLoader.SteamAPI_ISteamUserStats_UploadLeaderboardScore(
        userStatsInterface,
        leaderboardHandle,
        uploadMethod,
        score,
        detailsPtr,
        actualDetailsCount
      );

      if (callHandle === BigInt(0)) {
        SteamLogger.error(`[Steamworks] Failed to upload score`);
        return null;
      }

      // Poll for the result using ISteamUtils
      const result = await this.callbackPoller.poll<LeaderboardScoreUploadedType>(
        callHandle,
        LeaderboardScoreUploaded_t,
        k_iCallback_LeaderboardScoreUploaded
      );

      if (!result) {
        SteamLogger.error(`[Steamworks] Failed to get upload result`);
        return null;
      }

      if (!result.m_bSuccess) {
        SteamLogger.warn(`[Steamworks] Score upload was not successful`);
        return null;
      }

      // Successfully uploaded! Return the result
      const uploadResult: LeaderboardScoreUploadResult = {
        success: true,
        leaderboardHandle: result.m_hSteamLeaderboard,
        score: result.m_nScore,
        scoreChanged: result.m_bScoreChanged === 1,
        globalRankNew: result.m_nGlobalRankNew,
        globalRankPrevious: result.m_nGlobalRankPrevious
      };

      console.log(`[Steamworks] Score uploaded: ${result.m_nScore} | Rank: ${result.m_nGlobalRankPrevious} → ${result.m_nGlobalRankNew} | Changed: ${result.m_bScoreChanged === 1}`);
      return uploadResult;
    } catch (error: any) {
      SteamLogger.error(`[Steamworks] Error uploading score:`, error.message);
      return null;
    }
  }

  // ========================================
  // Entry Download
  // ========================================

  /**
   * Download leaderboard entries
   * 
   * Retrieves a range of entries from a leaderboard. Can fetch global top scores,
   * entries around the current user, or friend entries.
   * 
   * @param leaderboardHandle - Handle to the leaderboard
   * @param dataRequest - Type of data to request
   * @param rangeStart - Start of range (1-based for global, offset for around user)
   * @param rangeEnd - End of range (1-based for global, offset for around user)
   * @returns Promise resolving to array of entries, or empty array on error
   * 
   * @example
   * ```typescript
   * // Get top 10 global entries
   * const top10 = await leaderboardManager.downloadLeaderboardEntries(
   *   leaderboard.handle,
   *   LeaderboardDataRequest.Global,
   *   1,  // Start at rank 1
   *   10  // End at rank 10
   * );
   * 
   * // Get entries around current user (3 above, 3 below)
   * const aroundMe = await leaderboardManager.downloadLeaderboardEntries(
   *   leaderboard.handle,
   *   LeaderboardDataRequest.GlobalAroundUser,
   *   -3,  // 3 entries above
   *   3    // 3 entries below
   * );
   * 
   * // Get friend entries
   * const friends = await leaderboardManager.downloadLeaderboardEntries(
   *   leaderboard.handle,
   *   LeaderboardDataRequest.Friends,
   *   0,  // Ignored for friends
   *   0   // Ignored for friends
   * );
   * ```
   * 
   * @remarks
   * - Global: rangeStart and rangeEnd are 1-based ranks [1, N]
   * - GlobalAroundUser: rangeStart is negative offset, rangeEnd is positive offset
   * - Friends: range parameters are ignored
   * - Returns up to requested number of entries, or fewer if not available
   * - Waits up to 3 seconds for Steam server response
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_DownloadLeaderboardEntries()` - Download leaderboard entries
   * - `SteamAPI_ISteamUserStats_GetDownloadedLeaderboardEntry()` - Get individual entry data
   */
  async downloadLeaderboardEntries(
    leaderboardHandle: bigint,
    dataRequest: LeaderboardDataRequest,
    rangeStart: number,
    rangeEnd: number
  ): Promise<LeaderboardEntry[]> {
    if (!this.apiCore.isInitialized()) {
      SteamLogger.warn('[Steamworks] Steam API not initialized');
      return [];
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      SteamLogger.warn('[Steamworks] UserStats interface not available');
      return [];
    }

    try {
      console.log(`[Steamworks] Downloading entries (${rangeStart} to ${rangeEnd})`);
      
      const callHandle = this.libraryLoader.SteamAPI_ISteamUserStats_DownloadLeaderboardEntries(
        userStatsInterface,
        leaderboardHandle,
        dataRequest,
        rangeStart,
        rangeEnd
      );

      if (callHandle === BigInt(0)) {
        SteamLogger.error(`[Steamworks] Failed to download entries`);
        return [];
      }

      const result = await this.callbackPoller.poll<LeaderboardScoresDownloadedType>(
        callHandle,
        LeaderboardScoresDownloaded_t,
        k_iCallback_LeaderboardScoresDownloaded
      );

      if (!result) {
        SteamLogger.error(`[Steamworks] Failed to get download result`);
        return [];
      }

      if (result.m_cEntryCount === 0) {
        console.log(`[Steamworks] No entries downloaded`);
        return [];
      }

      // Now retrieve each individual entry using GetDownloadedLeaderboardEntry
      const entries: LeaderboardEntry[] = [];
      const entriesHandle = result.m_hSteamLeaderboardEntries;
      
      for (let i = 0; i < result.m_cEntryCount; i++) {
        const entryData = koffi.alloc(LeaderboardEntry_t, 1);
        const detailsArray = koffi.alloc('int32', 64); // Max 64 details
        
        const success = this.libraryLoader.SteamAPI_ISteamUserStats_GetDownloadedLeaderboardEntry(
          userStatsInterface,
          entriesHandle,
          i,
          entryData,
          detailsArray,
          64
        );

        if (success) {
          const entry = koffi.decode(entryData, LeaderboardEntry_t);
          const details: number[] = [];
          
          // Read details if any
          for (let j = 0; j < entry.m_cDetails && j < 64; j++) {
            details.push(koffi.decode(detailsArray, 'int32', j));
          }

          entries.push({
            steamId: entry.m_steamIDUser.toString(),
            globalRank: entry.m_nGlobalRank,
            score: entry.m_nScore,
            details,
            ugcHandle: entry.m_hUGC
          });
        }
      }

      console.log(`[Steamworks] Downloaded ${entries.length} entries`);
      return entries;
    } catch (error: any) {
      SteamLogger.error(`[Steamworks] Error downloading entries:`, error.message);
      return [];
    }
  }

  /**
   * Download leaderboard entries for specific users
   * 
   * Retrieves leaderboard entries for an arbitrary set of Steam users.
   * Useful for comparing scores with specific players.
   * 
   * @param leaderboardHandle - Handle to the leaderboard
   * @param steamIds - Array of Steam IDs to retrieve (max 100)
   * @returns Promise resolving to array of entries, or empty array on error
   * 
   * @example
   * ```typescript
   * // Compare scores with specific players
   * const playerIds = ['76561198012345678', '76561198087654321'];
   * const entries = await leaderboardManager.downloadLeaderboardEntriesForUsers(
   *   leaderboard.handle,
   *   playerIds
   * );
   * 
   * entries.forEach(entry => {
   *   console.log(`[Steamworks] ${entry.steamId}: ${entry.score} (rank ${entry.globalRank})`);
   * });
   * ```
   * 
   * @remarks
   * - Maximum 100 users per request
   * - Only returns entries for users who have scores
   * - Only one outstanding request at a time
   * - Waits up to 3 seconds for Steam server response
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_DownloadLeaderboardEntriesForUsers()` - Download entries for users
   * - `SteamAPI_ISteamUserStats_GetDownloadedLeaderboardEntry()` - Get individual entry data
   */
  async downloadLeaderboardEntriesForUsers(
    leaderboardHandle: bigint,
    steamIds: string[]
  ): Promise<LeaderboardEntry[]> {
    if (!this.apiCore.isInitialized()) {
      SteamLogger.warn('[Steamworks] Steam API not initialized');
      return [];
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      SteamLogger.warn('[Steamworks] UserStats interface not available');
      return [];
    }

    try {
      const userCount = Math.min(steamIds.length, 100);
      console.log(`[Steamworks] Downloading entries for ${userCount} users`);
      
      // Convert Steam IDs to BigInt array
      const steamIdArray = koffi.alloc('uint64', userCount);
      for (let i = 0; i < userCount; i++) {
        koffi.encode(steamIdArray, 'uint64', BigInt(steamIds[i]), i);
      }

      const callHandle = this.libraryLoader.SteamAPI_ISteamUserStats_DownloadLeaderboardEntriesForUsers(
        userStatsInterface,
        leaderboardHandle,
        steamIdArray,
        userCount
      );

      if (callHandle === BigInt(0)) {
        SteamLogger.error(`[Steamworks] Failed to download user entries`);
        return [];
      }

      const result = await this.callbackPoller.poll<LeaderboardScoresDownloadedType>(
        callHandle,
        LeaderboardScoresDownloaded_t,
        k_iCallback_LeaderboardScoresDownloaded
      );

      if (!result) {
        SteamLogger.error(`[Steamworks] Failed to get download result`);
        return [];
      }

      if (result.m_cEntryCount === 0) {
        console.log(`[Steamworks] No entries downloaded for specified users`);
        return [];
      }

      // Now retrieve each individual entry using GetDownloadedLeaderboardEntry
      const entries: LeaderboardEntry[] = [];
      const entriesHandle = result.m_hSteamLeaderboardEntries;
      
      for (let i = 0; i < result.m_cEntryCount; i++) {
        const entryData = koffi.alloc(LeaderboardEntry_t, 1);
        const detailsArray = koffi.alloc('int32', 64); // Max 64 details
        
        const success = this.libraryLoader.SteamAPI_ISteamUserStats_GetDownloadedLeaderboardEntry(
          userStatsInterface,
          entriesHandle,
          i,
          entryData,
          detailsArray,
          64
        );

        if (success) {
          const entry = koffi.decode(entryData, LeaderboardEntry_t);
          const details: number[] = [];
          
          // Read details if any
          for (let j = 0; j < entry.m_cDetails && j < 64; j++) {
            details.push(koffi.decode(detailsArray, 'int32', j));
          }

          entries.push({
            steamId: entry.m_steamIDUser.toString(),
            globalRank: entry.m_nGlobalRank,
            score: entry.m_nScore,
            details,
            ugcHandle: entry.m_hUGC
          });
        }
      }

      console.log(`[Steamworks] Downloaded ${entries.length} user entries`);
      return entries;
    } catch (error: any) {
      SteamLogger.error(`[Steamworks] Error downloading user entries:`, error.message);
      return [];
    }
  }

  // ========================================
  // UGC Attachment
  // ========================================

  /**
   * Attach user-generated content to a leaderboard entry
   * 
   * Associates a piece of UGC (like a replay file, screenshot, or level)
   * with the current user's leaderboard entry. The UGC must first be shared
   * using ISteamRemoteStorage::FileShare().
   * 
   * @param leaderboardHandle - Handle to the leaderboard
   * @param ugcHandle - Handle to the shared UGC content
   * @returns Promise resolving to true if successful, false otherwise
   * 
   * @example
   * ```typescript
   * // First, share a file to get UGC handle
   * // const ugcHandle = await steamRemoteStorage.fileShare('replay.dat');
   * 
   * // Then attach it to leaderboard entry
   * const ugcHandle = BigInt('123456789'); // From FileShare
   * const success = await leaderboardManager.attachLeaderboardUGC(
   *   leaderboard.handle,
   *   ugcHandle
   * );
   * 
   * if (success) {
   *   console.log('[Steamworks] UGC attached to leaderboard entry');
   * }
   * ```
   * 
   * @remarks
   * - UGC must be created with ISteamRemoteStorage::FileShare() first
   * - Only one UGC item can be attached per leaderboard entry
   * - Attaching new UGC replaces any previously attached UGC
   * - Common use cases: replays, screenshots, custom levels
   * - Waits up to 3 seconds for Steam server response
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_AttachLeaderboardUGC()` - Attach UGC to leaderboard entry
   */
  async attachLeaderboardUGC(
    leaderboardHandle: bigint,
    ugcHandle: bigint
  ): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      SteamLogger.warn('[Steamworks] Steam API not initialized');
      return false;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      SteamLogger.warn('[Steamworks] UserStats interface not available');
      return false;
    }

    try {
      console.log(`[Steamworks] Attaching UGC to leaderboard entry`);
      
      const callHandle = this.libraryLoader.SteamAPI_ISteamUserStats_AttachLeaderboardUGC(
        userStatsInterface,
        leaderboardHandle,
        ugcHandle
      );

      if (callHandle === BigInt(0)) {
        SteamLogger.error(`[Steamworks] Failed to attach UGC`);
        return false;
      }

      // Poll for the result using ISteamUtils
      const result = await this.callbackPoller.poll<LeaderboardUGCSetType>(
        callHandle,
        LeaderboardUGCSet_t,
        k_iCallback_LeaderboardUGCSet
      );

      if (!result) {
        SteamLogger.error(`[Steamworks] Failed to get UGC attachment result`);
        return false;
      }

      // EResult k_EResultOK = 1
      if (result.m_eResult !== 1) {
        SteamLogger.warn(`[Steamworks] UGC attachment failed. Result code: ${result.m_eResult}`);
        return false;
      }

      console.log(`[Steamworks] UGC attached successfully`);
      return true;
    } catch (error: any) {
      SteamLogger.error(`[Steamworks] Error attaching UGC:`, error.message);
      return false;
    }
  }
}

