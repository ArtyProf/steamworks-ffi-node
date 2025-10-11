import { 
  SteamAchievement, 
  SteamInitOptions, 
  SteamStatus,
  AchievementProgressLimits,
  UserAchievement,
  AchievementGlobalStats,
  AchievementWithIcon,
  SteamStat,
  GlobalStat,
  GlobalStatHistory,
  UserStat,
  LeaderboardSortMethod,
  LeaderboardDisplayType,
  LeaderboardDataRequest,
  LeaderboardEntry,
  LeaderboardInfo,
  LeaderboardScoreUploadResult
} from './types';
import { SteamLibraryLoader } from './internal/SteamLibraryLoader';
import { SteamAPICore } from './internal/SteamAPICore';
import { SteamAchievementManager } from './internal/SteamAchievementManager';
import { SteamStatsManager } from './internal/SteamStatsManager';
import { SteamLeaderboardManager } from './internal/SteamLeaderboardManager';

/**
 * Real Steamworks SDK implementation using Koffi FFI
 * This connects directly to the actual Steam client and Steamworks SDK
 * 
 * Uses composition pattern with specialized modules:
 * - SteamLibraryLoader: Handles FFI library loading and function binding
 * - SteamAPICore: Manages Steam API lifecycle (init, shutdown, callbacks)
 * - SteamAchievementManager: Handles all achievement operations
 * - SteamStatsManager: Handles all stats operations
 * - SteamLeaderboardManager: Handles all leaderboard operations
 */
class SteamworksSDK {
  private static instance: SteamworksSDK;
  
  // Composed modules
  private libraryLoader: SteamLibraryLoader;
  private apiCore: SteamAPICore;
  private achievementManager: SteamAchievementManager;
  private statsManager: SteamStatsManager;
  private leaderboardManager: SteamLeaderboardManager;

