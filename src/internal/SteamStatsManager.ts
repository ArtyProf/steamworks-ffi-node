import * as koffi from 'koffi';
import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import { SteamStat, GlobalStat, GlobalStatHistory, UserStat } from '../types';

/**
 * Manages Steam user statistics operations
 * Handles getting/setting stats, global stats, and friend stats
 */
export class SteamStatsManager {
  private libraryLoader: SteamLibraryLoader;
  private apiCore: SteamAPICore;

  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
  }

  // ========================================
  // User Stats Operations (Get/Set)
  // ========================================

  /**
   * Get an integer stat value
   * 
   * @param statName - Name of the stat to retrieve
   * @returns The stat value, or null if not found/error
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetStatInt32()` - Get int32 stat value
   */
  async getStatInt(statName: string): Promise<number | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('⚠️ Steam API not initialized');
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
        console.log(`📊 Got stat "${statName}": ${value}`);
        return value;
      } else {
        console.warn(`⚠️ Failed to get stat: ${statName}`);
        return null;
      }
    } catch (error: any) {
      console.error(`❌ Error getting stat "${statName}":`, error.message);
      return null;
    }
  }

  /**
   * Get a float stat value
   * 
   * @param statName - Name of the stat to retrieve
   * @returns The stat value, or null if not found/error
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetStatFloat()` - Get float stat value
   */
  async getStatFloat(statName: string): Promise<number | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('⚠️ Steam API not initialized');
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
        console.log(`📊 Got stat "${statName}": ${value}`);
        return value;
      } else {
        console.warn(`⚠️ Failed to get stat: ${statName}`);
        return null;
      }
    } catch (error: any) {
      console.error(`❌ Error getting stat "${statName}":`, error.message);
      return null;
    }
  }

  /**
   * Set an integer stat value
   * 
   * @param statName - Name of the stat to set
   * @param value - Integer value to set
   * @returns true if successful, false otherwise
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_SetStatInt32()` - Set int32 stat value
   * - `SteamAPI_ISteamUserStats_StoreStats()` - Store stats to Steam servers
   * - `SteamAPI_RunCallbacks()` - Process Steam callbacks
   */
  async setStatInt(statName: string, value: number): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.warn('⚠️ Steam API not initialized');
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
          console.log(`✅ Set stat "${statName}" to ${value}`);
          // Process callbacks
          this.libraryLoader.SteamAPI_RunCallbacks();
          return true;
        } else {
          console.warn(`⚠️ Failed to store stat: ${statName}`);
          return false;
        }
      } else {
        console.warn(`⚠️ Failed to set stat: ${statName}`);
        return false;
      }
    } catch (error: any) {
      console.error(`❌ Error setting stat "${statName}":`, error.message);
      return false;
    }
  }

  /**
   * Set a float stat value
   * 
   * @param statName - Name of the stat to set
   * @param value - Float value to set
   * @returns true if successful, false otherwise
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_SetStatFloat()` - Set float stat value
   * - `SteamAPI_ISteamUserStats_StoreStats()` - Store stats to Steam servers
   * - `SteamAPI_RunCallbacks()` - Process Steam callbacks
   */
  async setStatFloat(statName: string, value: number): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.warn('⚠️ Steam API not initialized');
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
          console.log(`✅ Set stat "${statName}" to ${value}`);
          // Process callbacks
          this.libraryLoader.SteamAPI_RunCallbacks();
          return true;
        } else {
          console.warn(`⚠️ Failed to store stat: ${statName}`);
          return false;
        }
      } else {
        console.warn(`⚠️ Failed to set stat: ${statName}`);
        return false;
      }
    } catch (error: any) {
      console.error(`❌ Error setting stat "${statName}":`, error.message);
      return false;
    }
  }

  /**
   * Update an average rate stat
   * This is used for stats like "average speed" or "kills per hour"
   * 
   * @param statName - Name of the stat to update
   * @param countThisSession - Count for this session
   * @param sessionLength - Length of session in seconds
   * @returns true if successful, false otherwise
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_UpdateAvgRateStat()` - Update average rate stat
   * - `SteamAPI_ISteamUserStats_StoreStats()` - Store stats to Steam servers
   * - `SteamAPI_RunCallbacks()` - Process Steam callbacks
   */
  async updateAvgRateStat(statName: string, countThisSession: number, sessionLength: number): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.warn('⚠️ Steam API not initialized');
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
          console.log(`✅ Updated avg rate stat "${statName}": ${countThisSession} over ${sessionLength}s`);
          // Process callbacks
          this.libraryLoader.SteamAPI_RunCallbacks();
          return true;
        } else {
          console.warn(`⚠️ Failed to store stat: ${statName}`);
          return false;
        }
      } else {
        console.warn(`⚠️ Failed to update avg rate stat: ${statName}`);
        return false;
      }
    } catch (error: any) {
      console.error(`❌ Error updating avg rate stat "${statName}":`, error.message);
      return false;
    }
  }

  // ========================================
  // Friend/User Stats Operations
  // ========================================

  /**
   * Request stats for another user (friend)
   * Must be called before getting user stats
   * 
   * @param steamId - Steam ID of the user (as string or BigInt)
   * @returns true if request was sent, false otherwise
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_RequestUserStats()` - Request user stats from Steam
   */
  async requestUserStats(steamId: string | bigint): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.warn('⚠️ Steam API not initialized');
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
        console.log(`📡 Requested stats for user: ${steamId}`);
        return true;
      } else {
        console.warn(`⚠️ Failed to request user stats: ${steamId}`);
        return false;
      }
    } catch (error: any) {
      console.error(`❌ Error requesting user stats:`, error.message);
      return false;
    }
  }

  /**
   * Get an integer stat value for another user (friend)
   * Must call requestUserStats() first and wait for callback
   * 
   * @param steamId - Steam ID of the user
   * @param statName - Name of the stat to retrieve
   * @returns The stat value, or null if not found/error
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetUserStatInt32()` - Get user's int32 stat value
   */
  async getUserStatInt(steamId: string | bigint, statName: string): Promise<number | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('⚠️ Steam API not initialized');
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
        console.log(`📊 Got user stat "${statName}" for ${steamId}: ${value}`);
        return value;
      } else {
        console.warn(`⚠️ Failed to get user stat: ${statName}`);
        return null;
      }
    } catch (error: any) {
      console.error(`❌ Error getting user stat "${statName}":`, error.message);
      return null;
    }
  }

  /**
   * Get a float stat value for another user (friend)
   * Must call requestUserStats() first and wait for callback
   * 
   * @param steamId - Steam ID of the user
   * @param statName - Name of the stat to retrieve
   * @returns The stat value, or null if not found/error
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetUserStatFloat()` - Get user's float stat value
   */
  async getUserStatFloat(steamId: string | bigint, statName: string): Promise<number | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('⚠️ Steam API not initialized');
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
        console.log(`📊 Got user stat "${statName}" for ${steamId}: ${value}`);
        return value;
      } else {
        console.warn(`⚠️ Failed to get user stat: ${statName}`);
        return null;
      }
    } catch (error: any) {
      console.error(`❌ Error getting user stat "${statName}":`, error.message);
      return null;
    }
  }

  // ========================================
  // Global Stats Operations
  // ========================================

  /**
   * Request global stats data from Steam
   * Must be called before getting global stats
   * 
   * @param historyDays - Number of days of history to retrieve (0-60)
   * @returns true if request was sent, false otherwise
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_RequestGlobalStats()` - Request global stats from Steam
   */
  async requestGlobalStats(historyDays: number = 0): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.warn('⚠️ Steam API not initialized');
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
        console.log(`📡 Requested global stats with ${days} days of history`);
        return true;
      } else {
        console.warn(`⚠️ Failed to request global stats`);
        return false;
      }
    } catch (error: any) {
      console.error(`❌ Error requesting global stats:`, error.message);
      return false;
    }
  }

  /**
   * Get a global stat value (int64)
   * Must call requestGlobalStats() first and wait for callback
   * 
   * @param statName - Name of the global stat to retrieve
   * @returns The stat value, or null if not found/error
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetGlobalStatInt64()` - Get global int64 stat value
   */
  async getGlobalStatInt(statName: string): Promise<bigint | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('⚠️ Steam API not initialized');
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
        console.log(`🌍 Got global stat "${statName}": ${value}`);
        return value;
      } else {
        console.warn(`⚠️ Failed to get global stat: ${statName}`);
        return null;
      }
    } catch (error: any) {
      console.error(`❌ Error getting global stat "${statName}":`, error.message);
      return null;
    }
  }

  /**
   * Get a global stat value (double)
   * Must call requestGlobalStats() first and wait for callback
   * 
   * @param statName - Name of the global stat to retrieve
   * @returns The stat value, or null if not found/error
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetGlobalStatDouble()` - Get global double stat value
   */
  async getGlobalStatDouble(statName: string): Promise<number | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('⚠️ Steam API not initialized');
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
        console.log(`🌍 Got global stat "${statName}": ${value}`);
        return value;
      } else {
        console.warn(`⚠️ Failed to get global stat: ${statName}`);
        return null;
      }
    } catch (error: any) {
      console.error(`❌ Error getting global stat "${statName}":`, error.message);
      return null;
    }
  }

  /**
   * Get global stat history (int64)
   * Returns daily values for the stat, with [0] being today, [1] yesterday, etc.
   * 
   * @param statName - Name of the global stat
   * @param days - Number of days of history to retrieve (max 60)
   * @returns Array of daily values, or null if error
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetGlobalStatHistoryInt64()` - Get global stat history
   */
  async getGlobalStatHistoryInt(statName: string, days: number = 7): Promise<bigint[] | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('⚠️ Steam API not initialized');
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
        console.log(`🌍 Got ${elementsReturned} days of history for "${statName}"`);
        return history;
      } else {
        console.warn(`⚠️ Failed to get global stat history: ${statName}`);
        return null;
      }
    } catch (error: any) {
      console.error(`❌ Error getting global stat history "${statName}":`, error.message);
      return null;
    }
  }

  /**
   * Get global stat history (double)
   * Returns daily values for the stat, with [0] being today, [1] yesterday, etc.
   * 
   * @param statName - Name of the global stat
   * @param days - Number of days of history to retrieve (max 60)
   * @returns Array of daily values, or null if error
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetGlobalStatHistoryDouble()` - Get global stat history
   */
  async getGlobalStatHistoryDouble(statName: string, days: number = 7): Promise<number[] | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('⚠️ Steam API not initialized');
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
        console.log(`🌍 Got ${elementsReturned} days of history for "${statName}"`);
        return history;
      } else {
        console.warn(`⚠️ Failed to get global stat history: ${statName}`);
        return null;
      }
    } catch (error: any) {
      console.error(`❌ Error getting global stat history "${statName}":`, error.message);
      return null;
    }
  }
}
