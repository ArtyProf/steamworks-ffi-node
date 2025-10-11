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

// ========================================
// Leaderboard API Types
// ========================================

// Leaderboard sort methods
export enum LeaderboardSortMethod {
  None = 0,
  Ascending = 1,   // Top score is lowest number
  Descending = 2   // Top score is highest number
}

// Leaderboard display types
export enum LeaderboardDisplayType {
  None = 0,
  Numeric = 1,           // Simple numerical score
  TimeSeconds = 2,       // Score represents time in seconds
  TimeMilliseconds = 3   // Score represents time in milliseconds
}

// Leaderboard data request types
export enum LeaderboardDataRequest {
  Global = 0,            // Top entries from full leaderboard
  GlobalAroundUser = 1,  // Entries around current user
  Friends = 2,           // Entries for friends only
  Users = 3              // Entries for specific users
}

// Leaderboard upload score methods
export enum LeaderboardUploadScoreMethod {
  None = 0,
  KeepBest = 1,      // Keep user's best score
  ForceUpdate = 2    // Always replace with new score
}

// Single leaderboard entry
export interface LeaderboardEntry {
  steamId: string;
  globalRank: number;    // [1..N] where N is total entries
  score: number;
  details: number[];     // Extra game-defined data (max 64 int32 values)
  ugcHandle: bigint;     // Handle for attached UGC content
}

// Leaderboard information
export interface LeaderboardInfo {
  handle: bigint;
  name: string;
  entryCount: number;
  sortMethod: LeaderboardSortMethod;
  displayType: LeaderboardDisplayType;
}

// Result of score upload
export interface LeaderboardScoreUploadResult {
  success: boolean;
  leaderboardHandle: bigint;
  score: number;
  scoreChanged: boolean;
  globalRankNew: number;
  globalRankPrevious: number;
}
