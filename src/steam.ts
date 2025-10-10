import * as koffi from 'koffi';
import * as path from 'path';
import * as fs from 'fs';
import { SteamAchievement, SteamInitOptions, SteamStatus } from './types';

/**
 * Real Steamworks SDK implementation using Koffi FFI
 * This connects directly to the actual Steam client and Steamworks SDK
 */
class SteamworksSDK {
  private static instance: SteamworksSDK;
  private steamLib: koffi.IKoffiLib | null = null;
  private initialized: boolean = false;
  private appId: number = 0;
  private userStatsInterface: any = null;

  // Koffi function declarations
  private SteamAPI_Init!: koffi.KoffiFunction;
  private SteamAPI_Shutdown!: koffi.KoffiFunction;
  private SteamAPI_RunCallbacks!: koffi.KoffiFunction;
  private SteamAPI_IsSteamRunning!: koffi.KoffiFunction;
  private SteamAPI_SteamUserStats_v013!: koffi.KoffiFunction;
  private SteamAPI_SteamUser_v023!: koffi.KoffiFunction;
  private SteamAPI_ISteamUserStats_GetNumAchievements!: koffi.KoffiFunction;
  private SteamAPI_ISteamUserStats_GetAchievementName!: koffi.KoffiFunction;
  private SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute!: koffi.KoffiFunction;
  private SteamAPI_ISteamUserStats_GetAchievement!: koffi.KoffiFunction;
  private SteamAPI_ISteamUserStats_SetAchievement!: koffi.KoffiFunction;
  private SteamAPI_ISteamUserStats_ClearAchievement!: koffi.KoffiFunction;
  private SteamAPI_ISteamUserStats_StoreStats!: koffi.KoffiFunction;
  private SteamAPI_ISteamUserStats_RequestCurrentStats!: koffi.KoffiFunction;
  private SteamAPI_ISteamUser_GetSteamID!: koffi.KoffiFunction;

  private constructor() {}

  static getInstance(): SteamworksSDK {
    if (!SteamworksSDK.instance) {
      SteamworksSDK.instance = new SteamworksSDK();
    }
    return SteamworksSDK.instance;
  }

