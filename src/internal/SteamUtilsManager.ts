import * as koffi from 'koffi';
import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import { SteamLogger } from './SteamLogger';
import {
  ENotificationPosition,
  EGamepadTextInputMode,
  EGamepadTextInputLineMode,
  EFloatingGamepadTextInputMode,
  ETextFilteringContext,
  ImageSize,
  ImageRGBA,
  BATTERY_POWER_AC,
} from '../types';

/**
 * Manager for Steam Utils API operations
 * 
 * The SteamUtilsManager provides access to various Steam utility functions,
 * including system information, Steam Deck detection, image loading,
 * overlay notification positioning, and gamepad text input.
 * 
 * Features:
 * - System information (battery level, IP country, server time)
 * - Steam Deck and Big Picture mode detection
 * - Overlay notification positioning
 * - Image loading from Steam's image cache (avatars, achievement icons)
 * - Gamepad text input dialogs
 * - Text filtering for user-generated content
 * 
 * @remarks
 * All methods require the Steam API to be initialized. The manager uses
 * the SteamAPI_SteamUtils_v010 interface accessor for API calls.
 * 
 * @example Get system information
 * ```typescript
 * const steam = SteamworksSDK.getInstance();
 * steam.init({ appId: 480 });
 * 
 * const country = steam.utils.getIPCountry();
 * const battery = steam.utils.getCurrentBatteryPower();
 * const serverTime = steam.utils.getServerRealTime();
 * 
 * console.log(`Country: ${country}`);
 * console.log(`Battery: ${battery === BATTERY_POWER_AC ? 'AC Power' : battery + '%'}`);
 * console.log(`Server Time: ${new Date(serverTime * 1000)}`);
 * ```
 * 
 * @example Check Steam Deck
 * ```typescript
 * if (steam.utils.isSteamRunningOnSteamDeck()) {
 *   console.log('Running on Steam Deck!');
 *   enableDeckOptimizations();
 * }
 * 
 * if (steam.utils.isSteamInBigPictureMode()) {
 *   useControllerUI();
 * }
 * ```
 * 
 * @example Load avatar image
 * ```typescript
 * // Get the image handle from friends API
 * const avatarHandle = steam.friends.getSmallFriendAvatar(steamId);
 * if (avatarHandle > 0) {
 *   const image = steam.utils.getImageRGBA(avatarHandle);
 *   if (image) {
 *     // Use image.data (RGBA buffer), image.width, image.height
 *     displayAvatar(image);
 *   }
 * }
 * ```
 * 
 * @see {@link https://partner.steamgames.com/doc/api/ISteamUtils ISteamUtils Documentation}
 */
export class SteamUtilsManager {
  /** Steam library loader for FFI function calls */
  private libraryLoader: SteamLibraryLoader;
  
  /** Steam API core for initialization and status management */
  private apiCore: SteamAPICore;