  private constructor() {
    // Initialize composed modules
    this.libraryLoader = new SteamLibraryLoader();
    this.apiCore = new SteamAPICore(this.libraryLoader);
    this.achievementManager = new SteamAchievementManager(this.libraryLoader, this.apiCore);
    this.statsManager = new SteamStatsManager(this.libraryLoader, this.apiCore);
    this.leaderboardManager = new SteamLeaderboardManager(this.libraryLoader, this.apiCore);
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
  async getStatInt(statName: string): Promise<SteamStat | null> {
    return this.statsManager.getStatInt(statName);
  }

  /**
   * Get a float stat value
   */
  async getStatFloat(statName: string): Promise<SteamStat | null> {
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
  async getUserStatInt(steamId: string | bigint, statName: string): Promise<UserStat | null> {
    return this.statsManager.getUserStatInt(steamId, statName);
  }

  /**
   * Get a float stat value for another user (friend)
   * Must call requestUserStatsForStats() first and wait for callback
   */
  async getUserStatFloat(steamId: string | bigint, statName: string): Promise<UserStat | null> {
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
  async getGlobalStatInt(statName: string): Promise<GlobalStat | null> {
    return this.statsManager.getGlobalStatInt(statName);
  }

  /**
   * Get a global stat value (double)
   * Must call requestGlobalStats() first and wait for callback
   */
  async getGlobalStatDouble(statName: string): Promise<GlobalStat | null> {
    return this.statsManager.getGlobalStatDouble(statName);
  }

  /**
   * Get global stat history (int64)
   * Returns daily values for the stat, with [0] being today, [1] yesterday, etc.
   * @param days - Number of days of history to retrieve (max 60)
   */
  async getGlobalStatHistoryInt(statName: string, days: number = 7): Promise<GlobalStatHistory | null> {
    return this.statsManager.getGlobalStatHistoryInt(statName, days);
  }

  /**
   * Get global stat history (double)
   * Returns daily values for the stat, with [0] being today, [1] yesterday, etc.
   * @param days - Number of days of history to retrieve (max 60)
   */
  async getGlobalStatHistoryDouble(statName: string, days: number = 7): Promise<GlobalStatHistory | null> {
    return this.statsManager.getGlobalStatHistoryDouble(statName, days);
  }

  // ========================================
  // LEADERBOARDS API
  // ========================================

  /**
   * Find or create a leaderboard with specified sort and display settings
   * 
   * If the leaderboard doesn't exist, it will be created with the specified settings.
   * If it exists, returns the info for the existing leaderboard.
   * 
   * @param leaderboardName - Unique name for the leaderboard (set in Steamworks dashboard)
   * @param sortMethod - How to sort scores (Ascending/Descending)
   * @param displayType - How to display scores (Numeric/TimeSeconds/TimeMilliseconds)
   * @returns Promise resolving to leaderboard info object, or null on failure
   * 
   * @example
   * ```typescript
   * const leaderboard = await steam.findOrCreateLeaderboard(
   *   'HighScores',
   *   LeaderboardSortMethod.Descending,
   *   LeaderboardDisplayType.Numeric
   * );
   * if (leaderboard) {
   *   console.log(`Leaderboard handle: ${leaderboard.handle}`);
   * }
   * ```
   */
  async findOrCreateLeaderboard(
    leaderboardName: string,
    sortMethod: LeaderboardSortMethod,
    displayType: LeaderboardDisplayType
  ): Promise<LeaderboardInfo | null> {
    return this.leaderboardManager.findOrCreateLeaderboard(leaderboardName, sortMethod, displayType);
  }

  /**
   * Find an existing leaderboard (does not create if missing)
   * 
   * @param leaderboardName - Unique name for the leaderboard
   * @returns Promise resolving to leaderboard info object, or null if not found
   * 
   * @example
   * ```typescript
   * const leaderboard = await steam.findLeaderboard('HighScores');
   * if (!leaderboard) {
   *   console.log('Leaderboard not found');
   * }
   * ```
   */
  async findLeaderboard(leaderboardName: string): Promise<LeaderboardInfo | null> {
    return this.leaderboardManager.findLeaderboard(leaderboardName);
  }

  /**
   * Get leaderboard metadata (name, entry count, sort method, display type)
   * 
   * @param leaderboardHandle - Handle to the leaderboard
   * @returns Leaderboard info object, or null on failure
   * 
   * @example
   * ```typescript
   * const handle = await steam.findLeaderboard('HighScores');
   * const info = await steam.getLeaderboardInfo(handle);
   * console.log(`${info.name}: ${info.entryCount} entries`);
   * ```
   */
  async getLeaderboardInfo(leaderboardHandle: bigint): Promise<LeaderboardInfo | null> {
    return this.leaderboardManager.getLeaderboardInfo(leaderboardHandle);
  }

  /**
   * Upload a score to a leaderboard
   * 
   * @param leaderboardHandle - Handle to the leaderboard
   * @param score - The score value to upload
   * @param uploadMethod - KeepBest (only updates if better) or ForceUpdate (always update)
   * @param scoreDetails - Optional array of up to 64 int32 values for additional data
   * @returns Promise resolving to upload result object, or null on failure
   * 
   * @example
   * ```typescript
   * // Simple score upload
   * const result = await steam.uploadLeaderboardScore(
   *   leaderboard.handle,
   *   1000,
   *   LeaderboardUploadScoreMethod.KeepBest
   * );
   * 
   * // With details (e.g., time, deaths, collectibles)
   * const result = await steam.uploadLeaderboardScore(
   *   leaderboard.handle,
   *   1000,
   *   LeaderboardUploadScoreMethod.KeepBest,
   *   [120, 5, 15] // time in seconds, deaths, collectibles
   * );
   * 
   * if (result?.scoreChanged) {
   *   console.log(`New rank: ${result.globalRankNew}`);
   * }
   * ```
   */
  async uploadLeaderboardScore(
    leaderboardHandle: bigint,
    score: number,
    uploadMethod: number,
    scoreDetails?: number[]
  ): Promise<LeaderboardScoreUploadResult | null> {
    return this.leaderboardManager.uploadScore(leaderboardHandle, score, uploadMethod, scoreDetails);
  }

  /**
   * Download leaderboard entries
   * 
   * @param leaderboardHandle - Handle to the leaderboard
   * @param dataRequest - Type of data to download (Global/AroundUser/Friends)
   * @param rangeStart - Starting index (for Global) or offset from user (for AroundUser)
   * @param rangeEnd - Ending index (for Global) or offset from user (for AroundUser)
   * @returns Promise resolving to array of leaderboard entries
   * 
   * @example
   * ```typescript
   * // Get top 10 global scores
   * const top10 = await steam.downloadLeaderboardEntries(
   *   leaderboard,
   *   LeaderboardDataRequest.Global,
   *   0,
   *   9
   * );
   * 
   * // Get 5 above and 5 below current user
   * const aroundUser = await steam.downloadLeaderboardEntries(
   *   leaderboard,
   *   LeaderboardDataRequest.GlobalAroundUser,
   *   -5,
   *   5
   * );
   * 
   * // Get all friends' scores
   * const friends = await steam.downloadLeaderboardEntries(
   *   leaderboard,
   *   LeaderboardDataRequest.Friends,
   *   0,
   *   0
   * );
   * ```
   */
  async downloadLeaderboardEntries(
    leaderboardHandle: bigint,
    dataRequest: LeaderboardDataRequest,
    rangeStart: number,
    rangeEnd: number
  ): Promise<LeaderboardEntry[]> {
    return this.leaderboardManager.downloadLeaderboardEntries(
      leaderboardHandle,
      dataRequest,
      rangeStart,
      rangeEnd
    );
  }

  /**
   * Download leaderboard entries for specific Steam users
   * 
   * @param leaderboardHandle - Handle to the leaderboard
   * @param steamIds - Array of Steam ID strings (max 100)
   * @returns Promise resolving to array of leaderboard entries
   * 
   * @example
   * ```typescript
   * const entries = await steam.downloadLeaderboardEntriesForUsers(
   *   leaderboard.handle,
   *   ['76561198000000000', '76561198000000001']
   * );
   * ```
   */
  async downloadLeaderboardEntriesForUsers(
    leaderboardHandle: bigint,
    steamIds: string[]
  ): Promise<LeaderboardEntry[]> {
    return this.leaderboardManager.downloadLeaderboardEntriesForUsers(leaderboardHandle, steamIds);
  }

  /**
   * Attach user-generated content to a leaderboard entry
   * 
   * Associates a piece of UGC (like a replay file, screenshot, or level)
   * with the current user's leaderboard entry.
   * 
   * @param leaderboardHandle - Handle to the leaderboard
   * @param ugcHandle - Handle to the shared UGC content (from ISteamRemoteStorage::FileShare())
   * @returns Promise resolving to true if successful
   * 
   * @example
   * ```typescript
   * // First share a file to get UGC handle
   * // const ugcHandle = await steamRemoteStorage.fileShare('replay.dat');
   * 
   * const ugcHandle = BigInt('123456789');
   * await steam.attachLeaderboardUGC(leaderboard, ugcHandle);
   * ```
   */
  async attachLeaderboardUGC(
    leaderboardHandle: bigint,
    ugcHandle: bigint
  ): Promise<boolean> {
    return this.leaderboardManager.attachLeaderboardUGC(leaderboardHandle, ugcHandle);
  }
}

export default SteamworksSDK;