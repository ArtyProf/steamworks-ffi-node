import * as path from 'path';
import { SteamInitOptions, SteamStatus } from '../types';
import { SteamLibraryLoader } from './SteamLibraryLoader';

/**
 * SteamAPICore
 * 
 * Core Steam API initialization and lifecycle management.
 * Handles Steam client connection, interface management, and callback processing.
 * 
 * This class manages the fundamental Steam API operations:
 * - Initialization and shutdown of the Steam API
 * - Interface retrieval (UserStats, User)
 * - Status monitoring (Steam running, initialization state)
 * - Callback processing for Steam events
 * 
 * @example
 * ```typescript
 * const loader = new SteamLibraryLoader();
 * const apiCore = new SteamAPICore(loader);
 * 
 * const success = apiCore.init({ appId: 480 });
 * if (success) {
 *   console.log('[Steamworks] Steam API initialized!');
 *   // Use Steam features...
 *   apiCore.shutdown();
 * }
 * ```
 */
export class SteamAPICore {
  /** Steam library loader for FFI function calls */
  private libraryLoader: SteamLibraryLoader;
  
  /** Whether the Steam API has been successfully initialized */
  private initialized: boolean = false;
  
  /** The Steam App ID for this application */
  private appId: number = 0;
  
  /** Pointer to the ISteamUserStats interface */
  private userStatsInterface: any = null;
  
  /** Pointer to the ISteamUser interface */
  private userInterface: any = null;
  
  /** Pointer to the ISteamUtils interface */
  private utilsInterface: any = null;
  
  /** Pointer to the ISteamApps interface */
  private appsInterface: any = null;
  
  /** Pointer to the ISteamFriends interface */
  private friendsInterface: any = null;
  
  /** Pointer to the ISteamRemoteStorage interface */
  private remoteStorageInterface: any = null;
  
  /** Pointer to the ISteamUGC interface */
  private ugcInterface: any = null;
  
  /** Pointer to the ISteamMatchmaking interface */
  private matchmakingInterface: any = null;

  /**
   * Creates a new SteamAPICore instance
   * 
   * @param libraryLoader - The Steam library loader for FFI calls
   */
  constructor(libraryLoader: SteamLibraryLoader) {
    this.libraryLoader = libraryLoader;
  }

