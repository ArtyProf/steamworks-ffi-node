import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import { SteamLogger } from './SteamLogger';
import {
  CloudFileInfo,
  CloudQuota,
  CloudFileReadResult,
  CloudBatchWriteResult
} from '../types';

/**
 * Manager for Steam Cloud / Remote Storage operations
 * 
 * The SteamCloudManager provides comprehensive access to Steam's cloud storage system,
 * allowing you to save and synchronize game data across multiple devices.
 * 
 * Key Features:
 * - File operations (read, write, delete, check existence)
 * - Quota management (check available space)
 * - File iteration and metadata retrieval
 * - Automatic synchronization across devices
 * - Platform-specific sync control
 * 
 * File Constraints:
 * - Max file size: 100MB per write, 200MB total
 * - Filenames are case-insensitive (converted to lowercase)
 * - Max filename length: 260 characters
 * 
 * @remarks
 * All methods require the Steam API to be initialized and cloud to be enabled.
 * Files are automatically synced when Steam is running and connected.
 * 
 * @example Basic file operations
 * ```typescript
 * const steam = SteamworksSDK.getInstance();
 * steam.init({ appId: 480 });
 * 
 * // Write a save file
 * const saveData = Buffer.from(JSON.stringify({ level: 5, score: 1000 }));
 * const written = steam.cloud.fileWrite('savegame.json', saveData);
 * 
 * // Read it back
 * const result = steam.cloud.fileRead('savegame.json');
 * if (result.success) {
 *   const data = JSON.parse(result.data.toString());
 *   console.log(`Level: ${data.level}, Score: ${data.score}`);
 * }
 * 
 * // Check quota
 * const quota = steam.cloud.getQuota();
 * console.log(`Using ${quota.percentUsed}% of cloud storage`);
 * ```
 * 
 * @example List all cloud files
 * ```typescript
 * const files = steam.cloud.getAllFiles();
 * files.forEach(file => {
 *   console.log(`${file.name}: ${file.size} bytes, modified ${new Date(file.timestamp * 1000)}`);
 * });
 * ```
 * 
 * @see {@link https://partner.steamgames.com/doc/api/ISteamRemoteStorage ISteamRemoteStorage Documentation}
 */
export class SteamCloudManager {
  /** Steam library loader for FFI function calls */
  private libraryLoader: SteamLibraryLoader;
  
  /** Steam API core for initialization and callback management */
  private apiCore: SteamAPICore;

