import { 
  SteamAchievement, 
  SteamInitOptions, 
  SteamStatus,
  AchievementProgressLimits,
  UserAchievement,
  AchievementGlobalStats,
  AchievementWithIcon
} from './types';
import { SteamLibraryLoader } from './internal/SteamLibraryLoader';
import { SteamAPICore } from './internal/SteamAPICore';
import { SteamAchievementManager } from './internal/SteamAchievementManager';
import { SteamStatsManager } from './internal/SteamStatsManager';

/**
 * Real Steamworks SDK implementation using Koffi FFI
 * This connects directly to the actual Steam client and Steamworks SDK
 * 
 * Uses composition pattern with specialized modules:
 * - SteamLibraryLoader: Handles FFI library loading and function binding
 * - SteamAPICore: Manages Steam API lifecycle (init, shutdown, callbacks)
 * - SteamAchievementManager: Handles all achievement operations
 * - SteamStatsManager: Handles all stats operations
 */
class SteamworksSDK {
  private static instance: SteamworksSDK;
  
  // Composed modules
  private libraryLoader: SteamLibraryLoader;
  private apiCore: SteamAPICore;
  private achievementManager: SteamAchievementManager;
  private statsManager: SteamStatsManager;

  private constructor() {
    // Initialize composed modules
    this.libraryLoader = new SteamLibraryLoader();
    this.apiCore = new SteamAPICore(this.libraryLoader);
    this.achievementManager = new SteamAchievementManager(this.libraryLoader, this.apiCore);
    this.statsManager = new SteamStatsManager(this.libraryLoader, this.apiCore);
  }

  static getInstance(): SteamworksSDK {
    if (!SteamworksSDK.instance) {
      SteamworksSDK.instance = new SteamworksSDK();
    }
    return SteamworksSDK.instance;
  }

  /**
   * Initialize Steam API with real Steamworks SDK
   */
  init(options: SteamInitOptions): boolean {
    return this.apiCore.init(options);
  }

  /**
   * Shutdown Steam API
   */
  shutdown(): void {
    this.apiCore.shutdown();
  }

  /**
   * Get current Steam status
   */
  getStatus(): SteamStatus {
    return this.apiCore.getStatus();
  }

  /**
   * Get all achievements from Steam
   */
  async getAllAchievements(): Promise<SteamAchievement[]> {
    return this.achievementManager.getAllAchievements();
  }

  /**
   * Unlock achievement in Steam
   */
  async unlockAchievement(achievementName: string): Promise<boolean> {
    return this.achievementManager.unlockAchievement(achievementName);
  }

  /**
   * Clear achievement in Steam (for testing)
   */
  async clearAchievement(achievementName: string): Promise<boolean> {
    return this.achievementManager.clearAchievement(achievementName);
  }

  /**
   * Check if achievement is unlocked
   */
  async isAchievementUnlocked(achievementName: string): Promise<boolean> {
    return this.achievementManager.isAchievementUnlocked(achievementName);
  }

  /**
   * Get achievement by API name
   */
  async getAchievementByName(achievementName: string): Promise<SteamAchievement | null> {
    return this.achievementManager.getAchievementByName(achievementName);
  }

  /**
   * Get total number of achievements
   */
  async getTotalAchievementCount(): Promise<number> {
    return this.achievementManager.getTotalAchievementCount();
  }

  /**
   * Get number of unlocked achievements
   */
  async getUnlockedAchievementCount(): Promise<number> {
    return this.achievementManager.getUnlockedAchievementCount();
  }

  /**
   * Run Steam callbacks to process pending events
   */
  runCallbacks(): void {
    this.apiCore.runCallbacks();
  }

  /**
   * Check if Steam client is running
   */
  isSteamRunning(): boolean {
    return this.apiCore.isSteamRunning();
  }

  // ===== VISUAL & UI FEATURES =====

  /**
   * Get achievement icon handle for use with ISteamUtils::GetImageRGBA()
   */
  async getAchievementIcon(achievementName: string): Promise<number> {
    return this.achievementManager.getAchievementIcon(achievementName);
  }

  /**
   * Show achievement progress notification in Steam overlay
   */
  async indicateAchievementProgress(
    achievementName: string,
    currentProgress: number,
    maxProgress: number
  ): Promise<boolean> {
    return this.achievementManager.indicateAchievementProgress(achievementName, currentProgress, maxProgress);
  }

  /**
   * Get all achievements with icon handles
   */
  async getAllAchievementsWithIcons(): Promise<AchievementWithIcon[]> {
    return this.achievementManager.getAllAchievementsWithIcons();
  }

  // ===== PROGRESS TRACKING =====

  /**
   * Get achievement progress limits (integer-based)
   */
  async getAchievementProgressLimitsInt(achievementName: string): Promise<AchievementProgressLimits | null> {
    return this.achievementManager.getAchievementProgressLimitsInt(achievementName);
  }

  /**
   * Get achievement progress limits (float-based)
   */
  async getAchievementProgressLimitsFloat(achievementName: string): Promise<AchievementProgressLimits | null> {
    return this.achievementManager.getAchievementProgressLimitsFloat(achievementName);
  }

  // ===== FRIEND/USER ACHIEVEMENTS =====

  /**
   * Request achievement stats for another user (friend)
   * This is async - wait for callback before calling getUserAchievement()
   */
  async requestUserStats(steamId: string): Promise<boolean> {
    return this.achievementManager.requestUserStats(steamId);
  }

  /**
   * Get achievement status for another user (friend)
   * Must call requestUserStats() first and wait for callback
   */
  async getUserAchievement(steamId: string, achievementName: string): Promise<UserAchievement | null> {
    return this.achievementManager.getUserAchievement(steamId, achievementName);
  }

