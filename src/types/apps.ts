/**
 * Steam Apps/DLC Types
 *
 * Types for the ISteamApps interface - DLC management, app ownership,
 * install directories, beta branches, and app metadata.
 */

/**
 * Steam Application ID type
 */
export type AppId = number;

/**
 * Steam Depot ID type (for installed depots)
 */
export type DepotId = number;

/**
 * DLC data structure returned by getDLCDataByIndex
 */
export interface DLCData {
  /** The App ID of the DLC */
  appId: AppId;
  /** Whether the DLC is available (owned and ready to use) */
  available: boolean;
  /** The name of the DLC */
  name: string;
}

/**
 * DLC download progress information
 */
export interface DLCDownloadProgress {
  /** Bytes downloaded so far */
  bytesDownloaded: bigint;
  /** Total bytes to download */
  bytesTotal: bigint;
  /** Download progress as percentage (0-100) */
  percentComplete: number;
}

/**
 * Beta branch information
 */
export interface BetaInfo {
  /** Beta branch name */
  name: string;
  /** Beta branch description */
  description: string;
  /** Current build ID for this beta */
  buildId: number;
  /** Beta branch flags (EBetaBranchFlags) */
  flags: number;
}

/**
 * Beta branch flags
 */
export enum EBetaBranchFlags {
  /** No special flags */
  None = 0,
  /** Beta is the default/public branch */
  Default = 1 << 0,
  /** Beta is available to the user */
  Available = 1 << 1,
  /** Beta is a private branch */
  Private = 1 << 2,
  /** Beta is currently selected/active */
  Selected = 1 << 3,
}

/**
 * Timed trial status information
 */
export interface TimedTrialStatus {
  /** Whether this is a timed trial */
  isTimedTrial: boolean;
  /** Total seconds allowed in the trial */
  secondsAllowed: number;
  /** Seconds already played */
  secondsPlayed: number;
  /** Seconds remaining in trial */
  secondsRemaining: number;
}

/**
 * File details result from GetFileDetails
 */
export interface FileDetails {
  /** Whether the query was successful */
  success: boolean;
  /** File size in bytes */
  fileSize: bigint;
  /** SHA1 hash of the file (20 bytes as hex string) */
  fileSHA: string;
  /** File flags */
  flags: number;
}

/**
 * App ownership information
 */
export interface AppOwnershipInfo {
  /** Whether the user is subscribed to the app */
  isSubscribed: boolean;
  /** Whether the user owns the app through a free weekend */
  isSubscribedFromFreeWeekend: boolean;
  /** Whether the user is borrowing via Family Sharing */
  isSubscribedFromFamilySharing: boolean;
  /** Whether the app is installed */
  isInstalled: boolean;
  /** Unix timestamp of earliest purchase */
  earliestPurchaseTime: number;
  /** Steam ID of the actual owner (different if Family Sharing) */
  ownerId: bigint;
}

/**
 * App build and version information
 */
export interface AppBuildInfo {
  /** Current build ID */
  buildId: number;
  /** Current beta branch name ('public' if default) */
  betaName: string;
  /** Install directory path */
  installDir: string;
}
