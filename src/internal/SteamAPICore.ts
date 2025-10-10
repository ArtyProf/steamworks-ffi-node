import * as fs from 'fs';
import * as path from 'path';
import { SteamInitOptions, SteamStatus } from '../types';
import { SteamLibraryLoader } from './SteamLibraryLoader';

/**
 * Core Steam API initialization and lifecycle management
 */
export class SteamAPICore {
  private libraryLoader: SteamLibraryLoader;
  private initialized: boolean = false;
  private appId: number = 0;
  private userStatsInterface: any = null;
  private userInterface: any = null;

  constructor(libraryLoader: SteamLibraryLoader) {
    this.libraryLoader = libraryLoader;
  }

  /**
   * Initialize Steam API
   */
  init(options: SteamInitOptions): boolean {
    try {
      this.appId = options.appId;

      // Set Steam App ID in environment
      process.env.SteamAppId = this.appId.toString();
      
      // Also create steam_appid.txt file (Steam requirement)
      const appIdFilePath = path.join(process.cwd(), 'steam_appid.txt');
      fs.writeFileSync(appIdFilePath, this.appId.toString());

      console.log(`[Steamworks] Loading Steamworks SDK for App ID: ${this.appId}`);
      
      // Load the library
      this.libraryLoader.load();

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
      console.error('   1. Steam client is running and you\'re logged in');
      console.error('   2. Steamworks SDK is in steamworks_sdk/ directory');
      console.error('   3. You have Visual Studio C++ Redistributable installed');
      return false;
    }
  }

  /**
   * Shutdown Steam API
   */
  shutdown(): void {
    if (this.libraryLoader.isLoaded() && this.initialized) {
      console.log('[Steamworks] Shutting down Steam API...');
      this.libraryLoader.SteamAPI_Shutdown();
      this.initialized = false;
      this.userStatsInterface = null;
      this.userInterface = null;
      console.log('[Steamworks] Steam API shutdown complete');
    }
  }

  /**
   * Get current Steam status
   */
  getStatus(): SteamStatus {
    let steamId = '0';
    
    if (this.initialized && this.userInterface && this.userInterface !== null) {
      try {
        const steamIdNum = this.libraryLoader.SteamAPI_ISteamUser_GetSteamID(this.userInterface);
        steamId = steamIdNum.toString();
      } catch (error) {
        console.warn('Failed to get Steam ID:', (error as Error).message);
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
   */
  runCallbacks(): void {
    if (this.initialized && this.libraryLoader.isLoaded()) {
      try {
        this.libraryLoader.SteamAPI_RunCallbacks();
      } catch (error) {
        console.warn('Warning: Error running Steam callbacks:', (error as Error).message);
      }
    }
  }

  /**
   * Check if Steam client is running
   */
  isSteamRunning(): boolean {
    if (this.initialized && this.libraryLoader.isLoaded()) {
      try {
        return this.libraryLoader.SteamAPI_IsSteamRunning();
      } catch (error) {
        console.warn('Warning: Error checking if Steam is running:', (error as Error).message);
        return false;
      }
    }
    return false;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get UserStats interface pointer
   */
  getUserStatsInterface(): any {
    return this.userStatsInterface;
  }

  /**
   * Get User interface pointer
   */
  getUserInterface(): any {
    return this.userInterface;
  }
}
