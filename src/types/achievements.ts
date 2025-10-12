/**
 * Achievement-related types for the SteamAchievementManager
 */

/**
 * Steam achievement data
 */
export interface SteamAchievement {
  apiName: string;
  displayName: string;
  description: string;
  unlocked: boolean;
  unlockTime: number;
  hidden?: boolean;
}

/**
 * Achievement progress limits for progress tracking
 */
export interface AchievementProgressLimits {
  minProgress: number;
  maxProgress: number;
}

/**
 * User (friend) achievement data
 */
export interface UserAchievement {
  steamId: string;
  apiName: string;
  displayName: string;
  description: string;
  unlocked: boolean;
  unlockTime: number;
}

/**
 * Global achievement statistics with unlock percentage
 */
export interface AchievementGlobalStats {
  apiName: string;
  displayName: string;
  description: string;
  unlocked: boolean;
  globalUnlockPercentage: number;
}

/**
 * Achievement with icon handle for visual display
 */
export interface AchievementWithIcon extends SteamAchievement {
  iconHandle: number;
}
