import SteamworksSDK from './steam';
import { 
  SteamAchievement, 
  SteamInitOptions, 
  SteamStatus,
  AchievementProgressLimits,
  UserAchievement,
  AchievementGlobalStats,
  AchievementWithIcon,
  SteamStat,
  GlobalStat,
  GlobalStatHistory,
  UserStat,
  LeaderboardEntry,
  LeaderboardInfo,
  LeaderboardScoreUploadResult,
  LeaderboardSortMethod,
  LeaderboardDisplayType,
  LeaderboardDataRequest,
  LeaderboardUploadScoreMethod
} from './types';

// Export types
export { 
  SteamAchievement, 
  SteamInitOptions, 
  SteamStatus,
  AchievementProgressLimits,
  UserAchievement,
  AchievementGlobalStats,
  AchievementWithIcon,
  SteamStat,
  GlobalStat,
  GlobalStatHistory,
  UserStat,
  LeaderboardEntry,
  LeaderboardInfo,
  LeaderboardScoreUploadResult,
  LeaderboardSortMethod,
  LeaderboardDisplayType,
  LeaderboardDataRequest,
  LeaderboardUploadScoreMethod
};

// Export main Steam class
export default SteamworksSDK;

// For convenience, also export as named export
export { SteamworksSDK as Steam };
