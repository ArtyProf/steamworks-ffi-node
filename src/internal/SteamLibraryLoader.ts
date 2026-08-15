import * as koffi from 'koffi';
import * as path from 'path';
import * as fs from 'fs';
import { SteamLogger } from './SteamLogger';

type KoffiFunction = koffi.KoffiFunc<(...args: any[]) => any>;

// Define callback prototype at module level
// The callback receives a pointer to SteamNetConnectionStatusChangedCallback_t
// Using 'void*' for the parameter since we'll decode it manually
export const FnSteamNetConnectionStatusChanged = koffi.proto(
  'FnSteamNetConnectionStatusChanged', 
  'void', 
  ['void*']
);
// Pointer type for the callback - needed for FFI declarations
export const FnSteamNetConnectionStatusChangedPtr = koffi.pointer(FnSteamNetConnectionStatusChanged);

// CCallbackBase structure for Steam callback registration
// This mimics the C++ CCallbackBase class layout for FFI
// See steam_api_common.h for the C++ implementation
//
// On Windows x64: vfptr (8) + m_nCallbackFlags (1) + padding (3) + m_iCallback (4) = 16 bytes
// On other platforms: similar layout but may differ
export const CCallbackBase = koffi.struct('CCallbackBase', {
  vfptr: 'void*',           // Virtual function table pointer (8 bytes on x64)
  m_nCallbackFlags: 'uint8', // 1 byte
  _pad: koffi.array('uint8', 3), // 3 bytes padding for alignment
  m_iCallback: 'int32'      // 4 bytes
});

// Callback prototypes for CCallbackBase virtual functions
export const FnCallbackRun = koffi.proto('void FnCallbackRun(void *self, void *pvParam)');
export const FnCallbackRunPtr = koffi.pointer(FnCallbackRun);

export const FnCallbackRunResult = koffi.proto('void FnCallbackRunResult(void *self, void *pvParam, bool bIOFailure, uint64 hSteamAPICall)');
export const FnCallbackRunResultPtr = koffi.pointer(FnCallbackRunResult);

export const FnGetCallbackSizeBytes = koffi.proto('int FnGetCallbackSizeBytes(void *self)');
export const FnGetCallbackSizeBytesPtr = koffi.pointer(FnGetCallbackSizeBytes);

// InputDigitalActionData_t: 2 booleans (bState, bActive) = 2 bytes
// Returned by value in registers on all platforms — must use struct return type
// (not void + output buffer) so SysV x86_64 ABI reads the result from RAX/RDX
export const InputDigitalActionData_t = koffi.struct('InputDigitalActionData_t', {
  bState: 'bool',
  bActive: 'bool',
});

// InputAnalogActionData_t: int eMode + float x + float y + bool bActive = 13 bytes
// Returned by value in registers on all platforms — same ABI fix required
export const InputAnalogActionData_t = koffi.struct('InputAnalogActionData_t', {
  eMode: 'int',
  x: 'float',
  y: 'float',
  bActive: 'bool',
});

// InputMotionData_t: 10 floats = 40 bytes
// Exceeds 16-byte SysV register limit → hidden pointer return convention on Linux x86_64
// koffi automatically handles the hidden pointer when the return type is a struct > 16 bytes
export const InputMotionData_t = koffi.struct('InputMotionData_t', {
  rotQuatX: 'float',
  rotQuatY: 'float',
  rotQuatZ: 'float',
  rotQuatW: 'float',
  posAccelX: 'float',
  posAccelY: 'float',
  posAccelZ: 'float',
  rotVelX: 'float',
  rotVelY: 'float',
  rotVelZ: 'float',
});

/**
 * Handles loading the Steamworks native library and FFI function declarations
 */
export class SteamLibraryLoader {
  private steamLib: koffi.LibraryHandle | null = null;

  // Koffi function declarations
  public SteamAPI_Init!: KoffiFunction;
  public SteamAPI_Shutdown!: KoffiFunction;
  public SteamAPI_RunCallbacks!: KoffiFunction;
  public SteamAPI_IsSteamRunning!: KoffiFunction;
  public SteamAPI_RestartAppIfNecessary!: KoffiFunction;
  
  // Callback registration functions
  public SteamAPI_RegisterCallback!: KoffiFunction;
  public SteamAPI_UnregisterCallback!: KoffiFunction;
  
  public SteamAPI_SteamUserStats_v013!: KoffiFunction;
  public SteamAPI_SteamUser_v023!: KoffiFunction;
  public SteamAPI_SteamUtils_v010!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetNumAchievements!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetAchievementName!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetAchievement!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetAchievementAndUnlockTime!: KoffiFunction;
  public SteamAPI_ISteamUserStats_SetAchievement!: KoffiFunction;
  public SteamAPI_ISteamUserStats_ClearAchievement!: KoffiFunction;
  public SteamAPI_ISteamUserStats_StoreStats!: KoffiFunction;
  public SteamAPI_ISteamUserStats_RequestCurrentStats!: KoffiFunction;
  public SteamAPI_ISteamUser_GetSteamID!: KoffiFunction;
  
  // Achievement icon and visual functions
  public SteamAPI_ISteamUserStats_GetAchievementIcon!: KoffiFunction;
  public SteamAPI_ISteamUserStats_IndicateAchievementProgress!: KoffiFunction;
  
  // Achievement progress limits
  public SteamAPI_ISteamUserStats_GetAchievementProgressLimitsInt32!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetAchievementProgressLimitsFloat!: KoffiFunction;
  
  // Friend/user achievements
  public SteamAPI_ISteamUserStats_RequestUserStats!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetUserAchievement!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetUserAchievementAndUnlockTime!: KoffiFunction;
  
  // Global achievement percentages
  public SteamAPI_ISteamUserStats_RequestGlobalAchievementPercentages!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetMostAchievedAchievementInfo!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetNextMostAchievedAchievementInfo!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetAchievementAchievedPercent!: KoffiFunction;
  
  // Reset stats
  public SteamAPI_ISteamUserStats_ResetAllStats!: KoffiFunction;

  // ========================================
  // Stats API Functions
  // ========================================
  
  // User stats (get/set)
  public SteamAPI_ISteamUserStats_GetStatInt32!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetStatFloat!: KoffiFunction;
  public SteamAPI_ISteamUserStats_SetStatInt32!: KoffiFunction;
  public SteamAPI_ISteamUserStats_SetStatFloat!: KoffiFunction;
  public SteamAPI_ISteamUserStats_UpdateAvgRateStat!: KoffiFunction;
  
  // Friend/user stats
  public SteamAPI_ISteamUserStats_GetUserStatInt32!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetUserStatFloat!: KoffiFunction;
  
  // Global stats
  public SteamAPI_ISteamUserStats_RequestGlobalStats!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetGlobalStatInt64!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetGlobalStatDouble!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetGlobalStatHistoryInt64!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetGlobalStatHistoryDouble!: KoffiFunction;
  
  // Player count
  public SteamAPI_ISteamUserStats_GetNumberOfCurrentPlayers!: KoffiFunction;

  // ========================================
  // Leaderboard API Functions
  // ========================================
  
  // Leaderboard find/create
  public SteamAPI_ISteamUserStats_FindOrCreateLeaderboard!: KoffiFunction;
  public SteamAPI_ISteamUserStats_FindLeaderboard!: KoffiFunction;
  
  // Leaderboard info
  public SteamAPI_ISteamUserStats_GetLeaderboardName!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetLeaderboardEntryCount!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetLeaderboardSortMethod!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetLeaderboardDisplayType!: KoffiFunction;
  
  // Leaderboard entries
  public SteamAPI_ISteamUserStats_DownloadLeaderboardEntries!: KoffiFunction;
  public SteamAPI_ISteamUserStats_DownloadLeaderboardEntriesForUsers!: KoffiFunction;
  public SteamAPI_ISteamUserStats_GetDownloadedLeaderboardEntry!: KoffiFunction;
  
  // Leaderboard upload
  public SteamAPI_ISteamUserStats_UploadLeaderboardScore!: KoffiFunction;
  public SteamAPI_ISteamUserStats_AttachLeaderboardUGC!: KoffiFunction;

  // ========================================
  // ISteamUtils API Functions (for callback results)
  // ========================================
  
  // API call result checking
  public SteamAPI_ISteamUtils_IsAPICallCompleted!: KoffiFunction;
  public SteamAPI_ISteamUtils_GetAPICallResult!: KoffiFunction;
  public SteamAPI_ISteamUtils_GetAPICallFailureReason!: KoffiFunction;
  
  // System information
  public SteamAPI_ISteamUtils_GetIPCountry!: KoffiFunction;
  public SteamAPI_ISteamUtils_GetCurrentBatteryPower!: KoffiFunction;
  public SteamAPI_ISteamUtils_GetAppID!: KoffiFunction;
  public SteamAPI_ISteamUtils_GetSecondsSinceAppActive!: KoffiFunction;
  public SteamAPI_ISteamUtils_GetSecondsSinceComputerActive!: KoffiFunction;
  public SteamAPI_ISteamUtils_GetServerRealTime!: KoffiFunction;
  public SteamAPI_ISteamUtils_GetSteamUILanguage!: KoffiFunction;
  public SteamAPI_ISteamUtils_GetConnectedUniverse!: KoffiFunction;
  
  // Steam Deck / Device detection
  public SteamAPI_ISteamUtils_IsSteamRunningOnSteamDeck!: KoffiFunction;
  public SteamAPI_ISteamUtils_IsSteamInBigPictureMode!: KoffiFunction;
  public SteamAPI_ISteamUtils_IsVRHeadsetStreamingEnabled!: KoffiFunction;
  public SteamAPI_ISteamUtils_SetVRHeadsetStreamingEnabled!: KoffiFunction;
  public SteamAPI_ISteamUtils_IsSteamChinaLauncher!: KoffiFunction;
  
  // Overlay notifications
  public SteamAPI_ISteamUtils_SetOverlayNotificationPosition!: KoffiFunction;
  public SteamAPI_ISteamUtils_SetOverlayNotificationInset!: KoffiFunction;
  public SteamAPI_ISteamUtils_BOverlayNeedsPresent!: KoffiFunction;
  public SteamAPI_ISteamUtils_IsOverlayEnabled!: KoffiFunction;
  
  // Image loading
  public SteamAPI_ISteamUtils_GetImageSize!: KoffiFunction;
  public SteamAPI_ISteamUtils_GetImageRGBA!: KoffiFunction;
  
  // Gamepad text input
  public SteamAPI_ISteamUtils_ShowGamepadTextInput!: KoffiFunction;
  public SteamAPI_ISteamUtils_GetEnteredGamepadTextLength!: KoffiFunction;
  public SteamAPI_ISteamUtils_GetEnteredGamepadTextInput!: KoffiFunction;
  public SteamAPI_ISteamUtils_ShowFloatingGamepadTextInput!: KoffiFunction;
  public SteamAPI_ISteamUtils_DismissFloatingGamepadTextInput!: KoffiFunction;
  
  // App update checking
  public SteamAPI_ISteamUtils_GetIPCCallCount!: KoffiFunction;
  public SteamAPI_ISteamUtils_StartVRDashboard!: KoffiFunction;
  
  // Text filtering
  public SteamAPI_ISteamUtils_FilterText!: KoffiFunction;
  public SteamAPI_ISteamUtils_InitFilterText!: KoffiFunction;

  // ========================================
  // ISteamNetworkingUtils API Functions
  // ========================================
  
  // Interface accessor
  public SteamAPI_SteamNetworkingUtils_SteamAPI_v004!: KoffiFunction;
  
  // Relay network access
  public SteamAPI_ISteamNetworkingUtils_InitRelayNetworkAccess!: KoffiFunction;
  public SteamAPI_ISteamNetworkingUtils_GetRelayNetworkStatus!: KoffiFunction;
  
  // Ping location
  public SteamAPI_ISteamNetworkingUtils_GetLocalPingLocation!: KoffiFunction;
  public SteamAPI_ISteamNetworkingUtils_EstimatePingTimeBetweenTwoLocations!: KoffiFunction;
  public SteamAPI_ISteamNetworkingUtils_EstimatePingTimeFromLocalHost!: KoffiFunction;
  public SteamAPI_ISteamNetworkingUtils_ConvertPingLocationToString!: KoffiFunction;
  public SteamAPI_ISteamNetworkingUtils_ParsePingLocationString!: KoffiFunction;
  public SteamAPI_ISteamNetworkingUtils_CheckPingDataUpToDate!: KoffiFunction;
  
  // POP (Point of Presence) functions
  public SteamAPI_ISteamNetworkingUtils_GetPingToDataCenter!: KoffiFunction;
  public SteamAPI_ISteamNetworkingUtils_GetDirectPingToPOP!: KoffiFunction;
  public SteamAPI_ISteamNetworkingUtils_GetPOPCount!: KoffiFunction;
  public SteamAPI_ISteamNetworkingUtils_GetPOPList!: KoffiFunction;
  
  // Time functions
  public SteamAPI_ISteamNetworkingUtils_GetLocalTimestamp!: KoffiFunction;
  
  // Debug output
  public SteamAPI_ISteamNetworkingUtils_SetDebugOutputFunction!: KoffiFunction;
  
  // Global callbacks
  public SteamAPI_ISteamNetworkingUtils_SetGlobalCallback_SteamNetConnectionStatusChanged!: KoffiFunction;

  // ========================================
  // ISteamNetworkingSockets API Functions
  // ========================================
  
  // Interface accessor
  public SteamAPI_SteamNetworkingSockets_SteamAPI_v012!: KoffiFunction;
  
  // P2P Listen/Connect
  public SteamAPI_ISteamNetworkingSockets_CreateListenSocketP2P!: KoffiFunction;
  public SteamAPI_ISteamNetworkingSockets_ConnectP2P!: KoffiFunction;
  
  // Connection management
  public SteamAPI_ISteamNetworkingSockets_AcceptConnection!: KoffiFunction;
  public SteamAPI_ISteamNetworkingSockets_CloseConnection!: KoffiFunction;
  public SteamAPI_ISteamNetworkingSockets_CloseListenSocket!: KoffiFunction;
  
  // Connection data
  public SteamAPI_ISteamNetworkingSockets_SetConnectionUserData!: KoffiFunction;
  public SteamAPI_ISteamNetworkingSockets_GetConnectionUserData!: KoffiFunction;
  public SteamAPI_ISteamNetworkingSockets_SetConnectionName!: KoffiFunction;
  public SteamAPI_ISteamNetworkingSockets_GetConnectionName!: KoffiFunction;
  
  // Messaging
  public SteamAPI_ISteamNetworkingSockets_SendMessageToConnection!: KoffiFunction;
  public SteamAPI_ISteamNetworkingSockets_FlushMessagesOnConnection!: KoffiFunction;
  public SteamAPI_ISteamNetworkingSockets_ReceiveMessagesOnConnection!: KoffiFunction;
  
  // Connection info
  public SteamAPI_ISteamNetworkingSockets_GetConnectionInfo!: KoffiFunction;
  public SteamAPI_ISteamNetworkingSockets_GetConnectionRealTimeStatus!: KoffiFunction;
  public SteamAPI_ISteamNetworkingSockets_GetDetailedConnectionStatus!: KoffiFunction;
  public SteamAPI_ISteamNetworkingSockets_GetListenSocketAddress!: KoffiFunction;
  
