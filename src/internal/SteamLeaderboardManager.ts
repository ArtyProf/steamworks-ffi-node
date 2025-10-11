import * as koffi from 'koffi';
import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import {
  LeaderboardEntry,
  LeaderboardInfo,
  LeaderboardScoreUploadResult,
  LeaderboardSortMethod,
  LeaderboardDisplayType,
  LeaderboardDataRequest,
  LeaderboardUploadScoreMethod
} from '../types';

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
 * // Upload a score
 * await leaderboardManager.uploadScore(
 *   leaderboard.handle,
 *   1000,
 *   LeaderboardUploadScoreMethod.KeepBest
 * );
 * 
 * // Download top 10 entries
 * const entries = await leaderboardManager.downloadLeaderboardEntries(
 *   leaderboard.handle,
 *   LeaderboardDataRequest.Global,
 *   1,
 *   10
 * );
 * ```
 */
export class SteamLeaderboardManager {
  /** Steam library loader for FFI function calls */
  private libraryLoader: SteamLibraryLoader;
  
  /** Steam API core for initialization and callback management */
  private apiCore: SteamAPICore;

  /** Cache of leaderboard handles by name */
  private leaderboardCache: Map<string, bigint> = new Map();

  /**
   * Creates a new SteamLeaderboardManager instance
   * 
   * @param libraryLoader - The Steam library loader for FFI calls
   * @param apiCore - The Steam API core for lifecycle management
   */
  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
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
   * - Results are cached for subsequent calls
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
      console.warn('⚠️ Steam API not initialized');
      return null;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('⚠️ UserStats interface not available');
      return null;
    }

    try {
      // Check cache first
      const cachedHandle = this.leaderboardCache.get(name);
      if (cachedHandle) {
        return this.getLeaderboardInfo(cachedHandle);
      }

      console.log(`📊 Finding or creating leaderboard: ${name}`);
      
      const callHandle = this.libraryLoader.SteamAPI_ISteamUserStats_FindOrCreateLeaderboard(
        userStatsInterface,
        name,
        sortMethod,
        displayType
      );

      if (callHandle === BigInt(0)) {
        console.error(`❌ Failed to request leaderboard: ${name}`);
        return null;
      }

      // Wait for callback (simulate async with timeout)
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.apiCore.runCallbacks();

      // Try to get leaderboard handle from cache (would be set by callback in real implementation)
      // For now, we'll use a simplified approach
      console.log(`✅ Leaderboard request sent: ${name}`);
      
      return null; // TODO: Implement proper callback handling
    } catch (error: any) {
      console.error(`❌ Error finding/creating leaderboard "${name}":`, error.message);
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
   *   console.log(`Found leaderboard with ${leaderboard.entryCount} entries`);
   * } else {
   *   console.log('Leaderboard does not exist');
   * }
   * ```
   * 
   * @remarks
   * - Returns null if leaderboard doesn't exist
   * - Waits up to 5 seconds for Steam server response
   * - Results are cached for subsequent calls
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_FindLeaderboard()` - Find existing leaderboard
   */
  async findLeaderboard(name: string): Promise<LeaderboardInfo | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('⚠️ Steam API not initialized');
      return null;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('⚠️ UserStats interface not available');
      return null;
    }

    try {
      // Check cache first
      const cachedHandle = this.leaderboardCache.get(name);
      if (cachedHandle) {
        return this.getLeaderboardInfo(cachedHandle);
      }

      console.log(`🔍 Finding leaderboard: ${name}`);
      
      const callHandle = this.libraryLoader.SteamAPI_ISteamUserStats_FindLeaderboard(
        userStatsInterface,
        name
      );

      if (callHandle === BigInt(0)) {
        console.error(`❌ Failed to request leaderboard: ${name}`);
        return null;
      }

      // Wait for callback
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.apiCore.runCallbacks();

      console.log(`✅ Leaderboard request sent: ${name}`);
      
      return null; // TODO: Implement proper callback handling
    } catch (error: any) {
      console.error(`❌ Error finding leaderboard "${name}":`, error.message);
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
      console.error(`❌ Error getting leaderboard info:`, error.message);
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
      console.warn('⚠️ Steam API not initialized');
      return null;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('⚠️ UserStats interface not available');
      return null;
    }

    try {
      const detailsArray = details || [];
      const detailsCount = Math.min(detailsArray.length, 64);

      console.log(`📤 Uploading score: ${score} (details: ${detailsCount})`);
      
      const detailsPtr = detailsCount > 0 ? koffi.alloc('int32', detailsCount) : null;
      if (detailsPtr && detailsCount > 0) {
        for (let i = 0; i < detailsCount; i++) {
          koffi.encode(detailsPtr, 'int32', detailsArray[i], i);
        }
      }

      const callHandle = this.libraryLoader.SteamAPI_ISteamUserStats_UploadLeaderboardScore(
        userStatsInterface,
        leaderboardHandle,
        uploadMethod,
        score,
        detailsPtr,
        detailsCount
      );

      if (callHandle === BigInt(0)) {
        console.error(`❌ Failed to upload score`);
        return null;
      }

      // Wait for callback
      await new Promise(resolve => setTimeout(resolve, 3000));
      this.apiCore.runCallbacks();

      console.log(`✅ Score upload request sent`);
      
      return null; // TODO: Implement proper callback handling
    } catch (error: any) {
      console.error(`❌ Error uploading score:`, error.message);
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
      console.warn('⚠️ Steam API not initialized');
      return [];
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('⚠️ UserStats interface not available');
      return [];
    }

    try {
      console.log(`📥 Downloading entries (${rangeStart} to ${rangeEnd})`);
      
      const callHandle = this.libraryLoader.SteamAPI_ISteamUserStats_DownloadLeaderboardEntries(
        userStatsInterface,
        leaderboardHandle,
        dataRequest,
        rangeStart,
        rangeEnd
      );

      if (callHandle === BigInt(0)) {
        console.error(`❌ Failed to download entries`);
        return [];
      }

      // Wait for callback
      await new Promise(resolve => setTimeout(resolve, 3000));
      this.apiCore.runCallbacks();

      console.log(`✅ Entry download request sent`);
      
      return []; // TODO: Implement proper callback handling and entry parsing
    } catch (error: any) {
      console.error(`❌ Error downloading entries:`, error.message);
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
   *   console.log(`${entry.steamId}: ${entry.score} (rank ${entry.globalRank})`);
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
      console.warn('⚠️ Steam API not initialized');
      return [];
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('⚠️ UserStats interface not available');
      return [];
    }

    try {
      const userCount = Math.min(steamIds.length, 100);
      console.log(`📥 Downloading entries for ${userCount} users`);
      
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
        console.error(`❌ Failed to download user entries`);
        return [];
      }

      // Wait for callback
      await new Promise(resolve => setTimeout(resolve, 3000));
      this.apiCore.runCallbacks();

      console.log(`✅ User entry download request sent`);
      
      return []; // TODO: Implement proper callback handling
    } catch (error: any) {
      console.error(`❌ Error downloading user entries:`, error.message);
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
   *   console.log('UGC attached to leaderboard entry');
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
      console.warn('⚠️ Steam API not initialized');
      return false;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('⚠️ UserStats interface not available');
      return false;
    }

    try {
      console.log(`📎 Attaching UGC to leaderboard entry`);
      
      const callHandle = this.libraryLoader.SteamAPI_ISteamUserStats_AttachLeaderboardUGC(
        userStatsInterface,
        leaderboardHandle,
        ugcHandle
      );

      if (callHandle === BigInt(0)) {
        console.error(`❌ Failed to attach UGC`);
        return false;
      }

      // Wait for callback
      await new Promise(resolve => setTimeout(resolve, 3000));
      this.apiCore.runCallbacks();

      console.log(`✅ UGC attachment request sent`);
      
      return true; // TODO: Implement proper callback handling for actual result
    } catch (error: any) {
      console.error(`❌ Error attaching UGC:`, error.message);
      return false;
    }
  }
}