  /**
   * Creates a new SteamCloudManager instance
   * 
   * @param libraryLoader - The Steam library loader for FFI calls
   * @param apiCore - The Steam API core for lifecycle management
   */
  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
  }

  /**
   * Writes a file to Steam Cloud
   * 
   * @param filename - The name of the file to write (will be converted to lowercase)
   * @param data - The data to write as a Buffer
   * @returns True if the write was successful, false otherwise
   * 
   * @remarks
   * - Files are limited to 100MB per write and 200MB total
   * - Filenames are automatically converted to lowercase
   * - File is queued for upload when Steam is connected
   * - Overwrites existing file with same name
   * 
   * @example
   * ```typescript
   * const saveData = Buffer.from(JSON.stringify({ level: 5 }));
   * const success = steam.cloud.fileWrite('savegame.json', saveData);
   * if (success) {
   *   console.log('Save file written to cloud');
   * }
   * ```
   */
  fileWrite(filename: string, data: Buffer): boolean {
    if (!this.apiCore.isInitialized()) {
      SteamLogger.error('[Steamworks] Steam API not initialized');
      return false;
    }

    const remoteStorage = this.apiCore.getRemoteStorageInterface();
    if (!remoteStorage) {
      SteamLogger.error('[Steamworks] ISteamRemoteStorage interface not available');
      return false;
    }

    try {
      const result = this.libraryLoader.SteamAPI_ISteamRemoteStorage_FileWrite(
        remoteStorage,
        filename,
        data,
        data.length
      );

      return result;
    } catch (error) {
      SteamLogger.error('[Steamworks] Error writing file to Steam Cloud:', error);
      return false;
    }
  }

  /**
   * Reads a file from Steam Cloud
   * 
   * @param filename - The name of the file to read
   * @returns CloudFileReadResult with success status and data
   * 
   * @remarks
   * - File must exist in cloud storage
   * - Returns the complete file contents as a Buffer
   * - Data can be converted to string or parsed as JSON
   * 
   * @example
   * ```typescript
   * const result = steam.cloud.fileRead('savegame.json');
   * if (result.success && result.data) {
   *   const saveData = JSON.parse(result.data.toString());
   *   console.log('Loaded save:', saveData);
   * }
   * ```
   */
  fileRead(filename: string): CloudFileReadResult {
    const result: CloudFileReadResult = {
      success: false,
      filename,
      data: null,
      bytesRead: 0
    };

    if (!this.apiCore.isInitialized()) {
      SteamLogger.error('[Steamworks] Steam API not initialized');
      return result;
    }

    const remoteStorage = this.apiCore.getRemoteStorageInterface();
    if (!remoteStorage) {
      SteamLogger.error('[Steamworks] ISteamRemoteStorage interface not available');
      return result;
    }

    try {
      // First, get the file size
      const size = this.getFileSize(filename);
      if (size <= 0) {
        return result;
      }

      // Allocate buffer for file data
      const buffer = Buffer.alloc(size);

      const bytesRead = this.libraryLoader.SteamAPI_ISteamRemoteStorage_FileRead(
        remoteStorage,
        filename,
        buffer,
        size
      );
      
      if (bytesRead > 0) {
        result.success = true;
        result.data = buffer.slice(0, bytesRead);
        result.bytesRead = bytesRead;
      }

      return result;
    } catch (error) {
      SteamLogger.error('[Steamworks] Error reading file from Steam Cloud:', error);
      return result;
    }
  }

  /**
   * Checks if a file exists in Steam Cloud
   * 
   * @param filename - The name of the file to check
   * @returns True if the file exists, false otherwise
   * 
   * @example
   * ```typescript
   * if (steam.cloud.fileExists('savegame.json')) {
   *   console.log('Save file found in cloud');
   * }
   * ```
   */
  fileExists(filename: string): boolean {
    if (!this.apiCore.isInitialized()) {
      return false;
    }

    const remoteStorage = this.apiCore.getRemoteStorageInterface();
    if (!remoteStorage) {
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamRemoteStorage_FileExists(remoteStorage, filename);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error checking file existence:', error);
      return false;
    }
  }

  /**
   * Deletes a file from Steam Cloud
   * 
   * @param filename - The name of the file to delete
   * @returns True if the file was deleted, false otherwise
   * 
   * @remarks
   * - File is removed from cloud storage
   * - Deletion is synchronized across all devices
   * - Returns true even if file doesn't exist
   * 
   * @example
   * ```typescript
   * const deleted = steam.cloud.fileDelete('old_save.json');
   * if (deleted) {
   *   console.log('Save file deleted from cloud');
   * }
   * ```
   */
  fileDelete(filename: string): boolean {
    if (!this.apiCore.isInitialized()) {
      return false;
    }

    const remoteStorage = this.apiCore.getRemoteStorageInterface();
    if (!remoteStorage) {
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamRemoteStorage_FileDelete(remoteStorage, filename);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error deleting file:', error);
      return false;
    }
  }

  /**
   * Gets the size of a file in Steam Cloud
   * 
   * @param filename - The name of the file
   * @returns File size in bytes, or 0 if file doesn't exist
   * 
   * @example
   * ```typescript
   * const size = steam.cloud.getFileSize('savegame.json');
   * console.log(`Save file is ${size} bytes`);
   * ```
   */
  getFileSize(filename: string): number {
    if (!this.apiCore.isInitialized()) {
      return 0;
    }

    const remoteStorage = this.apiCore.getRemoteStorageInterface();
    if (!remoteStorage) {
      return 0;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamRemoteStorage_GetFileSize(remoteStorage, filename);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting file size:', error);
      return 0;
    }
  }

  /**
   * Gets the last modified timestamp of a file
   * 
   * @param filename - The name of the file
   * @returns Unix timestamp of last modification, or 0 if file doesn't exist
   * 
   * @example
   * ```typescript
   * const timestamp = steam.cloud.getFileTimestamp('savegame.json');
   * const date = new Date(timestamp * 1000);
   * console.log(`Last saved: ${date.toLocaleString()}`);
   * ```
   */
  getFileTimestamp(filename: string): number {
    if (!this.apiCore.isInitialized()) {
      return 0;
    }

    const remoteStorage = this.apiCore.getRemoteStorageInterface();
    if (!remoteStorage) {
      return 0;
    }

    try {
      return Number(this.libraryLoader.SteamAPI_ISteamRemoteStorage_GetFileTimestamp(remoteStorage, filename));
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting file timestamp:', error);
      return 0;
    }
  }

  /**
   * Gets the total number of files in Steam Cloud for this app
   * 
   * @returns Number of files in cloud storage
   * 
   * @example
   * ```typescript
   * const count = steam.cloud.getFileCount();
   * console.log(`${count} files in cloud storage`);
   * ```
   */
  getFileCount(): number {
    if (!this.apiCore.isInitialized()) {
      return 0;
    }

    const remoteStorage = this.apiCore.getRemoteStorageInterface();
    if (!remoteStorage) {
      return 0;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamRemoteStorage_GetFileCount(remoteStorage);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting file count:', error);
      return 0;
    }
  }

  /**
   * Gets the name and size of a file by index
   * 
   * @param index - The index of the file (0 to GetFileCount()-1)
   * @returns Object with name and size, or null if index is invalid
   * 
   * @remarks
   * Use this with getFileCount() to iterate through all files
   * 
   * @example
   * ```typescript
   * const count = steam.cloud.getFileCount();
   * for (let i = 0; i < count; i++) {
   *   const file = steam.cloud.getFileNameAndSize(i);
   *   if (file) {
   *     console.log(`${file.name}: ${file.size} bytes`);
   *   }
   * }
   * ```
   */
  getFileNameAndSize(index: number): { name: string; size: number } | null {
    if (!this.apiCore.isInitialized()) {
      return null;
    }

    const remoteStorage = this.apiCore.getRemoteStorageInterface();
    if (!remoteStorage) {
      return null;
    }

    try {
      // Allocate buffer for the size output parameter
      const sizePtr = Buffer.alloc(4); // int32 pointer
      
      // Call the API - it will write the size into sizePtr
      const name = this.libraryLoader.SteamAPI_ISteamRemoteStorage_GetFileNameAndSize(
        remoteStorage,
        index,
        sizePtr
      );
      
      // If no name returned, index is out of bounds
      if (!name || name === '') {
        return null;
      }

      // Read the size value that was written by the API
      const size = sizePtr.readInt32LE(0);
      
      // Validate size is non-negative
      if (size < 0) {
        SteamLogger.warn('[Steamworks] Invalid file size returned for ' + name + ': ' + size);
        return { name, size: 0 };
      }
      
      return { name, size };
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting file name and size:', error);
      return null;
    }
  }

  /**
   * Gets detailed information about all files in Steam Cloud
   * 
   * @returns Array of CloudFileInfo objects with complete metadata
   * 
   * @example
   * ```typescript
   * const files = steam.cloud.getAllFiles();
   * files.forEach(file => {
   *   const date = new Date(file.timestamp * 1000);
   *   console.log(`${file.name}:`);
   *   console.log(`  Size: ${file.size} bytes`);
   *   console.log(`  Modified: ${date.toLocaleString()}`);
   *   console.log(`  Persisted: ${file.persisted ? 'Yes' : 'No'}`);
   * });
   * ```
   */
  getAllFiles(): CloudFileInfo[] {
    const files: CloudFileInfo[] = [];
    const count = this.getFileCount();

    for (let i = 0; i < count; i++) {
      const fileInfo = this.getFileNameAndSize(i);
      if (fileInfo) {
        const timestamp = this.getFileTimestamp(fileInfo.name);
        const persisted = this.filePersisted(fileInfo.name);
        
        files.push({
          name: fileInfo.name,
          size: fileInfo.size,
          timestamp,
          exists: true,
          persisted
        });
      }
    }

    return files;
  }

  /**
   * Checks if a file is persisted (uploaded) to Steam Cloud
   * 
   * @param filename - The name of the file to check
   * @returns True if the file is persisted to cloud, false otherwise
   * 
   * @remarks
   * Files may exist locally but not yet be uploaded to the cloud.
   * This checks if the file has been successfully synced.
   * 
   * @example
   * ```typescript
   * if (steam.cloud.filePersisted('savegame.json')) {
   *   console.log('Save file is synced to cloud');
   * } else {
   *   console.log('Save file is still uploading...');
   * }
   * ```
   */
  filePersisted(filename: string): boolean {
    if (!this.apiCore.isInitialized()) {
      return false;
    }

    const remoteStorage = this.apiCore.getRemoteStorageInterface();
    if (!remoteStorage) {
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamRemoteStorage_FilePersisted(remoteStorage, filename);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error checking file persisted status:', error);
      return false;
    }
  }

  /**
   * Gets Steam Cloud quota information
   * 
   * @returns CloudQuota object with total, available, and used bytes
   * 
   * @remarks
   * - Total quota varies by app (typically 100MB-1GB)
   * - Available bytes = total - used
   * - Quota is per-user, per-app
   * 
   * @example
   * ```typescript
   * const quota = steam.cloud.getQuota();
   * console.log(`Cloud Storage: ${quota.usedBytes}/${quota.totalBytes} bytes`);
   * console.log(`${quota.percentUsed.toFixed(1)}% used`);
   * console.log(`${quota.availableBytes} bytes remaining`);
   * ```
   */
  getQuota(): CloudQuota {
    const quota: CloudQuota = {
      totalBytes: 0,
      availableBytes: 0,
      usedBytes: 0,
      percentUsed: 0
    };

    if (!this.apiCore.isInitialized()) {
      return quota;
    }

    const remoteStorage = this.apiCore.getRemoteStorageInterface();
    if (!remoteStorage) {
      return quota;
    }

    try {
      const totalBytesPtr = Buffer.alloc(8); // uint64
      const availableBytesPtr = Buffer.alloc(8); // uint64
      
      const success = this.libraryLoader.SteamAPI_ISteamRemoteStorage_GetQuota(
        remoteStorage,
        totalBytesPtr,
        availableBytesPtr
      );
      
      if (success) {
        quota.totalBytes = Number(totalBytesPtr.readBigUInt64LE(0));
        quota.availableBytes = Number(availableBytesPtr.readBigUInt64LE(0));
        quota.usedBytes = quota.totalBytes - quota.availableBytes;
        quota.percentUsed = quota.totalBytes > 0 
          ? (quota.usedBytes / quota.totalBytes) * 100 
          : 0;
      }

      return quota;
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting cloud quota:', error);
      return quota;
    }
  }

  /**
   * Checks if Steam Cloud is enabled for the user's account
   * 
   * @returns True if cloud is enabled at account level
   * 
   * @remarks
   * Users can disable Steam Cloud globally in their Steam settings.
   * If disabled, file operations will fail.
   * 
   * @example
   * ```typescript
   * if (!steam.cloud.isCloudEnabledForAccount()) {
   *   console.warn('User has disabled Steam Cloud in their settings');
   * }
   * ```
   */
  isCloudEnabledForAccount(): boolean {
    if (!this.apiCore.isInitialized()) {
      return false;
    }

    const remoteStorage = this.apiCore.getRemoteStorageInterface();
    if (!remoteStorage) {
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamRemoteStorage_IsCloudEnabledForAccount(remoteStorage);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error checking cloud enabled for account:', error);
      return false;
    }
  }

  /**
   * Checks if Steam Cloud is enabled for this specific app
   * 
   * @returns True if cloud is enabled for this app
   * 
   * @remarks
   * Apps can enable/disable cloud storage independently.
   * Even if account cloud is enabled, app cloud might be disabled.
   * 
   * @example
   * ```typescript
   * if (steam.cloud.isCloudEnabledForApp()) {
   *   console.log('Steam Cloud is active for this game');
   * }
   * ```
   */
  isCloudEnabledForApp(): boolean {
    if (!this.apiCore.isInitialized()) {
      return false;
    }

    const remoteStorage = this.apiCore.getRemoteStorageInterface();
    if (!remoteStorage) {
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamRemoteStorage_IsCloudEnabledForApp(remoteStorage);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error checking cloud enabled for app:', error);
      return false;
    }
  }

  /**
   * Enables or disables Steam Cloud for this app
   * 
   * @param enabled - True to enable cloud, false to disable
   * 
   * @remarks
   * - This is a per-app setting
   * - User must have cloud enabled at account level
   * - Changes are saved to Steam config
   * 
   * @example
   * ```typescript
   * // Let user toggle cloud saves
   * steam.cloud.setCloudEnabledForApp(userWantsCloudSaves);
   * ```
   */
  setCloudEnabledForApp(enabled: boolean): void {
    if (!this.apiCore.isInitialized()) {
      return;
    }

    const remoteStorage = this.apiCore.getRemoteStorageInterface();
    if (!remoteStorage) {
      return;
    }

    try {
      this.libraryLoader.SteamAPI_ISteamRemoteStorage_SetCloudEnabledForApp(remoteStorage, enabled);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error setting cloud enabled for app:', error);
    }
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  /**
   * Begins a batch of file write operations
   * 
   * @returns True if the batch was started successfully, false otherwise
   * 
   * @remarks
   * Use this when you need to update multiple files atomically, such as a game save
   * that consists of multiple files. Steam will treat all writes between
   * BeginFileWriteBatch() and EndFileWriteBatch() as a single atomic operation.
   * 
   * If a batch is started but not ended (e.g., due to a crash), Steam will
   * rollback the changes when the user next plays the game.
   * 
   * @example
   * ```typescript
   * // Write multiple save files atomically
   * const success = steam.cloud.beginFileWriteBatch();
   * if (success) {
   *   steam.cloud.fileWrite('save_meta.json', metaBuffer);
   *   steam.cloud.fileWrite('save_world.bin', worldBuffer);
   *   steam.cloud.fileWrite('save_inventory.json', inventoryBuffer);
   *   steam.cloud.endFileWriteBatch();
   * }
   * ```
   * 
   * @see {@link endFileWriteBatch}
   */
  beginFileWriteBatch(): boolean {
    if (!this.apiCore.isInitialized()) {
      SteamLogger.error('[Steamworks] Steam API not initialized');
      return false;
    }

    const remoteStorage = this.apiCore.getRemoteStorageInterface();
    if (!remoteStorage) {
      SteamLogger.error('[Steamworks] ISteamRemoteStorage interface not available');
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamRemoteStorage_BeginFileWriteBatch(remoteStorage);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error beginning file write batch:', error);
      return false;
    }
  }

  /**
   * Ends a batch of file write operations
   * 
   * @returns True if the batch was ended successfully, false otherwise
   * 
   * @remarks
   * Call this after all files in the batch have been written. If this returns
   * true, all the files written since BeginFileWriteBatch() will be committed
   * atomically.
   * 
   * @example
   * ```typescript
   * // Complete a batch write
   * steam.cloud.beginFileWriteBatch();
   * steam.cloud.fileWrite('file1.dat', data1);
   * steam.cloud.fileWrite('file2.dat', data2);
   * const committed = steam.cloud.endFileWriteBatch();
   * if (committed) {
   *   console.log('All files saved atomically');
   * }
   * ```
   * 
   * @see {@link beginFileWriteBatch}
   */
  endFileWriteBatch(): boolean {
    if (!this.apiCore.isInitialized()) {
      SteamLogger.error('[Steamworks] Steam API not initialized');
      return false;
    }

    const remoteStorage = this.apiCore.getRemoteStorageInterface();
    if (!remoteStorage) {
      SteamLogger.error('[Steamworks] ISteamRemoteStorage interface not available');
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamRemoteStorage_EndFileWriteBatch(remoteStorage);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error ending file write batch:', error);
      return false;
    }
  }

  /**
   * Writes multiple files atomically as a batch operation
   * 
   * @param files - Array of objects containing filename and data pairs
   * @returns Object with success status and individual file results
   * 
   * @remarks
   * This is a convenience method that wraps BeginFileWriteBatch(), multiple
   * fileWrite() calls, and EndFileWriteBatch() into a single operation.
   * 
   * If any file fails to write, the entire batch is considered failed and
   * Steam may rollback the changes.
   * 
   * @example
   * ```typescript
   * const result = steam.cloud.writeFilesBatch([
   *   { filename: 'save_meta.json', data: Buffer.from(JSON.stringify(meta)) },
   *   { filename: 'save_world.bin', data: worldBuffer },
   *   { filename: 'save_inventory.json', data: Buffer.from(JSON.stringify(inventory)) }
   * ]);
   * 
   * if (result.success) {
   *   console.log(`All ${result.filesWritten} files saved`);
   * } else {
   *   console.error('Batch write failed:', result.failedFiles);
   * }
   * ```
   */
  writeFilesBatch(files: Array<{ filename: string; data: Buffer }>): CloudBatchWriteResult {
    const result = {
      success: false,
      filesWritten: 0,
      failedFiles: [] as string[]
    };

    if (!this.beginFileWriteBatch()) {
      SteamLogger.error('[Steamworks] Failed to begin file write batch');
      return result;
    }

    for (const file of files) {
      const written = this.fileWrite(file.filename, file.data);
      if (written) {
        result.filesWritten++;
      } else {
        result.failedFiles.push(file.filename);
      }
    }

    if (this.endFileWriteBatch() && result.failedFiles.length === 0) {
      result.success = true;
    }

    return result;
  }
}