  // Poll groups
  public SteamAPI_ISteamNetworkingSockets_CreatePollGroup!: KoffiFunction;
  public SteamAPI_ISteamNetworkingSockets_DestroyPollGroup!: KoffiFunction;
  public SteamAPI_ISteamNetworkingSockets_SetConnectionPollGroup!: KoffiFunction;
  public SteamAPI_ISteamNetworkingSockets_ReceiveMessagesOnPollGroup!: KoffiFunction;
  
  // Identity
  public SteamAPI_ISteamNetworkingSockets_GetIdentity!: KoffiFunction;
  
  // Authentication
  public SteamAPI_ISteamNetworkingSockets_InitAuthentication!: KoffiFunction;
  public SteamAPI_ISteamNetworkingSockets_GetAuthenticationStatus!: KoffiFunction;
  
  // Callbacks
  public SteamAPI_ISteamNetworkingSockets_RunCallbacks!: KoffiFunction;
  
  // Message utilities
  public SteamAPI_SteamNetworkingMessage_t_Release!: KoffiFunction;

  // ========================================
  // ISteamFriends API Functions
  // ========================================
  
  // Interface accessor
  public SteamAPI_SteamFriends_v018!: KoffiFunction;
  
  // User info
  public SteamAPI_ISteamFriends_GetPersonaName!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetPersonaState!: KoffiFunction;
  
  // Friends list
  public SteamAPI_ISteamFriends_GetFriendCount!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendByIndex!: KoffiFunction;
  
  // Friend info
  public SteamAPI_ISteamFriends_GetFriendPersonaName!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendPersonaState!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendRelationship!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendSteamLevel!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendGamePlayed!: KoffiFunction;
  
  // Rich Presence
  public SteamAPI_ISteamFriends_SetRichPresence!: KoffiFunction;
  public SteamAPI_ISteamFriends_ClearRichPresence!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendRichPresence!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendRichPresenceKeyCount!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendRichPresenceKeyByIndex!: KoffiFunction;
  public SteamAPI_ISteamFriends_RequestFriendRichPresence!: KoffiFunction;
  
  // Overlay
  public SteamAPI_ISteamFriends_ActivateGameOverlay!: KoffiFunction;
  public SteamAPI_ISteamFriends_ActivateGameOverlayToUser!: KoffiFunction;
  public SteamAPI_ISteamFriends_ActivateGameOverlayToWebPage!: KoffiFunction;
  public SteamAPI_ISteamFriends_ActivateGameOverlayToStore!: KoffiFunction;
  public SteamAPI_ISteamFriends_ActivateGameOverlayInviteDialog!: KoffiFunction;
  public SteamAPI_ISteamFriends_ActivateGameOverlayRemotePlayTogetherInviteDialog!: KoffiFunction;
  public SteamAPI_ISteamFriends_ActivateGameOverlayInviteDialogConnectString!: KoffiFunction;
  
  // Avatars
  public SteamAPI_ISteamFriends_GetSmallFriendAvatar!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetMediumFriendAvatar!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetLargeFriendAvatar!: KoffiFunction;
  
  // Friend Groups
  public SteamAPI_ISteamFriends_GetFriendsGroupCount!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendsGroupIDByIndex!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendsGroupName!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendsGroupMembersCount!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendsGroupMembersList!: KoffiFunction;
  
  // Coplay (Recently Played With)
  public SteamAPI_ISteamFriends_GetCoplayFriendCount!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetCoplayFriend!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendCoplayTime!: KoffiFunction;
  public SteamAPI_ISteamFriends_GetFriendCoplayGame!: KoffiFunction;

  // ========================================
  // ISteamRemoteStorage API Functions
  // ========================================
  
  // Interface accessor
  public SteamAPI_SteamRemoteStorage_v016!: KoffiFunction;
  
  // File operations
  public SteamAPI_ISteamRemoteStorage_FileWrite!: KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_FileRead!: KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_FileExists!: KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_FileDelete!: KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_GetFileSize!: KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_GetFileTimestamp!: KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_FilePersisted!: KoffiFunction;
  
  // File iteration
  public SteamAPI_ISteamRemoteStorage_GetFileCount!: KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_GetFileNameAndSize!: KoffiFunction;
  
  // Quota and settings
  public SteamAPI_ISteamRemoteStorage_GetQuota!: KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_IsCloudEnabledForAccount!: KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_IsCloudEnabledForApp!: KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_SetCloudEnabledForApp!: KoffiFunction;

  // Batch operations
  public SteamAPI_ISteamRemoteStorage_BeginFileWriteBatch!: KoffiFunction;
  public SteamAPI_ISteamRemoteStorage_EndFileWriteBatch!: KoffiFunction;

  // ========================================
  // ISteamUGC (Workshop) API Functions
  // ========================================
  
  // Interface accessor
  public SteamAPI_SteamUGC_v021!: KoffiFunction;
  
  // Query operations
  public SteamAPI_ISteamUGC_CreateQueryUserUGCRequest!: KoffiFunction;
  public SteamAPI_ISteamUGC_CreateQueryAllUGCRequestPage!: KoffiFunction;
  public SteamAPI_ISteamUGC_SendQueryUGCRequest!: KoffiFunction;
  public SteamAPI_ISteamUGC_GetQueryUGCResult!: KoffiFunction;
  public SteamAPI_ISteamUGC_GetQueryUGCNumTags!: KoffiFunction;
  public SteamAPI_ISteamUGC_GetQueryUGCTag!: KoffiFunction;
  public SteamAPI_ISteamUGC_GetQueryUGCTagDisplayName!: KoffiFunction;
  public SteamAPI_ISteamUGC_GetQueryUGCPreviewURL!: KoffiFunction;
  public SteamAPI_ISteamUGC_GetQueryUGCMetadata!: KoffiFunction;
  public SteamAPI_ISteamUGC_GetQueryUGCChildren!: KoffiFunction;
  public SteamAPI_ISteamUGC_SetReturnPlaytimeStats!: KoffiFunction;
  public SteamAPI_ISteamUGC_ReleaseQueryUGCRequest!: KoffiFunction;
  
  // Subscription operations
  public SteamAPI_ISteamUGC_SubscribeItem!: KoffiFunction;
  public SteamAPI_ISteamUGC_UnsubscribeItem!: KoffiFunction;
  public SteamAPI_ISteamUGC_GetNumSubscribedItems!: KoffiFunction;
  public SteamAPI_ISteamUGC_GetSubscribedItems!: KoffiFunction;
  
  // Item state and info
  public SteamAPI_ISteamUGC_GetItemState!: KoffiFunction;
  public SteamAPI_ISteamUGC_GetItemInstallInfo!: KoffiFunction;
  public SteamAPI_ISteamUGC_GetItemDownloadInfo!: KoffiFunction;
  public SteamAPI_ISteamUGC_DownloadItem!: KoffiFunction;
  
  // Creation and update
  public SteamAPI_ISteamUGC_CreateItem!: KoffiFunction;
  public SteamAPI_ISteamUGC_StartItemUpdate!: KoffiFunction;
  public SteamAPI_ISteamUGC_SetItemTitle!: KoffiFunction;
  public SteamAPI_ISteamUGC_SetItemDescription!: KoffiFunction;
  public SteamAPI_ISteamUGC_SetItemVisibility!: KoffiFunction;
  public SteamAPI_ISteamUGC_SetItemTags!: KoffiFunction;
  public SteamAPI_ISteamUGC_SetItemContent!: KoffiFunction;
  public SteamAPI_ISteamUGC_SetItemPreview!: KoffiFunction;
  public SteamAPI_ISteamUGC_AddContentDescriptor!: KoffiFunction;
  public SteamAPI_ISteamUGC_RemoveContentDescriptor!: KoffiFunction;
  public SteamAPI_ISteamUGC_GetQueryUGCContentDescriptors!: KoffiFunction;
  public SteamAPI_ISteamUGC_GetUserContentDescriptorPreferences!: KoffiFunction;
  public SteamAPI_ISteamUGC_SubmitItemUpdate!: KoffiFunction;
  public SteamAPI_ISteamUGC_GetItemUpdateProgress!: KoffiFunction;
  
  // Query options
  public SteamAPI_ISteamUGC_SetSearchText!: KoffiFunction;
  
  // Voting and favorites
  public SteamAPI_ISteamUGC_SetUserItemVote!: KoffiFunction;
  public SteamAPI_ISteamUGC_GetUserItemVote!: KoffiFunction;
  public SteamAPI_ISteamUGC_AddItemToFavorites!: KoffiFunction;
  public SteamAPI_ISteamUGC_RemoveItemFromFavorites!: KoffiFunction;
  
  // Deletion
  public SteamAPI_ISteamUGC_DeleteItem!: KoffiFunction;

  // ========================================
  // ISteamInput Functions
  // ========================================
  
  // Interface accessor
  public SteamAPI_SteamInput_v006!: KoffiFunction;
  
  // Initialization
  public SteamAPI_ISteamInput_Init!: KoffiFunction;
  public SteamAPI_ISteamInput_Shutdown!: KoffiFunction;
  public SteamAPI_ISteamInput_SetInputActionManifestFilePath!: KoffiFunction;
  public SteamAPI_ISteamInput_RunFrame!: KoffiFunction;
  public SteamAPI_ISteamInput_BWaitForData!: KoffiFunction;
  public SteamAPI_ISteamInput_BNewDataAvailable!: KoffiFunction;
  
  // Controller enumeration
  public SteamAPI_ISteamInput_GetConnectedControllers!: KoffiFunction;
  public SteamAPI_ISteamInput_EnableDeviceCallbacks!: KoffiFunction;
  public SteamAPI_ISteamInput_EnableActionEventCallbacks!: KoffiFunction;
  public SteamAPI_ISteamInput_GetInputTypeForHandle!: KoffiFunction;
  public SteamAPI_ISteamInput_GetControllerForGamepadIndex!: KoffiFunction;
  public SteamAPI_ISteamInput_GetGamepadIndexForController!: KoffiFunction;
  
  // Action sets
  public SteamAPI_ISteamInput_GetActionSetHandle!: KoffiFunction;
  public SteamAPI_ISteamInput_ActivateActionSet!: KoffiFunction;
  public SteamAPI_ISteamInput_GetCurrentActionSet!: KoffiFunction;
  public SteamAPI_ISteamInput_ActivateActionSetLayer!: KoffiFunction;
  public SteamAPI_ISteamInput_DeactivateActionSetLayer!: KoffiFunction;
  public SteamAPI_ISteamInput_DeactivateAllActionSetLayers!: KoffiFunction;
  public SteamAPI_ISteamInput_GetActiveActionSetLayers!: KoffiFunction;
  
  // Digital actions
  public SteamAPI_ISteamInput_GetDigitalActionHandle!: KoffiFunction;
  public SteamAPI_ISteamInput_GetDigitalActionData!: KoffiFunction;
  public SteamAPI_ISteamInput_GetDigitalActionOrigins!: KoffiFunction;
  public SteamAPI_ISteamInput_GetStringForDigitalActionName!: KoffiFunction;
  
  // Analog actions
  public SteamAPI_ISteamInput_GetAnalogActionHandle!: KoffiFunction;
  public SteamAPI_ISteamInput_GetAnalogActionData!: KoffiFunction;
  public SteamAPI_ISteamInput_GetAnalogActionOrigins!: KoffiFunction;
  public SteamAPI_ISteamInput_GetStringForAnalogActionName!: KoffiFunction;
  public SteamAPI_ISteamInput_StopAnalogActionMomentum!: KoffiFunction;
  
  // Motion data
  public SteamAPI_ISteamInput_GetMotionData!: KoffiFunction;
  
  // Haptics and rumble
  public SteamAPI_ISteamInput_TriggerVibration!: KoffiFunction;
  public SteamAPI_ISteamInput_TriggerVibrationExtended!: KoffiFunction;
  public SteamAPI_ISteamInput_TriggerSimpleHapticEvent!: KoffiFunction;
  public SteamAPI_ISteamInput_SetLEDColor!: KoffiFunction;
  public SteamAPI_ISteamInput_Legacy_TriggerHapticPulse!: KoffiFunction;
  public SteamAPI_ISteamInput_Legacy_TriggerRepeatedHapticPulse!: KoffiFunction;
  
  // Glyphs and strings
  public SteamAPI_ISteamInput_GetGlyphPNGForActionOrigin!: KoffiFunction;
  public SteamAPI_ISteamInput_GetGlyphSVGForActionOrigin!: KoffiFunction;
  public SteamAPI_ISteamInput_GetGlyphForActionOrigin_Legacy!: KoffiFunction;
  public SteamAPI_ISteamInput_GetStringForActionOrigin!: KoffiFunction;
  public SteamAPI_ISteamInput_GetStringForXboxOrigin!: KoffiFunction;
  public SteamAPI_ISteamInput_GetGlyphForXboxOrigin!: KoffiFunction;
  public SteamAPI_ISteamInput_GetActionOriginFromXboxOrigin!: KoffiFunction;
  public SteamAPI_ISteamInput_TranslateActionOrigin!: KoffiFunction;
  
  // Utility
  public SteamAPI_ISteamInput_ShowBindingPanel!: KoffiFunction;
  public SteamAPI_ISteamInput_GetDeviceBindingRevision!: KoffiFunction;
  public SteamAPI_ISteamInput_GetRemotePlaySessionID!: KoffiFunction;
  public SteamAPI_ISteamInput_GetSessionInputConfigurationSettings!: KoffiFunction;

  // ========================================
  // ISteamScreenshots Functions
  // ========================================
  
  // Interface accessor
  public SteamAPI_SteamScreenshots_v003!: KoffiFunction;
  
  // Screenshot capture
  public SteamAPI_ISteamScreenshots_WriteScreenshot!: KoffiFunction;
  public SteamAPI_ISteamScreenshots_AddScreenshotToLibrary!: KoffiFunction;
  public SteamAPI_ISteamScreenshots_TriggerScreenshot!: KoffiFunction;
  public SteamAPI_ISteamScreenshots_HookScreenshots!: KoffiFunction;
  public SteamAPI_ISteamScreenshots_IsScreenshotsHooked!: KoffiFunction;
  
  // Screenshot tagging
  public SteamAPI_ISteamScreenshots_SetLocation!: KoffiFunction;
  public SteamAPI_ISteamScreenshots_TagUser!: KoffiFunction;
  public SteamAPI_ISteamScreenshots_TagPublishedFile!: KoffiFunction;
  
  // VR screenshots
  public SteamAPI_ISteamScreenshots_AddVRScreenshotToLibrary!: KoffiFunction;

  // ========================================
  // ISteamApps Functions (DLC & App Ownership)
  // ========================================
  
  // Interface accessor
  public SteamAPI_SteamApps_v009!: KoffiFunction;
  
  // Ownership checks
  public SteamAPI_ISteamApps_BIsSubscribed!: KoffiFunction;
  public SteamAPI_ISteamApps_BIsLowViolence!: KoffiFunction;
  public SteamAPI_ISteamApps_BIsCybercafe!: KoffiFunction;
  public SteamAPI_ISteamApps_BIsVACBanned!: KoffiFunction;
  public SteamAPI_ISteamApps_BIsSubscribedApp!: KoffiFunction;
  public SteamAPI_ISteamApps_BIsAppInstalled!: KoffiFunction;
  public SteamAPI_ISteamApps_BIsSubscribedFromFreeWeekend!: KoffiFunction;
  public SteamAPI_ISteamApps_BIsSubscribedFromFamilySharing!: KoffiFunction;
  public SteamAPI_ISteamApps_BIsTimedTrial!: KoffiFunction;
  