  /**
   * Get platform-specific Steam library path
   */
  private getSteamLibraryPath(): string {
    const platform = process.platform;
    const arch = process.arch;
    
    let libPath: string;
    
    if (platform === 'win32') {
      if (arch === 'x64') {
        libPath = path.join(__dirname, '../steamworks_sdk/redistributable_bin/win64/steam_api64.dll');
      } else {
        libPath = path.join(__dirname, '../steamworks_sdk/redistributable_bin/steam_api.dll');
      }
    } else if (platform === 'darwin') {
      libPath = path.join(__dirname, '../steamworks_sdk/redistributable_bin/osx/libsteam_api.dylib');
    } else if (platform === 'linux') {
      libPath = path.join(__dirname, '../steamworks_sdk/redistributable_bin/linux64/libsteam_api.so');
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    
    // Check if the library exists
    if (!fs.existsSync(libPath)) {
      throw new Error(`Steamworks SDK library not found at: ${libPath}\n` +
        'Please download Steamworks SDK and place it in the steamworks_sdk/ directory.');
    }
    
    return libPath;
  }

  /**
   * Initialize Steam API with real Steamworks SDK
   */
  init(options: SteamInitOptions): boolean {
    try {
      this.appId = options.appId;

      // Set Steam App ID in environment
      process.env.SteamAppId = this.appId.toString();
      
      // Also create steam_appid.txt file (Steam requirement)
      const appIdFilePath = path.join(process.cwd(), 'steam_appid.txt');
      fs.writeFileSync(appIdFilePath, this.appId.toString());

      console.log(`🔌 Loading Steamworks SDK for App ID: ${this.appId}`);
      
      // Load Steam API library using Koffi
      const libPath = this.getSteamLibraryPath();
      console.log(`📚 Loading library: ${libPath}`);
      
      this.steamLib = koffi.load(libPath);

      // Define function signatures using Koffi
      this.SteamAPI_Init = this.steamLib.func('SteamAPI_InitSafe', 'bool', []);
      this.SteamAPI_Shutdown = this.steamLib.func('SteamAPI_Shutdown', 'void', []);
      this.SteamAPI_RunCallbacks = this.steamLib.func('SteamAPI_RunCallbacks', 'void', []);
      this.SteamAPI_IsSteamRunning = this.steamLib.func('SteamAPI_IsSteamRunning', 'bool', []);
      
      this.SteamAPI_SteamUserStats_v013 = this.steamLib.func('SteamAPI_SteamUserStats_v013', 'void*', []);
      this.SteamAPI_SteamUser_v023 = this.steamLib.func('SteamAPI_SteamUser_v023', 'void*', []);
      
      this.SteamAPI_ISteamUserStats_GetNumAchievements = this.steamLib.func('SteamAPI_ISteamUserStats_GetNumAchievements', 'uint32', ['void*']);
      this.SteamAPI_ISteamUserStats_GetAchievementName = this.steamLib.func('SteamAPI_ISteamUserStats_GetAchievementName', 'str', ['void*', 'uint32']);
      this.SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute = this.steamLib.func('SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute', 'str', ['void*', 'str', 'str']);
      this.SteamAPI_ISteamUserStats_GetAchievement = this.steamLib.func('SteamAPI_ISteamUserStats_GetAchievement', 'bool', ['void*', 'str', 'bool*']);
      this.SteamAPI_ISteamUserStats_SetAchievement = this.steamLib.func('SteamAPI_ISteamUserStats_SetAchievement', 'bool', ['void*', 'str']);
      this.SteamAPI_ISteamUserStats_ClearAchievement = this.steamLib.func('SteamAPI_ISteamUserStats_ClearAchievement', 'bool', ['void*', 'str']);
      this.SteamAPI_ISteamUserStats_StoreStats = this.steamLib.func('SteamAPI_ISteamUserStats_StoreStats', 'bool', ['void*']);
      this.SteamAPI_ISteamUserStats_RequestCurrentStats = this.steamLib.func('SteamAPI_ISteamUserStats_RequestUserStats', 'uint64', ['void*', 'uint64']);
      this.SteamAPI_ISteamUser_GetSteamID = this.steamLib.func('SteamAPI_ISteamUser_GetSteamID', 'uint64', ['void*']);

      console.log('🚀 Initializing Steam API...');
      
      // Initialize Steam API
      const initResult = this.SteamAPI_Init();
      
      if (!initResult) {
        throw new Error('SteamAPI_Init() failed. Make sure Steam client is running and you\'re logged in.');
      }

      // Check if Steam is running
      const steamRunning = this.SteamAPI_IsSteamRunning();
      if (!steamRunning) {
        console.warn('⚠️ Steam client might not be running properly');
      }

      // Get UserStats interface
      this.userStatsInterface = this.SteamAPI_SteamUserStats_v013();
      if (!this.userStatsInterface || this.userStatsInterface === null) {
        throw new Error('Failed to get SteamUserStats interface');
      }

      // Request current stats from Steam servers
      console.log('📊 Requesting current stats from Steam...');
      // Use 0 as SteamID to request stats for current user
      const statsRequested = this.SteamAPI_ISteamUserStats_RequestCurrentStats(this.userStatsInterface, 0);
      
      if (!statsRequested) {
        console.warn('⚠️ Failed to request current stats from Steam servers');
      }

      // Run callbacks to process any pending Steam events
      this.SteamAPI_RunCallbacks();

      this.initialized = true;
      console.log('✅ Steam API initialized successfully!');
      console.log(`🎮 Connected to Steam for App ID: ${this.appId}`);
      
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Steam API:', (error as Error).message);
      console.error('💡 Make sure:');
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
    if (this.steamLib && this.initialized) {
      console.log('🔌 Shutting down Steam API...');
      this.SteamAPI_Shutdown();
      this.initialized = false;
      this.userStatsInterface = null;
      console.log('✅ Steam API shutdown complete');
    }
  }

  /**
   * Get current Steam status
   */
  getStatus(): SteamStatus {
    let steamId = '0';
    
    if (this.initialized && this.steamLib) {
      try {
        const userInterface = this.SteamAPI_SteamUser_v023();
        if (userInterface && userInterface !== null) {
          const steamIdNum = this.SteamAPI_ISteamUser_GetSteamID(userInterface);
          steamId = steamIdNum.toString();
        }
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
   * Get all achievements from Steam
   */
  async getAllAchievements(): Promise<SteamAchievement[]> {
    if (!this.initialized || !this.steamLib || !this.userStatsInterface) {
      console.warn('⚠️ Steam API not initialized');
      return [];
    }

    try {
      // Run callbacks to ensure we have latest data
      this.SteamAPI_RunCallbacks();

      const achievements: SteamAchievement[] = [];
      const numAchievements = this.SteamAPI_ISteamUserStats_GetNumAchievements(this.userStatsInterface);
      
      console.log(`📋 Found ${numAchievements} achievements in Steam`);

      for (let i = 0; i < numAchievements; i++) {
        try {
          // Get achievement API name
          const apiName = this.SteamAPI_ISteamUserStats_GetAchievementName(this.userStatsInterface, i);
          if (!apiName) continue;

          // Get display name
          const displayName = this.SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute(
            this.userStatsInterface, apiName, 'name'
          ) || apiName;

          // Get description
          const description = this.SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute(
            this.userStatsInterface, apiName, 'desc'
          ) || '';

          // Check if unlocked
          const unlockedPtr = koffi.alloc('bool', 1);
          const hasAchievement = this.SteamAPI_ISteamUserStats_GetAchievement(
            this.userStatsInterface, apiName, unlockedPtr
          );
          
          const unlocked = hasAchievement ? koffi.decode(unlockedPtr, 'bool') : false;

          achievements.push({
            apiName,
            displayName,
            description,
            unlocked,
            unlockTime: unlocked ? Date.now() : 0 // Steam doesn't provide unlock time easily
          });

        } catch (error) {
          console.warn(`Failed to get achievement ${i}:`, (error as Error).message);
        }
      }

      return achievements;

    } catch (error) {
      console.error('❌ Failed to get achievements:', (error as Error).message);
      return [];
    }
  }

  /**
   * Unlock achievement in Steam
   */
  async unlockAchievement(apiName: string): Promise<boolean> {
    if (!this.initialized || !this.steamLib || !this.userStatsInterface) {
      console.warn('⚠️ Steam API not initialized');
      return false;
    }

    try {
      console.log(`🔓 Attempting to unlock achievement: ${apiName}`);
      
      // Set the achievement
      const result = this.SteamAPI_ISteamUserStats_SetAchievement(this.userStatsInterface, apiName);
      
      if (result) {
        // Store stats to commit the achievement to Steam servers
        const storeResult = this.SteamAPI_ISteamUserStats_StoreStats(this.userStatsInterface);
        
        if (storeResult) {
          // Run callbacks to process the achievement unlock
          this.SteamAPI_RunCallbacks();
          
          console.log(`🏆 Achievement unlocked successfully: ${apiName}`);
          return true;
        } else {
          console.error(`❌ Failed to store stats for achievement: ${apiName}`);
          return false;
        }
      } else {
        console.error(`❌ Failed to set achievement: ${apiName}`);
        return false;
      }

    } catch (error) {
      console.error(`❌ Error unlocking achievement ${apiName}:`, (error as Error).message);
      return false;
    }
  }

  /**
   * Clear achievement in Steam (for testing)
   */
  async clearAchievement(apiName: string): Promise<boolean> {
    if (!this.initialized || !this.steamLib || !this.userStatsInterface) {
      console.warn('⚠️ Steam API not initialized');
      return false;
    }

    try {
      console.log(`🔒 Attempting to clear achievement: ${apiName}`);
      
      // Clear the achievement
      const result = this.SteamAPI_ISteamUserStats_ClearAchievement(this.userStatsInterface, apiName);
      
      if (result) {
        // Store stats to commit the change to Steam servers
        const storeResult = this.SteamAPI_ISteamUserStats_StoreStats(this.userStatsInterface);
        
        if (storeResult) {
          // Run callbacks to process the change
          this.SteamAPI_RunCallbacks();
          
          console.log(`🔒 Achievement cleared successfully: ${apiName}`);
          return true;
        } else {
          console.error(`❌ Failed to store stats for clearing achievement: ${apiName}`);
          return false;
        }
      } else {
        console.error(`❌ Failed to clear achievement: ${apiName}`);
        return false;
      }

    } catch (error) {
      console.error(`❌ Error clearing achievement ${apiName}:`, (error as Error).message);
      return false;
    }
  }

  /**
   * Check if achievement is unlocked
   */
  async isAchievementUnlocked(apiName: string): Promise<boolean> {
    if (!this.initialized || !this.steamLib || !this.userStatsInterface) {
      return false;
    }

    try {
      const unlockedPtr = koffi.alloc('bool', 1);
      const hasAchievement = this.SteamAPI_ISteamUserStats_GetAchievement(
        this.userStatsInterface, apiName, unlockedPtr
      );
      
      return hasAchievement ? koffi.decode(unlockedPtr, 'bool') : false;

    } catch (error) {
      console.error(`❌ Error checking achievement ${apiName}:`, (error as Error).message);
      return false;
    }
  }

  /**
   * Get achievement by API name
   */
  async getAchievement(apiName: string): Promise<SteamAchievement | null> {
    const achievements = await this.getAllAchievements();
    return achievements.find(a => a.apiName === apiName) || null;
  }

  /**
   * Get total number of achievements
   */
  async getTotalCount(): Promise<number> {
    if (!this.initialized || !this.steamLib || !this.userStatsInterface) {
      return 0;
    }

    try {
      return this.SteamAPI_ISteamUserStats_GetNumAchievements(this.userStatsInterface);
    } catch (error) {
      console.error('❌ Error getting achievement count:', (error as Error).message);
      return 0;
    }
  }

  /**
   * Get number of unlocked achievements
   */
  async getUnlockedCount(): Promise<number> {
    const achievements = await this.getAllAchievements();
    return achievements.filter(a => a.unlocked).length;
  }

  /**
   * Run Steam callbacks to process pending events
   */
  runCallbacks(): void {
    if (this.initialized && this.steamLib) {
      try {
        this.SteamAPI_RunCallbacks();
      } catch (error) {
        console.warn('Warning: Error running Steam callbacks:', (error as Error).message);
      }
    }
  }

  /**
   * Check if Steam client is running
   */
  isSteamRunning(): boolean {
    if (this.initialized && this.steamLib) {
      try {
        return this.SteamAPI_IsSteamRunning();
      } catch (error) {
        console.warn('Warning: Error checking if Steam is running:', (error as Error).message);
        return false;
      }
    }
    return false;
  }
}

export default SteamworksSDK;