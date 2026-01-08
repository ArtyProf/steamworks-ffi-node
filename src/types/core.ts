/**
 * Core Steam API types used across all managers
 */

/**
 * Options for initializing the Steam API
 */
export interface SteamInitOptions {
  /** Steam App ID */
  appId: number;
  
  /**
   * Custom path to the steamworks_sdk folder (relative to project root)
   * 
   * Allows you to organize the Steamworks SDK in a custom location
   * instead of the default project root.
   * 
   * @default 'steamworks_sdk'
   * 
   * @example
   * ```typescript
   * // SDK in vendor folder
   * steam.init({ appId: 480, sdkPath: 'vendor/steamworks_sdk' });
   * 
   * // SDK in nested structure
   * steam.init({ appId: 480, sdkPath: 'source/main/sdk/steamworks' });
   * ```
   */
  sdkPath?: string;
}

/**
 * Current Steam connection status
 */
export interface SteamStatus {
  initialized: boolean;
  appId: number;
  steamId: string;
}
