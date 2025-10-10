import { SteamAchievement, SteamInitOptions, SteamStatus } from './types';
import { SteamLibraryLoader } from './internal/SteamLibraryLoader';
import { SteamAPICore } from './internal/SteamAPICore';
import { SteamAchievementManager } from './internal/SteamAchievementManager';

/**
 * Real Steamworks SDK implementation using Koffi FFI
 * This connects directly to the actual Steam client and Steamworks SDK
 * 
 * Uses composition pattern with specialized modules:
 * - SteamLibraryLoader: Handles FFI library loading and function binding
 * - SteamAPICore: Manages Steam API lifecycle (init, shutdown, callbacks)
 * - SteamAchievementManager: Handles all achievement operations
 */
class SteamworksSDK {
  private static instance: SteamworksSDK;
  
  // Composed modules
  private libraryLoader: SteamLibraryLoader;
  private apiCore: SteamAPICore;
  private achievementManager: SteamAchievementManager;

  private constructor() {
    // Initialize composed modules
    this.libraryLoader = new SteamLibraryLoader();
    this.apiCore = new SteamAPICore(this.libraryLoader);
    this.achievementManager = new SteamAchievementManager(this.libraryLoader, this.apiCore);
  }

  static getInstance(): SteamworksSDK {
    if (!SteamworksSDK.instance) {
      SteamworksSDK.instance = new SteamworksSDK();
    }
    return SteamworksSDK.instance;
  }

  /**
   * Initialize Steam API with real Steamworks SDK
   */
  init(options: SteamInitOptions): boolean {
    return this.apiCore.init(options);
  }

  /**
   * Shutdown Steam API
   */
  shutdown(): void {
    this.apiCore.shutdown();
  }

  /**
   * Get current Steam status
   */
  getStatus(): SteamStatus {
    return this.apiCore.getStatus();
  }

  /**
   * Get all achievements from Steam
   */
  async getAllAchievements(): Promise<SteamAchievement[]> {
    return this.achievementManager.getAllAchievements();
  }

  /**
   * Unlock achievement in Steam
   */
  async unlockAchievement(achievementName: string): Promise<boolean> {
    return this.achievementManager.unlockAchievement(achievementName);
  }

  /**
   * Clear achievement in Steam (for testing)
   */
  async clearAchievement(achievementName: string): Promise<boolean> {
    return this.achievementManager.clearAchievement(achievementName);
  }

  /**
   * Check if achievement is unlocked
   */
  async isAchievementUnlocked(achievementName: string): Promise<boolean> {
    return this.achievementManager.isAchievementUnlocked(achievementName);
  }

  /**
   * Get achievement by API name
   */
  async getAchievementByName(achievementName: string): Promise<SteamAchievement | null> {
    return this.achievementManager.getAchievementByName(achievementName);
  }

  /**
   * Get total number of achievements
   */
  async getTotalAchievementCount(): Promise<number> {
    return this.achievementManager.getTotalAchievementCount();
  }

  /**
   * Get number of unlocked achievements
   */
  async getUnlockedAchievementCount(): Promise<number> {
    return this.achievementManager.getUnlockedAchievementCount();
  }

  /**
   * Run Steam callbacks to process pending events
   */
  runCallbacks(): void {
    this.apiCore.runCallbacks();
  }

  /**
   * Check if Steam client is running
   */
  isSteamRunning(): boolean {
    return this.apiCore.isSteamRunning();
  }
}

export default SteamworksSDK;