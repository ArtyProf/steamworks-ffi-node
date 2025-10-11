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
  UserStat
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
  UserStat
};

// Export main Steam class
export default SteamworksSDK;

// For convenience, also export as named export
export { SteamworksSDK as Steam };
