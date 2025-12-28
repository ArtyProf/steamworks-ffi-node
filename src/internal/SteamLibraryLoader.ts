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
  public SteamAPI_SteamUtils_v010!: koffi.KoffiFunction;
  public SteamAPI_SteamApps_v008!: koffi.KoffiFunction;
  public SteamAPI_ISteamApps_GetCurrentGameLanguage!: koffi.KoffiFunction;
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

  // ========================================
  // Stats API Functions
  // ========================================
  
  // User stats (get/set)
  public SteamAPI_ISteamUserStats_GetStatInt32!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetStatFloat!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_SetStatInt32!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_SetStatFloat!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_UpdateAvgRateStat!: koffi.KoffiFunction;
  
  // Friend/user stats
  public SteamAPI_ISteamUserStats_GetUserStatInt32!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetUserStatFloat!: koffi.KoffiFunction;
  
  // Global stats
  public SteamAPI_ISteamUserStats_RequestGlobalStats!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetGlobalStatInt64!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetGlobalStatDouble!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetGlobalStatHistoryInt64!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetGlobalStatHistoryDouble!: koffi.KoffiFunction;
  
  // Player count
  public SteamAPI_ISteamUserStats_GetNumberOfCurrentPlayers!: koffi.KoffiFunction;

  // ========================================
  // Leaderboard API Functions
  // ========================================
  
  // Leaderboard find/create
  public SteamAPI_ISteamUserStats_FindOrCreateLeaderboard!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_FindLeaderboard!: koffi.KoffiFunction;
  
  // Leaderboard info
  public SteamAPI_ISteamUserStats_GetLeaderboardName!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetLeaderboardEntryCount!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetLeaderboardSortMethod!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetLeaderboardDisplayType!: koffi.KoffiFunction;
  
  // Leaderboard entries
  public SteamAPI_ISteamUserStats_DownloadLeaderboardEntries!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_DownloadLeaderboardEntriesForUsers!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_GetDownloadedLeaderboardEntry!: koffi.KoffiFunction;
  
  // Leaderboard upload
  public SteamAPI_ISteamUserStats_UploadLeaderboardScore!: koffi.KoffiFunction;
  public SteamAPI_ISteamUserStats_AttachLeaderboardUGC!: koffi.KoffiFunction;

  // ========================================
  // ISteamUtils API Functions (for callback results)
  // ========================================
  
  // API call result checking
  public SteamAPI_ISteamUtils_IsAPICallCompleted!: koffi.KoffiFunction;
  public SteamAPI_ISteamUtils_GetAPICallResult!: koffi.KoffiFunction;
  public SteamAPI_ISteamUtils_GetAPICallFailureReason!: koffi.KoffiFunction;

  // ========================================
  // ISteamFriends API Functions
  // ========================================
  
  // Interface accessor
  public SteamAPI_SteamFriends_v018!: koffi.KoffiFunction;
  
  // User info
  public SteamAPI_ISteamFriends_GetPersonaName!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetPersonaState!: koffi.KoffiFunction;
  
  // Friends list
  public SteamAPI_ISteamFriends_GetFriendCount!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendByIndex!: koffi.KoffiFunction;
  
  // Friend info
  public SteamAPI_ISteamFriends_GetFriendPersonaName!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendPersonaState!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendRelationship!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendSteamLevel!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendGamePlayed!: koffi.KoffiFunction;
  
  // Rich Presence
  public SteamAPI_ISteamFriends_SetRichPresence!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_ClearRichPresence!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendRichPresence!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendRichPresenceKeyCount!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendRichPresenceKeyByIndex!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_RequestFriendRichPresence!: koffi.KoffiFunction;
  
  // Overlay
  public SteamAPI_ISteamFriends_ActivateGameOverlay!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_ActivateGameOverlayToUser!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_ActivateGameOverlayToWebPage!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_ActivateGameOverlayToStore!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_ActivateGameOverlayInviteDialog!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_ActivateGameOverlayRemotePlayTogetherInviteDialog!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_ActivateGameOverlayInviteDialogConnectString!: koffi.KoffiFunction;
  
  // Avatars
  public SteamAPI_ISteamFriends_GetSmallFriendAvatar!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetMediumFriendAvatar!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetLargeFriendAvatar!: koffi.KoffiFunction;
  
  // Friend Groups
  public SteamAPI_ISteamFriends_GetFriendsGroupCount!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendsGroupIDByIndex!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendsGroupName!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendsGroupMembersCount!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendsGroupMembersList!: koffi.KoffiFunction;
  
  // Coplay (Recently Played With)
  public SteamAPI_ISteamFriends_GetCoplayFriendCount!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetCoplayFriend!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendCoplayTime!: koffi.KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendCoplayGame!: koffi.KoffiFunction;

  // ========================================
  // ISteamRemoteStorage API Functions
  // ========================================
  
  // Interface accessor
  public SteamAPI_SteamRemoteStorage_v016!: koffi.KoffiFunction;
  
  // File operations
  public SteamAPI_ISteamRemoteStorage_FileWrite!: koffi.KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_FileRead!: koffi.KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_FileExists!: koffi.KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_FileDelete!: koffi.KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_GetFileSize!: koffi.KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_GetFileTimestamp!: koffi.KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_FilePersisted!: koffi.KoffiFunction;
  
  // File iteration
  public SteamAPI_ISteamRemoteStorage_GetFileCount!: koffi.KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_GetFileNameAndSize!: koffi.KoffiFunction;
  
  // Quota and settings
  public SteamAPI_ISteamRemoteStorage_GetQuota!: koffi.KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_IsCloudEnabledForAccount!: koffi.KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_IsCloudEnabledForApp!: koffi.KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_SetCloudEnabledForApp!: koffi.KoffiFunction;

  // Batch operations
  public SteamAPI_ISteamRemoteStorage_BeginFileWriteBatch!: koffi.KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_EndFileWriteBatch!: koffi.KoffiFunction;

  // ========================================
  // ISteamUGC (Workshop) API Functions
  // ========================================
  
  // Interface accessor
  public SteamAPI_SteamUGC_v021!: koffi.KoffiFunction;
  
  // Query operations
  public SteamAPI_ISteamUGC_CreateQueryUserUGCRequest!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_CreateQueryAllUGCRequestPage!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_SendQueryUGCRequest!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_GetQueryUGCResult!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_GetQueryUGCNumTags!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_GetQueryUGCTag!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_GetQueryUGCTagDisplayName!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_GetQueryUGCPreviewURL!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_GetQueryUGCMetadata!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_GetQueryUGCChildren!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_SetReturnPlaytimeStats!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_ReleaseQueryUGCRequest!: koffi.KoffiFunction;
  
  // Subscription operations
  public SteamAPI_ISteamUGC_SubscribeItem!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_UnsubscribeItem!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_GetNumSubscribedItems!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_GetSubscribedItems!: koffi.KoffiFunction;
  
  // Item state and info
  public SteamAPI_ISteamUGC_GetItemState!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_GetItemInstallInfo!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_GetItemDownloadInfo!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_DownloadItem!: koffi.KoffiFunction;
  
  // Creation and update
  public SteamAPI_ISteamUGC_CreateItem!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_StartItemUpdate!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_SetItemTitle!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_SetItemDescription!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_SetItemVisibility!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_SetItemContent!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_SetItemPreview!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_SubmitItemUpdate!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_GetItemUpdateProgress!: koffi.KoffiFunction;
  
  // Query options
  public SteamAPI_ISteamUGC_SetSearchText!: koffi.KoffiFunction;
  
  // Voting and favorites
  public SteamAPI_ISteamUGC_SetUserItemVote!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_GetUserItemVote!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_AddItemToFavorites!: koffi.KoffiFunction;
  public SteamAPI_ISteamUGC_RemoveItemFromFavorites!: koffi.KoffiFunction;

  // ========================================
  // ISteamInput Functions
  // ========================================
  
  // Interface accessor
  public SteamAPI_SteamInput_v006!: koffi.KoffiFunction;
  
  // Initialization
  public SteamAPI_ISteamInput_Init!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_Shutdown!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_SetInputActionManifestFilePath!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_RunFrame!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_BWaitForData!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_BNewDataAvailable!: koffi.KoffiFunction;
  
  // Controller enumeration
  public SteamAPI_ISteamInput_GetConnectedControllers!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_EnableDeviceCallbacks!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_EnableActionEventCallbacks!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetInputTypeForHandle!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetControllerForGamepadIndex!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetGamepadIndexForController!: koffi.KoffiFunction;
  
  // Action sets
  public SteamAPI_ISteamInput_GetActionSetHandle!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_ActivateActionSet!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetCurrentActionSet!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_ActivateActionSetLayer!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_DeactivateActionSetLayer!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_DeactivateAllActionSetLayers!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetActiveActionSetLayers!: koffi.KoffiFunction;
  
  // Digital actions
  public SteamAPI_ISteamInput_GetDigitalActionHandle!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetDigitalActionData!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetDigitalActionOrigins!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetStringForDigitalActionName!: koffi.KoffiFunction;
  
  // Analog actions
  public SteamAPI_ISteamInput_GetAnalogActionHandle!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetAnalogActionData!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetAnalogActionOrigins!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetStringForAnalogActionName!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_StopAnalogActionMomentum!: koffi.KoffiFunction;
  
  // Motion data
  public SteamAPI_ISteamInput_GetMotionData!: koffi.KoffiFunction;
  
  // Haptics and rumble
  public SteamAPI_ISteamInput_TriggerVibration!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_TriggerVibrationExtended!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_TriggerSimpleHapticEvent!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_SetLEDColor!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_Legacy_TriggerHapticPulse!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_Legacy_TriggerRepeatedHapticPulse!: koffi.KoffiFunction;
  
  // Glyphs and strings
  public SteamAPI_ISteamInput_GetGlyphPNGForActionOrigin!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetGlyphSVGForActionOrigin!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetGlyphForActionOrigin_Legacy!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetStringForActionOrigin!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetStringForXboxOrigin!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetGlyphForXboxOrigin!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetActionOriginFromXboxOrigin!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_TranslateActionOrigin!: koffi.KoffiFunction;
  
  // Utility
  public SteamAPI_ISteamInput_ShowBindingPanel!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetDeviceBindingRevision!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetRemotePlaySessionID!: koffi.KoffiFunction;
  public SteamAPI_ISteamInput_GetSessionInputConfigurationSettings!: koffi.KoffiFunction;

  /**
   * Get platform-specific Steam library path
   * Users must download and install Steamworks SDK redistributables separately
   */
  private getSteamLibraryPath(): string | null {
    const platform = process.platform;
    const arch = process.arch;
    
    let steamworksSdkPaths: string[] = [];
    
    // Define possible Steamworks SDK locations (user must install these)
    const possibleBasePaths = [
      // Current working directory (most common for Node.js projects)
      process.cwd(),
      // Project root (if running from subdirectory)
      path.resolve(process.cwd(), '..'),
      path.resolve(process.cwd(), '../..'),
      // Parent directories relative to this module
      path.resolve(__dirname, '../..'),
      path.resolve(__dirname, '../../..'),
      path.resolve(__dirname, '../../../..'),
    ];

    // Build platform-specific library paths
    for (const basePath of possibleBasePaths) {
      let platformLibPath: string;
      
      if (platform === 'win32') {
        if (arch === 'x64') {
          platformLibPath = path.join(basePath, 'steamworks_sdk/redistributable_bin/win64/steam_api64.dll');
        } else {
          platformLibPath = path.join(basePath, 'steamworks_sdk/redistributable_bin/steam_api.dll');
        }
      } else if (platform === 'darwin') {
        platformLibPath = path.join(basePath, 'steamworks_sdk/redistributable_bin/osx/libsteam_api.dylib');
      } else if (platform === 'linux') {
        platformLibPath = path.join(basePath, 'steamworks_sdk/redistributable_bin/linux64/libsteam_api.so');
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }
      
      steamworksSdkPaths.push(path.resolve(platformLibPath));
    }
    
    // Check each possible path
    for (const checkPath of steamworksSdkPaths) {
      // Electron ASAR handling: if path contains .asar, try .asar.unpacked
      let resolvedPath = checkPath;
      if (resolvedPath.includes('.asar')) {
        resolvedPath = resolvedPath.replace('.asar', '.asar.unpacked');
      }
      if (fs.existsSync(resolvedPath)) {
        return resolvedPath;
      }
    }
    
    // If no library found, provide detailed error message
    const expectedPath = steamworksSdkPaths[0]; // Use the first (most common) path for error message
    
    console.error(
      `[Steamworks] Steamworks SDK library not found!\n\n` +
      `   Expected location: ${expectedPath}\n\n` +
      `   To fix this issue:\n` +
      `     1. Download the Steamworks SDK from: https://partner.steamgames.com/\n` +
      `     2. Extract the SDK to your project root directory\n` +
      `     3. Ensure the following structure exists:\n` +
      `        steamworks_sdk/\n` +
      `         └── redistributable_bin/\n` +
      `            ├── win64/steam_api64.dll (Windows 64-bit)\n` +
      `            ├── steam_api.dll (Windows 32-bit)\n` +
      `            ├── osx/libsteam_api.dylib (macOS)\n` +
      `            └── linux64/libsteam_api.so (Linux)\n\n` +
      `   Note: Due to Valve's licensing terms, the Steamworks SDK redistributables\n` +
      `   cannot be bundled with this package and must be downloaded separately.\n\n` +
      `   Quick verification: Run 'npm run verify-sdk' to check your setup\n\n` +
      `   Searched paths:\n${steamworksSdkPaths.map(p => `  - ${p}`).join('\n')}`
    );
    
    return null;
  }

  /**
   * Load the Steamworks library and bind all FFI functions
   */
  load(): void {
    const libPath = this.getSteamLibraryPath();
    
    if (!libPath) {
      console.error('[Steamworks] Cannot load Steamworks library: SDK not found');
      return;
    }
    
    console.log(`[Steamworks] Loading library: ${libPath}`);
    
    this.steamLib = koffi.load(libPath);

    // Define function signatures using Koffi
    this.SteamAPI_Init = this.steamLib.func('SteamAPI_InitSafe', 'bool', []);
    this.SteamAPI_Shutdown = this.steamLib.func('SteamAPI_Shutdown', 'void', []);
    this.SteamAPI_RunCallbacks = this.steamLib.func('SteamAPI_RunCallbacks', 'void', []);
    this.SteamAPI_IsSteamRunning = this.steamLib.func('SteamAPI_IsSteamRunning', 'bool', []);
    
    this.SteamAPI_SteamUserStats_v013 = this.steamLib.func('SteamAPI_SteamUserStats_v013', 'void*', []);
    this.SteamAPI_SteamUser_v023 = this.steamLib.func('SteamAPI_SteamUser_v023', 'void*', []);
    this.SteamAPI_SteamUtils_v010 = this.steamLib.func('SteamAPI_SteamUtils_v010', 'void*', []);
    this.SteamAPI_SteamApps_v008 = this.steamLib.func('SteamAPI_SteamApps_v008', 'void*', []);
    this.SteamAPI_ISteamApps_GetCurrentGameLanguage = this.steamLib.func('SteamAPI_ISteamApps_GetCurrentGameLanguage', 'str', ['void*']);
    
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
    
    // ========================================
    // Stats API Functions
    // ========================================
    
    // User stats (get/set)
    this.SteamAPI_ISteamUserStats_GetStatInt32 = this.steamLib.func('SteamAPI_ISteamUserStats_GetStatInt32', 'bool', ['void*', 'str', 'int32*']);
    this.SteamAPI_ISteamUserStats_GetStatFloat = this.steamLib.func('SteamAPI_ISteamUserStats_GetStatFloat', 'bool', ['void*', 'str', 'float*']);
    this.SteamAPI_ISteamUserStats_SetStatInt32 = this.steamLib.func('SteamAPI_ISteamUserStats_SetStatInt32', 'bool', ['void*', 'str', 'int32']);
    this.SteamAPI_ISteamUserStats_SetStatFloat = this.steamLib.func('SteamAPI_ISteamUserStats_SetStatFloat', 'bool', ['void*', 'str', 'float']);
    this.SteamAPI_ISteamUserStats_UpdateAvgRateStat = this.steamLib.func('SteamAPI_ISteamUserStats_UpdateAvgRateStat', 'bool', ['void*', 'str', 'float', 'double']);
    
    // Friend/user stats
    this.SteamAPI_ISteamUserStats_GetUserStatInt32 = this.steamLib.func('SteamAPI_ISteamUserStats_GetUserStatInt32', 'bool', ['void*', 'uint64', 'str', 'int32*']);
    this.SteamAPI_ISteamUserStats_GetUserStatFloat = this.steamLib.func('SteamAPI_ISteamUserStats_GetUserStatFloat', 'bool', ['void*', 'uint64', 'str', 'float*']);
    
    // Global stats
    this.SteamAPI_ISteamUserStats_RequestGlobalStats = this.steamLib.func('SteamAPI_ISteamUserStats_RequestGlobalStats', 'uint64', ['void*', 'int']);
    this.SteamAPI_ISteamUserStats_GetGlobalStatInt64 = this.steamLib.func('SteamAPI_ISteamUserStats_GetGlobalStatInt64', 'bool', ['void*', 'str', 'int64*']);
    this.SteamAPI_ISteamUserStats_GetGlobalStatDouble = this.steamLib.func('SteamAPI_ISteamUserStats_GetGlobalStatDouble', 'bool', ['void*', 'str', 'double*']);
    this.SteamAPI_ISteamUserStats_GetGlobalStatHistoryInt64 = this.steamLib.func('SteamAPI_ISteamUserStats_GetGlobalStatHistoryInt64', 'int32', ['void*', 'str', 'int64*', 'uint32']);
    this.SteamAPI_ISteamUserStats_GetGlobalStatHistoryDouble = this.steamLib.func('SteamAPI_ISteamUserStats_GetGlobalStatHistoryDouble', 'int32', ['void*', 'str', 'double*', 'uint32']);
    
    // Player count
    this.SteamAPI_ISteamUserStats_GetNumberOfCurrentPlayers = this.steamLib.func('SteamAPI_ISteamUserStats_GetNumberOfCurrentPlayers', 'uint64', ['void*']);
    
    // ========================================
    // Leaderboard API Functions
    // ========================================
    
    // Leaderboard find/create
    this.SteamAPI_ISteamUserStats_FindOrCreateLeaderboard = this.steamLib.func('SteamAPI_ISteamUserStats_FindOrCreateLeaderboard', 'uint64', ['void*', 'str', 'int', 'int']);
    this.SteamAPI_ISteamUserStats_FindLeaderboard = this.steamLib.func('SteamAPI_ISteamUserStats_FindLeaderboard', 'uint64', ['void*', 'str']);
    
    // Leaderboard info
    this.SteamAPI_ISteamUserStats_GetLeaderboardName = this.steamLib.func('SteamAPI_ISteamUserStats_GetLeaderboardName', 'str', ['void*', 'uint64']);
    this.SteamAPI_ISteamUserStats_GetLeaderboardEntryCount = this.steamLib.func('SteamAPI_ISteamUserStats_GetLeaderboardEntryCount', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamUserStats_GetLeaderboardSortMethod = this.steamLib.func('SteamAPI_ISteamUserStats_GetLeaderboardSortMethod', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamUserStats_GetLeaderboardDisplayType = this.steamLib.func('SteamAPI_ISteamUserStats_GetLeaderboardDisplayType', 'int', ['void*', 'uint64']);
    
    // Leaderboard entries
    this.SteamAPI_ISteamUserStats_DownloadLeaderboardEntries = this.steamLib.func('SteamAPI_ISteamUserStats_DownloadLeaderboardEntries', 'uint64', ['void*', 'uint64', 'int', 'int', 'int']);
    this.SteamAPI_ISteamUserStats_DownloadLeaderboardEntriesForUsers = this.steamLib.func('SteamAPI_ISteamUserStats_DownloadLeaderboardEntriesForUsers', 'uint64', ['void*', 'uint64', 'uint64*', 'int']);
    this.SteamAPI_ISteamUserStats_GetDownloadedLeaderboardEntry = this.steamLib.func('SteamAPI_ISteamUserStats_GetDownloadedLeaderboardEntry', 'bool', ['void*', 'uint64', 'int', 'void*', 'int32*', 'int']);
    
    // Leaderboard upload
    this.SteamAPI_ISteamUserStats_UploadLeaderboardScore = this.steamLib.func('SteamAPI_ISteamUserStats_UploadLeaderboardScore', 'uint64', ['void*', 'uint64', 'int', 'int32', 'int32*', 'int']);
    this.SteamAPI_ISteamUserStats_AttachLeaderboardUGC = this.steamLib.func('SteamAPI_ISteamUserStats_AttachLeaderboardUGC', 'uint64', ['void*', 'uint64', 'uint64']);
    
    // ========================================
    // ISteamUtils Functions
    // ========================================
    
    // API call result checking
    this.SteamAPI_ISteamUtils_IsAPICallCompleted = this.steamLib.func('SteamAPI_ISteamUtils_IsAPICallCompleted', 'bool', ['void*', 'uint64', 'bool*']);
    this.SteamAPI_ISteamUtils_GetAPICallResult = this.steamLib.func('SteamAPI_ISteamUtils_GetAPICallResult', 'bool', ['void*', 'uint64', 'void*', 'int', 'int', 'bool*']);
    this.SteamAPI_ISteamUtils_GetAPICallFailureReason = this.steamLib.func('SteamAPI_ISteamUtils_GetAPICallFailureReason', 'int', ['void*', 'uint64']);
    
    // ========================================
    // ISteamFriends Functions
    // ========================================
    
    // Interface accessor
    this.SteamAPI_SteamFriends_v018 = this.steamLib.func('SteamAPI_SteamFriends_v018', 'void*', []);
    
    // User info
    this.SteamAPI_ISteamFriends_GetPersonaName = this.steamLib.func('SteamAPI_ISteamFriends_GetPersonaName', 'str', ['void*']);
    this.SteamAPI_ISteamFriends_GetPersonaState = this.steamLib.func('SteamAPI_ISteamFriends_GetPersonaState', 'int', ['void*']);
    
    // Friends list
    this.SteamAPI_ISteamFriends_GetFriendCount = this.steamLib.func('SteamAPI_ISteamFriends_GetFriendCount', 'int', ['void*', 'int']);
    this.SteamAPI_ISteamFriends_GetFriendByIndex = this.steamLib.func('SteamAPI_ISteamFriends_GetFriendByIndex', 'uint64', ['void*', 'int', 'int']);
    
    // Friend info
    this.SteamAPI_ISteamFriends_GetFriendPersonaName = this.steamLib.func('SteamAPI_ISteamFriends_GetFriendPersonaName', 'str', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_GetFriendPersonaState = this.steamLib.func('SteamAPI_ISteamFriends_GetFriendPersonaState', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_GetFriendRelationship = this.steamLib.func('SteamAPI_ISteamFriends_GetFriendRelationship', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_GetFriendSteamLevel = this.steamLib.func('SteamAPI_ISteamFriends_GetFriendSteamLevel', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_GetFriendGamePlayed = this.steamLib.func('SteamAPI_ISteamFriends_GetFriendGamePlayed', 'bool', ['void*', 'uint64', 'void*']);
    
    // Rich Presence
    this.SteamAPI_ISteamFriends_SetRichPresence = this.steamLib.func('SteamAPI_ISteamFriends_SetRichPresence', 'bool', ['void*', 'str', 'str']);
    this.SteamAPI_ISteamFriends_ClearRichPresence = this.steamLib.func('SteamAPI_ISteamFriends_ClearRichPresence', 'void', ['void*']);
    this.SteamAPI_ISteamFriends_GetFriendRichPresence = this.steamLib.func('SteamAPI_ISteamFriends_GetFriendRichPresence', 'str', ['void*', 'uint64', 'str']);
    this.SteamAPI_ISteamFriends_GetFriendRichPresenceKeyCount = this.steamLib.func('SteamAPI_ISteamFriends_GetFriendRichPresenceKeyCount', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_GetFriendRichPresenceKeyByIndex = this.steamLib.func('SteamAPI_ISteamFriends_GetFriendRichPresenceKeyByIndex', 'str', ['void*', 'uint64', 'int']);
    this.SteamAPI_ISteamFriends_RequestFriendRichPresence = this.steamLib.func('SteamAPI_ISteamFriends_RequestFriendRichPresence', 'void', ['void*', 'uint64']);
    
    // Overlay
    this.SteamAPI_ISteamFriends_ActivateGameOverlay = this.steamLib.func('SteamAPI_ISteamFriends_ActivateGameOverlay', 'void', ['void*', 'str']);
    this.SteamAPI_ISteamFriends_ActivateGameOverlayToUser = this.steamLib.func('SteamAPI_ISteamFriends_ActivateGameOverlayToUser', 'void', ['void*', 'str', 'uint64']);
    this.SteamAPI_ISteamFriends_ActivateGameOverlayToWebPage = this.steamLib.func('SteamAPI_ISteamFriends_ActivateGameOverlayToWebPage', 'void', ['void*', 'str', 'int']);
    this.SteamAPI_ISteamFriends_ActivateGameOverlayToStore = this.steamLib.func('SteamAPI_ISteamFriends_ActivateGameOverlayToStore', 'void', ['void*', 'uint32', 'int']);
    this.SteamAPI_ISteamFriends_ActivateGameOverlayInviteDialog = this.steamLib.func('SteamAPI_ISteamFriends_ActivateGameOverlayInviteDialog', 'void', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_ActivateGameOverlayRemotePlayTogetherInviteDialog = this.steamLib.func('SteamAPI_ISteamFriends_ActivateGameOverlayRemotePlayTogetherInviteDialog', 'void', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_ActivateGameOverlayInviteDialogConnectString = this.steamLib.func('SteamAPI_ISteamFriends_ActivateGameOverlayInviteDialogConnectString', 'void', ['void*', 'str']);
    
    // Avatars
    this.SteamAPI_ISteamFriends_GetSmallFriendAvatar = this.steamLib.func('SteamAPI_ISteamFriends_GetSmallFriendAvatar', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_GetMediumFriendAvatar = this.steamLib.func('SteamAPI_ISteamFriends_GetMediumFriendAvatar', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_GetLargeFriendAvatar = this.steamLib.func('SteamAPI_ISteamFriends_GetLargeFriendAvatar', 'int', ['void*', 'uint64']);
    
    // Friend Groups
    this.SteamAPI_ISteamFriends_GetFriendsGroupCount = this.steamLib.func('SteamAPI_ISteamFriends_GetFriendsGroupCount', 'int', ['void*']);
    this.SteamAPI_ISteamFriends_GetFriendsGroupIDByIndex = this.steamLib.func('SteamAPI_ISteamFriends_GetFriendsGroupIDByIndex', 'int16', ['void*', 'int']);
    this.SteamAPI_ISteamFriends_GetFriendsGroupName = this.steamLib.func('SteamAPI_ISteamFriends_GetFriendsGroupName', 'str', ['void*', 'int16']);
    this.SteamAPI_ISteamFriends_GetFriendsGroupMembersCount = this.steamLib.func('SteamAPI_ISteamFriends_GetFriendsGroupMembersCount', 'int', ['void*', 'int16']);
    this.SteamAPI_ISteamFriends_GetFriendsGroupMembersList = this.steamLib.func('SteamAPI_ISteamFriends_GetFriendsGroupMembersList', 'void', ['void*', 'int16', 'uint64*', 'int']);
    
    // Coplay (Recently Played With)
    this.SteamAPI_ISteamFriends_GetCoplayFriendCount = this.steamLib.func('SteamAPI_ISteamFriends_GetCoplayFriendCount', 'int', ['void*']);
    this.SteamAPI_ISteamFriends_GetCoplayFriend = this.steamLib.func('SteamAPI_ISteamFriends_GetCoplayFriend', 'uint64', ['void*', 'int']);
    this.SteamAPI_ISteamFriends_GetFriendCoplayTime = this.steamLib.func('SteamAPI_ISteamFriends_GetFriendCoplayTime', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_GetFriendCoplayGame = this.steamLib.func('SteamAPI_ISteamFriends_GetFriendCoplayGame', 'uint32', ['void*', 'uint64']);
    
    // ========================================
    // ISteamRemoteStorage Functions
    // ========================================
    
    // Interface accessor
    this.SteamAPI_SteamRemoteStorage_v016 = this.steamLib.func('SteamAPI_SteamRemoteStorage_v016', 'void*', []);
    
    // File operations
    this.SteamAPI_ISteamRemoteStorage_FileWrite = this.steamLib.func('SteamAPI_ISteamRemoteStorage_FileWrite', 'bool', ['void*', 'str', 'void*', 'int32']);
    this.SteamAPI_ISteamRemoteStorage_FileRead = this.steamLib.func('SteamAPI_ISteamRemoteStorage_FileRead', 'int32', ['void*', 'str', 'void*', 'int32']);
    this.SteamAPI_ISteamRemoteStorage_FileExists = this.steamLib.func('SteamAPI_ISteamRemoteStorage_FileExists', 'bool', ['void*', 'str']);
    this.SteamAPI_ISteamRemoteStorage_FileDelete = this.steamLib.func('SteamAPI_ISteamRemoteStorage_FileDelete', 'bool', ['void*', 'str']);
    this.SteamAPI_ISteamRemoteStorage_GetFileSize = this.steamLib.func('SteamAPI_ISteamRemoteStorage_GetFileSize', 'int32', ['void*', 'str']);
    this.SteamAPI_ISteamRemoteStorage_GetFileTimestamp = this.steamLib.func('SteamAPI_ISteamRemoteStorage_GetFileTimestamp', 'int64', ['void*', 'str']);
    this.SteamAPI_ISteamRemoteStorage_FilePersisted = this.steamLib.func('SteamAPI_ISteamRemoteStorage_FilePersisted', 'bool', ['void*', 'str']);
    
    // File iteration
    this.SteamAPI_ISteamRemoteStorage_GetFileCount = this.steamLib.func('SteamAPI_ISteamRemoteStorage_GetFileCount', 'int32', ['void*']);
    this.SteamAPI_ISteamRemoteStorage_GetFileNameAndSize = this.steamLib.func('SteamAPI_ISteamRemoteStorage_GetFileNameAndSize', 'str', ['void*', 'int32', 'int32*']);
    
    // Quota and settings
    this.SteamAPI_ISteamRemoteStorage_GetQuota = this.steamLib.func('SteamAPI_ISteamRemoteStorage_GetQuota', 'bool', ['void*', 'uint64*', 'uint64*']);
    this.SteamAPI_ISteamRemoteStorage_IsCloudEnabledForAccount = this.steamLib.func('SteamAPI_ISteamRemoteStorage_IsCloudEnabledForAccount', 'bool', ['void*']);
    this.SteamAPI_ISteamRemoteStorage_IsCloudEnabledForApp = this.steamLib.func('SteamAPI_ISteamRemoteStorage_IsCloudEnabledForApp', 'bool', ['void*']);
    this.SteamAPI_ISteamRemoteStorage_SetCloudEnabledForApp = this.steamLib.func('SteamAPI_ISteamRemoteStorage_SetCloudEnabledForApp', 'void', ['void*', 'bool']);

    // Batch operations
    this.SteamAPI_ISteamRemoteStorage_BeginFileWriteBatch = this.steamLib.func('SteamAPI_ISteamRemoteStorage_BeginFileWriteBatch', 'bool', ['void*']);
    this.SteamAPI_ISteamRemoteStorage_EndFileWriteBatch = this.steamLib.func('SteamAPI_ISteamRemoteStorage_EndFileWriteBatch', 'bool', ['void*']);
    
    // ========================================
    // ISteamUGC (Workshop) Functions
    // ========================================
    
    // Interface accessor
    this.SteamAPI_SteamUGC_v021 = this.steamLib.func('SteamAPI_SteamUGC_v021', 'void*', []);
    
    // Query operations
    this.SteamAPI_ISteamUGC_CreateQueryUserUGCRequest = this.steamLib.func('SteamAPI_ISteamUGC_CreateQueryUserUGCRequest', 'uint64', ['void*', 'uint32', 'int', 'int', 'int', 'uint32', 'uint32', 'uint32']);
    this.SteamAPI_ISteamUGC_CreateQueryAllUGCRequestPage = this.steamLib.func('SteamAPI_ISteamUGC_CreateQueryAllUGCRequestPage', 'uint64', ['void*', 'int', 'int', 'uint32', 'uint32', 'uint32']);
    this.SteamAPI_ISteamUGC_SendQueryUGCRequest = this.steamLib.func('SteamAPI_ISteamUGC_SendQueryUGCRequest', 'uint64', ['void*', 'uint64']);
    this.SteamAPI_ISteamUGC_GetQueryUGCResult = this.steamLib.func('SteamAPI_ISteamUGC_GetQueryUGCResult', 'bool', ['void*', 'uint64', 'uint32', 'void*']);
    this.SteamAPI_ISteamUGC_GetQueryUGCNumTags = this.steamLib.func('SteamAPI_ISteamUGC_GetQueryUGCNumTags', 'uint32', ['void*', 'uint64', 'uint32']);
    this.SteamAPI_ISteamUGC_GetQueryUGCTag = this.steamLib.func('SteamAPI_ISteamUGC_GetQueryUGCTag', 'bool', ['void*', 'uint64', 'uint32', 'uint32', 'str', 'uint32']);
    this.SteamAPI_ISteamUGC_GetQueryUGCTagDisplayName = this.steamLib.func('SteamAPI_ISteamUGC_GetQueryUGCTagDisplayName', 'bool', ['void*', 'uint64', 'uint32', 'uint32', 'str', 'uint32']);
    this.SteamAPI_ISteamUGC_GetQueryUGCPreviewURL = this.steamLib.func('SteamAPI_ISteamUGC_GetQueryUGCPreviewURL', 'bool', ['void*', 'uint64', 'uint32', 'str', 'uint32']);
    this.SteamAPI_ISteamUGC_GetQueryUGCMetadata = this.steamLib.func('SteamAPI_ISteamUGC_GetQueryUGCMetadata', 'bool', ['void*', 'uint64', 'uint32', 'str', 'uint32']);
    this.SteamAPI_ISteamUGC_GetQueryUGCChildren = this.steamLib.func('SteamAPI_ISteamUGC_GetQueryUGCChildren', 'bool', ['void*', 'uint64', 'uint32', 'uint64*', 'uint32']);
    this.SteamAPI_ISteamUGC_SetReturnPlaytimeStats = this.steamLib.func('SteamAPI_ISteamUGC_SetReturnPlaytimeStats', 'bool', ['void*', 'uint64', 'uint32']);
    this.SteamAPI_ISteamUGC_ReleaseQueryUGCRequest = this.steamLib.func('SteamAPI_ISteamUGC_ReleaseQueryUGCRequest', 'bool', ['void*', 'uint64']);
    
    // Query options
    this.SteamAPI_ISteamUGC_SetSearchText = this.steamLib.func('SteamAPI_ISteamUGC_SetSearchText', 'bool', ['void*', 'uint64', 'string']);
    
    // Subscription operations
    this.SteamAPI_ISteamUGC_SubscribeItem = this.steamLib.func('SteamAPI_ISteamUGC_SubscribeItem', 'uint64', ['void*', 'uint64']);
    this.SteamAPI_ISteamUGC_UnsubscribeItem = this.steamLib.func('SteamAPI_ISteamUGC_UnsubscribeItem', 'uint64', ['void*', 'uint64']);
    this.SteamAPI_ISteamUGC_GetNumSubscribedItems = this.steamLib.func('SteamAPI_ISteamUGC_GetNumSubscribedItems', 'uint32', ['void*']);
    this.SteamAPI_ISteamUGC_GetSubscribedItems = this.steamLib.func('SteamAPI_ISteamUGC_GetSubscribedItems', 'uint32', ['void*', 'uint64*', 'uint32']);
    
    // Item state and info
    this.SteamAPI_ISteamUGC_GetItemState = this.steamLib.func('SteamAPI_ISteamUGC_GetItemState', 'uint32', ['void*', 'uint64']);
    this.SteamAPI_ISteamUGC_GetItemInstallInfo = this.steamLib.func('SteamAPI_ISteamUGC_GetItemInstallInfo', 'bool', ['void*', 'uint64', 'uint64*', 'str', 'uint32', 'uint32*']);
    this.SteamAPI_ISteamUGC_GetItemDownloadInfo = this.steamLib.func('SteamAPI_ISteamUGC_GetItemDownloadInfo', 'bool', ['void*', 'uint64', 'uint64*', 'uint64*']);
    this.SteamAPI_ISteamUGC_DownloadItem = this.steamLib.func('SteamAPI_ISteamUGC_DownloadItem', 'bool', ['void*', 'uint64', 'bool']);
    
    // Creation and update
    this.SteamAPI_ISteamUGC_CreateItem = this.steamLib.func('SteamAPI_ISteamUGC_CreateItem', 'uint64', ['void*', 'uint32', 'int']);
    this.SteamAPI_ISteamUGC_StartItemUpdate = this.steamLib.func('SteamAPI_ISteamUGC_StartItemUpdate', 'uint64', ['void*', 'uint32', 'uint64']);
    this.SteamAPI_ISteamUGC_SetItemTitle = this.steamLib.func('SteamAPI_ISteamUGC_SetItemTitle', 'bool', ['void*', 'uint64', 'str']);
    this.SteamAPI_ISteamUGC_SetItemDescription = this.steamLib.func('SteamAPI_ISteamUGC_SetItemDescription', 'bool', ['void*', 'uint64', 'str']);
    this.SteamAPI_ISteamUGC_SetItemVisibility = this.steamLib.func('SteamAPI_ISteamUGC_SetItemVisibility', 'bool', ['void*', 'uint64', 'int']);
    this.SteamAPI_ISteamUGC_SetItemContent = this.steamLib.func('SteamAPI_ISteamUGC_SetItemContent', 'bool', ['void*', 'uint64', 'str']);
    this.SteamAPI_ISteamUGC_SetItemPreview = this.steamLib.func('SteamAPI_ISteamUGC_SetItemPreview', 'bool', ['void*', 'uint64', 'str']);
    this.SteamAPI_ISteamUGC_SubmitItemUpdate = this.steamLib.func('SteamAPI_ISteamUGC_SubmitItemUpdate', 'uint64', ['void*', 'uint64', 'str']);
    this.SteamAPI_ISteamUGC_GetItemUpdateProgress = this.steamLib.func('SteamAPI_ISteamUGC_GetItemUpdateProgress', 'int', ['void*', 'uint64', 'uint64*', 'uint64*']);
    
    // Voting and favorites
    this.SteamAPI_ISteamUGC_SetUserItemVote = this.steamLib.func('SteamAPI_ISteamUGC_SetUserItemVote', 'uint64', ['void*', 'uint64', 'bool']);
    this.SteamAPI_ISteamUGC_GetUserItemVote = this.steamLib.func('SteamAPI_ISteamUGC_GetUserItemVote', 'uint64', ['void*', 'uint64']);
    this.SteamAPI_ISteamUGC_AddItemToFavorites = this.steamLib.func('SteamAPI_ISteamUGC_AddItemToFavorites', 'uint64', ['void*', 'uint32', 'uint64']);
    this.SteamAPI_ISteamUGC_RemoveItemFromFavorites = this.steamLib.func('SteamAPI_ISteamUGC_RemoveItemFromFavorites', 'uint64', ['void*', 'uint32', 'uint64']);
    
    // ========================================
    // ISteamInput Functions
    // ========================================
    
    // Interface accessor
    this.SteamAPI_SteamInput_v006 = this.steamLib.func('SteamAPI_SteamInput_v006', 'void*', []);
    
    // Initialization
    this.SteamAPI_ISteamInput_Init = this.steamLib.func('SteamAPI_ISteamInput_Init', 'bool', ['void*', 'bool']);
    this.SteamAPI_ISteamInput_Shutdown = this.steamLib.func('SteamAPI_ISteamInput_Shutdown', 'bool', ['void*']);
    this.SteamAPI_ISteamInput_SetInputActionManifestFilePath = this.steamLib.func('SteamAPI_ISteamInput_SetInputActionManifestFilePath', 'bool', ['void*', 'str']);
    this.SteamAPI_ISteamInput_RunFrame = this.steamLib.func('SteamAPI_ISteamInput_RunFrame', 'void', ['void*', 'bool']);
    this.SteamAPI_ISteamInput_BWaitForData = this.steamLib.func('SteamAPI_ISteamInput_BWaitForData', 'bool', ['void*', 'bool', 'uint32']);
    this.SteamAPI_ISteamInput_BNewDataAvailable = this.steamLib.func('SteamAPI_ISteamInput_BNewDataAvailable', 'bool', ['void*']);
    
    // Controller enumeration
    this.SteamAPI_ISteamInput_GetConnectedControllers = this.steamLib.func('SteamAPI_ISteamInput_GetConnectedControllers', 'int', ['void*', 'uint64*']);
    this.SteamAPI_ISteamInput_EnableDeviceCallbacks = this.steamLib.func('SteamAPI_ISteamInput_EnableDeviceCallbacks', 'void', ['void*']);
    this.SteamAPI_ISteamInput_EnableActionEventCallbacks = this.steamLib.func('SteamAPI_ISteamInput_EnableActionEventCallbacks', 'void', ['void*', 'void*']);
    this.SteamAPI_ISteamInput_GetInputTypeForHandle = this.steamLib.func('SteamAPI_ISteamInput_GetInputTypeForHandle', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamInput_GetControllerForGamepadIndex = this.steamLib.func('SteamAPI_ISteamInput_GetControllerForGamepadIndex', 'uint64', ['void*', 'int']);
    this.SteamAPI_ISteamInput_GetGamepadIndexForController = this.steamLib.func('SteamAPI_ISteamInput_GetGamepadIndexForController', 'int', ['void*', 'uint64']);
    
    // Action sets
    this.SteamAPI_ISteamInput_GetActionSetHandle = this.steamLib.func('SteamAPI_ISteamInput_GetActionSetHandle', 'uint64', ['void*', 'str']);
    this.SteamAPI_ISteamInput_ActivateActionSet = this.steamLib.func('SteamAPI_ISteamInput_ActivateActionSet', 'void', ['void*', 'uint64', 'uint64']);
    this.SteamAPI_ISteamInput_GetCurrentActionSet = this.steamLib.func('SteamAPI_ISteamInput_GetCurrentActionSet', 'uint64', ['void*', 'uint64']);
    this.SteamAPI_ISteamInput_ActivateActionSetLayer = this.steamLib.func('SteamAPI_ISteamInput_ActivateActionSetLayer', 'void', ['void*', 'uint64', 'uint64']);
    this.SteamAPI_ISteamInput_DeactivateActionSetLayer = this.steamLib.func('SteamAPI_ISteamInput_DeactivateActionSetLayer', 'void', ['void*', 'uint64', 'uint64']);
    this.SteamAPI_ISteamInput_DeactivateAllActionSetLayers = this.steamLib.func('SteamAPI_ISteamInput_DeactivateAllActionSetLayers', 'void', ['void*', 'uint64']);
    this.SteamAPI_ISteamInput_GetActiveActionSetLayers = this.steamLib.func('SteamAPI_ISteamInput_GetActiveActionSetLayers', 'int', ['void*', 'uint64', 'uint64*']);
    
    // Digital actions
    this.SteamAPI_ISteamInput_GetDigitalActionHandle = this.steamLib.func('SteamAPI_ISteamInput_GetDigitalActionHandle', 'uint64', ['void*', 'str']);
    this.SteamAPI_ISteamInput_GetDigitalActionData = this.steamLib.func('SteamAPI_ISteamInput_GetDigitalActionData', 'void', ['void*', 'uint64', 'uint64', 'void*']);
    this.SteamAPI_ISteamInput_GetDigitalActionOrigins = this.steamLib.func('SteamAPI_ISteamInput_GetDigitalActionOrigins', 'int', ['void*', 'uint64', 'uint64', 'uint64', 'int*']);
    this.SteamAPI_ISteamInput_GetStringForDigitalActionName = this.steamLib.func('SteamAPI_ISteamInput_GetStringForDigitalActionName', 'str', ['void*', 'uint64']);
    
    // Analog actions
    this.SteamAPI_ISteamInput_GetAnalogActionHandle = this.steamLib.func('SteamAPI_ISteamInput_GetAnalogActionHandle', 'uint64', ['void*', 'str']);
    this.SteamAPI_ISteamInput_GetAnalogActionData = this.steamLib.func('SteamAPI_ISteamInput_GetAnalogActionData', 'void', ['void*', 'uint64', 'uint64', 'void*']);
    this.SteamAPI_ISteamInput_GetAnalogActionOrigins = this.steamLib.func('SteamAPI_ISteamInput_GetAnalogActionOrigins', 'int', ['void*', 'uint64', 'uint64', 'uint64', 'int*']);
    this.SteamAPI_ISteamInput_GetStringForAnalogActionName = this.steamLib.func('SteamAPI_ISteamInput_GetStringForAnalogActionName', 'str', ['void*', 'uint64']);
    this.SteamAPI_ISteamInput_StopAnalogActionMomentum = this.steamLib.func('SteamAPI_ISteamInput_StopAnalogActionMomentum', 'void', ['void*', 'uint64', 'uint64']);
    
    // Motion data
    this.SteamAPI_ISteamInput_GetMotionData = this.steamLib.func('SteamAPI_ISteamInput_GetMotionData', 'void', ['void*', 'uint64', 'void*']);
    
    // Haptics and rumble
    this.SteamAPI_ISteamInput_TriggerVibration = this.steamLib.func('SteamAPI_ISteamInput_TriggerVibration', 'void', ['void*', 'uint64', 'uint16', 'uint16']);
    this.SteamAPI_ISteamInput_TriggerVibrationExtended = this.steamLib.func('SteamAPI_ISteamInput_TriggerVibrationExtended', 'void', ['void*', 'uint64', 'uint16', 'uint16', 'uint16', 'uint16']);
    this.SteamAPI_ISteamInput_TriggerSimpleHapticEvent = this.steamLib.func('SteamAPI_ISteamInput_TriggerSimpleHapticEvent', 'void', ['void*', 'uint64', 'int', 'uint8', 'int8', 'uint8', 'int8']);
    this.SteamAPI_ISteamInput_SetLEDColor = this.steamLib.func('SteamAPI_ISteamInput_SetLEDColor', 'void', ['void*', 'uint64', 'uint8', 'uint8', 'uint8', 'uint32']);
    this.SteamAPI_ISteamInput_Legacy_TriggerHapticPulse = this.steamLib.func('SteamAPI_ISteamInput_Legacy_TriggerHapticPulse', 'void', ['void*', 'uint64', 'int', 'uint16']);
    this.SteamAPI_ISteamInput_Legacy_TriggerRepeatedHapticPulse = this.steamLib.func('SteamAPI_ISteamInput_Legacy_TriggerRepeatedHapticPulse', 'void', ['void*', 'uint64', 'int', 'uint16', 'uint16', 'uint16', 'uint32']);
    
    // Glyphs and strings
    this.SteamAPI_ISteamInput_GetGlyphPNGForActionOrigin = this.steamLib.func('SteamAPI_ISteamInput_GetGlyphPNGForActionOrigin', 'str', ['void*', 'int', 'int', 'uint32']);
    this.SteamAPI_ISteamInput_GetGlyphSVGForActionOrigin = this.steamLib.func('SteamAPI_ISteamInput_GetGlyphSVGForActionOrigin', 'str', ['void*', 'int', 'uint32']);
    this.SteamAPI_ISteamInput_GetGlyphForActionOrigin_Legacy = this.steamLib.func('SteamAPI_ISteamInput_GetGlyphForActionOrigin_Legacy', 'str', ['void*', 'int']);
    this.SteamAPI_ISteamInput_GetStringForActionOrigin = this.steamLib.func('SteamAPI_ISteamInput_GetStringForActionOrigin', 'str', ['void*', 'int']);
    this.SteamAPI_ISteamInput_GetStringForXboxOrigin = this.steamLib.func('SteamAPI_ISteamInput_GetStringForXboxOrigin', 'str', ['void*', 'int']);
    this.SteamAPI_ISteamInput_GetGlyphForXboxOrigin = this.steamLib.func('SteamAPI_ISteamInput_GetGlyphForXboxOrigin', 'str', ['void*', 'int']);
    this.SteamAPI_ISteamInput_GetActionOriginFromXboxOrigin = this.steamLib.func('SteamAPI_ISteamInput_GetActionOriginFromXboxOrigin', 'int', ['void*', 'uint64', 'int']);
    this.SteamAPI_ISteamInput_TranslateActionOrigin = this.steamLib.func('SteamAPI_ISteamInput_TranslateActionOrigin', 'int', ['void*', 'int', 'int']);
    
    // Utility
    this.SteamAPI_ISteamInput_ShowBindingPanel = this.steamLib.func('SteamAPI_ISteamInput_ShowBindingPanel', 'bool', ['void*', 'uint64']);
    this.SteamAPI_ISteamInput_GetDeviceBindingRevision = this.steamLib.func('SteamAPI_ISteamInput_GetDeviceBindingRevision', 'bool', ['void*', 'uint64', 'int*', 'int*']);
    this.SteamAPI_ISteamInput_GetRemotePlaySessionID = this.steamLib.func('SteamAPI_ISteamInput_GetRemotePlaySessionID', 'uint32', ['void*', 'uint64']);
    this.SteamAPI_ISteamInput_GetSessionInputConfigurationSettings = this.steamLib.func('SteamAPI_ISteamInput_GetSessionInputConfigurationSettings', 'uint16', ['void*']);
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
