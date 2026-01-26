/**
 * SteamLogger
 * 
 * Centralized logging utility for all Steamworks modules.
 * Provides consistent logging across the entire library with configurable debug mode.
 * 
 * Features:
 * - Debug logs only show when debug mode is enabled
 * - Errors and warnings always display regardless of debug mode
 * - Consistent formatting across all modules
 * - Single point of control for all logging behavior
 * 
 * @example
 * ```typescript
 * import { SteamLogger } from './SteamLogger';
 * 
 * class MyManager {
 *   someMethod() {
 *     SteamLogger.debug('[MyManager] Doing something...');
 *     SteamLogger.warn('[MyManager] Warning message');
 *     SteamLogger.error('[MyManager] Error message');
 *   }
 * }
 * ```
 */
export class SteamLogger {
  /** Global debug mode flag */
  private static debugMode: boolean = false;

  /** Callback to notify when debug mode changes (used by Metal overlay) */
  private static onDebugChangeCallback: ((enabled: boolean) => void) | null = null;

  /**
   * Register a callback for debug mode changes
   * @internal Used by SteamOverlay to sync native debug mode
   */
  static onDebugChange(callback: (enabled: boolean) => void): void {
    SteamLogger.onDebugChangeCallback = callback;
  }

  /**
   * Enable or disable debug logging globally
   * 
   * @param enabled - Whether to enable debug logging
   * 
   * @example
   * ```typescript
   * SteamLogger.setDebug(true);  // Enable debug logs
   * SteamLogger.setDebug(false); // Disable debug logs
   * ```
   */
  static setDebug(enabled: boolean): void {
    SteamLogger.debugMode = enabled;
    if (enabled) {
      console.log('[Steamworks] Debug mode enabled');
    }
    // Notify listeners (e.g., Metal overlay native module)
    if (SteamLogger.onDebugChangeCallback) {
      SteamLogger.onDebugChangeCallback(enabled);
    }
  }

  /**
   * Check if debug mode is enabled
   * 
   * @returns true if debug mode is enabled, false otherwise
   */
  static isDebugEnabled(): boolean {
    return SteamLogger.debugMode;
  }

  /**
   * Log debug message (only shows when debug mode is enabled)
   * 
   * @param args - Messages to log
   * 
   * @example
   * ```typescript
   * SteamLogger.debug('[MyManager] Processing data...');
   * SteamLogger.debug('[MyManager] Value:', someValue);
   * ```
   */
  static debug(...args: any[]): void {
    if (SteamLogger.debugMode) {
      console.log(...args);
    }
  }

  /**
   * Log error message (always shows regardless of debug mode)
   * 
   * @param args - Error messages to log
   * 
   * @example
   * ```typescript
   * SteamLogger.error('[MyManager] Failed to load data:', error.message);
   * ```
   */
  static error(...args: any[]): void {
    console.error(...args);
  }

  /**
   * Log warning message (always shows regardless of debug mode)
   * 
   * @param args - Warning messages to log
   * 
   * @example
   * ```typescript
   * SteamLogger.warn('[MyManager] Deprecated feature used');
   * ```
   */
  static warn(...args: any[]): void {
    console.warn(...args);
  }

  /**
   * Log info message (always shows regardless of debug mode)
   * Useful for important messages that should always be visible
   * 
   * @param args - Info messages to log
   * 
   * @example
   * ```typescript
   * SteamLogger.info('[MyManager] Connected successfully');
   * ```
   */
  static info(...args: any[]): void {
    console.log(...args);
  }
}