  /**
   * Creates a new SteamUtilsManager instance
   * 
   * @param libraryLoader - The Steam library loader for FFI calls
   * @param apiCore - The Steam API core for lifecycle management
   */
  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
  }

  /**
   * Gets the SteamUtils interface pointer
   * @private
   */
  private getUtilsInterface(): any {
    const status = this.apiCore.getStatus();
    if (!status.initialized) {
      return null;
    }
    return this.libraryLoader.SteamAPI_SteamUtils_v010();
  }

  // ========================================
  // System Information Methods
  // ========================================

  /**
   * Gets the 2-letter country code for the user's IP address
   * 
   * This is determined by Steam's GeoIP database based on the user's
   * external IP address. Useful for region-specific content or analytics.
   * 
   * @returns Two-letter country code (e.g., 'US', 'GB', 'JP'), or empty string on failure
   * 
   * @example
   * ```typescript
   * const country = steam.utils.getIPCountry();
   * console.log(`User country: ${country}`);
   * 
   * // Load region-specific content
   * if (country === 'JP' || country === 'KR' || country === 'CN') {
   *   loadAsianLocalization();
   * }
   * ```
   */
  getIPCountry(): string {
    const utils = this.getUtilsInterface();
    if (!utils) return '';
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_GetIPCountry(utils) || '';
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get IP country:', error);
      return '';
    }
  }

  /**
   * Gets the current battery power level of the device
   * 
   * Returns the percentage of battery remaining (0-100), or 255 if the device
   * is running on AC power (not using battery).
   * 
   * @returns Battery percentage (0-100), or 255 (BATTERY_POWER_AC) if on AC power
   * 
   * @example
   * ```typescript
   * const battery = steam.utils.getCurrentBatteryPower();
   * 
   * if (battery === BATTERY_POWER_AC) {
   *   console.log('Device is plugged in');
   * } else if (battery < 20) {
   *   console.log(`Low battery: ${battery}%`);
   *   showBatteryWarning();
   * } else {
   *   console.log(`Battery: ${battery}%`);
   * }
   * ```
   */
  getCurrentBatteryPower(): number {
    const utils = this.getUtilsInterface();
    if (!utils) return BATTERY_POWER_AC;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_GetCurrentBatteryPower(utils);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get battery power:', error);
      return BATTERY_POWER_AC;
    }
  }

  /**
   * Gets the current App ID of the running application
   * 
   * @returns The App ID, or 0 if not initialized
   * 
   * @example
   * ```typescript
   * const appId = steam.utils.getAppID();
   * console.log(`Running App ID: ${appId}`);
   * ```
   */
  getAppID(): number {
    const utils = this.getUtilsInterface();
    if (!utils) return 0;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_GetAppID(utils);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get app ID:', error);
      return 0;
    }
  }

  /**
   * Gets the number of seconds since the application became active
   * 
   * @returns Seconds since the app was last active
   * 
   * @example
   * ```typescript
   * const idleTime = steam.utils.getSecondsSinceAppActive();
   * if (idleTime > 300) {
   *   pauseExpensiveOperations();
   * }
   * ```
   */
  getSecondsSinceAppActive(): number {
    const utils = this.getUtilsInterface();
    if (!utils) return 0;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_GetSecondsSinceAppActive(utils);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get seconds since app active:', error);
      return 0;
    }
  }

  /**
   * Gets the number of seconds since the computer was last active
   * 
   * This reflects user input activity, useful for detecting idle state.
   * 
   * @returns Seconds since last user input
   * 
   * @example
   * ```typescript
   * const computerIdle = steam.utils.getSecondsSinceComputerActive();
   * if (computerIdle > 600) {
   *   showIdleScreen();
   * }
   * ```
   */
  getSecondsSinceComputerActive(): number {
    const utils = this.getUtilsInterface();
    if (!utils) return 0;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_GetSecondsSinceComputerActive(utils);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get seconds since computer active:', error);
      return 0;
    }
  }

  /**
   * Gets the current time from the Steam servers
   * 
   * Returns the Unix timestamp (seconds since Jan 1, 1970) from Steam's servers.
   * More reliable than local time for multiplayer synchronization.
   * 
   * @returns Unix timestamp in seconds
   * 
   * @example
   * ```typescript
   * const serverTime = steam.utils.getServerRealTime();
   * const date = new Date(serverTime * 1000);
   * console.log(`Steam server time: ${date.toISOString()}`);
   * ```
   */
  getServerRealTime(): number {
    const utils = this.getUtilsInterface();
    if (!utils) return Math.floor(Date.now() / 1000);
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_GetServerRealTime(utils);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get server real time:', error);
      return Math.floor(Date.now() / 1000);
    }
  }

  /**
   * Gets the Steam client UI language
   * 
   * Returns the language code for the Steam client's UI, which may be different
   * from the game's language setting.
   * 
   * @returns Language code (e.g., 'english', 'french', 'japanese')
   * 
   * @example
   * ```typescript
   * const uiLanguage = steam.utils.getSteamUILanguage();
   * console.log(`Steam UI language: ${uiLanguage}`);
   * ```
   */
  getSteamUILanguage(): string {
    const utils = this.getUtilsInterface();
    if (!utils) return 'english';
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_GetSteamUILanguage(utils) || 'english';
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get Steam UI language:', error);
      return 'english';
    }
  }

  /**
   * Gets the connected Steam universe
   * 
   * Returns which Steam universe the client is connected to. Most users will
   * be connected to the Public universe (1).
   * 
   * @returns Universe ID (1 = Public, 2 = Beta, 3 = Internal, 4 = Dev)
   * 
   * @example
   * ```typescript
   * const universe = steam.utils.getConnectedUniverse();
   * if (universe !== 1) {
   *   console.log('Connected to non-public Steam universe');
   * }
   * ```
   */
  getConnectedUniverse(): number {
    const utils = this.getUtilsInterface();
    if (!utils) return 0;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_GetConnectedUniverse(utils);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get connected universe:', error);
      return 0;
    }
  }

  // ========================================
  // Device Detection Methods
  // ========================================

  /**
   * Checks if running on a Steam Deck device
   * 
   * Use this to enable Steam Deck-specific optimizations or UI adjustments.
   * 
   * @returns true if running on Steam Deck
   * 
   * @example
   * ```typescript
   * if (steam.utils.isSteamRunningOnSteamDeck()) {
   *   setTargetFramerate(40); // Use 40Hz for battery life
   *   enableDeckTouchControls();
   *   optimizeForHandheld();
   * }
   * ```
   */
  isSteamRunningOnSteamDeck(): boolean {
    const utils = this.getUtilsInterface();
    if (!utils) return false;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_IsSteamRunningOnSteamDeck(utils);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to check Steam Deck:', error);
      return false;
    }
  }

  /**
   * Checks if Steam is running in Big Picture Mode
   * 
   * Big Picture Mode indicates the user is using a controller-oriented UI,
   * which is common on Steam Deck and living room setups.
   * 
   * @returns true if Big Picture Mode is active
   * 
   * @example
   * ```typescript
   * if (steam.utils.isSteamInBigPictureMode()) {
   *   useControllerUI();
   *   increaseFontSize();
   * }
   * ```
   */
  isSteamInBigPictureMode(): boolean {
    const utils = this.getUtilsInterface();
    if (!utils) return false;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_IsSteamInBigPictureMode(utils);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to check Big Picture Mode:', error);
      return false;
    }
  }

  /**
   * Checks if VR headset streaming is enabled
   * 
   * @returns true if VR streaming is enabled
   */
  isVRHeadsetStreamingEnabled(): boolean {
    const utils = this.getUtilsInterface();
    if (!utils) return false;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_IsVRHeadsetStreamingEnabled(utils);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to check VR streaming:', error);
      return false;
    }
  }

  /**
   * Enables or disables VR headset streaming
   * 
   * @param enabled - Whether to enable VR streaming
   */
  setVRHeadsetStreamingEnabled(enabled: boolean): void {
    const utils = this.getUtilsInterface();
    if (!utils) return;
    
    try {
      this.libraryLoader.SteamAPI_ISteamUtils_SetVRHeadsetStreamingEnabled(utils, enabled);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to set VR streaming:', error);
    }
  }

  /**
   * Checks if running on Steam China launcher
   * 
   * @returns true if using Steam China
   */
  isSteamChinaLauncher(): boolean {
    const utils = this.getUtilsInterface();
    if (!utils) return false;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_IsSteamChinaLauncher(utils);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to check Steam China:', error);
      return false;
    }
  }

  // ========================================
  // Overlay Notification Methods
  // ========================================

  /**
   * Sets the position for Steam overlay notifications
   * 
   * Controls where Steam notifications (achievements, screenshots, etc.)
   * appear on screen.
   * 
   * @param position - Corner of the screen for notifications
   * 
   * @example
   * ```typescript
   * // Move notifications to bottom left to avoid UI conflicts
   * steam.utils.setOverlayNotificationPosition(ENotificationPosition.BottomLeft);
   * ```
   */
  setOverlayNotificationPosition(position: ENotificationPosition): void {
    const utils = this.getUtilsInterface();
    if (!utils) return;
    
    try {
      this.libraryLoader.SteamAPI_ISteamUtils_SetOverlayNotificationPosition(utils, position);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to set notification position:', error);
    }
  }

  /**
   * Sets an inset for overlay notifications from the corner
   * 
   * Allows fine-tuning of notification position by adding horizontal
   * and vertical offset from the corner position.
   * 
   * @param horizontalInset - Pixels to inset horizontally from the corner
   * @param verticalInset - Pixels to inset vertically from the corner
   * 
   * @example
   * ```typescript
   * // Inset notifications 100px from corner to avoid HUD elements
   * steam.utils.setOverlayNotificationInset(100, 50);
   * ```
   */
  setOverlayNotificationInset(horizontalInset: number, verticalInset: number): void {
    const utils = this.getUtilsInterface();
    if (!utils) return;
    
    try {
      this.libraryLoader.SteamAPI_ISteamUtils_SetOverlayNotificationInset(utils, horizontalInset, verticalInset);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to set notification inset:', error);
    }
  }

  /**
   * Checks if the overlay needs a present call
   * 
   * Returns true if there's an overlay (e.g., notification popup) that needs
   * to be rendered. Useful for games that have their own rendering loop.
   * 
   * @returns true if overlay content needs to be presented
   * 
   * @example
   * ```typescript
   * // In your render loop
   * if (steam.utils.overlayNeedsPresent()) {
   *   // Ensure Steam overlay is rendered
   *   forceOverlayRender();
   * }
   * ```
   */
  overlayNeedsPresent(): boolean {
    const utils = this.getUtilsInterface();
    if (!utils) return false;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_BOverlayNeedsPresent(utils);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to check overlay present:', error);
      return false;
    }
  }

  // ========================================
  // Image Loading Methods
  // ========================================

  /**
   * Gets the size of an image from Steam's image cache
   * 
   * Images are identified by a handle returned from other Steam APIs
   * (e.g., avatar handles from ISteamFriends, achievement icons).
   * 
   * @param imageHandle - The image handle from Steam APIs
   * @returns Image dimensions, or null if the handle is invalid
   * 
   * @example
   * ```typescript
   * const avatarHandle = steam.friends.getSmallFriendAvatar(steamId);
   * const size = steam.utils.getImageSize(avatarHandle);
   * if (size) {
   *   console.log(`Avatar size: ${size.width}x${size.height}`);
   * }
   * ```
   */
  getImageSize(imageHandle: number): ImageSize | null {
    const utils = this.getUtilsInterface();
    if (!utils || imageHandle <= 0) return null;
    
    try {
      const widthPtr = koffi.alloc('uint32', 1);
      const heightPtr = koffi.alloc('uint32', 1);
      
      const success = this.libraryLoader.SteamAPI_ISteamUtils_GetImageSize(
        utils,
        imageHandle,
        widthPtr,
        heightPtr
      );
      
      if (!success) return null;
      
      return {
        width: koffi.decode(widthPtr, 'uint32'),
        height: koffi.decode(heightPtr, 'uint32'),
      };
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get image size:', error);
      return null;
    }
  }

  /**
   * Gets the RGBA pixel data for an image from Steam's image cache
   * 
   * Loads the full image data for an image handle. The data is returned as
   * a Buffer containing RGBA pixels (4 bytes per pixel).
   * 
   * @param imageHandle - The image handle from Steam APIs
   * @returns Image data with width, height, and RGBA buffer, or null on failure
   * 
   * @example
   * ```typescript
   * // Load avatar image
   * const avatarHandle = steam.friends.getMediumFriendAvatar(steamId);
   * const image = steam.utils.getImageRGBA(avatarHandle);
   * 
   * if (image) {
   *   console.log(`Loaded ${image.width}x${image.height} image`);
   *   console.log(`Buffer size: ${image.data.length} bytes`);
   *   
   *   // Convert to base64 for web display, save to file, etc.
   *   // Each pixel is 4 bytes: R, G, B, A
   * }
   * ```
   */
  getImageRGBA(imageHandle: number): ImageRGBA | null {
    const utils = this.getUtilsInterface();
    if (!utils || imageHandle <= 0) return null;
    
    try {
      // First get the image size
      const size = this.getImageSize(imageHandle);
      if (!size) return null;
      
      // Calculate buffer size (4 bytes per pixel: RGBA)
      const bufferSize = size.width * size.height * 4;
      const imageBuffer = Buffer.alloc(bufferSize);
      
      const success = this.libraryLoader.SteamAPI_ISteamUtils_GetImageRGBA(
        utils,
        imageHandle,
        imageBuffer,
        bufferSize
      );
      
      if (!success) return null;
      
      return {
        width: size.width,
        height: size.height,
        data: imageBuffer,
      };
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get image RGBA:', error);
      return null;
    }
  }

  // ========================================
  // Gamepad Text Input Methods
  // ========================================

  /**
   * Opens the full-screen gamepad text input dialog
   * 
   * This shows a Steam virtual keyboard for entering text using a gamepad.
   * The result is retrieved via the GamepadTextInputDismissed_t callback
   * or by calling getEnteredGamepadTextInput.
   * 
   * @param inputMode - Normal or password input mode
   * @param lineMode - Single or multiple lines
   * @param description - Description text shown above the input field
   * @param maxCharacters - Maximum number of characters allowed
   * @param existingText - Pre-filled text in the input field
   * @returns true if the dialog was successfully opened
   * 
   * @example
   * ```typescript
   * // Show text input for player name
   * const opened = steam.utils.showGamepadTextInput(
   *   EGamepadTextInputMode.Normal,
   *   EGamepadTextInputLineMode.SingleLine,
   *   'Enter your player name',
   *   32,
   *   'Player1'
   * );
   * 
   * if (opened) {
   *   // Wait for GamepadTextInputDismissed_t callback
   * }
   * ```
   */
  showGamepadTextInput(
    inputMode: EGamepadTextInputMode,
    lineMode: EGamepadTextInputLineMode,
    description: string,
    maxCharacters: number,
    existingText: string = ''
  ): boolean {
    const utils = this.getUtilsInterface();
    if (!utils) return false;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_ShowGamepadTextInput(
        utils,
        inputMode,
        lineMode,
        description,
        maxCharacters,
        existingText
      );
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to show gamepad text input:', error);
      return false;
    }
  }

  /**
   * Gets the length of the text entered in the gamepad text input dialog
   * 
   * @returns The length of the entered text, including null terminator
   */
  getEnteredGamepadTextLength(): number {
    const utils = this.getUtilsInterface();
    if (!utils) return 0;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_GetEnteredGamepadTextLength(utils);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get gamepad text length:', error);
      return 0;
    }
  }

  /**
   * Gets the text entered in the gamepad text input dialog
   * 
   * Call this after the GamepadTextInputDismissed_t callback to retrieve
   * the text that the user entered.
   * 
   * @param maxLength - Maximum length of text to retrieve
   * @returns The entered text, or empty string on failure
   * 
   * @example
   * ```typescript
   * // After GamepadTextInputDismissed_t callback
   * const length = steam.utils.getEnteredGamepadTextLength();
   * if (length > 0) {
   *   const text = steam.utils.getEnteredGamepadTextInput(length);
   *   console.log(`User entered: ${text}`);
   * }
   * ```
   */
  getEnteredGamepadTextInput(maxLength: number = 256): string {
    const utils = this.getUtilsInterface();
    if (!utils) return '';
    
    try {
      const textBuffer = Buffer.alloc(maxLength);
      const success = this.libraryLoader.SteamAPI_ISteamUtils_GetEnteredGamepadTextInput(
        utils,
        textBuffer,
        maxLength
      );
      
      if (!success) return '';
      
      // Find null terminator and convert to string
      const nullIndex = textBuffer.indexOf(0);
      return textBuffer.slice(0, nullIndex === -1 ? maxLength : nullIndex).toString('utf8');
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get gamepad text input:', error);
      return '';
    }
  }

  /**
   * Shows a floating gamepad text input panel
   * 
   * Unlike showGamepadTextInput, this shows a smaller, floating keyboard
   * at a specific position on screen. Useful for in-game chat.
   * 
   * @param mode - The keyboard mode (single line, multi-line, email, numeric)
   * @param textFieldX - X position of the text field in screen pixels
   * @param textFieldY - Y position of the text field in screen pixels
   * @param textFieldWidth - Width of the text field
   * @param textFieldHeight - Height of the text field
   * @returns true if the floating keyboard was shown
   * 
   * @example
   * ```typescript
   * // Show floating keyboard near chat input field
   * steam.utils.showFloatingGamepadTextInput(
   *   EFloatingGamepadTextInputMode.SingleLine,
   *   100,  // x
   *   500,  // y
   *   400,  // width
   *   30    // height
   * );
   * ```
   */
  showFloatingGamepadTextInput(
    mode: EFloatingGamepadTextInputMode,
    textFieldX: number,
    textFieldY: number,
    textFieldWidth: number,
    textFieldHeight: number
  ): boolean {
    const utils = this.getUtilsInterface();
    if (!utils) return false;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_ShowFloatingGamepadTextInput(
        utils,
        mode,
        textFieldX,
        textFieldY,
        textFieldWidth,
        textFieldHeight
      );
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to show floating gamepad text input:', error);
      return false;
    }
  }

  /**
   * Dismisses the floating gamepad text input panel
   * 
   * @returns true if the panel was dismissed
   */
  dismissFloatingGamepadTextInput(): boolean {
    const utils = this.getUtilsInterface();
    if (!utils) return false;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_DismissFloatingGamepadTextInput(utils);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to dismiss floating gamepad text input:', error);
      return false;
    }
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Gets the number of IPC calls made since the last call to this function
   * 
   * Useful for debugging and performance monitoring to see how many
   * Steam API calls are being made.
   * 
   * @returns The IPC call count since last query
   */
  getIPCCallCount(): number {
    const utils = this.getUtilsInterface();
    if (!utils) return 0;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_GetIPCCallCount(utils);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get IPC call count:', error);
      return 0;
    }
  }

  /**
   * Launches the Steam VR dashboard
   * 
   * Brings up the SteamVR dashboard overlay if SteamVR is running.
   */
  startVRDashboard(): void {
    const utils = this.getUtilsInterface();
    if (!utils) return;
    
    try {
      this.libraryLoader.SteamAPI_ISteamUtils_StartVRDashboard(utils);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to start VR dashboard:', error);
    }
  }

  // ========================================
  // Text Filtering Methods
  // ========================================

  /**
   * Initializes the text filtering system
   * 
   * Must be called before using filterText. This loads the filtering
   * dictionaries for the specified language.
   * 
   * @param unFilterOptions - Reserved, pass 0
   * @returns true if initialization succeeded
   * 
   * @example
   * ```typescript
   * // Initialize text filtering
   * if (steam.utils.initFilterText()) {
   *   console.log('Text filtering ready');
   * }
   * ```
   */
  initFilterText(unFilterOptions: number = 0): boolean {
    const utils = this.getUtilsInterface();
    if (!utils) return false;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamUtils_InitFilterText(utils, unFilterOptions);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to init filter text:', error);
      return false;
    }
  }

  /**
   * Filters user-generated text for profanity and slurs
   * 
   * Use this to filter text from players before displaying it to others.
   * Filtered characters are replaced with asterisks.
   * 
   * @param context - The context where the text will be used
   * @param sourceSteamID - The Steam ID of the user who created the text
   * @param inputMessage - The text to filter
   * @param maxOutputLength - Maximum length of the output buffer
   * @returns Filtered text with profanity replaced by asterisks
   * 
   * @example
   * ```typescript
   * // Filter a chat message
   * const filtered = steam.utils.filterText(
   *   ETextFilteringContext.Chat,
   *   senderSteamId,
   *   chatMessage,
   *   256
   * );
   * displayChatMessage(filtered);
   * ```
   */
  filterText(
    context: ETextFilteringContext,
    sourceSteamID: string,
    inputMessage: string,
    maxOutputLength: number = 256
  ): string {
    const utils = this.getUtilsInterface();
    if (!utils) return inputMessage;
    
    try {
      const outputBuffer = Buffer.alloc(maxOutputLength);
      const steamId = BigInt(sourceSteamID);
      
      const filteredLength = this.libraryLoader.SteamAPI_ISteamUtils_FilterText(
        utils,
        context,
        steamId,
        inputMessage,
        outputBuffer,
        maxOutputLength
      );
      
      if (filteredLength === 0) return inputMessage;
      
      // Find null terminator and convert to string
      const nullIndex = outputBuffer.indexOf(0);
      return outputBuffer.slice(0, nullIndex === -1 ? filteredLength : nullIndex).toString('utf8');
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to filter text:', error);
      return inputMessage;
    }
  }

  // ========================================
  // Convenience Methods
  // ========================================

  /**
   * Checks if the device is running on battery power
   * 
   * Convenience method that returns true if the device is on battery
   * (not connected to AC power).
   * 
   * @returns true if running on battery
   * 
   * @example
   * ```typescript
   * if (steam.utils.isOnBattery()) {
   *   enablePowerSavingMode();
   * }
   * ```
   */
  isOnBattery(): boolean {
    const power = this.getCurrentBatteryPower();
    return power !== BATTERY_POWER_AC;
  }

  /**
   * Gets comprehensive device environment information
   * 
   * Returns an object with all device detection flags for easy use.
   * 
   * @returns Object with device environment flags
   * 
   * @example
   * ```typescript
   * const env = steam.utils.getDeviceEnvironment();
   * console.log(`Steam Deck: ${env.isSteamDeck}`);
   * console.log(`Big Picture: ${env.isBigPictureMode}`);
   * console.log(`On Battery: ${env.isOnBattery}`);
   * console.log(`Battery: ${env.batteryPercent}%`);
   * ```
   */
  getDeviceEnvironment(): {
    isSteamDeck: boolean;
    isBigPictureMode: boolean;
    isVRStreamingEnabled: boolean;
    isSteamChina: boolean;
    isOnBattery: boolean;
    batteryPercent: number | null;
    ipCountry: string;
    steamUILanguage: string;
    connectedUniverse: number;
  } {
    const battery = this.getCurrentBatteryPower();
    const isOnBattery = battery !== BATTERY_POWER_AC;
    
    return {
      isSteamDeck: this.isSteamRunningOnSteamDeck(),
      isBigPictureMode: this.isSteamInBigPictureMode(),
      isVRStreamingEnabled: this.isVRHeadsetStreamingEnabled(),
      isSteamChina: this.isSteamChinaLauncher(),
      isOnBattery,
      batteryPercent: isOnBattery ? battery : null,
      ipCountry: this.getIPCountry(),
      steamUILanguage: this.getSteamUILanguage(),
      connectedUniverse: this.getConnectedUniverse(),
    };
  }

  /**
   * Gets the current server time as a JavaScript Date object
   * 
   * Convenience method that converts the Unix timestamp to a Date.
   * 
   * @returns Date object representing Steam server time
   * 
   * @example
   * ```typescript
   * const serverDate = steam.utils.getServerRealTimeAsDate();
   * console.log(`Server time: ${serverDate.toISOString()}`);
   * ```
   */
  getServerRealTimeAsDate(): Date {
    return new Date(this.getServerRealTime() * 1000);
  }
}
