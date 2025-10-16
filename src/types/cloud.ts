/**
 * Steam Cloud / Remote Storage Types
 * Based on ISteamRemoteStorage interface from Steamworks SDK
 */

/**
 * Platform flags for Steam Cloud file sync
 * Files can be synced to specific platforms or all platforms
 */
export enum ERemoteStoragePlatform {
  None = 0,
  Windows = (1 << 0),
  OSX = (1 << 1),
  PS3 = (1 << 2),
  Linux = (1 << 3),
  Switch = (1 << 4),
  Android = (1 << 5),
  IOS = (1 << 6),
  All = 0xffffffff
}

/**
 * Information about a Steam Cloud file
 */
export interface CloudFileInfo {
  /** The filename (always lowercase) */
  name: string;
  
  /** File size in bytes */
  size: number;
  
  /** Last modified timestamp (Unix timestamp) */
  timestamp: number;
  
  /** Whether the file exists in the cloud */
  exists: boolean;
  
  /** Whether the file is persisted to the cloud */
  persisted: boolean;
}

/**
 * Steam Cloud quota information
 */
export interface CloudQuota {
  /** Total bytes available for this app */
  totalBytes: number;
  
  /** Bytes currently available (remaining) */
  availableBytes: number;
  
  /** Bytes currently used */
  usedBytes: number;
  
  /** Percentage used (0-100) */
  percentUsed: number;
}

/**
 * Result of a file write operation
 */
export interface CloudFileWriteResult {
  /** Whether the write was successful */
  success: boolean;
  
  /** The filename that was written */
  filename: string;
  
  /** Number of bytes written */
  bytesWritten: number;
}

/**
 * Result of a file read operation
 */
export interface CloudFileReadResult {
  /** Whether the read was successful */
  success: boolean;
  
  /** The filename that was read */
  filename: string;
  
  /** The file data as a Buffer */
  data: Buffer | null;
  
  /** Number of bytes read */
  bytesRead: number;
}

/**
 * Constants for Steam Cloud
 */
export const CloudConstants = {
  /** Maximum size for a single file write chunk (100MB) */
  MAX_CLOUD_FILE_CHUNK_SIZE: 100 * 1024 * 1024,
  
  /** Maximum filename length */
  MAX_FILENAME_LENGTH: 260,
  
  /** Maximum total file size (200MB) */
  MAX_FILE_SIZE: 200 * 1024 * 1024,
} as const;
