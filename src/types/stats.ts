/**
 * Stats-related types for the SteamStatsManager
 */

/**
 * User stat value (can be int or float)
 */
export interface SteamStat {
  name: string;
  value: number;
  type: 'int' | 'float';
}

/**
 * Global stat value from Steam servers
 */
export interface GlobalStat {
  name: string;
  value: number;
  type: 'int64' | 'double';
}

/**
 * Global stat with historical data
 */
export interface GlobalStatHistory {
  name: string;
  history: number[]; // Array of daily values, [0] = today, [1] = yesterday, etc.
  type: 'int64' | 'double';
}

/**
 * User stat for another user (friend)
 */
export interface UserStat {
  steamId: string;
  name: string;
  value: number;
  type: 'int' | 'float';
}

/**
 * NumberOfCurrentPlayers_t - Result of GetNumberOfCurrentPlayers
 * Callback ID: k_iSteamUserStatsCallbacks + 7 = 1107
 * @internal
 */
export interface NumberOfCurrentPlayersType {
  m_bSuccess: number;  // 1 if successful
  m_cPlayers: number;  // Number of players currently playing
}
