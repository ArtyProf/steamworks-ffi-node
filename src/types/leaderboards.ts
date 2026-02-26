/**
 * Leaderboard-related types for the SteamLeaderboardManager
 */

/**
 * Leaderboard sort methods
 */
export enum LeaderboardSortMethod {
  Ascending = 1,   // Top score is lowest number
  Descending = 2   // Top score is highest number
}

/**
 * Leaderboard display types
 */
export enum LeaderboardDisplayType {
  Numeric = 1,           // Simple numerical score
  TimeSeconds = 2,       // Score represents time in seconds
  TimeMilliseconds = 3   // Score represents time in milliseconds
}

/**
 * Leaderboard data request types
 */
export enum LeaderboardDataRequest {
  Global = 0,            // Top entries from full leaderboard
  GlobalAroundUser = 1,  // Entries around current user
  Friends = 2,           // Entries for friends only
  Users = 3              // Entries for specific users
}

/**
 * Leaderboard upload score methods
 */
export enum LeaderboardUploadScoreMethod {
  KeepBest = 1,      // Keep user's best score
  ForceUpdate = 2    // Always replace with new score
}

/**
 * Single leaderboard entry
 */
export interface LeaderboardEntry {
  steamId: string;
  globalRank: number;    // [1..N] where N is total entries
  score: number;
  details: number[];     // Extra game-defined data (max 64 int32 values)
  ugcHandle: bigint;     // Handle for attached UGC content
}

/**
 * Leaderboard information
 */
export interface LeaderboardInfo {
  handle: bigint;
  name: string;
  entryCount: number;
  sortMethod: LeaderboardSortMethod;
  displayType: LeaderboardDisplayType;
}

/**
 * Result of score upload
 */
export interface LeaderboardScoreUploadResult {
  success: boolean;
  leaderboardHandle: bigint;
  score: number;
  scoreChanged: boolean;
  globalRankNew: number;
  globalRankPrevious: number;
}

/**
 * LeaderboardFindResult_t - Result of FindOrCreateLeaderboard/FindLeaderboard
 * Callback ID: k_iSteamUserStatsCallbacks + 4 = 1104
 * @internal
 */
export interface LeaderboardFindResultType {
  m_hSteamLeaderboard: bigint;
  m_bLeaderboardFound: number;
}

/**
 * LeaderboardScoreUploaded_t - Result of UploadLeaderboardScore
 * Callback ID: k_iSteamUserStatsCallbacks + 6 = 1106
 * @internal
 */
export interface LeaderboardScoreUploadedType {
  m_bSuccess: number;
  m_hSteamLeaderboard: bigint;
  m_nScore: number;
  m_bScoreChanged: number;
  m_nGlobalRankNew: number;
  m_nGlobalRankPrevious: number;
}

/**
 * LeaderboardScoresDownloaded_t - Result of DownloadLeaderboardEntries
 * Callback ID: k_iSteamUserStatsCallbacks + 5 = 1105
 * @internal
 */
export interface LeaderboardScoresDownloadedType {
  m_hSteamLeaderboard: bigint;
  m_hSteamLeaderboardEntries: bigint;
  m_cEntryCount: number;
}

/**
 * LeaderboardUGCSet_t - Result of AttachLeaderboardUGC
 * Callback ID: k_iSteamUserStatsCallbacks + 11 = 1111
 * @internal
 */
export interface LeaderboardUGCSetType {
  m_eResult: number;
  m_hSteamLeaderboard: bigint;
}

/**
 * LeaderboardEntry_t - Individual leaderboard entry data (from Steam)
 * @internal
 */
export interface LeaderboardEntryType {
  m_steamIDUser: bigint;
  m_nGlobalRank: number;
  m_nScore: number;
  m_cDetails: number;
  m_hUGC: bigint;
}
