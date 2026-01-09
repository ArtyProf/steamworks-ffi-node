/**
 * Steam Apps Manager
 *
 * Handles DLC management, app ownership verification, install directories,
 * beta branches, and app metadata through the ISteamApps interface.
 *
 * Features:
 * - DLC ownership and installation status
 * - App ownership verification
 * - Install directory information
 * - Beta branch management
 * - Launch parameters
 * - App metadata (build ID, languages, purchase time)
 */

import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import { SteamLogger } from './SteamLogger';
import type {
  AppId,
  DepotId,
  DLCData,
  DLCDownloadProgress,
  BetaInfo,
  TimedTrialStatus,
  AppOwnershipInfo,
  AppBuildInfo
} from '../types';

/**
 * Manages Steam Apps/DLC functionality
 */
export class SteamAppsManager {
  private libraryLoader: SteamLibraryLoader;
  private apiCore: SteamAPICore;

  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
  }

  /**
   * Get the ISteamApps interface pointer
   */
  private getSteamApps(): any {
    return this.libraryLoader.SteamAPI_SteamApps_v008();
  }

  // ========================================
  // Ownership Checks
  // ========================================

  /**
   * Checks if the user is subscribed to the current app
   * 
   * @returns True if user owns or has access to the app
   * 
   * @remarks
   * - Returns true for owned games, free weekends, Family Sharing, etc.
   * - Use more specific methods to determine the type of access
   * 
   * @example
   * ```typescript
   * if (steam.apps.isSubscribed()) {
   *   console.log('User has access to this app');
   * }
   * ```
   */
  isSubscribed(): boolean {
    try {
      const apps = this.getSteamApps();
      if (!apps) {
        SteamLogger.warn('[Steamworks] ISteamApps interface not available');
        return false;
      }
      return this.libraryLoader.SteamAPI_ISteamApps_BIsSubscribed(apps);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error checking subscription:', error);
      return false;
    }
  }

  /**
   * Checks if the user is subscribed to a specific app
   * 
   * @param appId - The App ID to check ownership for
   * @returns True if user owns or has access to the specified app
   * 
   * @remarks
   * - Useful for checking if user owns related games (demos, sequels, etc.)
   * - For DLC, use isDlcInstalled() instead
   * 
   * @example
   * ```typescript
   * // Check if user owns the main game (for a demo)
   * if (steam.apps.isSubscribedApp(123456)) {
   *   console.log('User owns the full game!');
   * }
   * ```
   */
  isSubscribedApp(appId: AppId): boolean {
    try {
      const apps = this.getSteamApps();
      if (!apps) {
        SteamLogger.warn('[Steamworks] ISteamApps interface not available');
        return false;
      }
      return this.libraryLoader.SteamAPI_ISteamApps_BIsSubscribedApp(apps, appId);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error checking app subscription:', error);
      return false;
    }
  }

  /**
   * Checks if an app is installed (not necessarily owned)
   * 
   * @param appId - The App ID to check
   * @returns True if the app is installed on this machine
   * 
   * @example
   * ```typescript
   * if (steam.apps.isAppInstalled(480)) {
   *   console.log('Spacewar is installed');
   * }
   * ```
   */
  isAppInstalled(appId: AppId): boolean {
    try {
      const apps = this.getSteamApps();
      if (!apps) {
        SteamLogger.warn('[Steamworks] ISteamApps interface not available');
        return false;
      }
      return this.libraryLoader.SteamAPI_ISteamApps_BIsAppInstalled(apps, appId);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error checking app installation:', error);
      return false;
    }
  }

  /**
   * Checks if running in low violence mode
   * 
   * @returns True if the game is running in low violence mode
   * 
   * @remarks
   * Some regions require reduced violence content
   */
  isLowViolence(): boolean {
    try {
      const apps = this.getSteamApps();
      if (!apps) return false;
      return this.libraryLoader.SteamAPI_ISteamApps_BIsLowViolence(apps);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error checking low violence mode:', error);
      return false;
    }
  }

  /**
   * Checks if running in a cybercafe
   * 
   * @returns True if running on a cybercafe account
   */
  isCybercafe(): boolean {
    try {
      const apps = this.getSteamApps();
      if (!apps) return false;
      return this.libraryLoader.SteamAPI_ISteamApps_BIsCybercafe(apps);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error checking cybercafe status:', error);
      return false;
    }
  }

  /**
   * Checks if user is VAC banned
   * 
   * @returns True if user has a VAC ban
   */
  isVACBanned(): boolean {
    try {
      const apps = this.getSteamApps();
      if (!apps) return false;
      return this.libraryLoader.SteamAPI_ISteamApps_BIsVACBanned(apps);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error checking VAC ban status:', error);
      return false;
    }
  }

  /**
   * Checks if user has access through a free weekend
   * 
   * @returns True if user is playing through a free weekend
   * 
   * @example
   * ```typescript
   * if (steam.apps.isSubscribedFromFreeWeekend()) {
   *   console.log('Playing through free weekend - show purchase prompt!');
   * }
   * ```
   */
  isSubscribedFromFreeWeekend(): boolean {
    try {
      const apps = this.getSteamApps();
      if (!apps) return false;
      return this.libraryLoader.SteamAPI_ISteamApps_BIsSubscribedFromFreeWeekend(apps);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error checking free weekend status:', error);
      return false;
    }
  }

  /**
   * Checks if user has access through Family Sharing
   * 
   * @returns True if user is playing through Family Sharing
   * 
   * @remarks
   * If true, call getAppOwner() to get the Steam ID of the actual owner
   * 
   * @example
   * ```typescript
   * if (steam.apps.isSubscribedFromFamilySharing()) {
   *   const ownerId = steam.apps.getAppOwner();
   *   console.log(`Playing through Family Sharing from: ${ownerId}`);
   * }
   * ```
   */
  isSubscribedFromFamilySharing(): boolean {
    try {
      const apps = this.getSteamApps();
      if (!apps) return false;
      return this.libraryLoader.SteamAPI_ISteamApps_BIsSubscribedFromFamilySharing(apps);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error checking Family Sharing status:', error);
      return false;
    }
  }

  /**
   * Gets comprehensive ownership information
   * 
   * @returns Object with all ownership details
   * 
   * @example
   * ```typescript
   * const ownership = steam.apps.getOwnershipInfo();
   * console.log(`Subscribed: ${ownership.isSubscribed}`);
   * console.log(`Free Weekend: ${ownership.isSubscribedFromFreeWeekend}`);
   * console.log(`Family Sharing: ${ownership.isSubscribedFromFamilySharing}`);
   * ```
   */
  getOwnershipInfo(): AppOwnershipInfo {
    const apps = this.getSteamApps();
    const appId = 0; // Current app
    
    return {
      isSubscribed: apps ? this.libraryLoader.SteamAPI_ISteamApps_BIsSubscribed(apps) : false,
      isSubscribedFromFreeWeekend: apps ? this.libraryLoader.SteamAPI_ISteamApps_BIsSubscribedFromFreeWeekend(apps) : false,
      isSubscribedFromFamilySharing: apps ? this.libraryLoader.SteamAPI_ISteamApps_BIsSubscribedFromFamilySharing(apps) : false,
      isInstalled: apps ? this.libraryLoader.SteamAPI_ISteamApps_BIsAppInstalled(apps, appId) : false,
      earliestPurchaseTime: apps ? this.libraryLoader.SteamAPI_ISteamApps_GetEarliestPurchaseUnixTime(apps, appId) : 0,
      ownerId: apps ? BigInt(this.libraryLoader.SteamAPI_ISteamApps_GetAppOwner(apps)) : BigInt(0)
    };
  }

  // ========================================
  // DLC Functions
  // ========================================

  /**
   * Checks if a DLC is installed
   * 
   * @param dlcAppId - The App ID of the DLC
   * @returns True if the DLC is owned and installed
   * 
   * @remarks
   * This checks both ownership AND installation status
   * 
   * @example
   * ```typescript
   * const DLC_EXPANSION = 123456;
   * if (steam.apps.isDlcInstalled(DLC_EXPANSION)) {
   *   console.log('Expansion pack is ready!');
   *   enableExpansionContent();
   * }
   * ```
   */
  isDlcInstalled(dlcAppId: AppId): boolean {
    try {
      const apps = this.getSteamApps();
      if (!apps) {
        SteamLogger.warn('[Steamworks] ISteamApps interface not available');
        return false;
      }
      return this.libraryLoader.SteamAPI_ISteamApps_BIsDlcInstalled(apps, dlcAppId);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error checking DLC installation:', error);
      return false;
    }
  }

  /**
   * Gets the number of DLC pieces for this app
   * 
   * @returns Number of DLC items available
   * 
   * @example
   * ```typescript
   * const dlcCount = steam.apps.getDLCCount();
   * console.log(`This game has ${dlcCount} DLC items`);
   * ```
   */
  getDLCCount(): number {
    try {
      const apps = this.getSteamApps();
      if (!apps) return 0;
      return this.libraryLoader.SteamAPI_ISteamApps_GetDLCCount(apps);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting DLC count:', error);
      return 0;
    }
  }

  /**
   * Gets data about a specific DLC by index
   * 
   * @param index - DLC index (0 to getDLCCount()-1)
   * @returns DLC data or null if invalid index
   * 
   * @example
   * ```typescript
   * const dlc = steam.apps.getDLCDataByIndex(0);
   * if (dlc) {
   *   console.log(`DLC: ${dlc.name} (${dlc.appId})`);
   *   console.log(`Available: ${dlc.available}`);
   * }
   * ```
   */
  getDLCDataByIndex(index: number): DLCData | null {
    try {
      const apps = this.getSteamApps();
      if (!apps) return null;

      const appIdOut = [0];
      const availableOut = [false];
      const nameBuffer = Buffer.alloc(256);

      const success = this.libraryLoader.SteamAPI_ISteamApps_BGetDLCDataByIndex(
        apps,
        index,
        appIdOut,
        availableOut,
        nameBuffer,
        256
      );

      if (!success) return null;

      return {
        appId: appIdOut[0],
        available: availableOut[0],
        name: nameBuffer.toString('utf8').replace(/\0/g, '').trim()
      };
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting DLC data:', error);
      return null;
    }
  }

  /**
   * Gets all DLC data at once
   * 
   * @returns Array of all DLC data
   * 
   * @example
   * ```typescript
   * const allDlc = steam.apps.getAllDLC();
   * for (const dlc of allDlc) {
   *   console.log(`${dlc.name}: ${dlc.available ? 'Owned' : 'Not Owned'}`);
   * }
   * ```
   */
  getAllDLC(): DLCData[] {
    const result: DLCData[] = [];
    const count = this.getDLCCount();

    for (let i = 0; i < count; i++) {
      const dlc = this.getDLCDataByIndex(i);
      if (dlc) result.push(dlc);
    }

    return result;
  }

  /**
   * Triggers download/installation of optional DLC
   * 
   * @param dlcAppId - The App ID of the DLC to install
   * 
   * @remarks
   * - The DLC must be owned by the user
   * - This triggers the Steam download system
   * - Listen for DlcInstalled callback for completion
   * 
   * @example
   * ```typescript
   * // Start DLC download
   * steam.apps.installDLC(123456);
   * console.log('DLC download started!');
   * ```
   */
  installDLC(dlcAppId: AppId): void {
    try {
      const apps = this.getSteamApps();
      if (!apps) {
        SteamLogger.warn('[Steamworks] ISteamApps interface not available');
        return;
      }
      this.libraryLoader.SteamAPI_ISteamApps_InstallDLC(apps, dlcAppId);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error installing DLC:', error);
    }
  }

  /**
   * Removes an optional DLC from the system
   * 
   * @param dlcAppId - The App ID of the DLC to uninstall
   * 
   * @remarks
   * The user still owns the DLC; this just removes the local files
   * 
   * @example
   * ```typescript
   * steam.apps.uninstallDLC(123456);
   * console.log('DLC removed to free up disk space');
   * ```
   */
  uninstallDLC(dlcAppId: AppId): void {
    try {
      const apps = this.getSteamApps();
      if (!apps) {
        SteamLogger.warn('[Steamworks] ISteamApps interface not available');
        return;
      }
      this.libraryLoader.SteamAPI_ISteamApps_UninstallDLC(apps, dlcAppId);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error uninstalling DLC:', error);
    }
  }

  /**
   * Gets download progress for a DLC
   * 
   * @param dlcAppId - The App ID of the DLC
   * @returns Download progress or null if not downloading
   * 
   * @example
   * ```typescript
   * const progress = steam.apps.getDlcDownloadProgress(123456);
   * if (progress) {
   *   console.log(`Download: ${progress.percentComplete}%`);
   * }
   * ```
   */
  getDlcDownloadProgress(dlcAppId: AppId): DLCDownloadProgress | null {
    try {
      const apps = this.getSteamApps();
      if (!apps) return null;

      const bytesDownloaded = [BigInt(0)];
      const bytesTotal = [BigInt(0)];

      const downloading = this.libraryLoader.SteamAPI_ISteamApps_GetDlcDownloadProgress(
        apps,
        dlcAppId,
        bytesDownloaded,
        bytesTotal
      );

      if (!downloading) return null;

      const downloaded = bytesDownloaded[0];
      const total = bytesTotal[0];
      const percent = total > BigInt(0) 
        ? Number((downloaded * BigInt(100)) / total) 
        : 0;

      return {
        bytesDownloaded: downloaded,
        bytesTotal: total,
        percentComplete: percent
      };
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting DLC download progress:', error);
      return null;
    }
  }

  /**
   * Sets the current DLC context for usage tracking
   * 
   * @param dlcAppId - The App ID of the DLC being played (0 to clear)
   * @returns True if successful
   * 
   * @remarks
   * Allows Steam to track usage of major DLC extensions
   * 
   * @example
   * ```typescript
   * // Player entered expansion content
   * steam.apps.setDlcContext(EXPANSION_DLC_ID);
   * 
   * // Player left expansion content
   * steam.apps.setDlcContext(0);
   * ```
   */
  setDlcContext(dlcAppId: AppId): boolean {
    try {
      const apps = this.getSteamApps();
      if (!apps) return false;
      return this.libraryLoader.SteamAPI_ISteamApps_SetDlcContext(apps, dlcAppId);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error setting DLC context:', error);
      return false;
    }
  }

  // ========================================
  // Timed Trial
  // ========================================

  /**
   * Checks if the game is running as a timed trial
   * 
   * @returns Timed trial status or null if not a trial
   * 
   * @example
   * ```typescript
   * const trial = steam.apps.getTimedTrialStatus();
   * if (trial && trial.isTimedTrial) {
   *   const minutes = Math.floor(trial.secondsRemaining / 60);
   *   console.log(`Trial time remaining: ${minutes} minutes`);
   * }
   * ```
   */
  getTimedTrialStatus(): TimedTrialStatus | null {
    try {
      const apps = this.getSteamApps();
      if (!apps) return null;

      const secondsAllowed = [0];
      const secondsPlayed = [0];

      const isTrial = this.libraryLoader.SteamAPI_ISteamApps_BIsTimedTrial(
        apps,
        secondsAllowed,
        secondsPlayed
      );

      return {
        isTimedTrial: isTrial,
        secondsAllowed: secondsAllowed[0],
        secondsPlayed: secondsPlayed[0],
        secondsRemaining: Math.max(0, secondsAllowed[0] - secondsPlayed[0])
      };
    } catch (error) {
      SteamLogger.error('[Steamworks] Error checking timed trial status:', error);
      return null;
    }
  }

  // ========================================
  // App Information
  // ========================================

  /**
   * Gets the current game language
   * 
   * @returns Language code (e.g., 'english', 'german', 'french')
   * 
   * @example
   * ```typescript
   * const lang = steam.apps.getCurrentGameLanguage();
   * console.log(`Game language: ${lang}`);
   * loadLocalization(lang);
   * ```
   */
  getCurrentGameLanguage(): string {
    try {
      const apps = this.getSteamApps();
      if (!apps) return 'english';
      return this.libraryLoader.SteamAPI_ISteamApps_GetCurrentGameLanguage(apps) || 'english';
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting game language:', error);
      return 'english';
    }
  }

  /**
   * Gets all available game languages
   * 
   * @returns Comma-separated list of language codes
   * 
   * @example
   * ```typescript
   * const langs = steam.apps.getAvailableGameLanguages();
   * console.log(`Supported languages: ${langs}`);
   * // Output: "english,german,french,spanish"
   * ```
   */
  getAvailableGameLanguages(): string {
    try {
      const apps = this.getSteamApps();
      if (!apps) return 'english';
      return this.libraryLoader.SteamAPI_ISteamApps_GetAvailableGameLanguages(apps) || 'english';
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting available languages:', error);
      return 'english';
    }
  }

  /**
   * Gets the Unix timestamp of the earliest purchase
   * 
   * @param appId - App ID to check (0 for current app)
   * @returns Unix timestamp of purchase, or 0 if not owned
   * 
   * @example
   * ```typescript
   * const purchaseTime = steam.apps.getEarliestPurchaseUnixTime(0);
   * const purchaseDate = new Date(purchaseTime * 1000);
   * console.log(`Purchased: ${purchaseDate.toLocaleDateString()}`);
   * ```
   */
  getEarliestPurchaseUnixTime(appId: AppId = 0): number {
    try {
      const apps = this.getSteamApps();
      if (!apps) return 0;
      return this.libraryLoader.SteamAPI_ISteamApps_GetEarliestPurchaseUnixTime(apps, appId);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting purchase time:', error);
      return 0;
    }
  }

  /**
   * Gets the app installation directory
   * 
   * @param appId - App ID to get directory for (0 for current app - not recommended)
   * @returns Installation path or empty string
   * 
   * @example
   * ```typescript
   * const installDir = steam.apps.getAppInstallDir(480);
   * console.log(`Installed at: ${installDir}`);
   * ```
   */
  getAppInstallDir(appId: AppId): string {
    try {
      const apps = this.getSteamApps();
      if (!apps) return '';

      const pathBuffer = Buffer.alloc(1024);
      const length = this.libraryLoader.SteamAPI_ISteamApps_GetAppInstallDir(
        apps,
        appId,
        pathBuffer,
        1024
      );

      if (length === 0) return '';
      return pathBuffer.toString('utf8').replace(/\0/g, '').trim();
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting install directory:', error);
      return '';
    }
  }

  /**
   * Gets the Steam ID of the app owner
   * 
   * @returns Steam ID of the owner (may differ from current user if Family Sharing)
   * 
   * @example
   * ```typescript
   * const ownerId = steam.apps.getAppOwner();
   * if (steam.apps.isSubscribedFromFamilySharing()) {
   *   console.log(`Borrowed from: ${ownerId}`);
   * }
   * ```
   */
  getAppOwner(): bigint {
    try {
      const apps = this.getSteamApps();
      if (!apps) return BigInt(0);
      return BigInt(this.libraryLoader.SteamAPI_ISteamApps_GetAppOwner(apps));
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting app owner:', error);
      return BigInt(0);
    }
  }

  /**
   * Gets the current build ID
   * 
   * @returns Build ID (may change with backend updates)
   * 
   * @example
   * ```typescript
   * const buildId = steam.apps.getAppBuildId();
   * console.log(`Running build: ${buildId}`);
   * ```
   */
  getAppBuildId(): number {
    try {
      const apps = this.getSteamApps();
      if (!apps) return 0;
      return this.libraryLoader.SteamAPI_ISteamApps_GetAppBuildId(apps);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting build ID:', error);
      return 0;
    }
  }

  /**
   * Gets installed depot IDs for an app
   * 
   * @param appId - App ID to check
   * @param maxDepots - Maximum number of depots to return (default 32)
   * @returns Array of installed depot IDs in mount order
   * 
   * @example
   * ```typescript
   * const depots = steam.apps.getInstalledDepots(480);
   * console.log(`Installed depots: ${depots.join(', ')}`);
   * ```
   */
  getInstalledDepots(appId: AppId, maxDepots: number = 32): DepotId[] {
    try {
      const apps = this.getSteamApps();
      if (!apps) return [];

      const depotBuffer = Buffer.alloc(maxDepots * 4);
      const count = this.libraryLoader.SteamAPI_ISteamApps_GetInstalledDepots(
        apps,
        appId,
        depotBuffer,
        maxDepots
      );

      const depots: DepotId[] = [];
      for (let i = 0; i < count; i++) {
        depots.push(depotBuffer.readUInt32LE(i * 4));
      }
      return depots;
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting installed depots:', error);
      return [];
    }
  }

  /**
   * Gets comprehensive build information
   * 
   * @returns Object with build ID, beta name, and install directory
   * 
   * @example
   * ```typescript
   * const info = steam.apps.getBuildInfo();
   * console.log(`Build: ${info.buildId}`);
   * console.log(`Beta: ${info.betaName}`);
   * console.log(`Path: ${info.installDir}`);
   * ```
   */
  getBuildInfo(): AppBuildInfo {
    const apps = this.getSteamApps();
    const appId = this.apiCore.getStatus().appId;
    
    let betaName = 'public';
    if (apps) {
      const betaBuffer = Buffer.alloc(256);
      const onBeta = this.libraryLoader.SteamAPI_ISteamApps_GetCurrentBetaName(apps, betaBuffer, 256);
      if (onBeta) {
        betaName = betaBuffer.toString('utf8').replace(/\0/g, '').trim() || 'public';
      }
    }

    return {
      buildId: this.getAppBuildId(),
      betaName,
      installDir: this.getAppInstallDir(appId)
    };
  }

  // ========================================
  // Beta Branches
  // ========================================

  /**
   * Gets the current beta branch name
   * 
   * @returns Beta branch name or 'public' if on default branch
   * 
   * @example
   * ```typescript
   * const beta = steam.apps.getCurrentBetaName();
   * console.log(`Current beta: ${beta}`);
   * ```
   */
  getCurrentBetaName(): string {
    try {
      const apps = this.getSteamApps();
      if (!apps) return 'public';

      const betaBuffer = Buffer.alloc(256);
      const onBeta = this.libraryLoader.SteamAPI_ISteamApps_GetCurrentBetaName(apps, betaBuffer, 256);
      
      if (!onBeta) return 'public';
      return betaBuffer.toString('utf8').replace(/\0/g, '').trim() || 'public';
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting beta name:', error);
      return 'public';
    }
  }

  /**
   * Gets the number of available beta branches
   * 
   * @returns Object with total, available, and private beta counts
   * 
   * @example
   * ```typescript
   * const betas = steam.apps.getNumBetas();
   * console.log(`Total betas: ${betas.total}`);
   * console.log(`Available: ${betas.available}`);
   * console.log(`Private: ${betas.private}`);
   * ```
   */
  getNumBetas(): { total: number; available: number; private: number } {
    try {
      const apps = this.getSteamApps();
      if (!apps) return { total: 0, available: 0, private: 0 };

      const availableOut = [0];
      const privateOut = [0];

      const total = this.libraryLoader.SteamAPI_ISteamApps_GetNumBetas(apps, availableOut, privateOut);

      return {
        total,
        available: availableOut[0],
        private: privateOut[0]
      };
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting beta count:', error);
      return { total: 0, available: 0, private: 0 };
    }
  }

  /**
   * Gets information about a beta branch by index
   * 
   * @param index - Beta index (0 to getNumBetas().total - 1)
   * @returns Beta info or null if invalid index
   * 
   * @example
   * ```typescript
   * const beta = steam.apps.getBetaInfo(0);
   * if (beta) {
   *   console.log(`Beta: ${beta.name}`);
   *   console.log(`Description: ${beta.description}`);
   * }
   * ```
   */
  getBetaInfo(index: number): BetaInfo | null {
    try {
      const apps = this.getSteamApps();
      if (!apps) return null;

      const flagsOut = [0];
      const buildIdOut = [0];
      const nameBuffer = Buffer.alloc(256);
      const descBuffer = Buffer.alloc(256);

      const success = this.libraryLoader.SteamAPI_ISteamApps_GetBetaInfo(
        apps,
        index,
        flagsOut,
        buildIdOut,
        nameBuffer,
        256,
        descBuffer,
        256
      );

      if (!success) return null;

      return {
        name: nameBuffer.toString('utf8').replace(/\0/g, '').trim(),
        description: descBuffer.toString('utf8').replace(/\0/g, '').trim(),
        buildId: buildIdOut[0],
        flags: flagsOut[0]
      };
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting beta info:', error);
      return null;
    }
  }

  /**
   * Gets all available beta branches
   * 
   * @returns Array of beta info objects
   * 
   * @example
   * ```typescript
   * const betas = steam.apps.getAllBetas();
   * for (const beta of betas) {
   *   console.log(`${beta.name}: ${beta.description}`);
   * }
   * ```
   */
  getAllBetas(): BetaInfo[] {
    const result: BetaInfo[] = [];
    const { total } = this.getNumBetas();

    for (let i = 0; i < total; i++) {
      const beta = this.getBetaInfo(i);
      if (beta) result.push(beta);
    }

    return result;
  }

  /**
   * Sets the active beta branch
   * 
   * @param betaName - Name of the beta branch to activate
   * @returns True if successful (may require game restart)
   * 
   * @remarks
   * The game may need to restart for Steam to update to the new branch
   * 
   * @example
   * ```typescript
   * const success = steam.apps.setActiveBeta('experimental');
   * if (success) {
   *   console.log('Please restart the game to apply beta');
   * }
   * ```
   */
  setActiveBeta(betaName: string): boolean {
    try {
      const apps = this.getSteamApps();
      if (!apps) return false;
      return this.libraryLoader.SteamAPI_ISteamApps_SetActiveBeta(apps, betaName);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error setting active beta:', error);
      return false;
    }
  }

  // ========================================
  // Launch Parameters
  // ========================================

  /**
   * Gets a launch query parameter
   * 
   * @param key - Parameter key to retrieve
   * @returns Parameter value or empty string
   * 
   * @remarks
   * Launched via steam://run/<appid>//?param1=value1&param2=value2
   * 
   * @example
   * ```typescript
   * // Game launched via steam://run/480//?server=192.168.1.1&port=27015
   * const server = steam.apps.getLaunchQueryParam('server');
   * const port = steam.apps.getLaunchQueryParam('port');
   * ```
   */
  getLaunchQueryParam(key: string): string {
    try {
      const apps = this.getSteamApps();
      if (!apps) return '';
      return this.libraryLoader.SteamAPI_ISteamApps_GetLaunchQueryParam(apps, key) || '';
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting launch param:', error);
      return '';
    }
  }

  /**
   * Gets the full launch command line
   * 
   * @returns Command line string or empty string
   * 
   * @remarks
   * Launched via steam://run/<appid>//command line here
   * More secure than OS command line for rich presence joins
   * 
   * @example
   * ```typescript
   * const cmdLine = steam.apps.getLaunchCommandLine();
   * console.log(`Launch command: ${cmdLine}`);
   * ```
   */
  getLaunchCommandLine(): string {
    try {
      const apps = this.getSteamApps();
      if (!apps) return '';

      const cmdBuffer = Buffer.alloc(1024);
      const length = this.libraryLoader.SteamAPI_ISteamApps_GetLaunchCommandLine(apps, cmdBuffer, 1024);

      if (length === 0) return '';
      return cmdBuffer.toString('utf8').replace(/\0/g, '').trim();
    } catch (error) {
      SteamLogger.error('[Steamworks] Error getting launch command line:', error);
      return '';
    }
  }

  // ========================================
  // Misc
  // ========================================

  /**
   * Marks game content as corrupt (triggers verification)
   * 
   * @param missingFilesOnly - If true, only check for missing files
   * @returns True if request was accepted
   * 
   * @remarks
   * Signals Steam to verify game files on next restart
   * 
   * @example
   * ```typescript
   * // Game detected corrupted data
   * steam.apps.markContentCorrupt(false);
   * console.log('Please verify game files via Steam');
   * ```
   */
  markContentCorrupt(missingFilesOnly: boolean = false): boolean {
    try {
      const apps = this.getSteamApps();
      if (!apps) return false;
      return this.libraryLoader.SteamAPI_ISteamApps_MarkContentCorrupt(apps, missingFilesOnly);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error marking content corrupt:', error);
      return false;
    }
  }
}
