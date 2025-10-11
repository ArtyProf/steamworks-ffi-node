import * as koffi from 'koffi';
import { 
  SteamAchievement, 
  AchievementProgressLimits, 
  UserAchievement, 
  AchievementGlobalStats,
  AchievementWithIcon 
} from '../types';
import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';

/**
 * SteamAchievementManager
 * 
 * Manages all Steam achievement operations including:
 * - Core operations (get, unlock, clear, check status)
 * - Visual features (icons, progress notifications)
 * - Progress tracking (get limits for progress bars)
 * - Friend comparisons (see friend achievements)
 * - Global statistics (unlock percentages, popularity sorting)
 * - Testing tools (reset stats/achievements)
 * 
 * @example
 * ```typescript
 * const achievementManager = new SteamAchievementManager(libraryLoader, apiCore);
 * const achievements = await achievementManager.getAllAchievements();
 * await achievementManager.unlockAchievement('ACH_WIN_ONE_GAME');
 * ```
 */
export class SteamAchievementManager {
  /** Steam library loader for FFI function calls */
  private libraryLoader: SteamLibraryLoader;
  
  /** Steam API core for initialization and callback management */
  private apiCore: SteamAPICore;

  /**
   * Creates a new SteamAchievementManager instance
   * 
   * @param libraryLoader - The Steam library loader for FFI calls
   * @param apiCore - The Steam API core for lifecycle management
   */
  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
  }

  /**
   * Get all achievements from Steam
   * 
   * Retrieves complete achievement data including unlock status and timestamps.
   * Automatically runs Steam callbacks to ensure latest data is available.
   * 
   * @returns Promise resolving to array of all achievements, or empty array on error
   * 
   * @example
   * ```typescript
   * const achievements = await achievementManager.getAllAchievements();
   * console.log(`[Steamworks] Found ${achievements.length} achievements`);
   * achievements.forEach(ach => {
   *   console.log(`[Steamworks] ${ach.displayName}: ${ach.unlocked ? 'Unlocked' : 'Locked'}`);
   * });
   * ```
   * 
   * @remarks
   * - Returns empty array if Steam API is not initialized
   * - Includes display name, description, unlock status, and unlock time
   * - Unlock time is a Unix timestamp (seconds since epoch)
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_RunCallbacks()` - Process Steam callbacks
   * - `SteamAPI_ISteamUserStats_GetNumAchievements()` - Get total achievement count
   * - `SteamAPI_ISteamUserStats_GetAchievementName()` - Get achievement API name
   * - `SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute()` - Get display attributes
   * - `SteamAPI_ISteamUserStats_GetAchievementAndUnlockTime()` - Get unlock status and time
   */
  async getAllAchievements(): Promise<SteamAchievement[]> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return [];
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('[Steamworks] WARNING: UserStats interface not available');
      return [];
    }

    try {
      // Run callbacks to ensure we have latest data
      this.apiCore.runCallbacks();

      const achievements: SteamAchievement[] = [];
      const numAchievements = this.libraryLoader.SteamAPI_ISteamUserStats_GetNumAchievements(userStatsInterface);
      
      console.log(`[Steamworks] Found ${numAchievements} achievements in Steam`);

      for (let i = 0; i < numAchievements; i++) {
        try {
          // Get achievement API name
          const apiName = this.libraryLoader.SteamAPI_ISteamUserStats_GetAchievementName(userStatsInterface, i);
          if (!apiName) continue;

          // Get display name
          const displayName = this.libraryLoader.SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute(
            userStatsInterface, apiName, 'name'
          ) || apiName;

          // Get description
          const description = this.libraryLoader.SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute(
            userStatsInterface, apiName, 'desc'
          ) || '';

          // Check if unlocked and get unlock time
          const unlockedPtr = koffi.alloc('bool', 1);
          const unlockTimePtr = koffi.alloc('uint32', 1);
          const hasAchievement = this.libraryLoader.SteamAPI_ISteamUserStats_GetAchievementAndUnlockTime(
            userStatsInterface, apiName, unlockedPtr, unlockTimePtr
          );
          
          const unlocked = hasAchievement ? koffi.decode(unlockedPtr, 'bool') : false;
          const unlockTime = hasAchievement && unlocked ? koffi.decode(unlockTimePtr, 'uint32') : 0;

          achievements.push({
            apiName,
            displayName,
            description,
            unlocked,
            unlockTime // Now returns actual Steam unlock time (Unix timestamp)
          });

        } catch (error) {
          console.warn(`[Steamworks] Failed to get achievement ${i}:`, (error as Error).message);
        }
      }

      return achievements;

    } catch (error) {
      console.error('[Steamworks] ERROR: Failed to get achievements:', (error as Error).message);
      return [];
    }
  }

  /**
   * Unlock an achievement in Steam
   * 
   * Permanently unlocks the specified achievement and syncs to Steam servers.
   * Shows Steam overlay notification if enabled.
   * 
   * @param achievementName - The API name of the achievement to unlock
   * @returns Promise resolving to true if successful, false otherwise
   * 
   * @example
   * ```typescript
   * const success = await achievementManager.unlockAchievement('ACH_WIN_ONE_GAME');
   * if (success) {
   *   console.log('[Steamworks] Achievement unlocked!');
   * }
   * ```
   * 
   * @remarks
   * - Achievement must be configured in Steamworks Partner site
   * - Changes are immediately stored to Steam servers
   * - Steam overlay will show unlock notification
   * - Cannot unlock already unlocked achievements (returns true)
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_SetAchievement()` - Mark achievement as unlocked
   * - `SteamAPI_ISteamUserStats_StoreStats()` - Store achievement to Steam servers
   * - `SteamAPI_RunCallbacks()` - Process unlock notification
   */
  async unlockAchievement(achievementName: string): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return false;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('[Steamworks] WARNING: UserStats interface not available');
      return false;
    }

    try {
      console.log(`[Steamworks] Attempting to unlock achievement: ${achievementName}`);
      
      // Set the achievement
      const result = this.libraryLoader.SteamAPI_ISteamUserStats_SetAchievement(userStatsInterface, achievementName);
      
      if (result) {
        // Store stats to commit the achievement to Steam servers
        const storeResult = this.libraryLoader.SteamAPI_ISteamUserStats_StoreStats(userStatsInterface);
        
        if (storeResult) {
          // Run callbacks to process the achievement unlock
          this.apiCore.runCallbacks();
          
          console.log(`[Steamworks] Achievement unlocked successfully: ${achievementName}`);
          return true;
        } else {
          console.error(`[Steamworks] ERROR: Failed to store stats for achievement: ${achievementName}`);
          return false;
        }
      } else {
        console.error(`[Steamworks] ERROR: Failed to set achievement: ${achievementName}`);
        return false;
      }

    } catch (error) {
      console.error(`[Steamworks] ERROR: Error unlocking achievement ${achievementName}:`, (error as Error).message);
      return false;
    }
  }

  /**
   * Clear an achievement in Steam (for testing purposes)
   * 
   * Removes the unlock status of an achievement. Should only be used for testing.
   * Changes are immediately stored to Steam servers.
   * 
   * @param achievementName - The API name of the achievement to clear
   * @returns Promise resolving to true if successful, false otherwise
   * 
   * @example
   * ```typescript
   * // Clear achievement for testing
   * await achievementManager.clearAchievement('ACH_WIN_ONE_GAME');
   * ```
   * 
   * @remarks
   * - Only use for testing/debugging purposes
   * - Achievement must be configured in Steamworks Partner site
   * - Changes are immediately stored to Steam servers
   * - Cannot clear already locked achievements (returns true)
   * 
   * @warning This permanently removes the achievement unlock from user's profile
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_ClearAchievement()` - Mark achievement as locked
   * - `SteamAPI_ISteamUserStats_StoreStats()` - Store change to Steam servers
   * - `SteamAPI_RunCallbacks()` - Process the change
   */
  async clearAchievement(achievementName: string): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return false;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('[Steamworks] WARNING: UserStats interface not available');
      return false;
    }

    try {
      console.log(`[Steamworks] Attempting to clear achievement: ${achievementName}`);
      
      // Clear the achievement
      const result = this.libraryLoader.SteamAPI_ISteamUserStats_ClearAchievement(userStatsInterface, achievementName);
      
      if (result) {
        // Store stats to commit the change to Steam servers
        const storeResult = this.libraryLoader.SteamAPI_ISteamUserStats_StoreStats(userStatsInterface);
        
        if (storeResult) {
          // Run callbacks to process the change
          this.apiCore.runCallbacks();
          
          console.log(`[Steamworks] Achievement cleared successfully: ${achievementName}`);
          return true;
        } else {
          console.error(`[Steamworks] ERROR: Failed to store stats for clearing achievement: ${achievementName}`);
          return false;
        }
      } else {
        console.error(`[Steamworks] ERROR: Failed to clear achievement: ${achievementName}`);
        return false;
      }

    } catch (error) {
      console.error(`[Steamworks] ERROR: Error clearing achievement ${achievementName}:`, (error as Error).message);
      return false;
    }
  }

  /**
   * Check if an achievement is unlocked
   * 
   * Queries Steam for the current unlock status of a specific achievement.
   * 
   * @param achievementName - The API name of the achievement to check
   * @returns Promise resolving to true if unlocked, false if locked or error
   * 
   * @example
   * ```typescript
   * const isUnlocked = await achievementManager.isAchievementUnlocked('ACH_WIN_ONE_GAME');
   * if (isUnlocked) {
   *   console.log('[Steamworks] Player has already won one game');
   * }
   * ```
   * 
   * @remarks
   * - Returns false if Steam API is not initialized
   * - Returns false if achievement doesn't exist
   * - Returns false on any error (check console for details)
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetAchievement()` - Get achievement unlock status
   */
  async isAchievementUnlocked(achievementName: string): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      return false;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      return false;
    }

    try {
      const unlockedPtr = koffi.alloc('bool', 1);
      const unlockTimePtr = koffi.alloc('uint32', 1);
      const hasAchievement = this.libraryLoader.SteamAPI_ISteamUserStats_GetAchievementAndUnlockTime(
        userStatsInterface, achievementName, unlockedPtr, unlockTimePtr
      );
      
      return hasAchievement ? koffi.decode(unlockedPtr, 'bool') : false;

    } catch (error) {
      console.error(`[Steamworks] ERROR: Error checking achievement ${achievementName}:`, (error as Error).message);
      return false;
    }
  }

  /**
   * Get a specific achievement by its API name
   * 
   * Retrieves complete data for a single achievement.
   * 
   * @param achievementName - The API name of the achievement to retrieve
   * @returns Promise resolving to achievement data, or null if not found
   * 
   * @example
   * ```typescript
   * const achievement = await achievementManager.getAchievementByName('ACH_WIN_ONE_GAME');
   * if (achievement) {
   *   console.log(`[Steamworks] ${achievement.displayName}: ${achievement.description}`);
   * }
   * ```
   * 
   * @remarks
   * - Calls getAllAchievements() internally, so may be slower than batch operations
   * - Returns null if achievement doesn't exist
   * - Returns null if Steam API is not initialized
   * 
   * Steamworks SDK Functions:
   * - Uses getAllAchievements() which calls multiple SDK functions
   */
  async getAchievementByName(achievementName: string): Promise<SteamAchievement | null> {
    const achievements = await this.getAllAchievements();
    return achievements.find(a => a.apiName === achievementName) || null;
  }

  /**
   * Get the total number of achievements configured for this game
   * 
   * Returns the count of all achievements defined in Steamworks Partner site.
   * 
   * @returns Promise resolving to total achievement count, or 0 on error
   * 
   * @example
   * ```typescript
   * const total = await achievementManager.getTotalAchievementCount();
   * console.log(`[Steamworks] This game has ${total} achievements`);
   * ```
   * 
   * @remarks
   * - Returns 0 if Steam API is not initialized
   * - Count includes both locked and unlocked achievements
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetNumAchievements()` - Get total achievement count
   */
  async getTotalAchievementCount(): Promise<number> {
    if (!this.apiCore.isInitialized()) {
      return 0;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      return 0;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamUserStats_GetNumAchievements(userStatsInterface);
    } catch (error) {
      console.error('[Steamworks] ERROR: Error getting achievement count:', (error as Error).message);
      return 0;
    }
  }

  /**
   * Get the number of achievements the user has unlocked
   * 
   * Counts how many achievements the current user has unlocked.
   * 
   * @returns Promise resolving to count of unlocked achievements
   * 
   * @example
   * ```typescript
   * const total = await achievementManager.getTotalAchievementCount();
   * const unlocked = await achievementManager.getUnlockedAchievementCount();
   * console.log(`[Steamworks] Progress: ${unlocked}/${total} (${(unlocked/total*100).toFixed(1)}%)`);
   * ```
   * 
   * @remarks
   * - Calls getAllAchievements() internally to count unlocked achievements
   * - Returns 0 if Steam API is not initialized
   * 
   * Steamworks SDK Functions:
   * - Uses getAllAchievements() which calls multiple SDK functions
   */
  async getUnlockedAchievementCount(): Promise<number> {
    const achievements = await this.getAllAchievements();
    return achievements.filter(a => a.unlocked).length;
  }

  /**
   * Get the icon handle for an achievement
   * 
   * Returns an icon handle that can be used with ISteamUtils::GetImageRGBA()
   * to retrieve the actual icon image data.
   * 
   * @param achievementName - The API name of the achievement
   * @returns Promise resolving to icon handle (0 if no icon or still loading)
   * 
   * @example
   * ```typescript
   * const iconHandle = await achievementManager.getAchievementIcon('ACH_WIN_ONE_GAME');
   * if (iconHandle > 0) {
   *   // Use ISteamUtils::GetImageRGBA() to get actual image data
   *   console.log(`[Steamworks] Icon handle: ${iconHandle}`);
   * }
   * ```
   * 
   * @remarks
   * - Returns 0 if no icon is set for the achievement
   * - Returns 0 if icon is still being fetched from Steam
   * - Wait for UserAchievementIconFetched_t callback if 0 is returned
   * - Icon handle is valid until Steam API shutdown
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetAchievementIcon()` - Get achievement icon handle
   */
  async getAchievementIcon(achievementName: string): Promise<number> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return 0;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('[Steamworks] WARNING: UserStats interface not available');
      return 0;
    }

    try {
      const iconHandle = this.libraryLoader.SteamAPI_ISteamUserStats_GetAchievementIcon(
        userStatsInterface, 
        achievementName
      );
      
      console.log(`[Steamworks] Achievement icon handle for ${achievementName}: ${iconHandle}`);
      return iconHandle;
    } catch (error) {
      console.error(`[Steamworks] ERROR: Error getting achievement icon:`, (error as Error).message);
      return 0;
    }
  }

  /**
   * Show achievement progress notification to user
   * 
   * Displays a progress notification in the Steam overlay showing current/max progress.
   * Useful for achievements that require multiple steps or cumulative actions.
   * 
   * @param achievementName - The API name of the achievement
   * @param currentProgress - Current progress value
   * @param maxProgress - Maximum progress value needed to unlock
   * @returns Promise resolving to true if successful, false otherwise
   * 
   * @example
   * ```typescript
   * // Show "Win 50 games" progress: 25/50
   * await achievementManager.indicateAchievementProgress('ACH_WIN_50_GAMES', 25, 50);
   * 
   * // Update progress when player wins another game
   * await achievementManager.indicateAchievementProgress('ACH_WIN_50_GAMES', 26, 50);
   * ```
   * 
   * @remarks
   * - Shows notification in Steam overlay (if enabled)
   * - Does NOT unlock the achievement automatically
   * - Call unlockAchievement() when currentProgress >= maxProgress
   * - Notification only shows if progress has changed
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_IndicateAchievementProgress()` - Show progress notification
   */
  async indicateAchievementProgress(
    achievementName: string, 
    currentProgress: number, 
    maxProgress: number
  ): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return false;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('[Steamworks] WARNING: UserStats interface not available');
      return false;
    }

    try {
      console.log(`[Steamworks] Indicating achievement progress: ${achievementName} (${currentProgress}/${maxProgress})`);
      
      const result = this.libraryLoader.SteamAPI_ISteamUserStats_IndicateAchievementProgress(
        userStatsInterface,
        achievementName,
        currentProgress,
        maxProgress
      );
      
      if (result) {
        this.apiCore.runCallbacks();
        console.log(`[Steamworks] Achievement progress indicated successfully`);
        return true;
      } else {
        console.error(`[Steamworks] ERROR: Failed to indicate achievement progress`);
        return false;
      }
    } catch (error) {
      console.error(`[Steamworks] ERROR: Error indicating achievement progress:`, (error as Error).message);
      return false;
    }
  }

  /**
   * Get achievement progress limits (integer-based)
   * 
   * Retrieves the minimum and maximum progress values for an achievement that
   * uses integer-based progress tracking.
   * 
   * @param achievementName - The API name of the achievement
   * @returns Promise resolving to progress limits object, or null if not configured
   * 
   * @example
   * ```typescript
   * const limits = await achievementManager.getAchievementProgressLimitsInt('ACH_WIN_50_GAMES');
   * if (limits) {
   *   console.log(`[Steamworks] Progress range: ${limits.minProgress} to ${limits.maxProgress}`);
   * }
   * ```
   * 
   * @remarks
   * - Returns null if achievement has no progress tracking configured
   * - Use for achievements with integer progress (e.g., "Win 50 games")
   * - For float-based progress, use getAchievementProgressLimitsFloat()
   * - Must be configured in Steamworks Partner site
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetAchievementProgressLimitsInt32()` - Get integer progress limits
   */
  async getAchievementProgressLimitsInt(achievementName: string): Promise<AchievementProgressLimits | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return null;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('[Steamworks] WARNING: UserStats interface not available');
      return null;
    }

    try {
      const minPtr = koffi.alloc('int32', 1);
      const maxPtr = koffi.alloc('int32', 1);
      
      const result = this.libraryLoader.SteamAPI_ISteamUserStats_GetAchievementProgressLimitsInt32(
        userStatsInterface,
        achievementName,
        minPtr,
        maxPtr
      );
      
      if (result) {
        return {
          minProgress: koffi.decode(minPtr, 'int32'),
          maxProgress: koffi.decode(maxPtr, 'int32')
        };
      }
      
      return null;
    } catch (error) {
      console.error(`[Steamworks] ERROR: Error getting achievement progress limits:`, (error as Error).message);
      return null;
    }
  }

  /**
   * Get achievement progress limits (float-based)
   * 
   * Retrieves the minimum and maximum progress values for an achievement that
   * uses floating-point progress tracking.
   * 
   * @param achievementName - The API name of the achievement
   * @returns Promise resolving to progress limits object, or null if not configured
   * 
   * @example
   * ```typescript
   * const limits = await achievementManager.getAchievementProgressLimitsFloat('ACH_TRAVEL_100KM');
   * if (limits) {
   *   console.log(`[Steamworks] Need to travel ${limits.maxProgress}km`);
   * }
   * ```
   * 
   * @remarks
   * - Returns null if achievement has no progress tracking configured
   * - Use for achievements with decimal progress (e.g., "Travel 100.5km")
   * - For integer-based progress, use getAchievementProgressLimitsInt()
   * - Must be configured in Steamworks Partner site
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetAchievementProgressLimitsFloat()` - Get float progress limits
   */
  async getAchievementProgressLimitsFloat(achievementName: string): Promise<AchievementProgressLimits | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return null;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('[Steamworks] WARNING: UserStats interface not available');
      return null;
    }

    try {
      const minPtr = koffi.alloc('float', 1);
      const maxPtr = koffi.alloc('float', 1);
      
      const result = this.libraryLoader.SteamAPI_ISteamUserStats_GetAchievementProgressLimitsFloat(
        userStatsInterface,
        achievementName,
        minPtr,
        maxPtr
      );
      
      if (result) {
        return {
          minProgress: koffi.decode(minPtr, 'float'),
          maxProgress: koffi.decode(maxPtr, 'float')
        };
      }
      
      return null;
    } catch (error) {
      console.error(`[Steamworks] ERROR: Error getting achievement progress limits:`, (error as Error).message);
      return null;
    }
  }

  /**
   * Request achievement stats for another user (friend)
   * 
   * Initiates an asynchronous request to fetch achievement data for another Steam user.
   * Must be called before getUserAchievement() can return data for that user.
   * 
   * @param steamId - The Steam ID of the user (as string, e.g., "76561197960287930")
   * @returns Promise resolving to true if request sent, false on error
   * 
   * @example
   * ```typescript
   * const friendId = '76561197960287930';
   * 
   * // Request friend's stats
   * await achievementManager.requestUserStats(friendId);
   * 
   * // Wait for callback and process
   * await new Promise(resolve => setTimeout(resolve, 2000));
   * steam.runCallbacks();
   * 
   * // Now can get friend's achievement
   * const achievement = await achievementManager.getUserAchievement(friendId, 'ACH_WIN_ONE_GAME');
   * ```
   * 
   * @remarks
   * - This is an asynchronous operation - wait for callback
   * - Friend must have played the game to have stats
   * - Wait 1-2 seconds and call runCallbacks() before querying
   * - Request times out after some period (varies)
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_RequestUserStats()` - Request user's achievement data
   */
  async requestUserStats(steamId: string): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return false;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('[Steamworks] WARNING: UserStats interface not available');
      return false;
    }

    try {
      console.log(`[Steamworks] Requesting user stats for Steam ID: ${steamId}`);
      
      const steamIdNum = BigInt(steamId);
      const callHandle = this.libraryLoader.SteamAPI_ISteamUserStats_RequestUserStats(
        userStatsInterface,
        steamIdNum
      );
      
      if (callHandle !== BigInt(0)) {
        console.log(`[Steamworks] User stats request sent (call handle: ${callHandle})`);
        return true;
      } else {
        console.error(`[Steamworks] ERROR: Failed to request user stats`);
        return false;
      }
    } catch (error) {
      console.error(`[Steamworks] ERROR: Error requesting user stats:`, (error as Error).message);
      return false;
    }
  }

  /**
   * Get achievement status for another user (friend)
   * 
   * Retrieves complete achievement data for another Steam user, including their
   * unlock status and unlock time.
   * 
   * @param steamId - The Steam ID of the user (as string)
   * @param achievementName - The API name of the achievement
   * @returns Promise resolving to user achievement data, or null if not available
   * 
   * @example
   * ```typescript
   * // First request the user's stats
   * await achievementManager.requestUserStats('76561197960287930');
   * await new Promise(resolve => setTimeout(resolve, 2000));
   * steam.runCallbacks();
   * 
   * // Now get specific achievement
   * const achievement = await achievementManager.getUserAchievement(
   *   '76561197960287930',
   *   'ACH_WIN_ONE_GAME'
   * );
   * 
   * if (achievement && achievement.unlocked) {
   *   const date = new Date(achievement.unlockTime * 1000);
   *   console.log(`[Steamworks] Friend unlocked on: ${date.toLocaleDateString()}`);
   * }
   * ```
   * 
   * @remarks
   * - Must call requestUserStats() first and wait for callback
   * - Returns null if stats not yet loaded or achievement doesn't exist
   * - Friend must have played the game
   * - Includes unlock time as Unix timestamp
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetUserAchievementAndUnlockTime()` - Get user's achievement status
   */
  async getUserAchievement(steamId: string, achievementName: string): Promise<UserAchievement | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return null;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('[Steamworks] WARNING: UserStats interface not available');
      return null;
    }

    try {
      const steamIdNum = BigInt(steamId);
      const unlockedPtr = koffi.alloc('bool', 1);
      const unlockTimePtr = koffi.alloc('uint32', 1);
      
      const result = this.libraryLoader.SteamAPI_ISteamUserStats_GetUserAchievementAndUnlockTime(
        userStatsInterface,
        steamIdNum,
        achievementName,
        unlockedPtr,
        unlockTimePtr
      );
      
      if (result) {
        // Get display info for achievement
        const displayName = this.libraryLoader.SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute(
          userStatsInterface, achievementName, 'name'
        ) || achievementName;
        
        const description = this.libraryLoader.SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute(
          userStatsInterface, achievementName, 'desc'
        ) || '';
        
        const unlocked = koffi.decode(unlockedPtr, 'bool');
        const unlockTime = unlocked ? koffi.decode(unlockTimePtr, 'uint32') : 0;
        
        return {
          steamId,
          apiName: achievementName,
          displayName,
          description,
          unlocked,
          unlockTime
        };
      }
      
      return null;
    } catch (error) {
      console.error(`[Steamworks] ERROR: Error getting user achievement:`, (error as Error).message);
      return null;
    }
  }

  /**
   * Request global achievement unlock percentages
   * 
   * Initiates an asynchronous request to fetch global achievement statistics
   * (what percentage of all players have unlocked each achievement).
   * 
   * @returns Promise resolving to true if request sent, false on error
   * 
   * @example
   * ```typescript
   * // Request global percentages
   * await achievementManager.requestGlobalAchievementPercentages();
   * 
   * // Wait for callback
   * await new Promise(resolve => setTimeout(resolve, 2000));
   * steam.runCallbacks();
   * 
   * // Now can get percentages
   * const percent = await achievementManager.getAchievementAchievedPercent('ACH_WIN_ONE_GAME');
   * console.log(`[Steamworks] ${percent}% of players have unlocked this achievement`);
   * ```
   * 
   * @remarks
   * - This is an asynchronous operation - wait for callback
   * - Required before calling getAchievementAchievedPercent()
   * - Required before calling getAllAchievementsSortedByPopularity()
   * - Wait 2-3 seconds and call runCallbacks() before querying
   * - Data is cached after first successful request
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_RequestGlobalAchievementPercentages()` - Request global percentages
   */
  async requestGlobalAchievementPercentages(): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return false;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('[Steamworks] WARNING: UserStats interface not available');
      return false;
    }

    try {
      console.log(`[Steamworks] Requesting global achievement percentages...`);
      
      const callHandle = this.libraryLoader.SteamAPI_ISteamUserStats_RequestGlobalAchievementPercentages(
        userStatsInterface
      );
      
      if (callHandle !== BigInt(0)) {
        console.log(`[Steamworks] Global achievement percentages request sent (call handle: ${callHandle})`);
        return true;
      } else {
        console.error(`[Steamworks] ERROR: Failed to request global achievement percentages`);
        return false;
      }
    } catch (error) {
      console.error(`[Steamworks] ERROR: Error requesting global achievement percentages:`, (error as Error).message);
      return false;
    }
  }

  /**
   * Get global unlock percentage for a specific achievement
   * 
   * Returns what percentage of all players have unlocked this achievement.
   * 
   * @param achievementName - The API name of the achievement
   * @returns Promise resolving to percentage (0-100), or null if not available
   * 
   * @example
   * ```typescript
   * const percent = await achievementManager.getAchievementAchievedPercent('ACH_WIN_ONE_GAME');
   * if (percent !== null) {
   *   if (percent < 10) {
   *     console.log(`[Steamworks] Rare achievement! Only ${percent.toFixed(2)}% have this`);
   *   } else {
   *     console.log(`[Steamworks] Common achievement: ${percent.toFixed(2)}% unlocked`);
   *   }
   * }
   * ```
   * 
   * @remarks
   * - Must call requestGlobalAchievementPercentages() first
   * - Returns null if global stats not yet loaded
   * - Percentage is between 0.0 and 100.0
   * - Data represents all players across all platforms
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetAchievementAchievedPercent()` - Get global unlock percentage
   */
  async getAchievementAchievedPercent(achievementName: string): Promise<number | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return null;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('[Steamworks] WARNING: UserStats interface not available');
      return null;
    }

    try {
      const percentPtr = koffi.alloc('float', 1);
      
      const result = this.libraryLoader.SteamAPI_ISteamUserStats_GetAchievementAchievedPercent(
        userStatsInterface,
        achievementName,
        percentPtr
      );
      
      if (result) {
        const percent = koffi.decode(percentPtr, 'float');
        console.log(`[Steamworks] Achievement ${achievementName} global unlock: ${percent.toFixed(2)}%`);
        return percent;
      }
      
      return null;
    } catch (error) {
      console.error(`[Steamworks] ERROR: Error getting achievement percentage:`, (error as Error).message);
      return null;
    }
  }

  /**
   * Get all achievements with their global unlock percentages
   * 
   * Combines achievement data with global statistics to show what percentage
   * of players have unlocked each achievement.
   * 
   * @returns Promise resolving to array of achievements with global stats
   * 
   * @example
   * ```typescript
   * // Request global data first
   * await achievementManager.requestGlobalAchievementPercentages();
   * await new Promise(resolve => setTimeout(resolve, 2000));
   * steam.runCallbacks();
   * 
   * // Get all achievements with percentages
   * const achievements = await achievementManager.getAllAchievementsWithGlobalStats();
   * 
   * // Find rarest achievement
   * const rarest = achievements.reduce((prev, curr) => 
   *   curr.globalUnlockPercentage < prev.globalUnlockPercentage ? curr : prev
   * );
   * console.log(`[Steamworks] Rarest: ${rarest.displayName} (${rarest.globalUnlockPercentage.toFixed(2)}%)`);
   * ```
   * 
   * @remarks
   * - Must call requestGlobalAchievementPercentages() first
   * - Iterates through all achievements to fetch percentages
   * - May return 0% for achievements where data is unavailable
   * 
   * Steamworks SDK Functions:
   * - Uses getAllAchievements() and getAchievementAchievedPercent()
   */
  async getAllAchievementsWithGlobalStats(): Promise<AchievementGlobalStats[]> {
    const achievements = await this.getAllAchievements();
    const result: AchievementGlobalStats[] = [];
    
    for (const ach of achievements) {
      const percent = await this.getAchievementAchievedPercent(ach.apiName);
      
      result.push({
        apiName: ach.apiName,
        displayName: ach.displayName,
        description: ach.description,
        unlocked: ach.unlocked,
        globalUnlockPercentage: percent ?? 0
      });
    }
    
    return result;
  }

  /**
   * Get the most achieved achievement
   * 
   * Returns the achievement with the highest global unlock percentage.
   * Provides an iterator for use with getNextMostAchievedAchievementInfo().
   * 
   * @returns Promise resolving to most achieved achievement data with iterator, or null
   * 
   * @example
   * ```typescript
   * const mostAchieved = await achievementManager.getMostAchievedAchievementInfo();
   * if (mostAchieved) {
   *   console.log(`[Steamworks] Most achieved: ${mostAchieved.apiName}`);
   *   console.log(`[Steamworks] Unlocked by: ${mostAchieved.percent.toFixed(2)}% of players`);
   *   console.log(`[Steamworks] You ${mostAchieved.unlocked ? 'have' : 'don\'t have'} it`);
   * }
   * ```
   * 
   * @remarks
   * - Must call requestGlobalAchievementPercentages() first
   * - Returns -1 iterator if no data available
   * - Use iterator with getNextMostAchievedAchievementInfo() to iterate
   * - Ordered by highest percentage first
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetMostAchievedAchievementInfo()` - Get most achieved achievement
   */
  async getMostAchievedAchievementInfo(): Promise<{ 
    apiName: string; 
    percent: number; 
    unlocked: boolean; 
    iterator: number 
  } | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return null;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('[Steamworks] WARNING: UserStats interface not available');
      return null;
    }

    try {
      const nameBuffer = Buffer.alloc(256);
      const percentPtr = koffi.alloc('float', 1);
      const unlockedPtr = koffi.alloc('bool', 1);
      
      const iterator = this.libraryLoader.SteamAPI_ISteamUserStats_GetMostAchievedAchievementInfo(
        userStatsInterface,
        nameBuffer,
        256,
        percentPtr,
        unlockedPtr
      );
      
      if (iterator !== -1) {
        const apiName = nameBuffer.toString('utf8').split('\0')[0];
        const percent = koffi.decode(percentPtr, 'float');
        const unlocked = koffi.decode(unlockedPtr, 'bool');
        
        return { apiName, percent, unlocked, iterator };
      }
      
      return null;
    } catch (error) {
      console.error(`[Steamworks] ERROR: Error getting most achieved achievement:`, (error as Error).message);
      return null;
    }
  }

  /**
   * Get the next most achieved achievement (iterate by popularity)
   * 
   * Continues iteration through achievements ordered by global unlock percentage.
   * Use the iterator from getMostAchievedAchievementInfo() or previous call.
   * 
   * @param previousIterator - Iterator from previous call
   * @returns Promise resolving to next achievement data with iterator, or null if end
   * 
   * @example
   * ```typescript
   * // Get top 5 most achieved achievements
   * const top5 = [];
   * let current = await achievementManager.getMostAchievedAchievementInfo();
   * 
   * if (current) {
   *   top5.push(current);
   *   
   *   for (let i = 0; i < 4; i++) {
   *     const next = await achievementManager.getNextMostAchievedAchievementInfo(current.iterator);
   *     if (!next) break;
   *     top5.push(next);
   *     current = next;
   *   }
   * }
   * 
   * top5.forEach((ach, i) => {
   *   console.log(`[Steamworks] ${i + 1}. ${ach.apiName}: ${ach.percent.toFixed(2)}%`);
   * });
   * ```
   * 
   * @remarks
   * - Must call requestGlobalAchievementPercentages() first
   * - Returns null when iteration is complete (iterator === -1)
   * - Achievements ordered from highest to lowest percentage
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_GetNextMostAchievedAchievementInfo()` - Get next achievement by popularity
   */
  async getNextMostAchievedAchievementInfo(previousIterator: number): Promise<{ 
    apiName: string; 
    percent: number; 
    unlocked: boolean; 
    iterator: number 
  } | null> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return null;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('[Steamworks] WARNING: UserStats interface not available');
      return null;
    }

    try {
      const nameBuffer = Buffer.alloc(256);
      const percentPtr = koffi.alloc('float', 1);
      const unlockedPtr = koffi.alloc('bool', 1);
      
      const iterator = this.libraryLoader.SteamAPI_ISteamUserStats_GetNextMostAchievedAchievementInfo(
        userStatsInterface,
        previousIterator,
        nameBuffer,
        256,
        percentPtr,
        unlockedPtr
      );
      
      if (iterator !== -1) {
        const apiName = nameBuffer.toString('utf8').split('\0')[0];
        const percent = koffi.decode(percentPtr, 'float');
        const unlocked = koffi.decode(unlockedPtr, 'bool');
        
        return { apiName, percent, unlocked, iterator };
      }
      
      return null;
    } catch (error) {
      console.error(`[Steamworks] ERROR: Error getting next most achieved achievement:`, (error as Error).message);
      return null;
    }
  }

  /**
   * Get all achievements sorted by global unlock percentage
   * 
   * Returns complete achievement list ordered from most to least achieved.
   * Includes full achievement details with global unlock percentages.
   * 
   * @returns Promise resolving to sorted array of achievements with global stats
   * 
   * @example
   * ```typescript
   * // Request global data
   * await achievementManager.requestGlobalAchievementPercentages();
   * await new Promise(resolve => setTimeout(resolve, 2000));
   * steam.runCallbacks();
   * 
   * // Get sorted achievements
   * const sorted = await achievementManager.getAllAchievementsSortedByPopularity();
   * 
   * console.log('[Steamworks] Most to Least Achieved:');
   * sorted.forEach((ach, i) => {
   *   console.log(`[Steamworks] ${i + 1}. ${ach.displayName}: ${ach.globalUnlockPercentage.toFixed(2)}%`);
   * });
   * 
   * // Find rarest achievements
   * const rare = sorted.filter(a => a.globalUnlockPercentage < 5);
   * console.log(`[Steamworks] ${rare.length} rare achievements (< 5% unlock rate)`);
   * ```
   * 
   * @remarks
   * - Must call requestGlobalAchievementPercentages() first
   * - Returns empty array if no global data available
   * - Sorted from highest to lowest percentage
   * - Includes display names and descriptions
   * 
   * Steamworks SDK Functions:
   * - Uses getMostAchievedAchievementInfo() and getNextMostAchievedAchievementInfo()
   * - `SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute()` - Get display attributes
   */
  async getAllAchievementsSortedByPopularity(): Promise<AchievementGlobalStats[]> {
    const results: AchievementGlobalStats[] = [];
    
    // Get first achievement
    const first = await this.getMostAchievedAchievementInfo();
    if (!first) {
      console.warn('[Steamworks] WARNING: No global achievement data available. Call requestGlobalAchievementPercentages() first.');
      return results;
    }
    
    // Get display info
    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (userStatsInterface) {
      const displayName = this.libraryLoader.SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute(
        userStatsInterface, first.apiName, 'name'
      ) || first.apiName;
      
      const description = this.libraryLoader.SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute(
        userStatsInterface, first.apiName, 'desc'
      ) || '';
      
      results.push({
        apiName: first.apiName,
        displayName,
        description,
        unlocked: first.unlocked,
        globalUnlockPercentage: first.percent
      });
    }
    
    // Iterate through remaining achievements
    let iterator = first.iterator;
    while (iterator !== -1) {
      const next = await this.getNextMostAchievedAchievementInfo(iterator);
      if (!next) break;
      
      if (userStatsInterface) {
        const displayName = this.libraryLoader.SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute(
          userStatsInterface, next.apiName, 'name'
        ) || next.apiName;
        
        const description = this.libraryLoader.SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute(
          userStatsInterface, next.apiName, 'desc'
        ) || '';
        
        results.push({
          apiName: next.apiName,
          displayName,
          description,
          unlocked: next.unlocked,
          globalUnlockPercentage: next.percent
        });
      }
      
      iterator = next.iterator;
    }
    
    return results;
  }

  /**
   * Reset all user stats and optionally achievements
   * 
   * Permanently clears all statistics and optionally all achievements for the current user.
   * Changes are immediately stored to Steam servers.
   * 
   * @param includeAchievements - If true, also clears all achievements (default: false)
   * @returns Promise resolving to true if successful, false otherwise
   * 
   * @example
   * ```typescript
   * // Reset only stats, keep achievements
   * await achievementManager.resetAllStats(false);
   * 
   * // Reset everything including achievements
   * await achievementManager.resetAllStats(true);
   * ```
   * 
   * @warning
   * **THIS PERMANENTLY DELETES USER DATA!**
   * - All stats are set to 0
   * - If includeAchievements=true, all achievements are locked
   * - Changes are immediately synced to Steam servers
   * - Cannot be undone
   * - Only use for testing/debugging
   * 
   * @remarks
   * - Use with extreme caution - this affects user's permanent record
   * - Recommended only for development/testing accounts
   * - Does not affect other users or global statistics
   * - Changes visible immediately in Steam overlay
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUserStats_ResetAllStats()` - Reset all stats and optionally achievements
   * - `SteamAPI_ISteamUserStats_StoreStats()` - Store reset to Steam servers
   * - `SteamAPI_RunCallbacks()` - Process the reset operation
   */
  async resetAllStats(includeAchievements: boolean = false): Promise<boolean> {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return false;
    }

    const userStatsInterface = this.apiCore.getUserStatsInterface();
    if (!userStatsInterface) {
      console.warn('[Steamworks] WARNING: UserStats interface not available');
      return false;
    }

    try {
      console.log(`[Steamworks] Resetting all stats (achievements: ${includeAchievements ? 'YES' : 'NO'})`);
      console.warn('[Steamworks] WARNING: This will reset ALL user statistics!');
      
      const result = this.libraryLoader.SteamAPI_ISteamUserStats_ResetAllStats(
        userStatsInterface,
        includeAchievements
      );
      
      if (result) {
        // Store the reset
        const storeResult = this.libraryLoader.SteamAPI_ISteamUserStats_StoreStats(userStatsInterface);
        
        if (storeResult) {
          this.apiCore.runCallbacks();
          console.log(`[Steamworks] All stats reset successfully`);
          return true;
        } else {
          console.error(`[Steamworks] ERROR: Failed to store stats after reset`);
          return false;
        }
      } else {
        console.error(`[Steamworks] ERROR: Failed to reset stats`);
        return false;
      }
    } catch (error) {
      console.error(`[Steamworks] ERROR: Error resetting stats:`, (error as Error).message);
      return false;
    }
  }

  /**
   * Get all achievements with their icon handles
   * 
   * Returns complete achievement list with icon handles that can be used
   * to retrieve actual icon image data via ISteamUtils::GetImageRGBA().
   * 
   * @returns Promise resolving to array of achievements with icon handles
   * 
   * @example
   * ```typescript
   * const achievements = await achievementManager.getAllAchievementsWithIcons();
   * 
   * achievements.forEach(ach => {
   *   console.log(`[Steamworks] ${ach.displayName}:`);
   *   console.log(`[Steamworks]   Status: ${ach.unlocked ? 'Unlocked' : 'Locked'}`);
   *   console.log(`[Steamworks]   Icon Handle: ${ach.iconHandle}`);
   *   
   *   if (ach.iconHandle > 0) {
   *     // Use ISteamUtils::GetImageRGBA() to get actual image
   *     // const imageData = steamUtils.getImageRGBA(ach.iconHandle);
   *   }
   * });
   * ```
   * 
   * @remarks
   * - Icon handle of 0 means no icon or still loading
   * - Icon handles are valid until Steam API shutdown
   * - Use ISteamUtils interface to convert handles to image data
   * - May trigger icon fetching if not yet cached
   * 
   * Steamworks SDK Functions:
   * - Uses getAllAchievements() and getAchievementIcon()
   * - `SteamAPI_ISteamUserStats_GetAchievementIcon()` - Get icon handle for each achievement
   */
  async getAllAchievementsWithIcons(): Promise<AchievementWithIcon[]> {
    const achievements = await this.getAllAchievements();
    const result: AchievementWithIcon[] = [];
    
    for (const ach of achievements) {
      const iconHandle = await this.getAchievementIcon(ach.apiName);
      
      result.push({
        ...ach,
        iconHandle
      });
    }
    
    return result;
  }
}