  /**
   * Initialize the Steam API
   * 
   * Establishes connection to the Steam client and retrieves necessary interfaces.
   * Creates steam_appid.txt file required by Steam, loads the Steamworks library,
   * and initializes all necessary Steam interfaces.
   * 
   * @param options - Initialization options containing the Steam App ID
   * @returns true if initialization was successful, false otherwise
   * 
   * @example
   * ```typescript
   * const success = apiCore.init({ appId: 480 });
   * if (success) {
   *   console.log('[Steamworks] Connected to Steam for App ID:', 480);
   * } else {
   *   console.error('[Steamworks] Failed to initialize Steam API');
   * }
   * ```
   * 
   * @remarks
   * - Creates steam_appid.txt file in the current working directory
   * - Sets SteamAppId environment variable
   * - Automatically requests current stats from Steam servers
   * - Runs callbacks to process initial Steam events
   * 
   * @warning
   * Requires Steam client to be running and user to be logged in
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_Init()` - Initialize the Steam API
   * - `SteamAPI_IsSteamRunning()` - Check if Steam client is running
   * - `SteamAPI_SteamUserStats_v013()` - Get ISteamUserStats interface
   * - `SteamAPI_SteamUser_v023()` - Get ISteamUser interface
   * - `SteamAPI_ISteamUserStats_RequestCurrentStats()` - Request current stats from Steam
   * - `SteamAPI_RunCallbacks()` - Process Steam callbacks
   */
  init(options: SteamInitOptions): boolean {
    try {
      this.appId = options.appId;

      // Set Steam App ID in environment variable
      // This is sufficient for Steam SDK - no file needed
      process.env.SteamAppId = this.appId.toString();

      console.log(`[Steamworks] Loading Steamworks SDK for App ID: ${this.appId}`);
      
      if (options.sdkPath) {
        console.log(`[Steamworks] Using custom SDK path: ${options.sdkPath}`);
      }
      
      // Load the library (with optional custom SDK path)
      this.libraryLoader.load(options.sdkPath);

      console.log('[Steamworks] Initializing Steam API...');
      
      // Initialize Steam API
      const initResult = this.libraryLoader.SteamAPI_Init();
      
      if (!initResult) {
        throw new Error('SteamAPI_Init() failed. Make sure Steam client is running and you\'re logged in.');
      }

      // Check if Steam is running
      const steamRunning = this.libraryLoader.SteamAPI_IsSteamRunning();
      if (!steamRunning) {
        console.warn('[Steamworks] WARNING: Steam client might not be running properly');
      }

      // Get UserStats interface
      this.userStatsInterface = this.libraryLoader.SteamAPI_SteamUserStats_v013();
      if (!this.userStatsInterface || this.userStatsInterface === null) {
        throw new Error('Failed to get SteamUserStats interface');
      }

      // Get User interface
      this.userInterface = this.libraryLoader.SteamAPI_SteamUser_v023();
      
      // Get Utils interface
      this.utilsInterface = this.libraryLoader.SteamAPI_SteamUtils_v010();
      if (!this.utilsInterface || this.utilsInterface === null) {
        console.warn('[Steamworks] WARNING: Failed to get SteamUtils interface');
      }
      
      // Get Apps interface
      this.appsInterface = this.libraryLoader.SteamAPI_SteamApps_v008();
      if (!this.appsInterface || this.appsInterface === null) {
        console.warn('[Steamworks] WARNING: Failed to get SteamApps interface');
      }
      
      // Get Friends interface
      this.friendsInterface = this.libraryLoader.SteamAPI_SteamFriends_v018();
      if (!this.friendsInterface || this.friendsInterface === null) {
        console.warn('[Steamworks] WARNING: Failed to get SteamFriends interface');
      }
      
      // Get Remote Storage interface
      this.remoteStorageInterface = this.libraryLoader.SteamAPI_SteamRemoteStorage_v016();
      if (!this.remoteStorageInterface || this.remoteStorageInterface === null) {
        console.warn('[Steamworks] WARNING: Failed to get SteamRemoteStorage interface');
      }
      
      // Get UGC interface
      this.ugcInterface = this.libraryLoader.SteamAPI_SteamUGC_v021();
      if (!this.ugcInterface || this.ugcInterface === null) {
        console.warn('[Steamworks] WARNING: Failed to get SteamUGC interface');
      }
      
      // Get Matchmaking interface
      this.matchmakingInterface = this.libraryLoader.SteamAPI_SteamMatchmaking_v009();
      if (!this.matchmakingInterface || this.matchmakingInterface === null) {
        console.warn('[Steamworks] WARNING: Failed to get SteamMatchmaking interface');
      }

      // Request current stats from Steam servers
      console.log('[Steamworks] Requesting current stats from Steam...');
      const statsRequested = this.libraryLoader.SteamAPI_ISteamUserStats_RequestCurrentStats(this.userStatsInterface, 0);
      
      if (!statsRequested) {
        console.warn('[Steamworks] WARNING: Failed to request current stats from Steam servers');
      }

      // Run callbacks to process any pending Steam events
      this.runCallbacks();

      this.initialized = true;
      console.log('[Steamworks] Steam API initialized successfully!');
      console.log(`[Steamworks] Connected to Steam for App ID: ${this.appId}`);
      
      return true;

    } catch (error) {
      console.error('[Steamworks] ERROR: Failed to initialize Steam API:', (error as Error).message);
      console.error('[Steamworks] Make sure:');
      console.error('[Steamworks]    1. Steam client is running and you\'re logged in');
      console.error('[Steamworks]    2. Steamworks redistributable binaries are available');
      console.error('[Steamworks]    3. App ID is valid and game is in your library');
      return false;
    }
  }

