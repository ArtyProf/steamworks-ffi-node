import * as koffi from 'koffi';
import { SteamAchievement } from '../types';
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
}