  // ===== GLOBAL STATISTICS =====

  /**
   * Request global achievement percentages from Steam
   * This is async - wait for callback before calling other global stats methods
   */
  async requestGlobalAchievementPercentages(): Promise<boolean> {
    return this.achievementManager.requestGlobalAchievementPercentages();
  }

  /**
   * Get percentage of users who unlocked a specific achievement
   * Must call requestGlobalAchievementPercentages() first
   */
  async getAchievementAchievedPercent(achievementName: string): Promise<number | null> {
    return this.achievementManager.getAchievementAchievedPercent(achievementName);
  }

  /**
   * Get all achievements with global unlock percentages
   * Must call requestGlobalAchievementPercentages() first
   */
  async getAllAchievementsWithGlobalStats(): Promise<AchievementGlobalStats[]> {
    return this.achievementManager.getAllAchievementsWithGlobalStats();
  }

  /**
   * Get most achieved achievement
   */
  async getMostAchievedAchievementInfo(): Promise<{ 
    apiName: string; 
    percent: number; 
    unlocked: boolean; 
    iterator: number 
  } | null> {
    return this.achievementManager.getMostAchievedAchievementInfo();
  }

  /**
   * Get next most achieved achievement (iterate by popularity)
   */
  async getNextMostAchievedAchievementInfo(previousIterator: number): Promise<{ 
    apiName: string; 
    percent: number; 
    unlocked: boolean; 
    iterator: number 
  } | null> {
    return this.achievementManager.getNextMostAchievedAchievementInfo(previousIterator);
  }

  /**
   * Get all achievements sorted by global popularity (most achieved first)
   * Must call requestGlobalAchievementPercentages() first
   */
  async getAllAchievementsSortedByPopularity(): Promise<AchievementGlobalStats[]> {
    return this.achievementManager.getAllAchievementsSortedByPopularity();
  }

  // ===== TESTING & DEVELOPMENT =====

  /**
   * Reset all stats and optionally achievements
   * WARNING: This clears ALL user stats and achievements!
   */
  async resetAllStats(includeAchievements: boolean = false): Promise<boolean> {
    return this.achievementManager.resetAllStats(includeAchievements);
  }

  // ========================================
  // STATS API
  // ========================================

  // ===== USER STATS (GET/SET) =====

  /**
   * Get an integer stat value
   */
  async getStatInt(statName: string): Promise<number | null> {
    return this.statsManager.getStatInt(statName);
  }

  /**
   * Get a float stat value
   */
  async getStatFloat(statName: string): Promise<number | null> {
    return this.statsManager.getStatFloat(statName);
  }

  /**
   * Set an integer stat value
   */
  async setStatInt(statName: string, value: number): Promise<boolean> {
    return this.statsManager.setStatInt(statName, value);
  }

  /**
   * Set a float stat value
   */
  async setStatFloat(statName: string, value: number): Promise<boolean> {
    return this.statsManager.setStatFloat(statName, value);
  }

  /**
   * Update an average rate stat (e.g., kills per hour, average speed)
   */
  async updateAvgRateStat(statName: string, countThisSession: number, sessionLength: number): Promise<boolean> {
    return this.statsManager.updateAvgRateStat(statName, countThisSession, sessionLength);
  }

  // ===== FRIEND/USER STATS =====

  /**
   * Request stats for another user (friend)
   * Must be called before getting user stats
   */
  async requestUserStatsForStats(steamId: string | bigint): Promise<boolean> {
    return this.statsManager.requestUserStats(steamId);
  }

  /**
   * Get an integer stat value for another user (friend)
   * Must call requestUserStatsForStats() first and wait for callback
   */
  async getUserStatInt(steamId: string | bigint, statName: string): Promise<number | null> {
    return this.statsManager.getUserStatInt(steamId, statName);
  }

  /**
   * Get a float stat value for another user (friend)
   * Must call requestUserStatsForStats() first and wait for callback
   */
  async getUserStatFloat(steamId: string | bigint, statName: string): Promise<number | null> {
    return this.statsManager.getUserStatFloat(steamId, statName);
  }

  // ===== GLOBAL STATS =====

  /**
   * Request global stats data from Steam
   * Must be called before getting global stats
   * @param historyDays - Number of days of history to retrieve (0-60)
   */
  async requestGlobalStats(historyDays: number = 0): Promise<boolean> {
    return this.statsManager.requestGlobalStats(historyDays);
  }

  /**
   * Get a global stat value (int64)
   * Must call requestGlobalStats() first and wait for callback
   */
  async getGlobalStatInt(statName: string): Promise<bigint | null> {
    return this.statsManager.getGlobalStatInt(statName);
  }

  /**
   * Get a global stat value (double)
   * Must call requestGlobalStats() first and wait for callback
   */
  async getGlobalStatDouble(statName: string): Promise<number | null> {
    return this.statsManager.getGlobalStatDouble(statName);
  }

  /**
   * Get global stat history (int64)
   * Returns daily values for the stat, with [0] being today, [1] yesterday, etc.
   * @param days - Number of days of history to retrieve (max 60)
   */
  async getGlobalStatHistoryInt(statName: string, days: number = 7): Promise<bigint[] | null> {
    return this.statsManager.getGlobalStatHistoryInt(statName, days);
  }

  /**
   * Get global stat history (double)
   * Returns daily values for the stat, with [0] being today, [1] yesterday, etc.
   * @param days - Number of days of history to retrieve (max 60)
   */
  async getGlobalStatHistoryDouble(statName: string, days: number = 7): Promise<number[] | null> {
    return this.statsManager.getGlobalStatHistoryDouble(statName, days);
  }
}

export default SteamworksSDK;