  /**
   * Shutdown the Steam API
   * 
   * Cleanly shuts down the Steam API connection and releases all interfaces.
   * Should be called when the application is closing or Steam features are no longer needed.
   * 
   * @example
   * ```typescript
   * process.on('SIGINT', () => {
   *   apiCore.shutdown();
   *   process.exit(0);
   * });
   * ```
   * 
   * @remarks
   * - Safe to call multiple times (only shuts down if initialized)
   * - Clears all interface pointers
   * - Sets initialized state to false
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_Shutdown()` - Shutdown the Steam API
   */
  shutdown(): void {
    if (this.libraryLoader.isLoaded() && this.initialized) {
      console.log('[Steamworks] Shutting down Steam API...');
      this.libraryLoader.SteamAPI_Shutdown();
      this.initialized = false;
      this.userStatsInterface = null;
      this.userInterface = null;
      this.utilsInterface = null;
      this.appsInterface = null;
      console.log('[Steamworks] Steam API shutdown complete');
    }
  }

  /**
   * Get the current Steam status
   * 
   * Returns detailed status information including initialization state,
   * App ID, and the current user's Steam ID.
   * 
   * @returns Object containing initialization status, App ID, and Steam ID
   * 
   * @example
   * ```typescript
   * const status = apiCore.getStatus();
   * console.log(`[Steamworks] Initialized: ${status.initialized}`);
   * console.log(`[Steamworks] App ID: ${status.appId}`);
   * console.log(`[Steamworks] Steam ID: ${status.steamId}`);
   * ```
   * 
   * @remarks
   * - Steam ID is '0' if not initialized or unable to retrieve
   * - App ID is 0 if not initialized
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamUser_GetSteamID()` - Get current user's Steam ID
   */
  getStatus(): SteamStatus {
    let steamId = '0';
    
    if (this.initialized && this.userInterface && this.userInterface !== null) {
      try {
        const steamIdNum = this.libraryLoader.SteamAPI_ISteamUser_GetSteamID(this.userInterface);
        steamId = steamIdNum.toString();
      } catch (error) {
        console.warn('[Steamworks] Failed to get Steam ID:', (error as Error).message);
      }
    }

    return {
      initialized: this.initialized,
      appId: this.appId,
      steamId
    };
  }

  /**
   * Run Steam callbacks to process pending events
   * 
   * Processes all pending Steam callbacks and events. Should be called regularly
   * (e.g., in a game loop or timer) to ensure Steam events are processed promptly.
   * 
   * @example
   * ```typescript
   * // In a game loop or setInterval
   * setInterval(() => {
   *   apiCore.runCallbacks();
   * }, 100); // Every 100ms
   * ```
   * 
   * @remarks
   * - Safe to call even if not initialized (will be ignored)
   * - Automatically called by init() and after stat/achievement operations
   * - Required for receiving Steam events and callbacks
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_RunCallbacks()` - Process all pending Steam callbacks
   */
  runCallbacks(): void {
    if (this.initialized && this.libraryLoader.isLoaded()) {
      try {
        this.libraryLoader.SteamAPI_RunCallbacks();
      } catch (error) {
        console.warn('[Steamworks] Warning: Error running Steam callbacks:', (error as Error).message);
      }
    }
  }

