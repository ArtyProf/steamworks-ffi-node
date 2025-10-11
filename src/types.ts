// Basic Steam API types for achievements
export interface SteamAchievement {
  apiName: string;
  displayName: string;
  description: string;
  unlocked: boolean;
  unlockTime: number;
  hidden?: boolean;
}

export interface SteamInitOptions {
  appId: number;
}

export interface SteamStatus {
  initialized: boolean;
  appId: number;
  steamId: string;
}

// Achievement progress limits (for progress tracking)
export interface AchievementProgressLimits {
  minProgress: number;
  maxProgress: number;
}

// User (friend) achievement data
export interface UserAchievement {
  steamId: string;
  apiName: string;
  displayName: string;
  description: string;
  unlocked: boolean;
  unlockTime: number;
}

// Global achievement statistics
export interface AchievementGlobalStats {
  apiName: string;
  displayName: string;
  description: string;
  unlocked: boolean;
  globalUnlockPercentage: number;
}

// Achievement with icon handle
export interface AchievementWithIcon extends SteamAchievement {
  iconHandle: number;
}

// ========================================
// Stats API Types
// ========================================

// User stat value (can be int or float)
export interface SteamStat {
  name: string;
  value: number;
  type: 'int' | 'float';
}

// Global stat value
export interface GlobalStat {
  name: string;
  value: number;
  type: 'int64' | 'double';
}

// Global stat with history
export interface GlobalStatHistory {
  name: string;
  history: number[]; // Array of daily values, [0] = today, [1] = yesterday, etc.
  type: 'int64' | 'double';
}

// User stat for another user (friend)
export interface UserStat {
  steamId: string;
  name: string;
  value: number;
  type: 'int' | 'float';
}