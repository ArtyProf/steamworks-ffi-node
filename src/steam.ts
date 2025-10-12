import { 
  SteamInitOptions, 
  SteamStatus
} from './types';
import { SteamLibraryLoader } from './internal/SteamLibraryLoader';
import { SteamAPICore } from './internal/SteamAPICore';
import { SteamAchievementManager } from './internal/SteamAchievementManager';
import { SteamStatsManager } from './internal/SteamStatsManager';
import { SteamLeaderboardManager } from './internal/SteamLeaderboardManager';
import { SteamFriendsManager } from './internal/SteamFriendsManager';

/**
 * Real Steamworks SDK implementation using Koffi FFI
 * This connects directly to the actual Steam client and Steamworks SDK
 * 
 * Uses composition pattern with specialized managers:
 * - achievements: SteamAchievementManager - All achievement operations
 * - stats: SteamStatsManager - All stats operations
 * - leaderboards: SteamLeaderboardManager - All leaderboard operations
 * 
 * @example
 * ```typescript
 * const steam = Steam.getInstance();
 * steam.init({ appId: 480 });
 * 
 * // Use managers directly
 * await steam.achievements.unlockAchievement('ACH_WIN_ONE_GAME');
 * await steam.stats.setStatInt('NumGames', 1);
 * await steam.leaderboards.uploadScore(handle, 1000, KeepBest);
 * ```
 */
class SteamworksSDK {
  private static instance: SteamworksSDK;
  
  // Internal modules
  private libraryLoader: SteamLibraryLoader;
  private apiCore: SteamAPICore;
  
  /**
   * Achievement Manager - Handle all Steam achievement operations
   * 
   * Provides comprehensive achievement functionality including:
   * - Unlock/clear achievements
   * - Query achievement status and metadata
   * - Display progress notifications
   * - Retrieve global unlock percentages
   * - Get friend/user achievement data
   * - Achievement icons and visual elements
   * 
   * @example
   * ```typescript
   * // Basic operations
   * await steam.achievements.unlockAchievement('ACH_WIN_ONE_GAME');
   * const achievements = await steam.achievements.getAllAchievements();
   * const unlocked = await steam.achievements.isAchievementUnlocked('ACH_1');
   * 
   * // Progress tracking
   * await steam.achievements.indicateAchievementProgress('ACH_COLLECTOR', 50, 100);
   * 
   * // Global statistics
   * await steam.achievements.requestGlobalAchievementPercentages();
   * const percent = await steam.achievements.getAchievementAchievedPercent('ACH_1');
   * ```
   * 
   * @see {@link SteamAchievementManager} for complete API documentation
   */
  public readonly achievements: SteamAchievementManager;
  
  /**
   * Stats Manager - Handle all Steam stats operations
   * 
   * Provides comprehensive stats functionality including:
   * - Get/set user stats (int and float)
   * - Update average rate stats
   * - Query global stats and history
   * - Retrieve friend/user stats
   * - Track player progress and metrics
   * 
   * @example
   * ```typescript
   * // User stats
   * await steam.stats.setStatInt('NumGames', 10);
   * await steam.stats.setStatFloat('Accuracy', 0.95);
   * const stat = await steam.stats.getStatInt('NumGames');
   * 
   * // Average rate stats
   * await steam.stats.updateAvgRateStat('KillsPerHour', sessionKills, sessionTime);
   * 
   * // Global stats
   * await steam.stats.requestGlobalStats(7); // 7 days of history
   * const globalStat = await steam.stats.getGlobalStatInt('TotalPlayers');
   * ```
   * 
   * @see {@link SteamStatsManager} for complete API documentation
   */
  public readonly stats: SteamStatsManager;
  
  /**
   * Leaderboards Manager - Handle all Steam leaderboard operations
   * 
   * Provides comprehensive leaderboard functionality including:
   * - Find/create leaderboards
   * - Upload scores with optional details
   * - Download entries (global, friends, around user)
   * - Attach UGC to leaderboard entries
   * - Query leaderboard metadata
   * 
   * @example
   * ```typescript
   * // Find or create leaderboard
   * const lb = await steam.leaderboards.findOrCreateLeaderboard(
   *   'HighScores',
   *   LeaderboardSortMethod.Descending,
   *   LeaderboardDisplayType.Numeric
   * );
   * 
   * // Upload score with details
   * const result = await steam.leaderboards.uploadScore(
   *   lb.handle,
   *   1000,
   *   LeaderboardUploadScoreMethod.KeepBest,
   *   [120, 5, 15] // time, deaths, collectibles
   * );
   * 
   * // Download top 10 scores
   * const entries = await steam.leaderboards.downloadLeaderboardEntries(
   *   lb.handle,
   *   LeaderboardDataRequest.Global,
   *   1,
   *   10
   * );
   * ```
   * 
   * @see {@link SteamLeaderboardManager} for complete API documentation
   */
  public readonly leaderboards: SteamLeaderboardManager;

  /**
   * Friends Manager - Handle all Steam friends and social operations
   * 
   * Provides Phase 1 friends functionality including:
   * - Get current user info (name, status)
   * - Query friends list and details
   * - Check friend online status
   * - Get friend relationship status
   * - Check what games friends are playing
   * - Get Steam levels
   * 
   * @example
   * ```typescript
   * // Current user info
   * const myName = steam.friends.getPersonaName();
   * const myStatus = steam.friends.getPersonaState();
   * 
   * // Friends list
   * const friendCount = steam.friends.getFriendCount();
   * const friends = steam.friends.getAllFriends();
   * 
   * // Friend details
   * friends.forEach(friend => {
   *   console.log(`${friend.personaName} is ${friend.personaState}`);
   *   const gameInfo = steam.friends.getFriendGamePlayed(friend.steamId);
   *   if (gameInfo) {
   *     console.log(`Playing game: ${gameInfo.gameId}`);
   *   }
   * });
   * ```
   * 
   * @see {@link SteamFriendsManager} for complete API documentation
   */
  public readonly friends!: SteamFriendsManager;

  private constructor() {
    // Initialize internal modules
    this.libraryLoader = new SteamLibraryLoader();
    this.apiCore = new SteamAPICore(this.libraryLoader);
    
    // Initialize public managers
    this.achievements = new SteamAchievementManager(this.libraryLoader, this.apiCore);
    this.stats = new SteamStatsManager(this.libraryLoader, this.apiCore);
    this.leaderboards = new SteamLeaderboardManager(this.libraryLoader, this.apiCore);
    this.friends = new SteamFriendsManager(this.libraryLoader, this.apiCore);
  }

  static getInstance(): SteamworksSDK {
    if (!SteamworksSDK.instance) {
      SteamworksSDK.instance = new SteamworksSDK();
    }
    return SteamworksSDK.instance;
  }

  // ========================================
  // CORE API METHODS
  // ========================================

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
}

export default SteamworksSDK;