  /**
   * Check if the Steam client is running
   * 
   * Verifies that the Steam client application is currently running on the user's system.
   * 
   * @returns true if Steam is running, false otherwise
   * 
   * @example
   * ```typescript
   * if (apiCore.isSteamRunning()) {
   *   console.log('[Steamworks] Steam client is active');
   * } else {
   *   console.warn('[Steamworks] Steam client is not running');
   * }
   * ```
   * 
   * @remarks
   * - Returns false if Steam API is not initialized
   * - Safe to call at any time
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_IsSteamRunning()` - Check if Steam client is running
   */
  isSteamRunning(): boolean {
    if (this.initialized && this.libraryLoader.isLoaded()) {
      try {
        return this.libraryLoader.SteamAPI_IsSteamRunning();
      } catch (error) {
        console.warn('[Steamworks] Warning: Error checking if Steam is running:', (error as Error).message);
        return false;
      }
    }
    return false;
  }

  /**
   * Restart the app if it was not launched through Steam
   * 
   * This function should be called as early as possible in your application's lifecycle,
   * ideally before initializing Steam. It checks if your executable was launched through
   * the Steam client.
   * 
   * **Important:** If this function returns `true`, you should terminate your application
   * immediately. Steam is now re-launching your application through the Steam client.
   * 
   * Returns `false` if no action needs to be taken, meaning:
   * - Your executable was started through the Steam client, OR
   * - A `steam_appid.txt` file is present in your game's directory (for development), OR
   * - The `SteamAppId` environment variable is set
   * 
   * Your current process should continue normally if `false` is returned.
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
   * // Check before initializing
   * if (steam.restartAppIfNecessary(480)) {
   *   console.log('Restarting through Steam...');
   *   process.exit(0);
   * }
   * 
   * // Continue with normal initialization
   * steam.init({ appId: 480 });
   * ```
   * 
   * @remarks
   * - Call this **before** `init()` for best results
   * - Not needed if you use Steam DRM wrapper on your executable
   * - Useful for ensuring proper Steam overlay and authentication
   * - Safe to call even if Steam is not installed (returns false)
   * 
   * **Steam SDK Reference:**
   * - `SteamAPI_RestartAppIfNecessary()` - Ensures app was launched through Steam
   */
  restartAppIfNecessary(appId: number): boolean {
    if (!this.libraryLoader.isLoaded()) {
      this.libraryLoader.load();
    }
    
    try {
      return this.libraryLoader.SteamAPI_RestartAppIfNecessary(appId);
    } catch (error) {
      console.warn('[Steamworks] Warning: Error checking restart requirement:', (error as Error).message);
      return false;
    }
  }

  /**
   * Check if the Steam API is initialized
   * 
   * Returns the current initialization state of the Steam API.
   * 
   * @returns true if initialized and ready to use, false otherwise
   * 
   * @example
   * ```typescript
   * if (!apiCore.isInitialized()) {
   *   console.error('[Steamworks] Cannot perform Steam operations - not initialized');
   *   return;
   * }
   * ```
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the ISteamUserStats interface pointer
   * 
   * Returns the native pointer to the ISteamUserStats interface, which is used
   * for achievement and stats operations.
   * 
   * @returns Pointer to ISteamUserStats interface, or null if not initialized
   * 
   * @example
   * ```typescript
   * const userStats = apiCore.getUserStatsInterface();
   * if (userStats) {
   *   // Use interface for stats/achievement operations
   * }
   * ```
   * 
   * @remarks
   * - Returns null if Steam API is not initialized
   * - This is a native pointer for use with FFI calls
   */
  getUserStatsInterface(): any {
    return this.userStatsInterface;
  }

  /**
   * Get the ISteamUser interface pointer
   * 
   * Returns the native pointer to the ISteamUser interface, which is used
   * for user identity operations.
   * 
   * @returns Pointer to ISteamUser interface, or null if not initialized
   * 
   * @example
   * ```typescript
   * const user = apiCore.getUserInterface();
   * if (user) {
   *   // Use interface for user operations
   * }
   * ```
   * 
   * @remarks
   * - Returns null if Steam API is not initialized
   * - This is a native pointer for use with FFI calls
   */
  getUserInterface(): any {
    return this.userInterface;
  }
  
