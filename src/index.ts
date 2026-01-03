import SteamworksSDK from './steam';

// Export manager classes for advanced usage
export { SteamAchievementManager } from './internal/SteamAchievementManager';
export { SteamStatsManager } from './internal/SteamStatsManager';
export { SteamLeaderboardManager } from './internal/SteamLeaderboardManager';
export { SteamFriendsManager } from './internal/SteamFriendsManager';
export { SteamRichPresenceManager } from './internal/SteamRichPresenceManager';
export { SteamOverlayManager } from './internal/SteamOverlayManager';
export { SteamCloudManager } from './internal/SteamCloudManager';
export { SteamWorkshopManager } from './internal/SteamWorkshopManager';
export { SteamMatchmakingManager } from './internal/SteamMatchmakingManager';
export { SteamNetworkingUtilsManager } from './internal/SteamNetworkingUtilsManager';
export { SteamNetworkingSocketsManager } from './internal/SteamNetworkingSocketsManager';
export { SteamUserManager } from './internal/SteamUserManager';

// Export all types from organized structure
export * from './types';

// Export main Steam class as both default and named export
export default SteamworksSDK;
export { SteamworksSDK };
