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
import { SteamInputManager } from './internal/SteamInputManager';
import { SteamScreenshotManager } from './internal/SteamScreenshotManager';
import { SteamAppsManager } from './internal/SteamAppsManager';

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
 * - input: SteamInputManager - Unified controller input operations
 * - screenshots: SteamScreenshotManager - Screenshot capture and management
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
 * steam.input.init();
 * steam.input.runFrame();
 * const handle = steam.screenshots.addScreenshotToLibrary('/path/to/image.jpg', null, 1920, 1080);
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

  /**
   * Input Manager - Handle Steam Input for unified controller support
   * 
   * Provides comprehensive controller functionality including:
   * - Support for Xbox, PlayStation, Nintendo Switch, Steam Controller, and more
   * - Controller detection and enumeration
   * - Action set management for context-based controls
   * - Digital actions (buttons) and analog actions (sticks, triggers)
   * - Motion data (gyroscope, accelerometer)
   * - Haptic feedback and vibration
   * - LED control for supported controllers
   * - Button glyph display for on-screen prompts
   * - Controller configuration UI
   * 
   * @example
   * ```typescript
   * // Initialize Steam Input
   * steam.input.init();
   * 
   * // Update every frame
   * function gameLoop() {
   *   steam.input.runFrame();
   *   
   *   // Get connected controllers
   *   const controllers = steam.input.getConnectedControllers();
   *   if (controllers.length > 0) {
   *     const handle = controllers[0];
   *     
   *     // Read button input
   *     const jumpHandle = steam.input.getDigitalActionHandle('Jump');
   *     const jumpData = steam.input.getDigitalActionData(handle, jumpHandle);
   *     if (jumpData.state) {
   *       player.jump();
   *     }
   *     
   *     // Read analog input
   *     const moveHandle = steam.input.getAnalogActionHandle('Move');
   *     const moveData = steam.input.getAnalogActionData(handle, moveHandle);
   *     if (moveData.active) {
   *       player.move(moveData.x, moveData.y);
   *     }
   *     
   *     // Trigger rumble on hit
   *     if (player.tookDamage) {
   *       steam.input.triggerVibration(handle, 30000, 30000);
   *     }
   *   }
   *   
   *   requestAnimationFrame(gameLoop);
   * }
   * ```
   * 
   * @see {@link SteamInputManager} for complete API documentation
   */
  public readonly input!: SteamInputManager;

  /**
   * Screenshot Manager - Handle Steam Screenshot operations
   * 
   * Provides screenshot functionality including:
   * - Capture screenshots from raw RGB data
   * - Add screenshots from files to Steam library
   * - Tag screenshots with location metadata
   * - Tag users and Workshop items in screenshots
   * - Hook screenshots for custom capture handling
   * - VR screenshot support
   * 
   * @example
   * ```typescript
   * // Add screenshot from file
   * const handle = steam.screenshots.addScreenshotToLibrary(
   *   '/path/to/screenshot.jpg',
   *   null,  // Auto-generate thumbnail
   *   1920,
   *   1080
   * );
   * 
   * // Tag with location
   * if (handle !== INVALID_SCREENSHOT_HANDLE) {
   *   steam.screenshots.setLocation(handle, 'Level 5 - Boss Arena');
   * }
   * 
   * // Write raw RGB data
   * const rgbData = myRenderer.captureFrame();
   * const handle2 = steam.screenshots.writeScreenshot(rgbData, 1920, 1080);
   * 
   * // Hook screenshots for custom handling
   * steam.screenshots.hookScreenshots(true);
   * ```
   * 
   * @see {@link SteamScreenshotManager} for complete API documentation
   */
  public readonly screenshots!: SteamScreenshotManager;

  /**
   * Apps Manager - Handle DLC, app ownership, and app metadata
   * 
   * Provides DLC and app ownership functionality including:
   * - Check DLC ownership and installation status
   * - Install/uninstall optional DLC
   * - Verify app ownership (subscribed, free weekend, Family Sharing)
   * - Get app install directories
   * - Access beta branches and build information
   * - Retrieve launch parameters
   * - Check timed trial status
   * 
   * @example
   * ```typescript
   * // Check DLC ownership
   * const EXPANSION_DLC = 123456;
   * if (steam.apps.isDlcInstalled(EXPANSION_DLC)) {
   *   enableExpansionContent();
   * }
   * 
   * // List all DLC
   * const allDlc = steam.apps.getAllDLC();
   * allDlc.forEach(dlc => {
   *   console.log(`${dlc.name}: ${dlc.available ? 'Owned' : 'Not Owned'}`);
   * });
   * 
   * // Check Family Sharing
   * if (steam.apps.isSubscribedFromFamilySharing()) {
   *   const ownerId = steam.apps.getAppOwner();
   *   console.log(`Borrowed from: ${ownerId}`);
   * }
   * 
   * // Get app info
   * const language = steam.apps.getCurrentGameLanguage();
   * const buildId = steam.apps.getAppBuildId();
   * const installDir = steam.apps.getAppInstallDir(480);
   * ```
   * 
   * @see {@link SteamAppsManager} for complete API documentation
   */
  public readonly apps!: SteamAppsManager;

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
    this.input = new SteamInputManager(this.libraryLoader);
    this.screenshots = new SteamScreenshotManager(this.libraryLoader, this.apiCore);
    this.apps = new SteamAppsManager(this.libraryLoader, this.apiCore);
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

  /**
   * Get the current game language
   * 
   * Returns the language code that the user has set Steam to use.
   * This is useful for loading appropriate localization files for your game.
   * 
   * @returns Language code string (e.g., 'english', 'french', 'german', 'spanish', etc.)
   * 
   * @example
   * ```typescript
   * const language = steam.getCurrentGameLanguage();
   * console.log(`Steam language: ${language}`);
   * 
   * // Load appropriate translations
   * switch (language) {
   *   case 'french':
   *     loadFrenchTranslations();
   *     break;
   *   case 'german':
   *     loadGermanTranslations();
   *     break;
   *   case 'japanese':
   *     loadJapaneseTranslations();
   *     break;
   *   default:
   *     loadEnglishTranslations();
   * }
   * ```
   * 
   * @remarks
   * Common language codes include: 'english', 'french', 'german', 'spanish', 'latam',
   * 'italian', 'japanese', 'korean', 'portuguese', 'brazilian', 'russian', 'schinese',
   * 'tchinese', 'thai', 'polish', 'danish', 'dutch', 'finnish', 'norwegian', 'swedish',
   * 'hungarian', 'czech', 'romanian', 'turkish', 'arabic', 'bulgarian', 'greek',
   * 'ukrainian', 'vietnamese'
   * 
   * Returns 'english' if Steam API is not initialized or an error occurs.
   * 
   * @deprecated This method will be removed in a future version. 
   * Please use `steam.apps.getCurrentGameLanguage()` instead.
   */
  getCurrentGameLanguage(): string {
    return this.apps.getCurrentGameLanguage();
  }
}

export default SteamworksSDK;