import * as koffi from 'koffi';
import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import { SteamStat, GlobalStat, GlobalStatHistory, UserStat } from '../types';

/**
 * SteamStatsManager
 * 
 * Manages all Steam user statistics operations including:
 * - User stats (get/set integer and float values)
 * - Average rate stats (for tracking rates over time)
 * - Friend/user stats (view stats of other players)
 * - Global stats (aggregate statistics across all players)
 * - Global stat history (historical data over time)
 * 
 * Stats are different from achievements - they are numeric values that can increase/decrease
 * and are used for leaderboards, progress tracking, and game analytics.
 * 
 * @example
 * ```typescript
 * const statsManager = new SteamStatsManager(libraryLoader, apiCore);
 * 
 * // Set and get player stats
 * await statsManager.setStatInt('total_kills', 100);
 * const kills = await statsManager.getStatInt('total_kills');
 * 
 * // Get global stats
 * await statsManager.requestGlobalStats(7);
 * const globalKills = await statsManager.getGlobalStatInt('total_kills');
 * ```
 */
export class SteamStatsManager {
  /** Steam library loader for FFI function calls */
  private libraryLoader: SteamLibraryLoader;
  
  /** Steam API core for initialization and callback management */
  private apiCore: SteamAPICore;

  /**
   * Creates a new SteamStatsManager instance
   * 
   * @param libraryLoader - The Steam library loader for FFI calls
   * @param apiCore - The Steam API core for lifecycle management
   */
  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
  }

  // ========================================
  // User Stats Operations (Get/Set)
  // ========================================

  /**
   * Get an integer stat value for the current user
   * 
   * Retrieves a 32-bit integer stat value from Steam. Stats are numeric values
   * that track player progress and can be used for leaderboards and analytics.
   * 
   * @param statName - Name of the stat to retrieve (as defined in Steamworks Partner site)
   * @returns The stat value, or null if not found or on error
   * 
   * @example
   * ```typescript
   * const totalKills = await statsManager.getStatInt('total_kills');
   * if (totalKills !== null) {
   *   console.log(`[Steamworks] Total kills: ${totalKills}`);
   * }
   * ```
   * 
   * @remarks
   * - Returns null if Steam API is not initialized
   * - Stat names are case-sensitive and must match Steamworks configuration
   * - Use getStatFloat() for decimal values
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetStatInt32()` - Get int32 stat value
   */
  async getStatInt(statName: string): Promise<number | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] Steam API not initialized');
      return null;
    }

    try {
      const userStatsInterface = this.libraryLoader.SteamAPI_SteamUserStats_v013();
      const valueOut = koffi.alloc('int32', 1);
      
      const success = this.libraryLoader.SteamAPI_ISteamUserStats_GetStatInt32(
        userStatsInterface,
        statName,
        valueOut
      );

      if (success) {
        const value = koffi.decode(valueOut, 'int32');
        console.log(`[Steamworks] Got stat "${statName}": ${value}`);
        return value;
      } else {
        console.warn(`[Steamworks] Failed to get stat: ${statName}`);
        return null;
      }
    } catch (error: any) {
      console.error(`[Steamworks] Error getting stat "${statName}":`, error.message);
      return null;
    }
  }

  /**
   * Get a float stat value for the current user
   * 
   * Retrieves a floating-point stat value from Steam. Use this for stats that
   * require decimal precision (e.g., average accuracy, distance traveled).
   * 
   * @param statName - Name of the stat to retrieve (as defined in Steamworks Partner site)
   * @returns The stat value, or null if not found or on error
   * 
   * @example
   * ```typescript
   * const accuracy = await statsManager.getStatFloat('shooting_accuracy');
   * if (accuracy !== null) {
   *   console.log(`[Steamworks] Accuracy: ${(accuracy * 100).toFixed(2)}%`);
   * }
   * ```
   * 
   * @remarks
   * - Returns null if Steam API is not initialized
   * - Use getStatInt() for whole number values
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetStatFloat()` - Get float stat value
   */
  async getStatFloat(statName: string): Promise<number | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] Steam API not initialized');
      return null;
    }

    try {
      const userStatsInterface = this.libraryLoader.SteamAPI_SteamUserStats_v013();
      const valueOut = koffi.alloc('float', 1);
      
      const success = this.libraryLoader.SteamAPI_ISteamUserStats_GetStatFloat(
        userStatsInterface,
        statName,
        valueOut
      );

      if (success) {
        const value = koffi.decode(valueOut, 'float');
        console.log(`[Steamworks] Got stat "${statName}": ${value}`);
        return value;
      } else {
        console.warn(`[Steamworks] Failed to get stat: ${statName}`);
        return null;
      }
    } catch (error: any) {
      console.error(`[Steamworks] Error getting stat "${statName}":`, error.message);
      return null;
    }
  }

  /**
   * Set an integer stat value for the current user
   * 
   * Updates a 32-bit integer stat value and immediately stores it to Steam servers.
   * The new value will be visible in your Steam profile and can trigger achievements.
   * 
   * @param statName - Name of the stat to set (as defined in Steamworks Partner site)
   * @param value - Integer value to set
   * @returns true if successful, false otherwise
   * 
   * @example
   * ```typescript
   * // Increment kill count
   * const currentKills = await statsManager.getStatInt('total_kills') || 0;
   * const success = await statsManager.setStatInt('total_kills', currentKills + 1);
   * if (success) {
   *   console.log('[Steamworks] Kill count updated!');
   * }
   * ```
   * 
   * @remarks
   * - Automatically calls StoreStats() to save to Steam servers
   * - Runs callbacks to process the store operation
   * - Can trigger stat-based achievements
   * - Use setStatFloat() for decimal values
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_SetStatInt32()` - Set int32 stat value
   * - `SteamAPI_ISteamUserStats_StoreStats()` - Store stats to Steam servers
   * - `SteamAPI_RunCallbacks()` - Process Steam callbacks
   */
  async setStatInt(statName: string, value: number): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] Steam API not initialized');
      return false;
    }

    try {
      const userStatsInterface = this.libraryLoader.SteamAPI_SteamUserStats_v013();
      
      const success = this.libraryLoader.SteamAPI_ISteamUserStats_SetStatInt32(
        userStatsInterface,
        statName,
        value
      );

      if (success) {
        // Store the stats to Steam servers
        const stored = this.libraryLoader.SteamAPI_ISteamUserStats_StoreStats(userStatsInterface);
        if (stored) {
          console.log(`[Steamworks] Set stat "${statName}" to ${value}`);
          // Process callbacks
          this.libraryLoader.SteamAPI_RunCallbacks();
          return true;
        } else {
          console.warn(`[Steamworks] Failed to store stat: ${statName}`);
          return false;
        }
      } else {
        console.warn(`[Steamworks] Failed to set stat: ${statName}`);
        return false;
      }
    } catch (error: any) {
      console.error(`[Steamworks] Error setting stat "${statName}":`, error.message);
      return false;
    }
  }

  /**
   * Set a float stat value for the current user
   * 
   * Updates a floating-point stat value and immediately stores it to Steam servers.
   * Use this for stats requiring decimal precision.
   * 
   * @param statName - Name of the stat to set (as defined in Steamworks Partner site)
   * @param value - Float value to set
   * @returns true if successful, false otherwise
   * 
   * @example
   * ```typescript
   * // Update accuracy based on hits/shots
   * const hits = 85;
   * const shots = 100;
   * const accuracy = hits / shots; // 0.85
   * await statsManager.setStatFloat('shooting_accuracy', accuracy);
   * ```
   * 
   * @remarks
   * - Automatically calls StoreStats() to save to Steam servers
   * - Runs callbacks to process the store operation
   * - Use setStatInt() for whole number values
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_SetStatFloat()` - Set float stat value
   * - `SteamAPI_ISteamUserStats_StoreStats()` - Store stats to Steam servers
   * - `SteamAPI_RunCallbacks()` - Process Steam callbacks
   */
  async setStatFloat(statName: string, value: number): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] Steam API not initialized');
      return false;
    }

    try {
      const userStatsInterface = this.libraryLoader.SteamAPI_SteamUserStats_v013();
      
      const success = this.libraryLoader.SteamAPI_ISteamUserStats_SetStatFloat(
        userStatsInterface,
        statName,
        value
      );

      if (success) {
        // Store the stats to Steam servers
        const stored = this.libraryLoader.SteamAPI_ISteamUserStats_StoreStats(userStatsInterface);
        if (stored) {
          console.log(`[Steamworks] Set stat "${statName}" to ${value}`);
          // Process callbacks
          this.libraryLoader.SteamAPI_RunCallbacks();
          return true;
        } else {
          console.warn(`[Steamworks] Failed to store stat: ${statName}`);
          return false;
        }
      } else {
        console.warn(`[Steamworks] Failed to set stat: ${statName}`);
        return false;
      }
    } catch (error: any) {
      console.error(`[Steamworks] Error setting stat "${statName}":`, error.message);
      return false;
    }
  }

  /**
   * Update an average rate stat
   * 
   * Updates stats that represent rates or averages over time (e.g., "kills per hour",
   * "average speed"). Steam automatically maintains the average calculation.
   * 
   * @param statName - Name of the stat to update (as defined in Steamworks Partner site)
   * @param countThisSession - Count/value for this session (e.g., kills this session)
   * @param sessionLength - Length of session in seconds
   * @returns true if successful, false otherwise
   * 
   * @example
   * ```typescript
   * // Update kills per hour stat
   * const sessionKills = 25;
   * const sessionSeconds = 1800; // 30 minutes
   * await statsManager.updateAvgRateStat('kills_per_hour', sessionKills, sessionSeconds);
   * // Steam calculates: (25 / 1800) * 3600 = 50 kills/hour
   * ```
   * 
   * @remarks
   * - Automatically calls StoreStats() to save to Steam servers
   * - Steam maintains the running average across all sessions
   * - sessionLength should be in seconds
   * - Used for "per hour" or "per game" statistics
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_UpdateAvgRateStat()` - Update average rate stat
   * - `SteamAPI_ISteamUserStats_StoreStats()` - Store stats to Steam servers
   * - `SteamAPI_RunCallbacks()` - Process Steam callbacks
   */
  async updateAvgRateStat(statName: string, countThisSession: number, sessionLength: number): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] Steam API not initialized');
      return false;
    }

    try {
      const userStatsInterface = this.libraryLoader.SteamAPI_SteamUserStats_v013();
      
      const success = this.libraryLoader.SteamAPI_ISteamUserStats_UpdateAvgRateStat(
        userStatsInterface,
        statName,
        countThisSession,
        sessionLength
      );

      if (success) {
        // Store the stats to Steam servers
        const stored = this.libraryLoader.SteamAPI_ISteamUserStats_StoreStats(userStatsInterface);
        if (stored) {
          console.log(`[Steamworks] Updated avg rate stat "${statName}": ${countThisSession} over ${sessionLength}s`);
          // Process callbacks
          this.libraryLoader.SteamAPI_RunCallbacks();
          return true;
        } else {
          console.warn(`[Steamworks] Failed to store stat: ${statName}`);
          return false;
        }
      } else {
        console.warn(`[Steamworks] Failed to update avg rate stat: ${statName}`);
        return false;
      }
    } catch (error: any) {
      console.error(`[Steamworks] Error updating avg rate stat "${statName}":`, error.message);
      return false;
    }
  }

  // ========================================
  // Friend/User Stats Operations
  // ========================================

  /**
   * Request stats for another user (friend)
   * 
   * Requests stat data from Steam servers for a specific user. Must be called
   * before getting user stats with getUserStatInt() or getUserStatFloat().
   * This is an asynchronous operation - wait a moment before reading the stats.
   * 
   * @param steamId - Steam ID of the user (as string or BigInt)
   * @returns true if request was sent successfully, false otherwise
   * 
   * @example
   * ```typescript
   * const friendSteamId = '76561198012345678';
   * 
   * // Request the friend's stats
   * const success = await statsManager.requestUserStats(friendSteamId);
   * if (success) {
   *   // Wait a moment for Steam to fetch the data
   *   await new Promise(resolve => setTimeout(resolve, 100));
   *   
   *   // Now get the friend's stats
   *   const friendKills = await statsManager.getUserStatInt(friendSteamId, 'total_kills');
   *   console.log(`[Steamworks] Friend has ${friendKills} kills`);
   * }
   * ```
   * 
   * @remarks
   * - Must be called before getting user stats
   * - Returns true immediately if request was sent (not when data arrives)
   * - Wait 50-100ms after requesting before reading stats
   * - User's stats must be public for this to work
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_RequestUserStats()` - Request user stats from Steam servers
   */
  async requestUserStats(steamId: string | bigint): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] Steam API not initialized');
      return false;
    }

    try {
      const userStatsInterface = this.libraryLoader.SteamAPI_SteamUserStats_v013();
      const steamIdBigInt = typeof steamId === 'string' ? BigInt(steamId) : steamId;
      
      const callHandle = this.libraryLoader.SteamAPI_ISteamUserStats_RequestUserStats(
        userStatsInterface,
        steamIdBigInt
      );

      if (callHandle !== BigInt(0)) {
        console.log(`[Steamworks] Requested stats for user: ${steamId}`);
        return true;
      } else {
        console.warn(`[Steamworks] Failed to request user stats: ${steamId}`);
        return false;
      }
    } catch (error: any) {
      console.error(`[Steamworks] Error requesting user stats:`, error.message);
      return false;
    }
  }

  /**
   * Get an integer stat value for another user (friend)
   * 
   * Retrieves a 32-bit integer stat value for a specific user. Must call
   * requestUserStats() first and wait for the data to arrive.
   * 
   * @param steamId - Steam ID of the user
   * @param statName - Name of the stat to retrieve
   * @returns The stat value, or null if not found or on error
   * 
   * @example
   * ```typescript
   * // Compare your kills to a friend's
   * const friendId = '76561198012345678';
   * await statsManager.requestUserStats(friendId);
   * await new Promise(resolve => setTimeout(resolve, 100));
   * 
   * const myKills = await statsManager.getStatInt('total_kills') || 0;
   * const friendKills = await statsManager.getUserStatInt(friendId, 'total_kills') || 0;
   * 
   * console.log(`[Steamworks] You: ${myKills}, Friend: ${friendKills}`);
   * ```
   * 
   * @remarks
   * - Must call requestUserStats() first
   * - Wait 50-100ms after requesting before calling this
   * - Returns null if stats haven't arrived yet or user's stats are private
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetUserStatInt32()` - Get user's int32 stat value
   */
  async getUserStatInt(steamId: string | bigint, statName: string): Promise<number | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] Steam API not initialized');
      return null;
    }

    try {
      const userStatsInterface = this.libraryLoader.SteamAPI_SteamUserStats_v013();
      const steamIdBigInt = typeof steamId === 'string' ? BigInt(steamId) : steamId;
      const valueOut = koffi.alloc('int32', 1);
      
      const success = this.libraryLoader.SteamAPI_ISteamUserStats_GetUserStatInt32(
        userStatsInterface,
        steamIdBigInt,
        statName,
        valueOut
      );

      if (success) {
        const value = koffi.decode(valueOut, 'int32');
        console.log(`[Steamworks] Got user stat "${statName}" for ${steamId}: ${value}`);
        return value;
      } else {
        console.warn(`[Steamworks] Failed to get user stat: ${statName}`);
        return null;
      }
    } catch (error: any) {
      console.error(`[Steamworks] Error getting user stat "${statName}":`, error.message);
      return null;
    }
  }

  /**
   * Get a float stat value for another user (friend)
   * 
   * Retrieves a floating-point stat value for a specific user. Must call
   * requestUserStats() first and wait for the data to arrive.
   * 
   * @param steamId - Steam ID of the user
   * @param statName - Name of the stat to retrieve
   * @returns The stat value, or null if not found or on error
   * 
   * @example
   * ```typescript
   * // Compare accuracy with a friend
   * const friendId = '76561198012345678';
   * await statsManager.requestUserStats(friendId);
   * await new Promise(resolve => setTimeout(resolve, 100));
   * 
   * const friendAccuracy = await statsManager.getUserStatFloat(friendId, 'shooting_accuracy');
   * if (friendAccuracy !== null) {
   *   console.log(`[Steamworks] Friend accuracy: ${(friendAccuracy * 100).toFixed(2)}%`);
   * }
   * ```
   * 
   * @remarks
   * - Must call requestUserStats() first
   * - Wait 50-100ms after requesting before calling this
   * - Returns null if stats haven't arrived yet or user's stats are private
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetUserStatFloat()` - Get user's float stat value
   */
  async getUserStatFloat(steamId: string | bigint, statName: string): Promise<number | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] Steam API not initialized');
      return null;
    }

    try {
      const userStatsInterface = this.libraryLoader.SteamAPI_SteamUserStats_v013();
      const steamIdBigInt = typeof steamId === 'string' ? BigInt(steamId) : steamId;
      const valueOut = koffi.alloc('float', 1);
      
      const success = this.libraryLoader.SteamAPI_ISteamUserStats_GetUserStatFloat(
        userStatsInterface,
        steamIdBigInt,
        statName,
        valueOut
      );

      if (success) {
        const value = koffi.decode(valueOut, 'float');
        console.log(`[Steamworks] Got user stat "${statName}" for ${steamId}: ${value}`);
        return value;
      } else {
        console.warn(`[Steamworks] Failed to get user stat: ${statName}`);
        return null;
      }
    } catch (error: any) {
      console.error(`[Steamworks] Error getting user stat "${statName}":`, error.message);
      return null;
    }
  }

  // ========================================
  // Global Stats Operations
  // ========================================

  /**
   * Request global stats data from Steam
   * 
   * Requests aggregated statistics across all players from Steam servers.
   * Optionally includes historical data for trend analysis.
   * Must be called before getting global stats.
   * 
   * @param historyDays - Number of days of history to retrieve (0-60, default: 0)
   * @returns true if request was sent successfully, false otherwise
   * 
   * @example
   * ```typescript
   * // Request current global stats (no history)
   * await statsManager.requestGlobalStats(0);
   * 
   * // Request with 7 days of history for trends
   * await statsManager.requestGlobalStats(7);
   * await new Promise(resolve => setTimeout(resolve, 100));
   * 
   * const totalKills = await statsManager.getGlobalStatInt('total_kills');
   * console.log(`[Steamworks] All players combined: ${totalKills} kills`);
   * ```
   * 
   * @remarks
   * - Must be called before getting global stats
   * - Returns true immediately if request was sent (not when data arrives)
   * - Wait 50-100ms after requesting before reading stats
   * - historyDays is automatically clamped to 0-60 range
   * - Historical data allows tracking trends over time
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_RequestGlobalStats()` - Request global stats from Steam servers
   */
  async requestGlobalStats(historyDays: number = 0): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] Steam API not initialized');
      return false;
    }

    try {
      // Limit history days to 0-60
      const days = Math.max(0, Math.min(60, historyDays));
      
      const userStatsInterface = this.libraryLoader.SteamAPI_SteamUserStats_v013();
      
      const callHandle = this.libraryLoader.SteamAPI_ISteamUserStats_RequestGlobalStats(
        userStatsInterface,
        days
      );

      if (callHandle !== BigInt(0)) {
        console.log(`[Steamworks] Requested global stats with ${days} days of history`);
        return true;
      } else {
        console.warn(`[Steamworks] Failed to request global stats`);
        return false;
      }
    } catch (error: any) {
      console.error(`[Steamworks] Error requesting global stats:`, error.message);
      return false;
    }
  }

  /**
   * Get a global stat value (64-bit integer)
   * 
   * Retrieves an aggregated integer stat value across all players.
   * Must call requestGlobalStats() first and wait for the data to arrive.
   * 
   * @param statName - Name of the global stat to retrieve
   * @returns The stat value as BigInt, or null if not found or on error
   * 
   * @example
   * ```typescript
   * // Get total kills across all players
   * await statsManager.requestGlobalStats();
   * await new Promise(resolve => setTimeout(resolve, 100));
   * 
   * const globalKills = await statsManager.getGlobalStatInt('total_kills');
   * if (globalKills !== null) {
   *   console.log(`[Steamworks] All players have ${globalKills} total kills`);
   * }
   * ```
   * 
   * @remarks
   * - Returns BigInt for large numbers (can exceed JavaScript's safe integer range)
   * - Must call requestGlobalStats() first
   * - Wait 50-100ms after requesting before calling this
   * - Useful for tracking game-wide statistics
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetGlobalStatInt64()` - Get global int64 stat value
   */
  async getGlobalStatInt(statName: string): Promise<bigint | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] Steam API not initialized');
      return null;
    }

    try {
      const userStatsInterface = this.libraryLoader.SteamAPI_SteamUserStats_v013();
      const valueOut = koffi.alloc('int64', 1);
      
      const success = this.libraryLoader.SteamAPI_ISteamUserStats_GetGlobalStatInt64(
        userStatsInterface,
        statName,
        valueOut
      );

      if (success) {
        const value = koffi.decode(valueOut, 'int64');
        console.log(`[Steamworks] Got global stat "${statName}": ${value}`);
        return value;
      } else {
        console.warn(`[Steamworks] Failed to get global stat: ${statName}`);
        return null;
      }
    } catch (error: any) {
      console.error(`[Steamworks] Error getting global stat "${statName}":`, error.message);
      return null;
    }
  }

  /**
   * Get a global stat value (double-precision float)
   * 
   * Retrieves an aggregated floating-point stat value across all players.
   * Must call requestGlobalStats() first and wait for the data to arrive.
   * Use this for averages or stats requiring decimal precision.
   * 
   * @param statName - Name of the global stat to retrieve
   * @returns The stat value, or null if not found or on error
   * 
   * @example
   * ```typescript
   * // Get average accuracy across all players
   * await statsManager.requestGlobalStats();
   * await new Promise(resolve => setTimeout(resolve, 100));
   * 
   * const avgAccuracy = await statsManager.getGlobalStatDouble('average_accuracy');
   * if (avgAccuracy !== null) {
   *   console.log(`[Steamworks] Global average accuracy: ${(avgAccuracy * 100).toFixed(2)}%`);
   * }
   * ```
   * 
   * @remarks
   * - Use for stats requiring decimal precision
   * - Must call requestGlobalStats() first
   * - Wait 50-100ms after requesting before calling this
   * - Perfect for calculating game-wide averages
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetGlobalStatDouble()` - Get global double stat value
   */
  async getGlobalStatDouble(statName: string): Promise<number | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] Steam API not initialized');
      return null;
    }

    try {
      const userStatsInterface = this.libraryLoader.SteamAPI_SteamUserStats_v013();
      const valueOut = koffi.alloc('double', 1);
      
      const success = this.libraryLoader.SteamAPI_ISteamUserStats_GetGlobalStatDouble(
        userStatsInterface,
        statName,
        valueOut
      );

      if (success) {
        const value = koffi.decode(valueOut, 'double');
        console.log(`[Steamworks] Got global stat "${statName}": ${value}`);
        return value;
      } else {
        console.warn(`[Steamworks] Failed to get global stat: ${statName}`);
        return null;
      }
    } catch (error: any) {
      console.error(`[Steamworks] Error getting global stat "${statName}":`, error.message);
      return null;
    }
  }

  /**
   * Get global stat history for an integer stat
   * 
   * Retrieves historical daily values for a global stat. Array index [0] is today,
   * [1] is yesterday, etc. Useful for tracking trends and creating graphs.
   * 
   * @param statName - Name of the global stat
   * @param days - Number of days of history to retrieve (1-60, default: 7)
   * @returns Array of daily BigInt values, or null if error
   * 
   * @example
   * ```typescript
   * // Get 7 days of global kill history
   * await statsManager.requestGlobalStats(7);
   * await new Promise(resolve => setTimeout(resolve, 100));
   * 
   * const history = await statsManager.getGlobalStatHistoryInt('total_kills', 7);
   * if (history) {
   *   console.log('[Steamworks] Kill history (newest to oldest):');
   *   history.forEach((kills, index) => {
   *     const daysAgo = index === 0 ? 'today' : `${index} days ago`;
   *     console.log(`[Steamworks]   ${daysAgo}: ${kills} kills`);
   *   });
   * }
   * ```
   * 
   * @remarks
   * - Array index [0] = today, [1] = yesterday, etc.
   * - Must call requestGlobalStats(days) first with same or greater number of days
   * - Returns BigInt values for large numbers
   * - Maximum 60 days of history (automatically clamped)
   * - Perfect for trend analysis and visualizations
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetGlobalStatHistoryInt64()` - Get historical int64 values
   */
  async getGlobalStatHistoryInt(statName: string, days: number = 7): Promise<bigint[] | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] Steam API not initialized');
      return null;
    }

    try {
      // Limit to 60 days
      const numDays = Math.max(1, Math.min(60, days));
      
      const userStatsInterface = this.libraryLoader.SteamAPI_SteamUserStats_v013();
      const historyOut = koffi.alloc('int64', numDays);
      
      const elementsReturned = this.libraryLoader.SteamAPI_ISteamUserStats_GetGlobalStatHistoryInt64(
        userStatsInterface,
        statName,
        historyOut,
        numDays
      );

      if (elementsReturned > 0) {
        const history: bigint[] = [];
        for (let i = 0; i < elementsReturned; i++) {
          history.push(koffi.decode(historyOut, 'int64', i));
        }
        console.log(`[Steamworks] Got ${elementsReturned} days of history for "${statName}"`);
        return history;
      } else {
        console.warn(`[Steamworks] Failed to get global stat history: ${statName}`);
        return null;
      }
    } catch (error: any) {
      console.error(`[Steamworks] Error getting global stat history "${statName}":`, error.message);
      return null;
    }
  }

  /**
   * Get global stat history for a floating-point stat
   * 
   * Retrieves historical daily values for a global stat with decimal precision.
   * Array index [0] is today, [1] is yesterday, etc. Ideal for tracking averages
   * and rates over time.
   * 
   * @param statName - Name of the global stat
   * @param days - Number of days of history to retrieve (1-60, default: 7)
   * @returns Array of daily float values, or null if error
   * 
   * @example
   * ```typescript
   * // Track average accuracy trend over 30 days
   * await statsManager.requestGlobalStats(30);
   * await new Promise(resolve => setTimeout(resolve, 100));
   * 
   * const history = await statsManager.getGlobalStatHistoryDouble('average_accuracy', 30);
   * if (history) {
   *   console.log('[Steamworks] Accuracy trend:');
   *   history.forEach((accuracy, index) => {
   *     if (index % 7 === 0) { // Weekly intervals
   *       console.log(`[Steamworks]   Week ${index/7}: ${(accuracy * 100).toFixed(2)}%`);
   *     }
   *   });
   * }
   * ```
   * 
   * @remarks
   * - Array index [0] = today, [1] = yesterday, etc.
   * - Must call requestGlobalStats(days) first with same or greater number of days
   * - Returns floating-point values for decimal precision
   * - Maximum 60 days of history (automatically clamped)
   * - Perfect for tracking averages, rates, and percentages over time
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetGlobalStatHistoryDouble()` - Get historical double values
   */
  async getGlobalStatHistoryDouble(statName: string, days: number = 7): Promise<number[] | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] Steam API not initialized');
      return null;
    }

    try {
      // Limit to 60 days
      const numDays = Math.max(1, Math.min(60, days));
      
      const userStatsInterface = this.libraryLoader.SteamAPI_SteamUserStats_v013();
      const historyOut = koffi.alloc('double', numDays);
      
      const elementsReturned = this.libraryLoader.SteamAPI_ISteamUserStats_GetGlobalStatHistoryDouble(
        userStatsInterface,
        statName,
        historyOut,
        numDays
      );

      if (elementsReturned > 0) {
        const history: number[] = [];
        for (let i = 0; i < elementsReturned; i++) {
          history.push(koffi.decode(historyOut, 'double', i));
        }
        console.log(`[Steamworks] Got ${elementsReturned} days of history for "${statName}"`);
        return history;
      } else {
        console.warn(`[Steamworks] Failed to get global stat history: ${statName}`);
        return null;
      }
    } catch (error: any) {
      console.error(`[Steamworks] Error getting global stat history "${statName}":`, error.message);
      return null;
    }
  }
}