  /**
   * Get the ISteamUtils interface pointer
   * 
   * Returns the native pointer to the ISteamUtils interface, which is used
   * for utility operations including API call result checking.
   * 
   * @returns Pointer to ISteamUtils interface, or null if not initialized
   * 
   * @example
   * ```typescript
   * const utils = apiCore.getUtilsInterface();
   * if (utils) {
   *   // Use interface for utility operations
   * }
   * ```
   * 
   * @remarks
   * - Returns null if Steam API is not initialized
   * - This is a native pointer for use with FFI calls
   */
  getUtilsInterface(): any {
    return this.utilsInterface;
  }
  
  /**
   * Get the ISteamFriends interface pointer
   * 
   * Returns the native pointer to the ISteamFriends interface, which is used
   * for friends list and social features.
   * 
   * @returns Pointer to ISteamFriends interface, or null if not initialized
   * 
   * @example
   * ```typescript
   * const friends = apiCore.getFriendsInterface();
   * if (friends) {
   *   // Use interface for friends operations
   * }
   * ```
   * 
   * @remarks
   * - Returns null if Steam API is not initialized
   * - This is a native pointer for use with FFI calls
   */
  getFriendsInterface(): any {
    return this.friendsInterface;
  }

  /**
   * Gets the ISteamRemoteStorage interface pointer
   * 
   * The Remote Storage interface provides access to Steam Cloud file operations,
   * allowing you to save and sync game data across devices.
   * 
   * @returns Pointer to ISteamRemoteStorage interface, or null if not initialized
   * 
   * @example
   * ```typescript
   * const remoteStorage = apiCore.getRemoteStorageInterface();
   * if (remoteStorage) {
   *   // Use interface for cloud storage operations
   * }
   * ```
   * 
   * @remarks
   * - Returns null if Steam API is not initialized
   * - This is a native pointer for use with FFI calls
   */
  getRemoteStorageInterface(): any {
    return this.remoteStorageInterface;
  }

  /**
   * Get the ISteamUGC interface pointer
   * 
   * Provides access to the Workshop/UGC (User Generated Content) interface for managing
   * Steam Workshop items.
   * 
   * @returns Pointer to ISteamUGC interface, or null if not initialized
   * 
   * @example
   * ```typescript
   * const ugc = apiCore.getUGCInterface();
   * if (ugc) {
   *   // Use interface for Workshop operations
   * }
   * ```
   * 
   * @remarks
   * - Returns null if Steam API is not initialized
   * - This is a native pointer for use with FFI calls
   */
  getUGCInterface(): any {
    return this.ugcInterface;
  }

  /**
   * Get the ISteamApps interface pointer
   * 
   * Provides access to the Apps interface for application-specific operations
   * like language detection, DLC status, and beta information.
   * 
   * @returns Pointer to ISteamApps interface, or null if not initialized
   * 
   * @example
   * ```typescript
   * const apps = apiCore.getAppsInterface();
   * if (apps) {
   *   // Use interface for apps operations
   * }
   * ```
   * 
   * @remarks
   * - Returns null if Steam API is not initialized
   * - This is a native pointer for use with FFI calls
   */
  getAppsInterface(): any {
    return this.appsInterface;
  }

  /**
   * Get the ISteamMatchmaking interface pointer
   * 
   * Provides access to the Matchmaking interface for lobby operations
   * including creating, joining, and managing game lobbies.
   * 
   * @returns Pointer to ISteamMatchmaking interface, or null if not initialized
   * 
   * @example
   * ```typescript
   * const matchmaking = apiCore.getMatchmakingInterface();
   * if (matchmaking) {
   *   // Use interface for lobby operations
   * }
   * ```
   * 
   * @remarks
   * - Returns null if Steam API is not initialized
   * - This is a native pointer for use with FFI calls
   */
  getMatchmakingInterface(): any {
    return this.matchmakingInterface;
  }

}
