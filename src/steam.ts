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
import { SteamMatchmakingManager } from './internal/SteamMatchmakingManager';
import { SteamUtilsManager } from './internal/SteamUtilsManager';
import { SteamNetworkingUtilsManager } from './internal/SteamNetworkingUtilsManager';
import { SteamNetworkingSocketsManager } from './internal/SteamNetworkingSocketsManager';
import { SteamUserManager } from './internal/SteamUserManager';
import { SteamOverlay } from './internal/SteamOverlay';

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
 * - matchmaking: SteamMatchmakingManager - Lobby matchmaking operations
 * - utils: SteamUtilsManager - System utilities and device detection
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
 * const lobby = await steam.matchmaking.createLobby(ELobbyType.Public, 4);
 * const isSteamDeck = steam.utils.isSteamRunningOnSteamDeck();
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

  /**
   * Steam Matchmaking Manager - Manages multiplayer lobbies and matchmaking
   * 
   * Provides comprehensive access to the ISteamMatchmaking interface for:
   * - Creating and managing lobbies (public, private, friends-only, invisible)
   * - Searching for and joining existing lobbies
   * - Managing lobby members and data
   * - Sending and receiving lobby chat messages
   * - Configuring lobby game servers
   * 
   * @example
   * ```typescript
   * // Create a public lobby for up to 4 players
   * const result = await steam.matchmaking.createLobby(ELobbyType.Public, 4);
   * if (result.success) {
   *   console.log(`Lobby created: ${result.lobbyId}`);
   *   
   *   // Set lobby data for searching
   *   steam.matchmaking.setLobbyData(result.lobbyId, 'gameMode', 'deathmatch');
   *   steam.matchmaking.setLobbyData(result.lobbyId, 'map', 'dust2');
   * }
   * 
   * // Search for lobbies with filters
   * steam.matchmaking.addRequestLobbyListStringFilter('gameMode', 'deathmatch', ELobbyComparison.Equal);
   * steam.matchmaking.addRequestLobbyListResultCountFilter(10);
   * const lobbies = await steam.matchmaking.requestLobbyList();
   * 
   * // Join a lobby
   * if (lobbies.lobbies.length > 0) {
   *   const joinResult = await steam.matchmaking.joinLobby(lobbies.lobbies[0].lobbyId);
   *   if (joinResult.success) {
   *     console.log('Joined lobby successfully!');
   *   }
   * }
   * ```
   * 
   * @see {@link SteamMatchmakingManager} for complete API documentation
   */
  public readonly matchmaking!: SteamMatchmakingManager;

  /**
   * Steam Utils Manager - System utilities, device detection, and helper functions
   * 
   * Provides access to the ISteamUtils interface for:
   * - System information (battery level, IP country, server time)
   * - Steam Deck and Big Picture mode detection
   * - Overlay notification positioning
   * - Loading images from Steam's cache (avatars, achievement icons)
   * - Gamepad text input dialogs
   * - Text filtering for user-generated content
   * 
   * @example
   * ```typescript
   * // Check if running on Steam Deck
   * if (steam.utils.isSteamRunningOnSteamDeck()) {
   *   enableDeckOptimizations();
   * }
   * 
   * // Get battery status
   * const battery = steam.utils.getCurrentBatteryPower();
   * if (battery !== BATTERY_POWER_AC && battery < 20) {
   *   showLowBatteryWarning();
   * }
   * 
   * // Get device environment
   * const env = steam.utils.getDeviceEnvironment();
   * console.log(`Country: ${env.ipCountry}, Deck: ${env.isSteamDeck}`);
   * 
   * // Load avatar image
   * const avatarHandle = steam.friends.getSmallFriendAvatar(steamId);
   * const image = steam.utils.getImageRGBA(avatarHandle);
   * if (image) {
   *   // Use image.data (RGBA buffer), image.width, image.height
   * }
   * 
   * // Position notifications
   * steam.utils.setOverlayNotificationPosition(ENotificationPosition.BottomLeft);
   * ```
   * 
   * @see {@link SteamUtilsManager} for complete API documentation
   */
  public readonly utils!: SteamUtilsManager;

  /**
   * Steam Networking Utils Manager - Network utilities and ping estimation
   * 
   * Provides access to the ISteamNetworkingUtils interface for:
   * - Initializing and monitoring Steam's relay network
   * - Getting local ping location for matchmaking
   * - Estimating ping times between players without sending packets
   * - Querying data center (POP) information and ping times
   * - High-precision local timestamps
   * 
   * @example
   * ```typescript
   * // Initialize relay network (required for ping features)
   * steam.networkingUtils.initRelayNetworkAccess();
   * 
   * // Wait for network to be ready
   * while (true) {
   *   steam.runCallbacks();
   *   const status = steam.networkingUtils.getRelayNetworkStatus();
   *   if (status.availability === ESteamNetworkingAvailability.Current) break;
   *   await new Promise(r => setTimeout(r, 100));
   * }
   * 
   * // Get your ping location (share this with other players)
   * const myLocation = steam.networkingUtils.getLocalPingLocation();
   * console.log(`My location: ${myLocation?.locationString}`);
   * 
   * // Estimate ping to another player
   * const theirLocation = "received from matchmaking...";
   * const estimate = steam.networkingUtils.estimatePingFromString(theirLocation);
   * if (estimate.valid) {
   *   console.log(`Estimated ping: ${estimate.pingMs}ms`);
   * }
   * 
   * // Get data center list
   * const pops = steam.networkingUtils.getPOPList();
   * pops.forEach(pop => {
   *   console.log(`${pop.popCode}: ${pop.directPing}ms direct`);
   * });
   * ```
   * 
   * @see {@link SteamNetworkingUtilsManager} for complete API documentation
   */
  public readonly networkingUtils!: SteamNetworkingUtilsManager;

  /**
   * Steam Networking Sockets Manager - P2P networking for multiplayer games
   * 
   * Provides access to the ISteamNetworkingSockets interface for:
   * - Creating P2P connections between Steam users
   * - Hosting listen sockets to accept incoming connections
   * - Sending reliable and unreliable messages
   * - Managing connection state and lifecycle
   * - Poll groups for efficient message receiving from multiple connections
   * 
   * @example
   * ```typescript
   * // HOST: Create a listen socket
   * const listenSocket = steam.networkingSockets.createListenSocketP2P(0);
   * 
   * // CLIENT: Connect to host
   * const connection = steam.networkingSockets.connectP2P(hostSteamId, 0);
   * 
   * // Wait for connection
   * steam.networkingSockets.onConnectionStateChange((change) => {
   *   if (change.newState === ESteamNetworkingConnectionState.Connected) {
   *     console.log('Connected!');
   *   }
   * });
   * 
   * // Send messages
   * steam.networkingSockets.sendReliable(connection, Buffer.from('Hello!'));
   * steam.networkingSockets.sendUnreliable(connection, positionData);
   * 
   * // Receive messages
   * const messages = steam.networkingSockets.receiveMessages(connection);
   * messages.forEach(msg => {
   *   console.log('Received:', msg.data.toString());
   * });
   * 
   * // Close when done
   * steam.networkingSockets.closeConnection(connection);
   * steam.networkingSockets.closeListenSocket(listenSocket);
   * ```
   * 
   * @see {@link SteamNetworkingSocketsManager} for complete API documentation
   */
  public readonly networkingSockets!: SteamNetworkingSocketsManager;

  /**
   * Steam Auth Manager - Handle authentication, session tickets, and user verification
   * 
   * Provides access to the ISteamUser authentication interface for:
   * - Generating session tickets for P2P/game server authentication
   * - Generating web API tickets for backend service authentication
   * - Validating incoming auth tickets from other players
   * - Checking app/DLC license ownership for authenticated users
   * - Requesting encrypted app tickets for secure backend verification
   * - Querying user security settings (2FA, phone verification)
   * - Duration control compliance (anti-indulgence regulations)
   * 
   * @example
   * ```typescript
   * // Get a session ticket for game server authentication
   * const ticket = steam.user.getAuthSessionTicket();
   * if (ticket.success) {
   *   // Send ticket data to game server
   *   sendToServer(ticket.ticketData, steam.getStatus().steamId);
   * }
   * 
   * // Get a web API ticket (like steamworks.js getSessionTicketWithSteamId)
   * const webTicket = await steam.user.getAuthTicketForWebApi('my-service');
   * if (webTicket.success) {
   *   // Use ticketHex for HTTP authentication
   *   fetch('/api/auth', {
   *     headers: { 'X-Steam-Ticket': webTicket.ticketHex }
   *   });
   * }
   * 
   * // Server-side: Validate incoming ticket
   * const validation = steam.user.beginAuthSession(ticketData, clientSteamId);
   * if (validation.success) {
   *   // Check DLC ownership
   *   const license = steam.user.userHasLicenseForApp(clientSteamId, DLC_APP_ID);
   *   if (license === EUserHasLicenseForAppResult.HasLicense) {
   *     grantDLCContent();
   *   }
   * }
   * 
   * // Clean up when player disconnects
   * steam.user.endAuthSession(clientSteamId);
   * steam.user.cancelAuthTicket(ticket.authTicket);
   * ```
   * 
   * @see {@link SteamUserManager} for complete API documentation
   */
  public readonly user!: SteamUserManager;

  /**
   * Metal Overlay Integration - Electron offscreen rendering to native Metal window
   * 
   * Provides Steam overlay support for Electron applications on macOS by rendering
   * Electron's offscreen output to a native Metal window.
   * 
   * @remarks
   * This is macOS-only functionality. On other platforms, this will be available
   * but methods will no-op gracefully.
   * 
   * @example
   * ```typescript
   * import { app, BrowserWindow } from 'electron';
   * 
   * const win = new BrowserWindow({
   *   width: 1280,
   *   height: 720,
   *   webPreferences: {
   *     offscreen: true
   *   }
   * });
   * 
   * // Add Steam overlay support
   * steam.addElectronSteamOverlay(win);
   * ```
   * 
   * @see {@link SteamOverlay} for complete API documentation
   */
  private nativeOverlay: SteamOverlay;

  private constructor() {
    // Initialize internal modules
    this.libraryLoader = new SteamLibraryLoader();
    this.apiCore = new SteamAPICore(this.libraryLoader);
    this.nativeOverlay = new SteamOverlay();
    
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
    this.matchmaking = new SteamMatchmakingManager(this.libraryLoader, this.apiCore);
    this.utils = new SteamUtilsManager(this.libraryLoader, this.apiCore);
    this.networkingUtils = new SteamNetworkingUtilsManager(this.libraryLoader, this.apiCore);
    this.networkingSockets = new SteamNetworkingSocketsManager(this.libraryLoader, this.apiCore);
    this.user = new SteamUserManager(this.libraryLoader, this.apiCore);
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
    // Cleanup managers before shutdown
    this.user.cleanup();
    
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
   * Restart the app if it was not launched through Steam
   * 
   * This function should be called as early as possible in your application's lifecycle,
   * **before** calling `init()`. It checks if your executable was launched through the
   * Steam client.
   * 
   * **IMPORTANT:** If this function returns `true`, you MUST terminate your application
   * immediately. Steam is now re-launching your application through the Steam client.
   * 
   * Returns `false` if no action needs to be taken, meaning your app should continue normally.
   * 
   * @param appId - Your Steam App ID
   * @returns true if the app should terminate (Steam is restarting it), false if it should continue
   * 
   * @example
   * ```typescript
   * import SteamworksSDK from 'steamworks-ffi-node';
   * 
   * const steam = SteamworksSDK.getInstance();
   * 
   * // Check BEFORE initializing
   * if (steam.restartAppIfNecessary(480)) {
   *   console.log('App was not launched through Steam. Restarting...');
   *   process.exit(0);
   * }
   * 
   * // If we get here, continue with normal initialization
   * steam.init({ appId: 480 });
   * ```
   * 
   * @example
   * ```typescript
   * // Electron main process example
   * import { app } from 'electron';
   * import SteamworksSDK from 'steamworks-ffi-node';
   * 
   * const steam = SteamworksSDK.getInstance();
   * 
   * // Check on app ready
   * app.whenReady().then(() => {
   *   if (steam.restartAppIfNecessary(480)) {
   *     app.quit();
   *     return;
   *   }
   *   
   *   steam.init({ appId: 480 });
   *   // ... rest of app initialization
   * });
   * ```
   * 
   * @remarks
   * **When to Use:**
   * - Your app is released on Steam
   * - You want to ensure proper Steam overlay and authentication
   * - You're not using Steam DRM wrapper
   * 
   * **Not Needed When:**
   * - Using Steam DRM wrapper on your executable
   * - Running in development with `steam_appid.txt` or `SteamAppId` env var
   * - Steam is not installed (function returns false safely)
   * 
   * **Best Practice:**
   * Always call this before `init()` to ensure your app restarts through Steam
   * if it was launched directly by the user instead of through the Steam client.
   */
  restartAppIfNecessary(appId: number): boolean {
    return this.apiCore.restartAppIfNecessary(appId);
  }

  /**
   * Set custom SDK path (optional)
   * 
   * Must be called BEFORE restartAppIfNecessary() or init() if using a custom SDK location.
   * The path should be relative to the project root.
   * 
   * @param customSdkPath - Path to the steamworks_sdk folder (e.g., 'vendor/steamworks_sdk')
   * 
   * @example
   * ```typescript
   * const steam = SteamworksSDK.getInstance();
   * 
   * // Set custom SDK path before any Steam operations
   * steam.setSdkPath('vendor/steamworks_sdk');
   * 
   * // Now restartAppIfNecessary() will use the custom path
   * if (steam.restartAppIfNecessary(480)) {
   *   process.exit(0);
   * }
   * 
   * steam.init({ appId: 480 });
   * ```
   */
  setSdkPath(customSdkPath: string): void {
    this.apiCore.setSdkPath(customSdkPath);
  }

  /**
   * Enable or disable debug logging
   * 
   * Controls debug output for Steam API operations. When enabled, displays detailed
   * information about SDK loading, initialization, and internal operations.
   * Errors and warnings are always shown regardless of debug mode.
   * 
   * Must be called BEFORE restartAppIfNecessary() or init() to see early initialization logs.
   * 
   * @param enabled - true to enable debug logs, false to disable (default: false)
   * 
   * @example
   * ```typescript
   * const steam = SteamworksSDK.getInstance();
   * 
   * // Enable debug mode before any Steam operations
   * steam.setDebug(true);
   * 
   * // Set custom SDK path (if needed)
   * steam.setSdkPath('vendor/steamworks_sdk');
   * 
   * // Check restart requirement (debug logs will show library loading)
   * if (steam.restartAppIfNecessary(480)) {
   *   process.exit(0);
   * }
   * 
   * // Initialize (debug logs will show initialization details)
   * steam.init({ appId: 480 });
   * 
   * // Disable debug logs after initialization if desired
   * steam.setDebug(false);
   * ```
   * 
   * @remarks
   * - Debug logs are only shown when debug mode is enabled
   * - Errors and warnings always appear regardless of debug setting
   * - Useful for troubleshooting SDK loading and initialization issues
   * - Can be toggled at any time during runtime
   */
  setDebug(enabled: boolean): void {
    this.apiCore.setDebug(enabled);
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

  // ========================================
  // ELECTRON METAL OVERLAY INTEGRATION
  // ========================================

  /**
   * Add Steam overlay support to an Electron BrowserWindow (macOS only)
   * 
   * This method enables Steam overlay for Electron applications by setting up
   * offscreen rendering to a native Metal window. The BrowserWindow must be
   * created with `offscreen: true` in webPreferences.
   * 
   * @param browserWindow - The Electron BrowserWindow to add overlay support to
   * @param options - Optional configuration for the Metal window
   * @returns True if overlay was successfully added, false otherwise
   * 
   * @remarks
   * - macOS only (gracefully no-ops on other platforms)
   * - Requires Electron BrowserWindow with offscreen rendering enabled
   * - Requires proper entitlements for Steam overlay injection
   * - The native Metal window will match the BrowserWindow size
   * - Handles resize and close events automatically
   * 
   * @example Basic usage
   * ```typescript
   * import { app, BrowserWindow } from 'electron';
   * import SteamworksSDK from 'steamworks-ffi-node';
   * 
   * const steam = SteamworksSDK.getInstance();
   * steam.init({ appId: 480 });
   * 
   * app.whenReady().then(() => {
   *   const win = new BrowserWindow({
   *     width: 1280,
   *     height: 720,
   *     webPreferences: {
   *       offscreen: true
   *     }
   *   });
   * 
   *   // Add Steam overlay
   *   steam.addElectronSteamOverlay(win);
   *   
   *   win.loadFile('index.html');
   * });
   * ```
   * 
   * @example With custom options
   * ```typescript
   * steam.addElectronSteamOverlay(win, {
   *   title: 'My Steam Game',
   *   fps: 60,
   *   vsync: true
   * });
   * ```
   * 
   * @example Full Electron app
   * ```typescript
   * import { app, BrowserWindow } from 'electron';
   * import SteamworksSDK from 'steamworks-ffi-node';
   * 
   * const steam = SteamworksSDK.getInstance();
   * 
   * // Initialize Steam
   * if (!steam.init({ appId: 480 })) {
   *   console.error('Failed to initialize Steam');
   *   app.quit();
   * }
   * 
   * // Run callbacks periodically
   * setInterval(() => steam.runCallbacks(), 1000);
   * 
   * app.whenReady().then(() => {
   *   const win = new BrowserWindow({
   *     width: 1280,
   *     height: 720,
   *     webPreferences: {
   *       offscreen: true,
   *       nodeIntegration: true,
   *       contextIsolation: false
   *     }
   *   });
   * 
   *   // Enable Steam overlay
   *   if (steam.addElectronSteamOverlay(win)) {
   *     console.log('Steam overlay enabled!');
   *   }
   *   
   *   win.loadFile('index.html');
   * });
   * 
   * app.on('before-quit', () => {
   *   steam.shutdown();
   * });
   * ```
   */
  addElectronSteamOverlay(
    browserWindow: any,
    options?: {
      title?: string;
      fps?: number;
      vsync?: boolean;
    }
  ): boolean {
    return this.nativeOverlay.addElectronSteamOverlay(browserWindow, options);
  }

  /**
   * Check if Metal overlay is available on this system
   * 
   * @returns True if native overlay can be used
   * 
   * @example
   * ```typescript
   * if (steam.isOverlayAvailable()) {
   *   console.log('Steam overlay is available!');
   *   steam.addElectronSteamOverlay(win);
   * } else {
   *   console.log('Steam overlay not available (native module missing)');
   * }
   * ```
   */
  isOverlayAvailable(): boolean {
    return this.nativeOverlay.isAvailable();
  }
}

export default SteamworksSDK;