  // DLC functions
  public SteamAPI_ISteamApps_BIsDlcInstalled!: KoffiFunction;
  public SteamAPI_ISteamApps_GetDLCCount!: KoffiFunction;
  public SteamAPI_ISteamApps_BGetDLCDataByIndex!: KoffiFunction;
  public SteamAPI_ISteamApps_InstallDLC!: KoffiFunction;
  public SteamAPI_ISteamApps_UninstallDLC!: KoffiFunction;
  public SteamAPI_ISteamApps_GetDlcDownloadProgress!: KoffiFunction;
  public SteamAPI_ISteamApps_SetDlcContext!: KoffiFunction;
  
  // App info
  public SteamAPI_ISteamApps_GetCurrentGameLanguage!: KoffiFunction;
  public SteamAPI_ISteamApps_GetAvailableGameLanguages!: KoffiFunction;
  public SteamAPI_ISteamApps_GetEarliestPurchaseUnixTime!: KoffiFunction;
  public SteamAPI_ISteamApps_GetAppInstallDir!: KoffiFunction;
  public SteamAPI_ISteamApps_GetAppOwner!: KoffiFunction;
  public SteamAPI_ISteamApps_GetAppBuildId!: KoffiFunction;
  public SteamAPI_ISteamApps_GetInstalledDepots!: KoffiFunction;
  
  // Beta branches
  public SteamAPI_ISteamApps_GetCurrentBetaName!: KoffiFunction;
  public SteamAPI_ISteamApps_GetNumBetas!: KoffiFunction;
  public SteamAPI_ISteamApps_GetBetaInfo!: KoffiFunction;
  public SteamAPI_ISteamApps_SetActiveBeta!: KoffiFunction;
  
  // Launch parameters
  public SteamAPI_ISteamApps_GetLaunchQueryParam!: KoffiFunction;
  public SteamAPI_ISteamApps_GetLaunchCommandLine!: KoffiFunction;
  
  // Misc
  public SteamAPI_ISteamApps_MarkContentCorrupt!: KoffiFunction;
  public SteamAPI_ISteamApps_GetFileDetails!: KoffiFunction;

  // ========================================
  // ISteamMatchmaking Functions (Lobbies)
  // ========================================
  
  // Interface accessor
  public SteamAPI_SteamMatchmaking_v009!: KoffiFunction;
  
  // Favorite servers
  public SteamAPI_ISteamMatchmaking_GetFavoriteGameCount!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_GetFavoriteGame!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_AddFavoriteGame!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_RemoveFavoriteGame!: KoffiFunction;
  
  // Lobby list requests
  public SteamAPI_ISteamMatchmaking_RequestLobbyList!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_AddRequestLobbyListStringFilter!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_AddRequestLobbyListNumericalFilter!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_AddRequestLobbyListNearValueFilter!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_AddRequestLobbyListFilterSlotsAvailable!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_AddRequestLobbyListDistanceFilter!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_AddRequestLobbyListResultCountFilter!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_AddRequestLobbyListCompatibleMembersFilter!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_GetLobbyByIndex!: KoffiFunction;
  
  // Lobby creation and joining
  public SteamAPI_ISteamMatchmaking_CreateLobby!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_JoinLobby!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_LeaveLobby!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_InviteUserToLobby!: KoffiFunction;
  
  // Lobby members
  public SteamAPI_ISteamMatchmaking_GetNumLobbyMembers!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_GetLobbyMemberByIndex!: KoffiFunction;
  
  // Lobby data
  public SteamAPI_ISteamMatchmaking_GetLobbyData!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_SetLobbyData!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_GetLobbyDataCount!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_GetLobbyDataByIndex!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_DeleteLobbyData!: KoffiFunction;
  
  // Lobby member data
  public SteamAPI_ISteamMatchmaking_GetLobbyMemberData!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_SetLobbyMemberData!: KoffiFunction;
  
  // Lobby chat
  public SteamAPI_ISteamMatchmaking_SendLobbyChatMsg!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_GetLobbyChatEntry!: KoffiFunction;
  
  // Lobby metadata request
  public SteamAPI_ISteamMatchmaking_RequestLobbyData!: KoffiFunction;
  
  // Lobby game server
  public SteamAPI_ISteamMatchmaking_SetLobbyGameServer!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_GetLobbyGameServer!: KoffiFunction;
  
  // Lobby settings
  public SteamAPI_ISteamMatchmaking_SetLobbyMemberLimit!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_GetLobbyMemberLimit!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_SetLobbyType!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_SetLobbyJoinable!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_GetLobbyOwner!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_SetLobbyOwner!: KoffiFunction;
  public SteamAPI_ISteamMatchmaking_SetLinkedLobby!: KoffiFunction;

  // ========================================
  // ISteamUser Authentication Functions
  // ========================================
  
  // Login state
  public SteamAPI_ISteamUser_BLoggedOn!: KoffiFunction;
  
  // Auth session tickets
  public SteamAPI_ISteamUser_GetAuthSessionTicket!: KoffiFunction;
  public SteamAPI_ISteamUser_GetAuthTicketForWebApi!: KoffiFunction;
  public SteamAPI_ISteamUser_BeginAuthSession!: KoffiFunction;
  public SteamAPI_ISteamUser_EndAuthSession!: KoffiFunction;
  public SteamAPI_ISteamUser_CancelAuthTicket!: KoffiFunction;
  public SteamAPI_ISteamUser_UserHasLicenseForApp!: KoffiFunction;
  
  // Encrypted app tickets
  public SteamAPI_ISteamUser_RequestEncryptedAppTicket!: KoffiFunction;
  public SteamAPI_ISteamUser_GetEncryptedAppTicket!: KoffiFunction;
  
  // Security and account info
  public SteamAPI_ISteamUser_BIsPhoneVerified!: KoffiFunction;
  public SteamAPI_ISteamUser_BIsTwoFactorEnabled!: KoffiFunction;
  public SteamAPI_ISteamUser_BIsPhoneIdentifying!: KoffiFunction;
  public SteamAPI_ISteamUser_BIsPhoneRequiringVerification!: KoffiFunction;
  public SteamAPI_ISteamUser_BIsBehindNAT!: KoffiFunction;
  
  // User info
  public SteamAPI_ISteamUser_GetPlayerSteamLevel!: KoffiFunction;
  public SteamAPI_ISteamUser_GetGameBadgeLevel!: KoffiFunction;
  public SteamAPI_ISteamUser_GetUserDataFolder!: KoffiFunction;
  
  // Market and duration control
  public SteamAPI_ISteamUser_GetMarketEligibility!: KoffiFunction;
  public SteamAPI_ISteamUser_GetDurationControl!: KoffiFunction;
  public SteamAPI_ISteamUser_BSetDurationControlOnlineState!: KoffiFunction;
  
  // Store auth URL
  public SteamAPI_ISteamUser_RequestStoreAuthURL!: KoffiFunction;
  
  // Advertising game
  public SteamAPI_ISteamUser_AdvertiseGame!: KoffiFunction;
  
  // Voice recording
  public SteamAPI_ISteamUser_StartVoiceRecording!: KoffiFunction;
  public SteamAPI_ISteamUser_StopVoiceRecording!: KoffiFunction;
  public SteamAPI_ISteamUser_GetAvailableVoice!: KoffiFunction;
  public SteamAPI_ISteamUser_GetVoice!: KoffiFunction;
  public SteamAPI_ISteamUser_DecompressVoice!: KoffiFunction;
  public SteamAPI_ISteamUser_GetVoiceOptimalSampleRate!: KoffiFunction;

  /**
   * Get platform-specific Steam library path
   * Users must download and install Steamworks SDK redistributables separately
   * Uses customSdkPath if set, otherwise searches default locations
   * @param customSdkPath Optional custom path to steamworks_sdk folder
   */
  private getSteamLibraryPath(customSdkPath?: string): string | null {
    const platform = process.platform;
    const arch = process.arch;
    
    let steamworksSdkPaths: string[] = [];
    
    // Define possible Steamworks SDK locations (user must install these)
    const possibleBasePaths = customSdkPath
      ? [
          // Custom SDK path takes priority
          path.resolve(process.cwd(), customSdkPath),
        ]
      : [
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
          platformLibPath = path.join(basePath, customSdkPath ? 'redistributable_bin/win64/steam_api64.dll' : 'steamworks_sdk/redistributable_bin/win64/steam_api64.dll');
        } else {
          platformLibPath = path.join(basePath, customSdkPath ? 'redistributable_bin/steam_api.dll' : 'steamworks_sdk/redistributable_bin/steam_api.dll');
        }
      } else if (platform === 'darwin') {
        platformLibPath = path.join(basePath, customSdkPath ? 'redistributable_bin/osx/libsteam_api.dylib' : 'steamworks_sdk/redistributable_bin/osx/libsteam_api.dylib');
      } else if (platform === 'linux') {
        if (arch === 'arm64') {
          platformLibPath = path.join(basePath, customSdkPath ? 'redistributable_bin/linuxarm64/libsteam_api.so' : 'steamworks_sdk/redistributable_bin/linuxarm64/libsteam_api.so');
        } else if (arch === 'ia32') {
          platformLibPath = path.join(basePath, customSdkPath ? 'redistributable_bin/linux32/libsteam_api.so' : 'steamworks_sdk/redistributable_bin/linux32/libsteam_api.so');
        } else {
          platformLibPath = path.join(basePath, customSdkPath ? 'redistributable_bin/linux64/libsteam_api.so' : 'steamworks_sdk/redistributable_bin/linux64/libsteam_api.so');
        }
      } else if (platform === 'android') {
        // Android ARM64 support (for Electron-based Android apps or similar)
        platformLibPath = path.join(basePath, customSdkPath ? 'redistributable_bin/androidarm64/libsteam_api.so' : 'steamworks_sdk/redistributable_bin/androidarm64/libsteam_api.so');
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
    
    SteamLogger.error(
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
      `            ├── linux64/libsteam_api.so (Linux x64)\n` +
      `            ├── linux32/libsteam_api.so (Linux x86)\n` +
      `            ├── linuxarm64/libsteam_api.so (Linux ARM64)\n` +
      `            └── androidarm64/libsteam_api.so (Android ARM64)\n\n` +
      `   Note: Due to Valve's licensing terms, the Steamworks SDK redistributables\n` +
      `   cannot be bundled with this package and must be downloaded separately.\n\n` +
      `   Quick verification: Run 'npm run verify-sdk' to check your setup\n\n` +
      `   Searched paths:\n${steamworksSdkPaths.map(p => `  - ${p}`).join('\n')}`
    );
    
    return null;
  }

