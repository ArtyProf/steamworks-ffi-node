/**
 * Core Steam API types used across all managers
 */

/**
 * Options for initializing the Steam API
 */
export interface SteamInitOptions {
  appId: number;
}

/**
 * Current Steam connection status
 */
export interface SteamStatus {
  initialized: boolean;
  appId: number;
  steamId: string;
}
