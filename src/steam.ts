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
import { SteamRichPresenceManager } from './internal/SteamRichPresenceManager';
import { SteamOverlayManager } from './internal/SteamOverlayManager';
import { SteamCloudManager } from './internal/SteamCloudManager';
import { SteamWorkshopManager } from './internal/SteamWorkshopManager';

/**
 * Real Steamworks SDK implementation using Koffi FFI
 * This connects directly to the actual Steam client and Steamworks SDK
 * 
 * Uses composition pattern with specialized managers:
 * - achievements: SteamAchievementManager - All achievement operations
 * - stats: SteamStatsManager - All stats operations
 * - leaderboards: SteamLeaderboardManager - All leaderboard operations
 * - friends: SteamFriendsManager - All friends and social operations
 * - richPresence: SteamRichPresenceManager - Rich presence operations
 * - overlay: SteamOverlayManager - Overlay control operations
 * - cloud: SteamCloudManager - Steam Cloud / Remote Storage operations
 * - workshop: SteamWorkshopManager - Steam Workshop / UGC operations
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
 * const friends = steam.friends.getAllFriends();
 * steam.richPresence.setRichPresence('status', 'In Menu');
 * steam.overlay.activateGameOverlay('Friends');
 * steam.cloud.fileWrite('savegame.json', saveData);
 * const items = await steam.workshop.getSubscribedItems();
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
   * Provides friends functionality including:
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

  /**
   * Rich Presence Manager - Handle Steam Rich Presence operations
   * 
   * Provides Rich Presence functionality including:
   * - Set/clear rich presence key/value pairs
   * - Query friend rich presence data
   * - Display custom status in Steam friends list
   * - Enable friend join functionality
   * 
   * @example
   * ```typescript
   * // Set rich presence
   * steam.richPresence.setRichPresence('status', 'In Deathmatch');
   * steam.richPresence.setRichPresence('connect', '+connect 192.168.1.100');
   * 
   * // Read friend's rich presence
   * steam.richPresence.requestFriendRichPresence(friendId);
   * const status = steam.richPresence.getFriendRichPresence(friendId, 'status');
   * 
   * // Clear all
   * steam.richPresence.clearRichPresence();
   * ```
   * 
   * @see {@link SteamRichPresenceManager} for complete API documentation
   */
  public readonly richPresence!: SteamRichPresenceManager;

  /**
   * Overlay Manager - Handle Steam Overlay operations
   * 
   * Provides overlay functionality including:
   * - Open overlay to various dialogs (friends, achievements, etc.)
   * - Open overlay to user profiles
   * - Open overlay browser to URLs
   * - Open store pages
   * - Show invite dialogs
   * 
   * @example
   * ```typescript
   * // Open overlay dialogs
   * steam.overlay.activateGameOverlay('Friends');
   * steam.overlay.activateGameOverlay('Achievements');
   * 
   * // Open user profile
   * steam.overlay.activateGameOverlayToUser('steamid', friendId);
   * 
   * // Open web page
   * steam.overlay.activateGameOverlayToWebPage('https://example.com');
   * 
   * // Open store page
   * steam.overlay.activateGameOverlayToStore(480);
   * ```
   * 
   * @see {@link SteamOverlayManager} for complete API documentation
   */
  public readonly overlay!: SteamOverlayManager;

  /**
   * Cloud Manager - Handle Steam Cloud / Remote Storage operations
   * 
   * Provides Steam Cloud functionality including:
   * - Read/write files to cloud storage
   * - Delete and manage cloud files
   * - Query cloud quota and usage
   * - List all cloud files with metadata
   * - Enable/disable cloud for app
   * 
   * @example
   * ```typescript
   * // Write save file to cloud
   * const saveData = Buffer.from(JSON.stringify({ level: 5, score: 1000 }));
   * steam.cloud.fileWrite('savegame.json', saveData);
   * 
   * // Read save file
   * const result = steam.cloud.fileRead('savegame.json');
   * if (result.success) {
   *   const data = JSON.parse(result.data.toString());
   * }
   * 
   * // Check quota
   * const quota = steam.cloud.getQuota();
   * console.log(`Using ${quota.percentUsed}% of cloud storage`);
   * 
   * // List all files
   * const files = steam.cloud.getAllFiles();
   * ```
   * 
   * @see {@link SteamCloudManager} for complete API documentation
   */
  public readonly cloud!: SteamCloudManager;

  /**
   * Workshop Manager - Handle Steam Workshop / User Generated Content operations
   * 
   * Provides Workshop functionality including:
   * - Query and browse Workshop items
   * - Subscribe/unsubscribe to Workshop content
   * - Download and install Workshop items
   * - Track download and installation progress
   * - Create and update Workshop items
   * - Vote on and favorite Workshop content
   * 
   * @example
   * ```typescript
   * // Subscribe to Workshop item
   * const itemId = BigInt('123456789');
   * await steam.workshop.subscribeItem(itemId);
   * 
   * // Check subscribed items
   * const items = steam.workshop.getSubscribedItems();
   * items.forEach(id => {
   *   const info = steam.workshop.getItemInstallInfo(id);
   *   if (info) {
   *     console.log(`Item installed at: ${info.folder}`);
   *   }
   * });
   * 
   * // Query popular items
   * const query = steam.workshop.createQueryAllUGCRequest(
   *   EUGCQuery.RankedByVote,
   *   EUGCMatchingUGCType.Items,
   *   480, 480, 1
   * );
   * steam.workshop.sendQueryUGCRequest(query);
   * // Wait for callback, then releaseQueryUGCRequest
   * ```
   * 
   * @see {@link SteamWorkshopManager} for complete API documentation
   */
  public readonly workshop!: SteamWorkshopManager;

  private constructor() {
    // Initialize internal modules
    this.libraryLoader = new SteamLibraryLoader();
    this.apiCore = new SteamAPICore(this.libraryLoader);
    
    // Initialize public managers
    this.achievements = new SteamAchievementManager(this.libraryLoader, this.apiCore);
    this.stats = new SteamStatsManager(this.libraryLoader, this.apiCore);
    this.leaderboards = new SteamLeaderboardManager(this.libraryLoader, this.apiCore);
    this.friends = new SteamFriendsManager(this.libraryLoader, this.apiCore);
    this.richPresence = new SteamRichPresenceManager(this.libraryLoader, this.apiCore);
    this.overlay = new SteamOverlayManager(this.libraryLoader, this.apiCore);
    this.cloud = new SteamCloudManager(this.libraryLoader, this.apiCore);
    this.workshop = new SteamWorkshopManager(this.libraryLoader, this.apiCore);
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