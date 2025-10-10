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
