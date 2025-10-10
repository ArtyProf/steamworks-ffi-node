import * as koffi from 'koffi';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Handles loading the Steamworks native library and FFI function declarations
 */
export class SteamLibraryLoader {
  private steamLib: koffi.IKoffiLib | null = null;

  // Koffi function declarations
  public SteamAPI_Init!: koffi.KoffiFunction;
  public SteamAPI_Shutdown!: koffi.KoffiFunction;
  public SteamAPI_RunCallbacks!: koffi.KoffiFunction;
  public SteamAPI_IsSteamRunning!: koffi.KoffiFunction;
  public SteamAPI_SteamUserStats_v013!: koffi.KoffiFunction;
  public SteamAPI_SteamUser_v023!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetNumAchievements!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetAchievementName!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetAchievement!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetAchievementAndUnlockTime!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_SetAchievement!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_ClearAchievement!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_StoreStats!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_RequestCurrentStats!: koffi.KoffiFunction;
  public SteamAPI_ISteamUser_GetSteamID!: koffi.KoffiFunction;
  
  // Achievement icon and visual functions
  public SteamAPI_ISteamUserStats_GetAchievementIcon!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_IndicateAchievementProgress!: koffi.KoffiFunction;
  
  // Achievement progress limits
  public SteamAPI_ISteamUserStats_GetAchievementProgressLimitsInt32!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetAchievementProgressLimitsFloat!: koffi.KoffiFunction;
  
  // Friend/user achievements
  public SteamAPI_ISteamUserStats_RequestUserStats!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetUserAchievement!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetUserAchievementAndUnlockTime!: koffi.KoffiFunction;
  
  // Global achievement percentages
  public SteamAPI_ISteamUserStats_RequestGlobalAchievementPercentages!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetMostAchievedAchievementInfo!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetNextMostAchievedAchievementInfo!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetAchievementAchievedPercent!: koffi.KoffiFunction;
  
  // Reset stats
  public SteamAPI_ISteamUserStats_ResetAllStats!: koffi.KoffiFunction;

  /**
   * Get platform-specific Steam library path
   */
  private getSteamLibraryPath(): string {
    const platform = process.platform;
    const arch = process.arch;
    
    let libPath: string;
    
    if (platform === 'win32') {
      if (arch === 'x64') {
        libPath = path.join(__dirname, '../../steamworks_sdk/redistributable_bin/win64/steam_api64.dll');
      } else {
        libPath = path.join(__dirname, '../../steamworks_sdk/redistributable_bin/steam_api.dll');
      }
    } else if (platform === 'darwin') {
      libPath = path.join(__dirname, '../../steamworks_sdk/redistributable_bin/osx/libsteam_api.dylib');
    } else if (platform === 'linux') {
      libPath = path.join(__dirname, '../../steamworks_sdk/redistributable_bin/linux64/libsteam_api.so');
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
   * Load the Steamworks library and bind all FFI functions
   */
  load(): void {
    const libPath = this.getSteamLibraryPath();
    console.log(`[Steamworks] Loading library: ${libPath}`);
    
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
    this.SteamAPI_ISteamUserStats_GetAchievementAndUnlockTime = this.steamLib.func('SteamAPI_ISteamUserStats_GetAchievementAndUnlockTime', 'bool', ['void*', 'str', 'bool*', 'uint32*']);
    this.SteamAPI_ISteamUserStats_SetAchievement = this.steamLib.func('SteamAPI_ISteamUserStats_SetAchievement', 'bool', ['void*', 'str']);
    this.SteamAPI_ISteamUserStats_ClearAchievement = this.steamLib.func('SteamAPI_ISteamUserStats_ClearAchievement', 'bool', ['void*', 'str']);
    this.SteamAPI_ISteamUserStats_StoreStats = this.steamLib.func('SteamAPI_ISteamUserStats_StoreStats', 'bool', ['void*']);
    this.SteamAPI_ISteamUserStats_RequestCurrentStats = this.steamLib.func('SteamAPI_ISteamUserStats_RequestUserStats', 'uint64', ['void*', 'uint64']);
    this.SteamAPI_ISteamUser_GetSteamID = this.steamLib.func('SteamAPI_ISteamUser_GetSteamID', 'uint64', ['void*']);
    
    // Achievement icon and visual functions
    this.SteamAPI_ISteamUserStats_GetAchievementIcon = this.steamLib.func('SteamAPI_ISteamUserStats_GetAchievementIcon', 'int', ['void*', 'str']);
    this.SteamAPI_ISteamUserStats_IndicateAchievementProgress = this.steamLib.func('SteamAPI_ISteamUserStats_IndicateAchievementProgress', 'bool', ['void*', 'str', 'uint32', 'uint32']);
    
    // Achievement progress limits
    this.SteamAPI_ISteamUserStats_GetAchievementProgressLimitsInt32 = this.steamLib.func('SteamAPI_ISteamUserStats_GetAchievementProgressLimitsInt32', 'bool', ['void*', 'str', 'int32*', 'int32*']);
    this.SteamAPI_ISteamUserStats_GetAchievementProgressLimitsFloat = this.steamLib.func('SteamAPI_ISteamUserStats_GetAchievementProgressLimitsFloat', 'bool', ['void*', 'str', 'float*', 'float*']);
    
    // Friend/user achievements
    this.SteamAPI_ISteamUserStats_RequestUserStats = this.steamLib.func('SteamAPI_ISteamUserStats_RequestUserStats', 'uint64', ['void*', 'uint64']);
    this.SteamAPI_ISteamUserStats_GetUserAchievement = this.steamLib.func('SteamAPI_ISteamUserStats_GetUserAchievement', 'bool', ['void*', 'uint64', 'str', 'bool*']);
    this.SteamAPI_ISteamUserStats_GetUserAchievementAndUnlockTime = this.steamLib.func('SteamAPI_ISteamUserStats_GetUserAchievementAndUnlockTime', 'bool', ['void*', 'uint64', 'str', 'bool*', 'uint32*']);
    
    // Global achievement percentages
    this.SteamAPI_ISteamUserStats_RequestGlobalAchievementPercentages = this.steamLib.func('SteamAPI_ISteamUserStats_RequestGlobalAchievementPercentages', 'uint64', ['void*']);
    this.SteamAPI_ISteamUserStats_GetMostAchievedAchievementInfo = this.steamLib.func('SteamAPI_ISteamUserStats_GetMostAchievedAchievementInfo', 'int', ['void*', 'char*', 'uint32', 'float*', 'bool*']);
    this.SteamAPI_ISteamUserStats_GetNextMostAchievedAchievementInfo = this.steamLib.func('SteamAPI_ISteamUserStats_GetNextMostAchievedAchievementInfo', 'int', ['void*', 'int', 'char*', 'uint32', 'float*', 'bool*']);
    this.SteamAPI_ISteamUserStats_GetAchievementAchievedPercent = this.steamLib.func('SteamAPI_ISteamUserStats_GetAchievementAchievedPercent', 'bool', ['void*', 'str', 'float*']);
    
    // Reset stats
    this.SteamAPI_ISteamUserStats_ResetAllStats = this.steamLib.func('SteamAPI_ISteamUserStats_ResetAllStats', 'bool', ['void*', 'bool']);
  }

  /**
   * Check if library is loaded
   */
  isLoaded(): boolean {
    return this.steamLib !== null;
  }

  /**
   * Get the loaded library instance
   */
  getLibrary(): koffi.IKoffiLib | null {
    return this.steamLib;
  }
}