  /**
   * Load the Steamworks library and bind all FFI functions
   * @param sdkPath Optional custom path to steamworks_sdk folder
   */
  load(sdkPath?: string): void {
    const libPath = this.getSteamLibraryPath(sdkPath);
    
    if (!libPath) {
      SteamLogger.error('[Steamworks] Cannot load Steamworks library: SDK not found');
      return;
    }
    
    SteamLogger.debug(`[Steamworks] Loading library: ${libPath}`);
    
    this.steamLib = koffi.load(libPath);

    // Lazy FFI binding: defers koffi.func() symbol lookup to first call.
    // With ~200 functions, eager binding at load() adds hundreds of ms to startup.
    const lf = (name: string, ret: any, args: any[]): KoffiFunction => {
      let fn: KoffiFunction | undefined;
      const wrapper = (...a: any[]) => {
        if (!fn) fn = this.steamLib!.func(name, ret, args);
        return fn(...a);
      };
      return wrapper as unknown as KoffiFunction;
    };

    // Define function signatures using Koffi
    this.SteamAPI_Init = lf('SteamAPI_InitSafe', 'bool', []);
    this.SteamAPI_Shutdown = lf('SteamAPI_Shutdown', 'void', []);
    this.SteamAPI_RunCallbacks = lf('SteamAPI_RunCallbacks', 'void', []);
    this.SteamAPI_IsSteamRunning = lf('SteamAPI_IsSteamRunning', 'bool', []);
    this.SteamAPI_RestartAppIfNecessary = lf('SteamAPI_RestartAppIfNecessary', 'bool', ['uint32']);
    
    // Callback registration functions for manual callback handling
    // RegisterCallback(pCallback, iCallback) -> void
    this.SteamAPI_RegisterCallback = lf('SteamAPI_RegisterCallback', 'void', ['void*', 'int']);
    // UnregisterCallback(pCallback) -> void
    this.SteamAPI_UnregisterCallback = lf('SteamAPI_UnregisterCallback', 'void', ['void*']);
    
    this.SteamAPI_SteamUserStats_v013 = lf('SteamAPI_SteamUserStats_v013', 'void*', []);
    this.SteamAPI_SteamUser_v023 = lf('SteamAPI_SteamUser_v023', 'void*', []);
    this.SteamAPI_SteamUtils_v010 = lf('SteamAPI_SteamUtils_v010', 'void*', []);
    
    this.SteamAPI_ISteamUserStats_GetNumAchievements = lf('SteamAPI_ISteamUserStats_GetNumAchievements', 'uint32', ['void*']);
    this.SteamAPI_ISteamUserStats_GetAchievementName = lf('SteamAPI_ISteamUserStats_GetAchievementName', 'str', ['void*', 'uint32']);
    this.SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute = lf('SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute', 'str', ['void*', 'str', 'str']);
    this.SteamAPI_ISteamUserStats_GetAchievement = lf('SteamAPI_ISteamUserStats_GetAchievement', 'bool', ['void*', 'str', 'bool*']);
    this.SteamAPI_ISteamUserStats_GetAchievementAndUnlockTime = lf('SteamAPI_ISteamUserStats_GetAchievementAndUnlockTime', 'bool', ['void*', 'str', 'bool*', 'uint32*']);
    this.SteamAPI_ISteamUserStats_SetAchievement = lf('SteamAPI_ISteamUserStats_SetAchievement', 'bool', ['void*', 'str']);
    this.SteamAPI_ISteamUserStats_ClearAchievement = lf('SteamAPI_ISteamUserStats_ClearAchievement', 'bool', ['void*', 'str']);
    this.SteamAPI_ISteamUserStats_StoreStats = lf('SteamAPI_ISteamUserStats_StoreStats', 'bool', ['void*']);
    this.SteamAPI_ISteamUserStats_RequestCurrentStats = lf('SteamAPI_ISteamUserStats_RequestUserStats', 'uint64', ['void*', 'uint64']);
    this.SteamAPI_ISteamUser_GetSteamID = lf('SteamAPI_ISteamUser_GetSteamID', 'uint64', ['void*']);
    
    // Achievement icon and visual functions
    this.SteamAPI_ISteamUserStats_GetAchievementIcon = lf('SteamAPI_ISteamUserStats_GetAchievementIcon', 'int', ['void*', 'str']);
    this.SteamAPI_ISteamUserStats_IndicateAchievementProgress = lf('SteamAPI_ISteamUserStats_IndicateAchievementProgress', 'bool', ['void*', 'str', 'uint32', 'uint32']);
    
    // Achievement progress limits
    this.SteamAPI_ISteamUserStats_GetAchievementProgressLimitsInt32 = lf('SteamAPI_ISteamUserStats_GetAchievementProgressLimitsInt32', 'bool', ['void*', 'str', 'int32*', 'int32*']);
    this.SteamAPI_ISteamUserStats_GetAchievementProgressLimitsFloat = lf('SteamAPI_ISteamUserStats_GetAchievementProgressLimitsFloat', 'bool', ['void*', 'str', 'float*', 'float*']);
    
    // Friend/user achievements
    this.SteamAPI_ISteamUserStats_RequestUserStats = lf('SteamAPI_ISteamUserStats_RequestUserStats', 'uint64', ['void*', 'uint64']);
    this.SteamAPI_ISteamUserStats_GetUserAchievement = lf('SteamAPI_ISteamUserStats_GetUserAchievement', 'bool', ['void*', 'uint64', 'str', 'bool*']);
    this.SteamAPI_ISteamUserStats_GetUserAchievementAndUnlockTime = lf('SteamAPI_ISteamUserStats_GetUserAchievementAndUnlockTime', 'bool', ['void*', 'uint64', 'str', 'bool*', 'uint32*']);
    
    // Global achievement percentages
    this.SteamAPI_ISteamUserStats_RequestGlobalAchievementPercentages = lf('SteamAPI_ISteamUserStats_RequestGlobalAchievementPercentages', 'uint64', ['void*']);
    this.SteamAPI_ISteamUserStats_GetMostAchievedAchievementInfo = lf('SteamAPI_ISteamUserStats_GetMostAchievedAchievementInfo', 'int', ['void*', 'char*', 'uint32', 'float*', 'bool*']);
    this.SteamAPI_ISteamUserStats_GetNextMostAchievedAchievementInfo = lf('SteamAPI_ISteamUserStats_GetNextMostAchievedAchievementInfo', 'int', ['void*', 'int', 'char*', 'uint32', 'float*', 'bool*']);
    this.SteamAPI_ISteamUserStats_GetAchievementAchievedPercent = lf('SteamAPI_ISteamUserStats_GetAchievementAchievedPercent', 'bool', ['void*', 'str', 'float*']);
    
    // Reset stats
    this.SteamAPI_ISteamUserStats_ResetAllStats = lf('SteamAPI_ISteamUserStats_ResetAllStats', 'bool', ['void*', 'bool']);
    
    // ========================================
    // Stats API Functions
    // ========================================
    
    // User stats (get/set)
    this.SteamAPI_ISteamUserStats_GetStatInt32 = lf('SteamAPI_ISteamUserStats_GetStatInt32', 'bool', ['void*', 'str', 'int32*']);
    this.SteamAPI_ISteamUserStats_GetStatFloat = lf('SteamAPI_ISteamUserStats_GetStatFloat', 'bool', ['void*', 'str', 'float*']);
    this.SteamAPI_ISteamUserStats_SetStatInt32 = lf('SteamAPI_ISteamUserStats_SetStatInt32', 'bool', ['void*', 'str', 'int32']);
    this.SteamAPI_ISteamUserStats_SetStatFloat = lf('SteamAPI_ISteamUserStats_SetStatFloat', 'bool', ['void*', 'str', 'float']);
    this.SteamAPI_ISteamUserStats_UpdateAvgRateStat = lf('SteamAPI_ISteamUserStats_UpdateAvgRateStat', 'bool', ['void*', 'str', 'float', 'double']);
    
    // Friend/user stats
    this.SteamAPI_ISteamUserStats_GetUserStatInt32 = lf('SteamAPI_ISteamUserStats_GetUserStatInt32', 'bool', ['void*', 'uint64', 'str', 'int32*']);
    this.SteamAPI_ISteamUserStats_GetUserStatFloat = lf('SteamAPI_ISteamUserStats_GetUserStatFloat', 'bool', ['void*', 'uint64', 'str', 'float*']);
    
    // Global stats
    this.SteamAPI_ISteamUserStats_RequestGlobalStats = lf('SteamAPI_ISteamUserStats_RequestGlobalStats', 'uint64', ['void*', 'int']);
    this.SteamAPI_ISteamUserStats_GetGlobalStatInt64 = lf('SteamAPI_ISteamUserStats_GetGlobalStatInt64', 'bool', ['void*', 'str', 'int64*']);
    this.SteamAPI_ISteamUserStats_GetGlobalStatDouble = lf('SteamAPI_ISteamUserStats_GetGlobalStatDouble', 'bool', ['void*', 'str', 'double*']);
    this.SteamAPI_ISteamUserStats_GetGlobalStatHistoryInt64 = lf('SteamAPI_ISteamUserStats_GetGlobalStatHistoryInt64', 'int32', ['void*', 'str', 'int64*', 'uint32']);
    this.SteamAPI_ISteamUserStats_GetGlobalStatHistoryDouble = lf('SteamAPI_ISteamUserStats_GetGlobalStatHistoryDouble', 'int32', ['void*', 'str', 'double*', 'uint32']);
    
    // Player count
    this.SteamAPI_ISteamUserStats_GetNumberOfCurrentPlayers = lf('SteamAPI_ISteamUserStats_GetNumberOfCurrentPlayers', 'uint64', ['void*']);
    
    // ========================================
    // Leaderboard API Functions
    // ========================================
    
    // Leaderboard find/create
    this.SteamAPI_ISteamUserStats_FindOrCreateLeaderboard = lf('SteamAPI_ISteamUserStats_FindOrCreateLeaderboard', 'uint64', ['void*', 'str', 'int', 'int']);
    this.SteamAPI_ISteamUserStats_FindLeaderboard = lf('SteamAPI_ISteamUserStats_FindLeaderboard', 'uint64', ['void*', 'str']);
    
    // Leaderboard info
    this.SteamAPI_ISteamUserStats_GetLeaderboardName = lf('SteamAPI_ISteamUserStats_GetLeaderboardName', 'str', ['void*', 'uint64']);
    this.SteamAPI_ISteamUserStats_GetLeaderboardEntryCount = lf('SteamAPI_ISteamUserStats_GetLeaderboardEntryCount', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamUserStats_GetLeaderboardSortMethod = lf('SteamAPI_ISteamUserStats_GetLeaderboardSortMethod', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamUserStats_GetLeaderboardDisplayType = lf('SteamAPI_ISteamUserStats_GetLeaderboardDisplayType', 'int', ['void*', 'uint64']);
    
    // Leaderboard entries
    this.SteamAPI_ISteamUserStats_DownloadLeaderboardEntries = lf('SteamAPI_ISteamUserStats_DownloadLeaderboardEntries', 'uint64', ['void*', 'uint64', 'int', 'int', 'int']);
    this.SteamAPI_ISteamUserStats_DownloadLeaderboardEntriesForUsers = lf('SteamAPI_ISteamUserStats_DownloadLeaderboardEntriesForUsers', 'uint64', ['void*', 'uint64', 'uint64*', 'int']);
    this.SteamAPI_ISteamUserStats_GetDownloadedLeaderboardEntry = lf('SteamAPI_ISteamUserStats_GetDownloadedLeaderboardEntry', 'bool', ['void*', 'uint64', 'int', 'void*', 'int32*', 'int']);
    
    // Leaderboard upload
    this.SteamAPI_ISteamUserStats_UploadLeaderboardScore = lf('SteamAPI_ISteamUserStats_UploadLeaderboardScore', 'uint64', ['void*', 'uint64', 'int', 'int32', 'int32*', 'int']);
    this.SteamAPI_ISteamUserStats_AttachLeaderboardUGC = lf('SteamAPI_ISteamUserStats_AttachLeaderboardUGC', 'uint64', ['void*', 'uint64', 'uint64']);
    
    // ========================================
    // ISteamUtils Functions
    // ========================================
    
    // API call result checking
    this.SteamAPI_ISteamUtils_IsAPICallCompleted = lf('SteamAPI_ISteamUtils_IsAPICallCompleted', 'bool', ['void*', 'uint64', 'bool*']);
    this.SteamAPI_ISteamUtils_GetAPICallResult = lf('SteamAPI_ISteamUtils_GetAPICallResult', 'bool', ['void*', 'uint64', 'void*', 'int', 'int', 'bool*']);
    this.SteamAPI_ISteamUtils_GetAPICallFailureReason = lf('SteamAPI_ISteamUtils_GetAPICallFailureReason', 'int', ['void*', 'uint64']);
    
    // System information
    this.SteamAPI_ISteamUtils_GetIPCountry = lf('SteamAPI_ISteamUtils_GetIPCountry', 'str', ['void*']);
    this.SteamAPI_ISteamUtils_GetCurrentBatteryPower = lf('SteamAPI_ISteamUtils_GetCurrentBatteryPower', 'uint8', ['void*']);
    this.SteamAPI_ISteamUtils_GetAppID = lf('SteamAPI_ISteamUtils_GetAppID', 'uint32', ['void*']);
    this.SteamAPI_ISteamUtils_GetSecondsSinceAppActive = lf('SteamAPI_ISteamUtils_GetSecondsSinceAppActive', 'uint32', ['void*']);
    this.SteamAPI_ISteamUtils_GetSecondsSinceComputerActive = lf('SteamAPI_ISteamUtils_GetSecondsSinceComputerActive', 'uint32', ['void*']);
    this.SteamAPI_ISteamUtils_GetServerRealTime = lf('SteamAPI_ISteamUtils_GetServerRealTime', 'uint32', ['void*']);
    this.SteamAPI_ISteamUtils_GetSteamUILanguage = lf('SteamAPI_ISteamUtils_GetSteamUILanguage', 'str', ['void*']);
    this.SteamAPI_ISteamUtils_GetConnectedUniverse = lf('SteamAPI_ISteamUtils_GetConnectedUniverse', 'int', ['void*']);
    
    // Steam Deck / Device detection
    this.SteamAPI_ISteamUtils_IsSteamRunningOnSteamDeck = lf('SteamAPI_ISteamUtils_IsSteamRunningOnSteamDeck', 'bool', ['void*']);
    this.SteamAPI_ISteamUtils_IsSteamInBigPictureMode = lf('SteamAPI_ISteamUtils_IsSteamInBigPictureMode', 'bool', ['void*']);
    this.SteamAPI_ISteamUtils_IsVRHeadsetStreamingEnabled = lf('SteamAPI_ISteamUtils_IsVRHeadsetStreamingEnabled', 'bool', ['void*']);
    this.SteamAPI_ISteamUtils_SetVRHeadsetStreamingEnabled = lf('SteamAPI_ISteamUtils_SetVRHeadsetStreamingEnabled', 'void', ['void*', 'bool']);
    this.SteamAPI_ISteamUtils_IsSteamChinaLauncher = lf('SteamAPI_ISteamUtils_IsSteamChinaLauncher', 'bool', ['void*']);
    
    // Overlay notifications
    this.SteamAPI_ISteamUtils_SetOverlayNotificationPosition = lf('SteamAPI_ISteamUtils_SetOverlayNotificationPosition', 'void', ['void*', 'int']);
    this.SteamAPI_ISteamUtils_SetOverlayNotificationInset = lf('SteamAPI_ISteamUtils_SetOverlayNotificationInset', 'void', ['void*', 'int', 'int']);
    this.SteamAPI_ISteamUtils_BOverlayNeedsPresent = lf('SteamAPI_ISteamUtils_BOverlayNeedsPresent', 'bool', ['void*']);
    this.SteamAPI_ISteamUtils_IsOverlayEnabled = lf('SteamAPI_ISteamUtils_IsOverlayEnabled', 'bool', ['void*']);
    
    // Image loading
    this.SteamAPI_ISteamUtils_GetImageSize = lf('SteamAPI_ISteamUtils_GetImageSize', 'bool', ['void*', 'int', 'uint32*', 'uint32*']);
    this.SteamAPI_ISteamUtils_GetImageRGBA = lf('SteamAPI_ISteamUtils_GetImageRGBA', 'bool', ['void*', 'int', 'uint8*', 'int']);
    
    // Gamepad text input
    this.SteamAPI_ISteamUtils_ShowGamepadTextInput = lf('SteamAPI_ISteamUtils_ShowGamepadTextInput', 'bool', ['void*', 'int', 'int', 'str', 'uint32', 'str']);
    this.SteamAPI_ISteamUtils_GetEnteredGamepadTextLength = lf('SteamAPI_ISteamUtils_GetEnteredGamepadTextLength', 'uint32', ['void*']);
    this.SteamAPI_ISteamUtils_GetEnteredGamepadTextInput = lf('SteamAPI_ISteamUtils_GetEnteredGamepadTextInput', 'bool', ['void*', 'str', 'uint32']);
    this.SteamAPI_ISteamUtils_ShowFloatingGamepadTextInput = lf('SteamAPI_ISteamUtils_ShowFloatingGamepadTextInput', 'bool', ['void*', 'int', 'int', 'int', 'int', 'int']);
    this.SteamAPI_ISteamUtils_DismissFloatingGamepadTextInput = lf('SteamAPI_ISteamUtils_DismissFloatingGamepadTextInput', 'bool', ['void*']);
    
    // Misc utilities
    this.SteamAPI_ISteamUtils_GetIPCCallCount = lf('SteamAPI_ISteamUtils_GetIPCCallCount', 'uint32', ['void*']);
    this.SteamAPI_ISteamUtils_StartVRDashboard = lf('SteamAPI_ISteamUtils_StartVRDashboard', 'void', ['void*']);
    
    // Text filtering
    this.SteamAPI_ISteamUtils_FilterText = lf('SteamAPI_ISteamUtils_FilterText', 'int', ['void*', 'int', 'uint64', 'str', 'str', 'uint32']);
    this.SteamAPI_ISteamUtils_InitFilterText = lf('SteamAPI_ISteamUtils_InitFilterText', 'bool', ['void*', 'uint32']);
    
    // ========================================
    // ISteamNetworkingUtils Functions
    // ========================================
    
    // Interface accessor
    this.SteamAPI_SteamNetworkingUtils_SteamAPI_v004 = lf('SteamAPI_SteamNetworkingUtils_SteamAPI_v004', 'void*', []);
    
    // Relay network access
    this.SteamAPI_ISteamNetworkingUtils_InitRelayNetworkAccess = lf('SteamAPI_ISteamNetworkingUtils_InitRelayNetworkAccess', 'void', ['void*']);
    this.SteamAPI_ISteamNetworkingUtils_GetRelayNetworkStatus = lf('SteamAPI_ISteamNetworkingUtils_GetRelayNetworkStatus', 'int', ['void*', 'void*']);
    
    // Ping location - SteamNetworkPingLocation_t is 512 bytes
    this.SteamAPI_ISteamNetworkingUtils_GetLocalPingLocation = lf('SteamAPI_ISteamNetworkingUtils_GetLocalPingLocation', 'float', ['void*', 'void*']);
    this.SteamAPI_ISteamNetworkingUtils_EstimatePingTimeBetweenTwoLocations = lf('SteamAPI_ISteamNetworkingUtils_EstimatePingTimeBetweenTwoLocations', 'int', ['void*', 'void*', 'void*']);
    this.SteamAPI_ISteamNetworkingUtils_EstimatePingTimeFromLocalHost = lf('SteamAPI_ISteamNetworkingUtils_EstimatePingTimeFromLocalHost', 'int', ['void*', 'void*']);
    this.SteamAPI_ISteamNetworkingUtils_ConvertPingLocationToString = lf('SteamAPI_ISteamNetworkingUtils_ConvertPingLocationToString', 'void', ['void*', 'void*', 'str', 'int']);
    this.SteamAPI_ISteamNetworkingUtils_ParsePingLocationString = lf('SteamAPI_ISteamNetworkingUtils_ParsePingLocationString', 'bool', ['void*', 'str', 'void*']);
    this.SteamAPI_ISteamNetworkingUtils_CheckPingDataUpToDate = lf('SteamAPI_ISteamNetworkingUtils_CheckPingDataUpToDate', 'bool', ['void*', 'float']);
    
    // POP (Point of Presence) functions
    this.SteamAPI_ISteamNetworkingUtils_GetPingToDataCenter = lf('SteamAPI_ISteamNetworkingUtils_GetPingToDataCenter', 'int', ['void*', 'uint32', 'uint32*']);
    this.SteamAPI_ISteamNetworkingUtils_GetDirectPingToPOP = lf('SteamAPI_ISteamNetworkingUtils_GetDirectPingToPOP', 'int', ['void*', 'uint32']);
    this.SteamAPI_ISteamNetworkingUtils_GetPOPCount = lf('SteamAPI_ISteamNetworkingUtils_GetPOPCount', 'int', ['void*']);
    this.SteamAPI_ISteamNetworkingUtils_GetPOPList = lf('SteamAPI_ISteamNetworkingUtils_GetPOPList', 'int', ['void*', 'uint32*', 'int']);
    
    // Time functions
    this.SteamAPI_ISteamNetworkingUtils_GetLocalTimestamp = lf('SteamAPI_ISteamNetworkingUtils_GetLocalTimestamp', 'int64', ['void*']);
    
    // Debug output - uses callback function pointer
    this.SteamAPI_ISteamNetworkingUtils_SetDebugOutputFunction = lf('SteamAPI_ISteamNetworkingUtils_SetDebugOutputFunction', 'void', ['void*', 'int', 'void*']);
    
    // Global connection status callback
    // SetGlobalCallback_SteamNetConnectionStatusChanged(self, fnCallback) -> bool
    // fnCallback is FnSteamNetConnectionStatusChanged: void (*)(SteamNetConnectionStatusChangedCallback_t *)
    this.SteamAPI_ISteamNetworkingUtils_SetGlobalCallback_SteamNetConnectionStatusChanged = lf(
      'SteamAPI_ISteamNetworkingUtils_SetGlobalCallback_SteamNetConnectionStatusChanged', 
      'bool', 
      ['void*', FnSteamNetConnectionStatusChangedPtr]
    );
    
    // ========================================
    // ISteamNetworkingSockets Functions
    // ========================================
    
    // Interface accessor
    this.SteamAPI_SteamNetworkingSockets_SteamAPI_v012 = lf('SteamAPI_SteamNetworkingSockets_SteamAPI_v012', 'void*', []);
    
    // P2P Listen/Connect
    // CreateListenSocketP2P(nLocalVirtualPort, nOptions, pOptions) -> HSteamListenSocket
    this.SteamAPI_ISteamNetworkingSockets_CreateListenSocketP2P = lf('SteamAPI_ISteamNetworkingSockets_CreateListenSocketP2P', 'uint32', ['void*', 'int', 'int', 'void*']);
    // ConnectP2P(identityRemote, nRemoteVirtualPort, nOptions, pOptions) -> HSteamNetConnection
    this.SteamAPI_ISteamNetworkingSockets_ConnectP2P = lf('SteamAPI_ISteamNetworkingSockets_ConnectP2P', 'uint32', ['void*', 'void*', 'int', 'int', 'void*']);
    
    // Connection management
    this.SteamAPI_ISteamNetworkingSockets_AcceptConnection = lf('SteamAPI_ISteamNetworkingSockets_AcceptConnection', 'int', ['void*', 'uint32']);
    this.SteamAPI_ISteamNetworkingSockets_CloseConnection = lf('SteamAPI_ISteamNetworkingSockets_CloseConnection', 'bool', ['void*', 'uint32', 'int', 'str', 'bool']);
    this.SteamAPI_ISteamNetworkingSockets_CloseListenSocket = lf('SteamAPI_ISteamNetworkingSockets_CloseListenSocket', 'bool', ['void*', 'uint32']);
    
    // Connection data
    this.SteamAPI_ISteamNetworkingSockets_SetConnectionUserData = lf('SteamAPI_ISteamNetworkingSockets_SetConnectionUserData', 'bool', ['void*', 'uint32', 'int64']);
    this.SteamAPI_ISteamNetworkingSockets_GetConnectionUserData = lf('SteamAPI_ISteamNetworkingSockets_GetConnectionUserData', 'int64', ['void*', 'uint32']);
    this.SteamAPI_ISteamNetworkingSockets_SetConnectionName = lf('SteamAPI_ISteamNetworkingSockets_SetConnectionName', 'void', ['void*', 'uint32', 'str']);
    this.SteamAPI_ISteamNetworkingSockets_GetConnectionName = lf('SteamAPI_ISteamNetworkingSockets_GetConnectionName', 'bool', ['void*', 'uint32', 'char*', 'int']);
    
    // Messaging
    // SendMessageToConnection(hConn, pData, cbData, nSendFlags, pOutMessageNumber) -> EResult
    this.SteamAPI_ISteamNetworkingSockets_SendMessageToConnection = lf('SteamAPI_ISteamNetworkingSockets_SendMessageToConnection', 'int', ['void*', 'uint32', 'void*', 'uint32', 'int', 'int64*']);
    this.SteamAPI_ISteamNetworkingSockets_FlushMessagesOnConnection = lf('SteamAPI_ISteamNetworkingSockets_FlushMessagesOnConnection', 'int', ['void*', 'uint32']);
    // ReceiveMessagesOnConnection(hConn, ppOutMessages, nMaxMessages) -> int
    this.SteamAPI_ISteamNetworkingSockets_ReceiveMessagesOnConnection = lf('SteamAPI_ISteamNetworkingSockets_ReceiveMessagesOnConnection', 'int', ['void*', 'uint32', 'void*', 'int']);
    
    // Connection info
    this.SteamAPI_ISteamNetworkingSockets_GetConnectionInfo = lf('SteamAPI_ISteamNetworkingSockets_GetConnectionInfo', 'bool', ['void*', 'uint32', 'void*']);
    this.SteamAPI_ISteamNetworkingSockets_GetConnectionRealTimeStatus = lf('SteamAPI_ISteamNetworkingSockets_GetConnectionRealTimeStatus', 'int', ['void*', 'uint32', 'void*', 'int', 'void*']);
    this.SteamAPI_ISteamNetworkingSockets_GetDetailedConnectionStatus = lf('SteamAPI_ISteamNetworkingSockets_GetDetailedConnectionStatus', 'int', ['void*', 'uint32', 'char*', 'int']);
    this.SteamAPI_ISteamNetworkingSockets_GetListenSocketAddress = lf('SteamAPI_ISteamNetworkingSockets_GetListenSocketAddress', 'bool', ['void*', 'uint32', 'void*']);
    
    // Poll groups
    this.SteamAPI_ISteamNetworkingSockets_CreatePollGroup = lf('SteamAPI_ISteamNetworkingSockets_CreatePollGroup', 'uint32', ['void*']);
    this.SteamAPI_ISteamNetworkingSockets_DestroyPollGroup = lf('SteamAPI_ISteamNetworkingSockets_DestroyPollGroup', 'bool', ['void*', 'uint32']);
    this.SteamAPI_ISteamNetworkingSockets_SetConnectionPollGroup = lf('SteamAPI_ISteamNetworkingSockets_SetConnectionPollGroup', 'bool', ['void*', 'uint32', 'uint32']);
    this.SteamAPI_ISteamNetworkingSockets_ReceiveMessagesOnPollGroup = lf('SteamAPI_ISteamNetworkingSockets_ReceiveMessagesOnPollGroup', 'int', ['void*', 'uint32', 'void*', 'int']);
    
    // Identity
    this.SteamAPI_ISteamNetworkingSockets_GetIdentity = lf('SteamAPI_ISteamNetworkingSockets_GetIdentity', 'bool', ['void*', 'void*']);
    
    // Authentication
    this.SteamAPI_ISteamNetworkingSockets_InitAuthentication = lf('SteamAPI_ISteamNetworkingSockets_InitAuthentication', 'int', ['void*']);
    this.SteamAPI_ISteamNetworkingSockets_GetAuthenticationStatus = lf('SteamAPI_ISteamNetworkingSockets_GetAuthenticationStatus', 'int', ['void*', 'void*']);
    
    // Callbacks
    this.SteamAPI_ISteamNetworkingSockets_RunCallbacks = lf('SteamAPI_ISteamNetworkingSockets_RunCallbacks', 'void', ['void*']);
    
    // Message utilities
    this.SteamAPI_SteamNetworkingMessage_t_Release = lf('SteamAPI_SteamNetworkingMessage_t_Release', 'void', ['void*']);

    // ========================================
    // ISteamFriends Functions
    // ========================================
    
    // Interface accessor
    this.SteamAPI_SteamFriends_v018 = lf('SteamAPI_SteamFriends_v018', 'void*', []);
    
    // User info
    this.SteamAPI_ISteamFriends_GetPersonaName = lf('SteamAPI_ISteamFriends_GetPersonaName', 'str', ['void*']);
    this.SteamAPI_ISteamFriends_GetPersonaState = lf('SteamAPI_ISteamFriends_GetPersonaState', 'int', ['void*']);
    
    // Friends list
    this.SteamAPI_ISteamFriends_GetFriendCount = lf('SteamAPI_ISteamFriends_GetFriendCount', 'int', ['void*', 'int']);
    this.SteamAPI_ISteamFriends_GetFriendByIndex = lf('SteamAPI_ISteamFriends_GetFriendByIndex', 'uint64', ['void*', 'int', 'int']);
    
    // Friend info
    this.SteamAPI_ISteamFriends_GetFriendPersonaName = lf('SteamAPI_ISteamFriends_GetFriendPersonaName', 'str', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_GetFriendPersonaState = lf('SteamAPI_ISteamFriends_GetFriendPersonaState', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_GetFriendRelationship = lf('SteamAPI_ISteamFriends_GetFriendRelationship', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_GetFriendSteamLevel = lf('SteamAPI_ISteamFriends_GetFriendSteamLevel', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_GetFriendGamePlayed = lf('SteamAPI_ISteamFriends_GetFriendGamePlayed', 'bool', ['void*', 'uint64', 'void*']);
    
    // Rich Presence
    this.SteamAPI_ISteamFriends_SetRichPresence = lf('SteamAPI_ISteamFriends_SetRichPresence', 'bool', ['void*', 'str', 'str']);
    this.SteamAPI_ISteamFriends_ClearRichPresence = lf('SteamAPI_ISteamFriends_ClearRichPresence', 'void', ['void*']);
    this.SteamAPI_ISteamFriends_GetFriendRichPresence = lf('SteamAPI_ISteamFriends_GetFriendRichPresence', 'str', ['void*', 'uint64', 'str']);
    this.SteamAPI_ISteamFriends_GetFriendRichPresenceKeyCount = lf('SteamAPI_ISteamFriends_GetFriendRichPresenceKeyCount', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_GetFriendRichPresenceKeyByIndex = lf('SteamAPI_ISteamFriends_GetFriendRichPresenceKeyByIndex', 'str', ['void*', 'uint64', 'int']);
    this.SteamAPI_ISteamFriends_RequestFriendRichPresence = lf('SteamAPI_ISteamFriends_RequestFriendRichPresence', 'void', ['void*', 'uint64']);
    
    // Overlay
    this.SteamAPI_ISteamFriends_ActivateGameOverlay = lf('SteamAPI_ISteamFriends_ActivateGameOverlay', 'void', ['void*', 'str']);
    this.SteamAPI_ISteamFriends_ActivateGameOverlayToUser = lf('SteamAPI_ISteamFriends_ActivateGameOverlayToUser', 'void', ['void*', 'str', 'uint64']);
    this.SteamAPI_ISteamFriends_ActivateGameOverlayToWebPage = lf('SteamAPI_ISteamFriends_ActivateGameOverlayToWebPage', 'void', ['void*', 'str', 'int']);
    this.SteamAPI_ISteamFriends_ActivateGameOverlayToStore = lf('SteamAPI_ISteamFriends_ActivateGameOverlayToStore', 'void', ['void*', 'uint32', 'int']);
    this.SteamAPI_ISteamFriends_ActivateGameOverlayInviteDialog = lf('SteamAPI_ISteamFriends_ActivateGameOverlayInviteDialog', 'void', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_ActivateGameOverlayRemotePlayTogetherInviteDialog = lf('SteamAPI_ISteamFriends_ActivateGameOverlayRemotePlayTogetherInviteDialog', 'void', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_ActivateGameOverlayInviteDialogConnectString = lf('SteamAPI_ISteamFriends_ActivateGameOverlayInviteDialogConnectString', 'void', ['void*', 'str']);
    
    // Avatars
    this.SteamAPI_ISteamFriends_GetSmallFriendAvatar = lf('SteamAPI_ISteamFriends_GetSmallFriendAvatar', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_GetMediumFriendAvatar = lf('SteamAPI_ISteamFriends_GetMediumFriendAvatar', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_GetLargeFriendAvatar = lf('SteamAPI_ISteamFriends_GetLargeFriendAvatar', 'int', ['void*', 'uint64']);
    
    // Friend Groups
    this.SteamAPI_ISteamFriends_GetFriendsGroupCount = lf('SteamAPI_ISteamFriends_GetFriendsGroupCount', 'int', ['void*']);
    this.SteamAPI_ISteamFriends_GetFriendsGroupIDByIndex = lf('SteamAPI_ISteamFriends_GetFriendsGroupIDByIndex', 'int16', ['void*', 'int']);
    this.SteamAPI_ISteamFriends_GetFriendsGroupName = lf('SteamAPI_ISteamFriends_GetFriendsGroupName', 'str', ['void*', 'int16']);
    this.SteamAPI_ISteamFriends_GetFriendsGroupMembersCount = lf('SteamAPI_ISteamFriends_GetFriendsGroupMembersCount', 'int', ['void*', 'int16']);
    this.SteamAPI_ISteamFriends_GetFriendsGroupMembersList = lf('SteamAPI_ISteamFriends_GetFriendsGroupMembersList', 'void', ['void*', 'int16', 'uint64*', 'int']);
    
    // Coplay (Recently Played With)
    this.SteamAPI_ISteamFriends_GetCoplayFriendCount = lf('SteamAPI_ISteamFriends_GetCoplayFriendCount', 'int', ['void*']);
    this.SteamAPI_ISteamFriends_GetCoplayFriend = lf('SteamAPI_ISteamFriends_GetCoplayFriend', 'uint64', ['void*', 'int']);
    this.SteamAPI_ISteamFriends_GetFriendCoplayTime = lf('SteamAPI_ISteamFriends_GetFriendCoplayTime', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamFriends_GetFriendCoplayGame = lf('SteamAPI_ISteamFriends_GetFriendCoplayGame', 'uint32', ['void*', 'uint64']);
    
    // ========================================
    // ISteamRemoteStorage Functions
    // ========================================
    
    // Interface accessor
    this.SteamAPI_SteamRemoteStorage_v016 = lf('SteamAPI_SteamRemoteStorage_v016', 'void*', []);
    
    // File operations
    this.SteamAPI_ISteamRemoteStorage_FileWrite = lf('SteamAPI_ISteamRemoteStorage_FileWrite', 'bool', ['void*', 'str', 'void*', 'int32']);
    this.SteamAPI_ISteamRemoteStorage_FileRead = lf('SteamAPI_ISteamRemoteStorage_FileRead', 'int32', ['void*', 'str', 'void*', 'int32']);
    this.SteamAPI_ISteamRemoteStorage_FileExists = lf('SteamAPI_ISteamRemoteStorage_FileExists', 'bool', ['void*', 'str']);
    this.SteamAPI_ISteamRemoteStorage_FileDelete = lf('SteamAPI_ISteamRemoteStorage_FileDelete', 'bool', ['void*', 'str']);
    this.SteamAPI_ISteamRemoteStorage_GetFileSize = lf('SteamAPI_ISteamRemoteStorage_GetFileSize', 'int32', ['void*', 'str']);
    this.SteamAPI_ISteamRemoteStorage_GetFileTimestamp = lf('SteamAPI_ISteamRemoteStorage_GetFileTimestamp', 'int64', ['void*', 'str']);
    this.SteamAPI_ISteamRemoteStorage_FilePersisted = lf('SteamAPI_ISteamRemoteStorage_FilePersisted', 'bool', ['void*', 'str']);
    
    // File iteration
    this.SteamAPI_ISteamRemoteStorage_GetFileCount = lf('SteamAPI_ISteamRemoteStorage_GetFileCount', 'int32', ['void*']);
    this.SteamAPI_ISteamRemoteStorage_GetFileNameAndSize = lf('SteamAPI_ISteamRemoteStorage_GetFileNameAndSize', 'str', ['void*', 'int32', 'int32*']);
    
    // Quota and settings
    this.SteamAPI_ISteamRemoteStorage_GetQuota = lf('SteamAPI_ISteamRemoteStorage_GetQuota', 'bool', ['void*', 'uint64*', 'uint64*']);
    this.SteamAPI_ISteamRemoteStorage_IsCloudEnabledForAccount = lf('SteamAPI_ISteamRemoteStorage_IsCloudEnabledForAccount', 'bool', ['void*']);
    this.SteamAPI_ISteamRemoteStorage_IsCloudEnabledForApp = lf('SteamAPI_ISteamRemoteStorage_IsCloudEnabledForApp', 'bool', ['void*']);
    this.SteamAPI_ISteamRemoteStorage_SetCloudEnabledForApp = lf('SteamAPI_ISteamRemoteStorage_SetCloudEnabledForApp', 'void', ['void*', 'bool']);

    // Batch operations
    this.SteamAPI_ISteamRemoteStorage_BeginFileWriteBatch = lf('SteamAPI_ISteamRemoteStorage_BeginFileWriteBatch', 'bool', ['void*']);
    this.SteamAPI_ISteamRemoteStorage_EndFileWriteBatch = lf('SteamAPI_ISteamRemoteStorage_EndFileWriteBatch', 'bool', ['void*']);
    
    // ========================================
    // ISteamUGC (Workshop) Functions
    // ========================================
    
    // Interface accessor
    this.SteamAPI_SteamUGC_v021 = lf('SteamAPI_SteamUGC_v021', 'void*', []);
    
    // Query operations
    this.SteamAPI_ISteamUGC_CreateQueryUserUGCRequest = lf('SteamAPI_ISteamUGC_CreateQueryUserUGCRequest', 'uint64', ['void*', 'uint32', 'int', 'int', 'int', 'uint32', 'uint32', 'uint32']);
    this.SteamAPI_ISteamUGC_CreateQueryAllUGCRequestPage = lf('SteamAPI_ISteamUGC_CreateQueryAllUGCRequestPage', 'uint64', ['void*', 'int', 'int', 'uint32', 'uint32', 'uint32']);
    this.SteamAPI_ISteamUGC_SendQueryUGCRequest = lf('SteamAPI_ISteamUGC_SendQueryUGCRequest', 'uint64', ['void*', 'uint64']);
    this.SteamAPI_ISteamUGC_GetQueryUGCResult = lf('SteamAPI_ISteamUGC_GetQueryUGCResult', 'bool', ['void*', 'uint64', 'uint32', 'void*']);
    this.SteamAPI_ISteamUGC_GetQueryUGCNumTags = lf('SteamAPI_ISteamUGC_GetQueryUGCNumTags', 'uint32', ['void*', 'uint64', 'uint32']);
    this.SteamAPI_ISteamUGC_GetQueryUGCTag = lf('SteamAPI_ISteamUGC_GetQueryUGCTag', 'bool', ['void*', 'uint64', 'uint32', 'uint32', 'str', 'uint32']);
    this.SteamAPI_ISteamUGC_GetQueryUGCTagDisplayName = lf('SteamAPI_ISteamUGC_GetQueryUGCTagDisplayName', 'bool', ['void*', 'uint64', 'uint32', 'uint32', 'str', 'uint32']);
    this.SteamAPI_ISteamUGC_GetQueryUGCPreviewURL = lf('SteamAPI_ISteamUGC_GetQueryUGCPreviewURL', 'bool', ['void*', 'uint64', 'uint32', 'str', 'uint32']);
    this.SteamAPI_ISteamUGC_GetQueryUGCMetadata = lf('SteamAPI_ISteamUGC_GetQueryUGCMetadata', 'bool', ['void*', 'uint64', 'uint32', 'str', 'uint32']);
    this.SteamAPI_ISteamUGC_GetQueryUGCChildren = lf('SteamAPI_ISteamUGC_GetQueryUGCChildren', 'bool', ['void*', 'uint64', 'uint32', 'uint64*', 'uint32']);
    this.SteamAPI_ISteamUGC_SetReturnPlaytimeStats = lf('SteamAPI_ISteamUGC_SetReturnPlaytimeStats', 'bool', ['void*', 'uint64', 'uint32']);
    this.SteamAPI_ISteamUGC_ReleaseQueryUGCRequest = lf('SteamAPI_ISteamUGC_ReleaseQueryUGCRequest', 'bool', ['void*', 'uint64']);
    
    // Query options
    this.SteamAPI_ISteamUGC_SetSearchText = lf('SteamAPI_ISteamUGC_SetSearchText', 'bool', ['void*', 'uint64', 'string']);
    
    // Subscription operations
    this.SteamAPI_ISteamUGC_SubscribeItem = lf('SteamAPI_ISteamUGC_SubscribeItem', 'uint64', ['void*', 'uint64']);
    this.SteamAPI_ISteamUGC_UnsubscribeItem = lf('SteamAPI_ISteamUGC_UnsubscribeItem', 'uint64', ['void*', 'uint64']);
    this.SteamAPI_ISteamUGC_GetNumSubscribedItems = lf('SteamAPI_ISteamUGC_GetNumSubscribedItems', 'uint32', ['void*']);
    this.SteamAPI_ISteamUGC_GetSubscribedItems = lf('SteamAPI_ISteamUGC_GetSubscribedItems', 'uint32', ['void*', 'uint64*', 'uint32']);
    
    // Item state and info
    this.SteamAPI_ISteamUGC_GetItemState = lf('SteamAPI_ISteamUGC_GetItemState', 'uint32', ['void*', 'uint64']);
    this.SteamAPI_ISteamUGC_GetItemInstallInfo = lf('SteamAPI_ISteamUGC_GetItemInstallInfo', 'bool', ['void*', 'uint64', 'uint64*', 'str', 'uint32', 'uint32*']);
    this.SteamAPI_ISteamUGC_GetItemDownloadInfo = lf('SteamAPI_ISteamUGC_GetItemDownloadInfo', 'bool', ['void*', 'uint64', 'uint64*', 'uint64*']);
    this.SteamAPI_ISteamUGC_DownloadItem = lf('SteamAPI_ISteamUGC_DownloadItem', 'bool', ['void*', 'uint64', 'bool']);
    
    // Creation and update
    this.SteamAPI_ISteamUGC_CreateItem = lf('SteamAPI_ISteamUGC_CreateItem', 'uint64', ['void*', 'uint32', 'int']);
    this.SteamAPI_ISteamUGC_StartItemUpdate = lf('SteamAPI_ISteamUGC_StartItemUpdate', 'uint64', ['void*', 'uint32', 'uint64']);
    this.SteamAPI_ISteamUGC_SetItemTitle = lf('SteamAPI_ISteamUGC_SetItemTitle', 'bool', ['void*', 'uint64', 'str']);
    this.SteamAPI_ISteamUGC_SetItemDescription = lf('SteamAPI_ISteamUGC_SetItemDescription', 'bool', ['void*', 'uint64', 'str']);
    this.SteamAPI_ISteamUGC_SetItemVisibility = lf('SteamAPI_ISteamUGC_SetItemVisibility', 'bool', ['void*', 'uint64', 'int']);
    // SteamParamStringArray_t* is passed as a raw void* (manually built buffer)
    this.SteamAPI_ISteamUGC_SetItemTags = lf('SteamAPI_ISteamUGC_SetItemTags', 'bool', ['void*', 'uint64', 'void*', 'bool']);
    this.SteamAPI_ISteamUGC_SetItemContent = lf('SteamAPI_ISteamUGC_SetItemContent', 'bool', ['void*', 'uint64', 'str']);
    this.SteamAPI_ISteamUGC_SetItemPreview = lf('SteamAPI_ISteamUGC_SetItemPreview', 'bool', ['void*', 'uint64', 'str']);
    this.SteamAPI_ISteamUGC_AddContentDescriptor = lf('SteamAPI_ISteamUGC_AddContentDescriptor', 'bool', ['void*', 'uint64', 'int']);
    this.SteamAPI_ISteamUGC_RemoveContentDescriptor = lf('SteamAPI_ISteamUGC_RemoveContentDescriptor', 'bool', ['void*', 'uint64', 'int']);
    this.SteamAPI_ISteamUGC_GetQueryUGCContentDescriptors = lf('SteamAPI_ISteamUGC_GetQueryUGCContentDescriptors', 'uint32', ['void*', 'uint64', 'uint32', 'int32*', 'uint32']);
    this.SteamAPI_ISteamUGC_GetUserContentDescriptorPreferences = lf('SteamAPI_ISteamUGC_GetUserContentDescriptorPreferences', 'uint32', ['void*', 'int32*', 'uint32']);
    this.SteamAPI_ISteamUGC_SubmitItemUpdate = lf('SteamAPI_ISteamUGC_SubmitItemUpdate', 'uint64', ['void*', 'uint64', 'str']);
    this.SteamAPI_ISteamUGC_GetItemUpdateProgress = lf('SteamAPI_ISteamUGC_GetItemUpdateProgress', 'int', ['void*', 'uint64', 'uint64*', 'uint64*']);
    
    // Voting and favorites
    this.SteamAPI_ISteamUGC_SetUserItemVote = lf('SteamAPI_ISteamUGC_SetUserItemVote', 'uint64', ['void*', 'uint64', 'bool']);
    this.SteamAPI_ISteamUGC_GetUserItemVote = lf('SteamAPI_ISteamUGC_GetUserItemVote', 'uint64', ['void*', 'uint64']);
    this.SteamAPI_ISteamUGC_AddItemToFavorites = lf('SteamAPI_ISteamUGC_AddItemToFavorites', 'uint64', ['void*', 'uint32', 'uint64']);
    this.SteamAPI_ISteamUGC_RemoveItemFromFavorites = lf('SteamAPI_ISteamUGC_RemoveItemFromFavorites', 'uint64', ['void*', 'uint32', 'uint64']);
    
    // Deletion
    this.SteamAPI_ISteamUGC_DeleteItem = lf('SteamAPI_ISteamUGC_DeleteItem', 'uint64', ['void*', 'uint64']);
    
    // ========================================
    // ISteamInput Functions
    // ========================================
    
    // Interface accessor
    this.SteamAPI_SteamInput_v006 = lf('SteamAPI_SteamInput_v006', 'void*', []);
    
    // Initialization
    this.SteamAPI_ISteamInput_Init = lf('SteamAPI_ISteamInput_Init', 'bool', ['void*', 'bool']);
    this.SteamAPI_ISteamInput_Shutdown = lf('SteamAPI_ISteamInput_Shutdown', 'bool', ['void*']);
    this.SteamAPI_ISteamInput_SetInputActionManifestFilePath = lf('SteamAPI_ISteamInput_SetInputActionManifestFilePath', 'bool', ['void*', 'str']);
    this.SteamAPI_ISteamInput_RunFrame = lf('SteamAPI_ISteamInput_RunFrame', 'void', ['void*', 'bool']);
    this.SteamAPI_ISteamInput_BWaitForData = lf('SteamAPI_ISteamInput_BWaitForData', 'bool', ['void*', 'bool', 'uint32']);
    this.SteamAPI_ISteamInput_BNewDataAvailable = lf('SteamAPI_ISteamInput_BNewDataAvailable', 'bool', ['void*']);
    
    // Controller enumeration
    this.SteamAPI_ISteamInput_GetConnectedControllers = lf('SteamAPI_ISteamInput_GetConnectedControllers', 'int', ['void*', 'uint64*']);
    this.SteamAPI_ISteamInput_EnableDeviceCallbacks = lf('SteamAPI_ISteamInput_EnableDeviceCallbacks', 'void', ['void*']);
    this.SteamAPI_ISteamInput_EnableActionEventCallbacks = lf('SteamAPI_ISteamInput_EnableActionEventCallbacks', 'void', ['void*', 'void*']);
    this.SteamAPI_ISteamInput_GetInputTypeForHandle = lf('SteamAPI_ISteamInput_GetInputTypeForHandle', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamInput_GetControllerForGamepadIndex = lf('SteamAPI_ISteamInput_GetControllerForGamepadIndex', 'uint64', ['void*', 'int']);
    this.SteamAPI_ISteamInput_GetGamepadIndexForController = lf('SteamAPI_ISteamInput_GetGamepadIndexForController', 'int', ['void*', 'uint64']);
    
    // Action sets
    this.SteamAPI_ISteamInput_GetActionSetHandle = lf('SteamAPI_ISteamInput_GetActionSetHandle', 'uint64', ['void*', 'str']);
    this.SteamAPI_ISteamInput_ActivateActionSet = lf('SteamAPI_ISteamInput_ActivateActionSet', 'void', ['void*', 'uint64', 'uint64']);
    this.SteamAPI_ISteamInput_GetCurrentActionSet = lf('SteamAPI_ISteamInput_GetCurrentActionSet', 'uint64', ['void*', 'uint64']);
    this.SteamAPI_ISteamInput_ActivateActionSetLayer = lf('SteamAPI_ISteamInput_ActivateActionSetLayer', 'void', ['void*', 'uint64', 'uint64']);
    this.SteamAPI_ISteamInput_DeactivateActionSetLayer = lf('SteamAPI_ISteamInput_DeactivateActionSetLayer', 'void', ['void*', 'uint64', 'uint64']);
    this.SteamAPI_ISteamInput_DeactivateAllActionSetLayers = lf('SteamAPI_ISteamInput_DeactivateAllActionSetLayers', 'void', ['void*', 'uint64']);
    this.SteamAPI_ISteamInput_GetActiveActionSetLayers = lf('SteamAPI_ISteamInput_GetActiveActionSetLayers', 'int', ['void*', 'uint64', 'uint64*']);
    
    // Digital actions
    this.SteamAPI_ISteamInput_GetDigitalActionHandle = lf('SteamAPI_ISteamInput_GetDigitalActionHandle', 'uint64', ['void*', 'str']);
    this.SteamAPI_ISteamInput_GetDigitalActionData = lf('SteamAPI_ISteamInput_GetDigitalActionData', InputDigitalActionData_t, ['void*', 'uint64', 'uint64']);
    this.SteamAPI_ISteamInput_GetDigitalActionOrigins = lf('SteamAPI_ISteamInput_GetDigitalActionOrigins', 'int', ['void*', 'uint64', 'uint64', 'uint64', 'int*']);
    this.SteamAPI_ISteamInput_GetStringForDigitalActionName = lf('SteamAPI_ISteamInput_GetStringForDigitalActionName', 'str', ['void*', 'uint64']);
    
    // Analog actions
    this.SteamAPI_ISteamInput_GetAnalogActionHandle = lf('SteamAPI_ISteamInput_GetAnalogActionHandle', 'uint64', ['void*', 'str']);
    this.SteamAPI_ISteamInput_GetAnalogActionData = lf('SteamAPI_ISteamInput_GetAnalogActionData', InputAnalogActionData_t, ['void*', 'uint64', 'uint64']);
    this.SteamAPI_ISteamInput_GetAnalogActionOrigins = lf('SteamAPI_ISteamInput_GetAnalogActionOrigins', 'int', ['void*', 'uint64', 'uint64', 'uint64', 'int*']);
    this.SteamAPI_ISteamInput_GetStringForAnalogActionName = lf('SteamAPI_ISteamInput_GetStringForAnalogActionName', 'str', ['void*', 'uint64']);
    this.SteamAPI_ISteamInput_StopAnalogActionMomentum = lf('SteamAPI_ISteamInput_StopAnalogActionMomentum', 'void', ['void*', 'uint64', 'uint64']);
    
    // Motion data
    this.SteamAPI_ISteamInput_GetMotionData = lf('SteamAPI_ISteamInput_GetMotionData', InputMotionData_t, ['void*', 'uint64']);
    
    // Haptics and rumble
    this.SteamAPI_ISteamInput_TriggerVibration = lf('SteamAPI_ISteamInput_TriggerVibration', 'void', ['void*', 'uint64', 'uint16', 'uint16']);
    this.SteamAPI_ISteamInput_TriggerVibrationExtended = lf('SteamAPI_ISteamInput_TriggerVibrationExtended', 'void', ['void*', 'uint64', 'uint16', 'uint16', 'uint16', 'uint16']);
    this.SteamAPI_ISteamInput_TriggerSimpleHapticEvent = lf('SteamAPI_ISteamInput_TriggerSimpleHapticEvent', 'void', ['void*', 'uint64', 'int', 'uint8', 'int8', 'uint8', 'int8']);
    this.SteamAPI_ISteamInput_SetLEDColor = lf('SteamAPI_ISteamInput_SetLEDColor', 'void', ['void*', 'uint64', 'uint8', 'uint8', 'uint8', 'uint32']);
    this.SteamAPI_ISteamInput_Legacy_TriggerHapticPulse = lf('SteamAPI_ISteamInput_Legacy_TriggerHapticPulse', 'void', ['void*', 'uint64', 'int', 'uint16']);
    this.SteamAPI_ISteamInput_Legacy_TriggerRepeatedHapticPulse = lf('SteamAPI_ISteamInput_Legacy_TriggerRepeatedHapticPulse', 'void', ['void*', 'uint64', 'int', 'uint16', 'uint16', 'uint16', 'uint32']);
    
    // Glyphs and strings
    this.SteamAPI_ISteamInput_GetGlyphPNGForActionOrigin = lf('SteamAPI_ISteamInput_GetGlyphPNGForActionOrigin', 'str', ['void*', 'int', 'int', 'uint32']);
    this.SteamAPI_ISteamInput_GetGlyphSVGForActionOrigin = lf('SteamAPI_ISteamInput_GetGlyphSVGForActionOrigin', 'str', ['void*', 'int', 'uint32']);
    this.SteamAPI_ISteamInput_GetGlyphForActionOrigin_Legacy = lf('SteamAPI_ISteamInput_GetGlyphForActionOrigin_Legacy', 'str', ['void*', 'int']);
    this.SteamAPI_ISteamInput_GetStringForActionOrigin = lf('SteamAPI_ISteamInput_GetStringForActionOrigin', 'str', ['void*', 'int']);
    this.SteamAPI_ISteamInput_GetStringForXboxOrigin = lf('SteamAPI_ISteamInput_GetStringForXboxOrigin', 'str', ['void*', 'int']);
    this.SteamAPI_ISteamInput_GetGlyphForXboxOrigin = lf('SteamAPI_ISteamInput_GetGlyphForXboxOrigin', 'str', ['void*', 'int']);
    this.SteamAPI_ISteamInput_GetActionOriginFromXboxOrigin = lf('SteamAPI_ISteamInput_GetActionOriginFromXboxOrigin', 'int', ['void*', 'uint64', 'int']);
    this.SteamAPI_ISteamInput_TranslateActionOrigin = lf('SteamAPI_ISteamInput_TranslateActionOrigin', 'int', ['void*', 'int', 'int']);
    
    // Utility
    this.SteamAPI_ISteamInput_ShowBindingPanel = lf('SteamAPI_ISteamInput_ShowBindingPanel', 'bool', ['void*', 'uint64']);
    this.SteamAPI_ISteamInput_GetDeviceBindingRevision = lf('SteamAPI_ISteamInput_GetDeviceBindingRevision', 'bool', ['void*', 'uint64', 'int*', 'int*']);
    this.SteamAPI_ISteamInput_GetRemotePlaySessionID = lf('SteamAPI_ISteamInput_GetRemotePlaySessionID', 'uint32', ['void*', 'uint64']);
    this.SteamAPI_ISteamInput_GetSessionInputConfigurationSettings = lf('SteamAPI_ISteamInput_GetSessionInputConfigurationSettings', 'uint16', ['void*']);
    
    // ========================================
    // ISteamScreenshots Functions
    // ========================================
    
    // Interface accessor
    this.SteamAPI_SteamScreenshots_v003 = lf('SteamAPI_SteamScreenshots_v003', 'void*', []);
    
    // Screenshot capture
    this.SteamAPI_ISteamScreenshots_WriteScreenshot = lf('SteamAPI_ISteamScreenshots_WriteScreenshot', 'uint32', ['void*', 'void*', 'uint32', 'int', 'int']);
    this.SteamAPI_ISteamScreenshots_AddScreenshotToLibrary = lf('SteamAPI_ISteamScreenshots_AddScreenshotToLibrary', 'uint32', ['void*', 'str', 'str', 'int', 'int']);
    this.SteamAPI_ISteamScreenshots_TriggerScreenshot = lf('SteamAPI_ISteamScreenshots_TriggerScreenshot', 'void', ['void*']);
    this.SteamAPI_ISteamScreenshots_HookScreenshots = lf('SteamAPI_ISteamScreenshots_HookScreenshots', 'void', ['void*', 'bool']);
    this.SteamAPI_ISteamScreenshots_IsScreenshotsHooked = lf('SteamAPI_ISteamScreenshots_IsScreenshotsHooked', 'bool', ['void*']);
    
    // Screenshot tagging
    this.SteamAPI_ISteamScreenshots_SetLocation = lf('SteamAPI_ISteamScreenshots_SetLocation', 'bool', ['void*', 'uint32', 'str']);
    this.SteamAPI_ISteamScreenshots_TagUser = lf('SteamAPI_ISteamScreenshots_TagUser', 'bool', ['void*', 'uint32', 'uint64']);
    this.SteamAPI_ISteamScreenshots_TagPublishedFile = lf('SteamAPI_ISteamScreenshots_TagPublishedFile', 'bool', ['void*', 'uint32', 'uint64']);
    
    // VR screenshots
    this.SteamAPI_ISteamScreenshots_AddVRScreenshotToLibrary = lf('SteamAPI_ISteamScreenshots_AddVRScreenshotToLibrary', 'uint32', ['void*', 'int', 'str', 'str']);
    
    // ========================================
    // ISteamApps Functions (DLC & App Ownership)
    // ========================================
    
    // Interface accessor
    this.SteamAPI_SteamApps_v009 = lf('SteamAPI_SteamApps_v009', 'void*', []);
    
    // Ownership checks
    this.SteamAPI_ISteamApps_BIsSubscribed = lf('SteamAPI_ISteamApps_BIsSubscribed', 'bool', ['void*']);
    this.SteamAPI_ISteamApps_BIsLowViolence = lf('SteamAPI_ISteamApps_BIsLowViolence', 'bool', ['void*']);
    this.SteamAPI_ISteamApps_BIsCybercafe = lf('SteamAPI_ISteamApps_BIsCybercafe', 'bool', ['void*']);
    this.SteamAPI_ISteamApps_BIsVACBanned = lf('SteamAPI_ISteamApps_BIsVACBanned', 'bool', ['void*']);
    this.SteamAPI_ISteamApps_BIsSubscribedApp = lf('SteamAPI_ISteamApps_BIsSubscribedApp', 'bool', ['void*', 'uint32']);
    this.SteamAPI_ISteamApps_BIsAppInstalled = lf('SteamAPI_ISteamApps_BIsAppInstalled', 'bool', ['void*', 'uint32']);
    this.SteamAPI_ISteamApps_BIsSubscribedFromFreeWeekend = lf('SteamAPI_ISteamApps_BIsSubscribedFromFreeWeekend', 'bool', ['void*']);
    this.SteamAPI_ISteamApps_BIsSubscribedFromFamilySharing = lf('SteamAPI_ISteamApps_BIsSubscribedFromFamilySharing', 'bool', ['void*']);
    this.SteamAPI_ISteamApps_BIsTimedTrial = lf('SteamAPI_ISteamApps_BIsTimedTrial', 'bool', ['void*', 'uint32*', 'uint32*']);
    
    // DLC functions
    this.SteamAPI_ISteamApps_BIsDlcInstalled = lf('SteamAPI_ISteamApps_BIsDlcInstalled', 'bool', ['void*', 'uint32']);
    this.SteamAPI_ISteamApps_GetDLCCount = lf('SteamAPI_ISteamApps_GetDLCCount', 'int', ['void*']);
    this.SteamAPI_ISteamApps_BGetDLCDataByIndex = lf('SteamAPI_ISteamApps_BGetDLCDataByIndex', 'bool', ['void*', 'int', 'uint32*', 'bool*', 'char*', 'int']);
    this.SteamAPI_ISteamApps_InstallDLC = lf('SteamAPI_ISteamApps_InstallDLC', 'void', ['void*', 'uint32']);
    this.SteamAPI_ISteamApps_UninstallDLC = lf('SteamAPI_ISteamApps_UninstallDLC', 'void', ['void*', 'uint32']);
    this.SteamAPI_ISteamApps_GetDlcDownloadProgress = lf('SteamAPI_ISteamApps_GetDlcDownloadProgress', 'bool', ['void*', 'uint32', 'uint64*', 'uint64*']);
    this.SteamAPI_ISteamApps_SetDlcContext = lf('SteamAPI_ISteamApps_SetDlcContext', 'bool', ['void*', 'uint32']);
    
    // App info
    this.SteamAPI_ISteamApps_GetCurrentGameLanguage = lf('SteamAPI_ISteamApps_GetCurrentGameLanguage', 'str', ['void*']);
    this.SteamAPI_ISteamApps_GetAvailableGameLanguages = lf('SteamAPI_ISteamApps_GetAvailableGameLanguages', 'str', ['void*']);
    this.SteamAPI_ISteamApps_GetEarliestPurchaseUnixTime = lf('SteamAPI_ISteamApps_GetEarliestPurchaseUnixTime', 'uint32', ['void*', 'uint32']);
    this.SteamAPI_ISteamApps_GetAppInstallDir = lf('SteamAPI_ISteamApps_GetAppInstallDir', 'uint32', ['void*', 'uint32', 'char*', 'uint32']);
    this.SteamAPI_ISteamApps_GetAppOwner = lf('SteamAPI_ISteamApps_GetAppOwner', 'uint64', ['void*']);
    this.SteamAPI_ISteamApps_GetAppBuildId = lf('SteamAPI_ISteamApps_GetAppBuildId', 'int', ['void*']);
    this.SteamAPI_ISteamApps_GetInstalledDepots = lf('SteamAPI_ISteamApps_GetInstalledDepots', 'uint32', ['void*', 'uint32', 'uint32*', 'uint32']);
    
    // Beta branches
    this.SteamAPI_ISteamApps_GetCurrentBetaName = lf('SteamAPI_ISteamApps_GetCurrentBetaName', 'bool', ['void*', 'char*', 'int']);
    this.SteamAPI_ISteamApps_GetNumBetas = lf('SteamAPI_ISteamApps_GetNumBetas', 'int', ['void*', 'int*', 'int*']);
    this.SteamAPI_ISteamApps_GetBetaInfo = lf('SteamAPI_ISteamApps_GetBetaInfo', 'bool', ['void*', 'int', 'uint32*', 'uint32*', 'char*', 'int', 'char*', 'int', 'uint32*']);
    this.SteamAPI_ISteamApps_SetActiveBeta = lf('SteamAPI_ISteamApps_SetActiveBeta', 'bool', ['void*', 'str']);
    
    // Launch parameters
    this.SteamAPI_ISteamApps_GetLaunchQueryParam = lf('SteamAPI_ISteamApps_GetLaunchQueryParam', 'str', ['void*', 'str']);
    this.SteamAPI_ISteamApps_GetLaunchCommandLine = lf('SteamAPI_ISteamApps_GetLaunchCommandLine', 'int', ['void*', 'char*', 'int']);
    
    // Misc
    this.SteamAPI_ISteamApps_MarkContentCorrupt = lf('SteamAPI_ISteamApps_MarkContentCorrupt', 'bool', ['void*', 'bool']);
    this.SteamAPI_ISteamApps_GetFileDetails = lf('SteamAPI_ISteamApps_GetFileDetails', 'uint64', ['void*', 'str']);
    
    // ========================================
    // ISteamMatchmaking Functions (Lobbies)
    // ========================================
    
    // Interface accessor
    this.SteamAPI_SteamMatchmaking_v009 = lf('SteamAPI_SteamMatchmaking_v009', 'void*', []);
    
    // Favorite servers
    this.SteamAPI_ISteamMatchmaking_GetFavoriteGameCount = lf('SteamAPI_ISteamMatchmaking_GetFavoriteGameCount', 'int', ['void*']);
    this.SteamAPI_ISteamMatchmaking_GetFavoriteGame = lf('SteamAPI_ISteamMatchmaking_GetFavoriteGame', 'bool', ['void*', 'int', 'uint32*', 'uint32*', 'uint16*', 'uint16*', 'uint32*', 'uint32*']);
    this.SteamAPI_ISteamMatchmaking_AddFavoriteGame = lf('SteamAPI_ISteamMatchmaking_AddFavoriteGame', 'int', ['void*', 'uint32', 'uint32', 'uint16', 'uint16', 'uint32', 'uint32']);
    this.SteamAPI_ISteamMatchmaking_RemoveFavoriteGame = lf('SteamAPI_ISteamMatchmaking_RemoveFavoriteGame', 'bool', ['void*', 'uint32', 'uint32', 'uint16', 'uint16', 'uint32']);
    
    // Lobby list requests
    this.SteamAPI_ISteamMatchmaking_RequestLobbyList = lf('SteamAPI_ISteamMatchmaking_RequestLobbyList', 'uint64', ['void*']);
    this.SteamAPI_ISteamMatchmaking_AddRequestLobbyListStringFilter = lf('SteamAPI_ISteamMatchmaking_AddRequestLobbyListStringFilter', 'void', ['void*', 'str', 'str', 'int']);
    this.SteamAPI_ISteamMatchmaking_AddRequestLobbyListNumericalFilter = lf('SteamAPI_ISteamMatchmaking_AddRequestLobbyListNumericalFilter', 'void', ['void*', 'str', 'int', 'int']);
    this.SteamAPI_ISteamMatchmaking_AddRequestLobbyListNearValueFilter = lf('SteamAPI_ISteamMatchmaking_AddRequestLobbyListNearValueFilter', 'void', ['void*', 'str', 'int']);
    this.SteamAPI_ISteamMatchmaking_AddRequestLobbyListFilterSlotsAvailable = lf('SteamAPI_ISteamMatchmaking_AddRequestLobbyListFilterSlotsAvailable', 'void', ['void*', 'int']);
    this.SteamAPI_ISteamMatchmaking_AddRequestLobbyListDistanceFilter = lf('SteamAPI_ISteamMatchmaking_AddRequestLobbyListDistanceFilter', 'void', ['void*', 'int']);
    this.SteamAPI_ISteamMatchmaking_AddRequestLobbyListResultCountFilter = lf('SteamAPI_ISteamMatchmaking_AddRequestLobbyListResultCountFilter', 'void', ['void*', 'int']);
    this.SteamAPI_ISteamMatchmaking_AddRequestLobbyListCompatibleMembersFilter = lf('SteamAPI_ISteamMatchmaking_AddRequestLobbyListCompatibleMembersFilter', 'void', ['void*', 'uint64']);
    this.SteamAPI_ISteamMatchmaking_GetLobbyByIndex = lf('SteamAPI_ISteamMatchmaking_GetLobbyByIndex', 'uint64', ['void*', 'int']);
    
    // Lobby creation and joining
    this.SteamAPI_ISteamMatchmaking_CreateLobby = lf('SteamAPI_ISteamMatchmaking_CreateLobby', 'uint64', ['void*', 'int', 'int']);
    this.SteamAPI_ISteamMatchmaking_JoinLobby = lf('SteamAPI_ISteamMatchmaking_JoinLobby', 'uint64', ['void*', 'uint64']);
    this.SteamAPI_ISteamMatchmaking_LeaveLobby = lf('SteamAPI_ISteamMatchmaking_LeaveLobby', 'void', ['void*', 'uint64']);
    this.SteamAPI_ISteamMatchmaking_InviteUserToLobby = lf('SteamAPI_ISteamMatchmaking_InviteUserToLobby', 'bool', ['void*', 'uint64', 'uint64']);
    
    // Lobby members
    this.SteamAPI_ISteamMatchmaking_GetNumLobbyMembers = lf('SteamAPI_ISteamMatchmaking_GetNumLobbyMembers', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamMatchmaking_GetLobbyMemberByIndex = lf('SteamAPI_ISteamMatchmaking_GetLobbyMemberByIndex', 'uint64', ['void*', 'uint64', 'int']);
    
    // Lobby data
    this.SteamAPI_ISteamMatchmaking_GetLobbyData = lf('SteamAPI_ISteamMatchmaking_GetLobbyData', 'str', ['void*', 'uint64', 'str']);
    this.SteamAPI_ISteamMatchmaking_SetLobbyData = lf('SteamAPI_ISteamMatchmaking_SetLobbyData', 'bool', ['void*', 'uint64', 'str', 'str']);
    this.SteamAPI_ISteamMatchmaking_GetLobbyDataCount = lf('SteamAPI_ISteamMatchmaking_GetLobbyDataCount', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamMatchmaking_GetLobbyDataByIndex = lf('SteamAPI_ISteamMatchmaking_GetLobbyDataByIndex', 'bool', ['void*', 'uint64', 'int', 'char*', 'int', 'char*', 'int']);
    this.SteamAPI_ISteamMatchmaking_DeleteLobbyData = lf('SteamAPI_ISteamMatchmaking_DeleteLobbyData', 'bool', ['void*', 'uint64', 'str']);
    
    // Lobby member data
    this.SteamAPI_ISteamMatchmaking_GetLobbyMemberData = lf('SteamAPI_ISteamMatchmaking_GetLobbyMemberData', 'str', ['void*', 'uint64', 'uint64', 'str']);
    this.SteamAPI_ISteamMatchmaking_SetLobbyMemberData = lf('SteamAPI_ISteamMatchmaking_SetLobbyMemberData', 'void', ['void*', 'uint64', 'str', 'str']);
    
    // Lobby chat
    this.SteamAPI_ISteamMatchmaking_SendLobbyChatMsg = lf('SteamAPI_ISteamMatchmaking_SendLobbyChatMsg', 'bool', ['void*', 'uint64', 'void*', 'int']);
    this.SteamAPI_ISteamMatchmaking_GetLobbyChatEntry = lf('SteamAPI_ISteamMatchmaking_GetLobbyChatEntry', 'int', ['void*', 'uint64', 'int', 'uint64*', 'void*', 'int', 'int*']);
    
    // Lobby metadata request
    this.SteamAPI_ISteamMatchmaking_RequestLobbyData = lf('SteamAPI_ISteamMatchmaking_RequestLobbyData', 'bool', ['void*', 'uint64']);
    
    // Lobby game server
    this.SteamAPI_ISteamMatchmaking_SetLobbyGameServer = lf('SteamAPI_ISteamMatchmaking_SetLobbyGameServer', 'void', ['void*', 'uint64', 'uint32', 'uint16', 'uint64']);
    this.SteamAPI_ISteamMatchmaking_GetLobbyGameServer = lf('SteamAPI_ISteamMatchmaking_GetLobbyGameServer', 'bool', ['void*', 'uint64', 'uint32*', 'uint16*', 'uint64*']);
    
    // Lobby settings
    this.SteamAPI_ISteamMatchmaking_SetLobbyMemberLimit = lf('SteamAPI_ISteamMatchmaking_SetLobbyMemberLimit', 'bool', ['void*', 'uint64', 'int']);
    this.SteamAPI_ISteamMatchmaking_GetLobbyMemberLimit = lf('SteamAPI_ISteamMatchmaking_GetLobbyMemberLimit', 'int', ['void*', 'uint64']);
    this.SteamAPI_ISteamMatchmaking_SetLobbyType = lf('SteamAPI_ISteamMatchmaking_SetLobbyType', 'bool', ['void*', 'uint64', 'int']);
    this.SteamAPI_ISteamMatchmaking_SetLobbyJoinable = lf('SteamAPI_ISteamMatchmaking_SetLobbyJoinable', 'bool', ['void*', 'uint64', 'bool']);
    this.SteamAPI_ISteamMatchmaking_GetLobbyOwner = lf('SteamAPI_ISteamMatchmaking_GetLobbyOwner', 'uint64', ['void*', 'uint64']);
    this.SteamAPI_ISteamMatchmaking_SetLobbyOwner = lf('SteamAPI_ISteamMatchmaking_SetLobbyOwner', 'bool', ['void*', 'uint64', 'uint64']);
    this.SteamAPI_ISteamMatchmaking_SetLinkedLobby = lf('SteamAPI_ISteamMatchmaking_SetLinkedLobby', 'bool', ['void*', 'uint64', 'uint64']);
    
    // ========================================
    // ISteamUser Authentication Functions
    // ========================================
    
    // Login state
    this.SteamAPI_ISteamUser_BLoggedOn = lf('SteamAPI_ISteamUser_BLoggedOn', 'bool', ['void*']);
    
    // Auth session tickets
    // GetAuthSessionTicket(pTicket, cbMaxTicket, pcbTicket, pSteamNetworkingIdentity) -> HAuthTicket
    this.SteamAPI_ISteamUser_GetAuthSessionTicket = lf('SteamAPI_ISteamUser_GetAuthSessionTicket', 'uint32', ['void*', 'void*', 'int', 'uint32*', 'void*']);
    // GetAuthTicketForWebApi(pchIdentity) -> HAuthTicket
    this.SteamAPI_ISteamUser_GetAuthTicketForWebApi = lf('SteamAPI_ISteamUser_GetAuthTicketForWebApi', 'uint32', ['void*', 'str']);
    // BeginAuthSession(pAuthTicket, cbAuthTicket, steamID) -> EBeginAuthSessionResult
    this.SteamAPI_ISteamUser_BeginAuthSession = lf('SteamAPI_ISteamUser_BeginAuthSession', 'int', ['void*', 'void*', 'int', 'uint64']);
    // EndAuthSession(steamID) -> void
    this.SteamAPI_ISteamUser_EndAuthSession = lf('SteamAPI_ISteamUser_EndAuthSession', 'void', ['void*', 'uint64']);
    // CancelAuthTicket(hAuthTicket) -> void
    this.SteamAPI_ISteamUser_CancelAuthTicket = lf('SteamAPI_ISteamUser_CancelAuthTicket', 'void', ['void*', 'uint32']);
    // UserHasLicenseForApp(steamID, appID) -> EUserHasLicenseForAppResult
    this.SteamAPI_ISteamUser_UserHasLicenseForApp = lf('SteamAPI_ISteamUser_UserHasLicenseForApp', 'int', ['void*', 'uint64', 'uint32']);
    
    // Encrypted app tickets
    // RequestEncryptedAppTicket(pDataToInclude, cbDataToInclude) -> SteamAPICall_t
    this.SteamAPI_ISteamUser_RequestEncryptedAppTicket = lf('SteamAPI_ISteamUser_RequestEncryptedAppTicket', 'uint64', ['void*', 'void*', 'int']);
    // GetEncryptedAppTicket(pTicket, cbMaxTicket, pcbTicket) -> bool
    this.SteamAPI_ISteamUser_GetEncryptedAppTicket = lf('SteamAPI_ISteamUser_GetEncryptedAppTicket', 'bool', ['void*', 'void*', 'int', 'uint32*']);
    
    // Security and account info
    this.SteamAPI_ISteamUser_BIsPhoneVerified = lf('SteamAPI_ISteamUser_BIsPhoneVerified', 'bool', ['void*']);
    this.SteamAPI_ISteamUser_BIsTwoFactorEnabled = lf('SteamAPI_ISteamUser_BIsTwoFactorEnabled', 'bool', ['void*']);
    this.SteamAPI_ISteamUser_BIsPhoneIdentifying = lf('SteamAPI_ISteamUser_BIsPhoneIdentifying', 'bool', ['void*']);
    this.SteamAPI_ISteamUser_BIsPhoneRequiringVerification = lf('SteamAPI_ISteamUser_BIsPhoneRequiringVerification', 'bool', ['void*']);
    this.SteamAPI_ISteamUser_BIsBehindNAT = lf('SteamAPI_ISteamUser_BIsBehindNAT', 'bool', ['void*']);
    
    // User info
    this.SteamAPI_ISteamUser_GetPlayerSteamLevel = lf('SteamAPI_ISteamUser_GetPlayerSteamLevel', 'int', ['void*']);
    this.SteamAPI_ISteamUser_GetGameBadgeLevel = lf('SteamAPI_ISteamUser_GetGameBadgeLevel', 'int', ['void*', 'int', 'bool']);
    this.SteamAPI_ISteamUser_GetUserDataFolder = lf('SteamAPI_ISteamUser_GetUserDataFolder', 'bool', ['void*', 'char*', 'int']);
    
    // Market and duration control
    this.SteamAPI_ISteamUser_GetMarketEligibility = lf('SteamAPI_ISteamUser_GetMarketEligibility', 'uint64', ['void*']);
    this.SteamAPI_ISteamUser_GetDurationControl = lf('SteamAPI_ISteamUser_GetDurationControl', 'uint64', ['void*']);
    this.SteamAPI_ISteamUser_BSetDurationControlOnlineState = lf('SteamAPI_ISteamUser_BSetDurationControlOnlineState', 'bool', ['void*', 'int']);
    
    // Advertising game
    this.SteamAPI_ISteamUser_AdvertiseGame = lf('SteamAPI_ISteamUser_AdvertiseGame', 'void', ['void*', 'uint64', 'uint32', 'uint16']);
    
    // Store auth URL
    this.SteamAPI_ISteamUser_RequestStoreAuthURL = lf('SteamAPI_ISteamUser_RequestStoreAuthURL', 'uint64', ['void*', 'str']);
    
    // Voice recording
    this.SteamAPI_ISteamUser_StartVoiceRecording = lf('SteamAPI_ISteamUser_StartVoiceRecording', 'void', ['void*']);
    this.SteamAPI_ISteamUser_StopVoiceRecording = lf('SteamAPI_ISteamUser_StopVoiceRecording', 'void', ['void*']);
    this.SteamAPI_ISteamUser_GetAvailableVoice = lf('SteamAPI_ISteamUser_GetAvailableVoice', 'int', ['void*', 'uint32*', 'uint32*', 'uint32']);
    this.SteamAPI_ISteamUser_GetVoice = lf('SteamAPI_ISteamUser_GetVoice', 'int', ['void*', 'bool', 'void*', 'uint32', 'uint32*', 'bool', 'void*', 'uint32', 'uint32*', 'uint32']);
    this.SteamAPI_ISteamUser_DecompressVoice = lf('SteamAPI_ISteamUser_DecompressVoice', 'int', ['void*', 'void*', 'uint32', 'void*', 'uint32', 'uint32*', 'uint32']);
    this.SteamAPI_ISteamUser_GetVoiceOptimalSampleRate = lf('SteamAPI_ISteamUser_GetVoiceOptimalSampleRate', 'uint32', ['void*']);
  }

  /**
   * Check if library is loaded
   */
  isLoaded(): boolean {
    return this.steamLib !== null;
  }

  /**
   * Unload the native Steam library
   * 
   * Releases the koffi FFI handle to the Steam shared library (.dll/.dylib/.so).
   * Must be called **after** `SteamAPI_Shutdown()` to avoid using freed memory.
   */
  unload(): void {
    if (this.steamLib) {
      try {
        this.steamLib.unload();
        SteamLogger.debug('[Steamworks] Native library unloaded');
      } catch (e) {
        SteamLogger.warn('[Steamworks] Failed to unload native library:', e);
      } finally {
        this.steamLib = null;
      }
    }
  }

  /**
   * Get the loaded library instance
   */
  getLibrary(): koffi.LibraryHandle | null {
    return this.steamLib;
  }
}
