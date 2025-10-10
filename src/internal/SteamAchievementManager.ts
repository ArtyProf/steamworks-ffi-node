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
 * Manages all Steam achievement operations
 */
export class SteamAchievementManager {
  private libraryLoader: SteamLibraryLoader;
  private apiCore: SteamAPICore;

  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
  }

  /**
   * Get all achievements from Steam
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
          console.warn(`Failed to get achievement ${i}:`, (error as Error).message);
        }
      }

      return achievements;

    } catch (error) {
      console.error('[Steamworks] ERROR: Failed to get achievements:', (error as Error).message);
      return [];
    }
  }

  /**
   * Unlock achievement in Steam
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
   * Clear achievement in Steam (for testing)
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
   * Check if achievement is unlocked
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
   * Get achievement by API name
   */
  async getAchievementByName(achievementName: string): Promise<SteamAchievement | null> {
    const achievements = await this.getAllAchievements();
    return achievements.find(a => a.apiName === achievementName) || null;
  }

  /**
   * Get total number of achievements
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
   * Get number of unlocked achievements
   */
  async getUnlockedAchievementCount(): Promise<number> {
    const achievements = await this.getAllAchievements();
    return achievements.filter(a => a.unlocked).length;
  }

  /**
   * Get achievement icon handle
   * Returns icon handle for use with ISteamUtils::GetImageRGBA()
   * Returns 0 if no icon set or still loading
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
   * Indicate achievement progress to user
   * Shows a progress notification in Steam overlay
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
   * Get achievement progress limits (for integer-based progress)
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
   * Get achievement progress limits (for float-based progress)
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
   * Request stats for another user (friend)
   * This is async - you need to wait for the callback before calling getUserAchievement
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
   * Must call requestUserStats() first and wait for callback
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
   * Request global achievement percentages
   * This is async - wait for callback before calling getAchievementAchievedPercent
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
   * Get percentage of users who unlocked a specific achievement
   * Must call requestGlobalAchievementPercentages() first
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
   * Get all achievements with global unlock percentages
   * Must call requestGlobalAchievementPercentages() first and wait for callback
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
   * Get most achieved achievement info
   * Returns iterator for use with getNextMostAchievedAchievementInfo
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
   * Get next most achieved achievement info (iterate by popularity)
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
   * Get all achievements sorted by global unlock percentage (most achieved first)
   * Must call requestGlobalAchievementPercentages() first
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
   * Reset all stats and optionally achievements
   * WARNING: This clears ALL user stats and achievements!
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
   * Get all achievements with icon handles
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
