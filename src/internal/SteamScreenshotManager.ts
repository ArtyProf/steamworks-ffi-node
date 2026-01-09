import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import { SteamLogger } from './SteamLogger';
import {
  ScreenshotHandle,
  EVRScreenshotType,
  INVALID_SCREENSHOT_HANDLE
} from '../types';

/**
 * Manager for Steam Screenshots API operations
 * 
 * The SteamScreenshotManager provides functionality to capture screenshots,
 * add them to the user's Steam screenshot library, and tag them with metadata
 * like location, users, and Workshop items.
 * 
 * Screenshots can be captured in two ways:
 * 1. **Overlay capture**: Using `triggerScreenshot()` to have Steam capture the screen
 * 2. **Manual capture**: Your game captures the image and uses `writeScreenshot()` or
 *    `addScreenshotToLibrary()` to add it
 * 
 * @remarks
 * The manual capture methods work without the overlay, making them suitable for
 * headless or non-graphical environments. The overlay-based `triggerScreenshot()`
 * requires the Steam overlay to be available.
 * 
 * @example Basic screenshot capture
 * ```typescript
 * const steam = SteamworksSDK.getInstance();
 * steam.init({ appId: 480 });
 * 
 * // Add a screenshot from a file
 * const handle = steam.screenshots.addScreenshotToLibrary(
 *   '/path/to/screenshot.jpg',
 *   null,  // No thumbnail - Steam will generate one
 *   1920,
 *   1080
 * );
 * 
 * if (handle !== INVALID_SCREENSHOT_HANDLE) {
 *   // Tag the screenshot with location
 *   steam.screenshots.setLocation(handle, 'Level 1 - Boss Fight');
 * }
 * ```
 * 
 * @example Hook screenshots for custom handling
 * ```typescript
 * // Tell Steam your app handles screenshots
 * steam.screenshots.hookScreenshots(true);
 * 
 * // Now when user presses screenshot key, you get a callback
 * // and should call writeScreenshot() or addScreenshotToLibrary()
 * ```
 * 
 * @see {@link https://partner.steamgames.com/doc/api/ISteamScreenshots ISteamScreenshots Documentation}
 */
export class SteamScreenshotManager {
  /** Steam library loader for FFI function calls */
  private libraryLoader: SteamLibraryLoader;
  
  /** Steam API core for initialization and callback management */
  private apiCore: SteamAPICore;
  
  /** Cached screenshots interface pointer */
  private screenshotsInterface: any = null;

  /**
   * Creates a new SteamScreenshotManager instance
   * 
   * @param libraryLoader - The Steam library loader for FFI calls
   * @param apiCore - The Steam API core for lifecycle management
   */
  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
  }

  /**
   * Gets the ISteamScreenshots interface pointer
   * 
   * @returns The interface pointer or null if not available
   */
  private getScreenshotsInterface(): any {
    if (!this.apiCore.isInitialized()) {
      return null;
    }
    
    if (!this.screenshotsInterface) {
      try {
        this.screenshotsInterface = this.libraryLoader.SteamAPI_SteamScreenshots_v003();
      } catch (error) {
        SteamLogger.error('[Steamworks] Failed to get ISteamScreenshots interface:', error);
        return null;
      }
    }
    
    return this.screenshotsInterface;
  }

  /**
   * Writes a screenshot to the user's Steam screenshot library from raw RGB data
   * 
   * @param rgbData - Buffer containing raw RGB pixel data (no alpha channel)
   * @param width - Width of the image in pixels
   * @param height - Height of the image in pixels
   * @returns Screenshot handle, or INVALID_SCREENSHOT_HANDLE on failure
   * 
   * @remarks
   * - The image data must be in RGB format (3 bytes per pixel)
   * - The buffer size should be width * height * 3 bytes
   * - This method works without the overlay
   * - The returned handle can be used to tag the screenshot
   * 
   * @example Write raw RGB data as screenshot
   * ```typescript
   * // Assume you have raw RGB pixel data from your renderer
   * const width = 1920;
   * const height = 1080;
   * const rgbData = Buffer.alloc(width * height * 3);
   * 
   * // Fill rgbData with your screenshot pixels...
   * 
   * const handle = steam.screenshots.writeScreenshot(rgbData, width, height);
   * 
   * if (handle !== INVALID_SCREENSHOT_HANDLE) {
   *   console.log('Screenshot saved with handle:', handle);
   *   steam.screenshots.setLocation(handle, 'My Game Location');
   * }
   * ```
   */
  writeScreenshot(rgbData: Buffer, width: number, height: number): ScreenshotHandle {
    const screenshots = this.getScreenshotsInterface();
    if (!screenshots) {
      SteamLogger.error('[Steamworks] Screenshots interface not available');
      return INVALID_SCREENSHOT_HANDLE;
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamScreenshots_WriteScreenshot(
        screenshots,
        rgbData,
        rgbData.length,
        width,
        height
      );
      return handle;
    } catch (error) {
      SteamLogger.error('[Steamworks] Error writing screenshot:', error);
      return INVALID_SCREENSHOT_HANDLE;
    }
  }

  /**
   * Adds a screenshot to the user's Steam library from a file on disk
   * 
   * @param filename - Path to the screenshot file (JPEG, TGA, or PNG)
   * @param thumbnailFilename - Path to thumbnail file (200px wide), or null for auto-generation
   * @param width - Width of the image in pixels
   * @param height - Height of the image in pixels
   * @returns Screenshot handle, or INVALID_SCREENSHOT_HANDLE on failure
   * 
   * @remarks
   * - Supported formats: JPEG, TGA, PNG
   * - If thumbnail is provided, it must be 200 pixels wide with same aspect ratio
   * - If thumbnail is null, Steam will generate one when the screenshot is uploaded
   * - This method works without the overlay
   * 
   * @example Add screenshot from file
   * ```typescript
   * // Add a screenshot without custom thumbnail
   * const handle = steam.screenshots.addScreenshotToLibrary(
   *   '/path/to/screenshot.png',
   *   null,
   *   1920,
   *   1080
   * );
   * 
   * // Add with custom thumbnail
   * const handle2 = steam.screenshots.addScreenshotToLibrary(
   *   '/path/to/screenshot.jpg',
   *   '/path/to/thumb.jpg',
   *   2560,
   *   1440
   * );
   * 
   * if (handle !== INVALID_SCREENSHOT_HANDLE) {
   *   steam.screenshots.setLocation(handle, 'Epic Boss Battle');
   * }
   * ```
   */
  addScreenshotToLibrary(
    filename: string,
    thumbnailFilename: string | null,
    width: number,
    height: number
  ): ScreenshotHandle {
    const screenshots = this.getScreenshotsInterface();
    if (!screenshots) {
      SteamLogger.error('[Steamworks] Screenshots interface not available');
      return INVALID_SCREENSHOT_HANDLE;
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamScreenshots_AddScreenshotToLibrary(
        screenshots,
        filename,
        thumbnailFilename || '',
        width,
        height
      );
      return handle;
    } catch (error) {
      SteamLogger.error('[Steamworks] Error adding screenshot to library:', error);
      return INVALID_SCREENSHOT_HANDLE;
    }
  }

  /**
   * Triggers the Steam overlay to take a screenshot
   * 
   * @remarks
   * - If screenshots are hooked via `hookScreenshots(true)`, this sends a
   *   ScreenshotRequested_t callback instead and your game should capture
   *   the screenshot manually
   * - Requires the Steam overlay to be available
   * - This is equivalent to the user pressing the screenshot hotkey
   * 
   * @example Trigger overlay screenshot
   * ```typescript
   * // Simple screenshot button in your game
   * function onScreenshotButtonClick() {
   *   steam.screenshots.triggerScreenshot();
   * }
   * ```
   */
  triggerScreenshot(): void {
    const screenshots = this.getScreenshotsInterface();
    if (!screenshots) {
      SteamLogger.error('[Steamworks] Screenshots interface not available');
      return;
    }

    try {
      this.libraryLoader.SteamAPI_ISteamScreenshots_TriggerScreenshot(screenshots);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error triggering screenshot:', error);
    }
  }

  /**
   * Toggles whether your game handles screenshots or Steam does
   * 
   * @param hook - True to handle screenshots yourself, false to let Steam handle them
   * 
   * @remarks
   * When hooked:
   * - Steam will NOT automatically capture screenshots when user presses hotkey
   * - Instead, your game receives a ScreenshotRequested_t callback
   * - Your game should then call `writeScreenshot()` or `addScreenshotToLibrary()`
   * 
   * This is useful when:
   * - You want to add custom overlays/HUD to screenshots
   * - You want to capture from a specific render target
   * - You need to post-process screenshots before saving
   * 
   * @example Hook screenshots for custom capture
   * ```typescript
   * // Tell Steam we'll handle screenshots
   * steam.screenshots.hookScreenshots(true);
   * 
   * // Later, in your screenshot callback handler:
   * function onScreenshotRequested() {
   *   // Capture from your render target
   *   const rgbData = myRenderer.captureScreen();
   *   
   *   // Add to Steam library
   *   const handle = steam.screenshots.writeScreenshot(rgbData, 1920, 1080);
   *   steam.screenshots.setLocation(handle, getCurrentMapName());
   * }
   * ```
   */
  hookScreenshots(hook: boolean): void {
    const screenshots = this.getScreenshotsInterface();
    if (!screenshots) {
      SteamLogger.error('[Steamworks] Screenshots interface not available');
      return;
    }

    try {
      this.libraryLoader.SteamAPI_ISteamScreenshots_HookScreenshots(screenshots, hook);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error hooking screenshots:', error);
    }
  }

  /**
   * Checks if screenshots are currently hooked by your game
   * 
   * @returns True if your game is handling screenshots, false if Steam handles them
   * 
   * @example Check hook status
   * ```typescript
   * if (steam.screenshots.isScreenshotsHooked()) {
   *   console.log('Game is handling screenshots');
   * } else {
   *   console.log('Steam overlay handles screenshots');
   * }
   * ```
   */
  isScreenshotsHooked(): boolean {
    const screenshots = this.getScreenshotsInterface();
    if (!screenshots) {
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamScreenshots_IsScreenshotsHooked(screenshots);
    } catch (error) {
      SteamLogger.error('[Steamworks] Error checking screenshot hook status:', error);
      return false;
    }
  }

  /**
   * Sets the location metadata for a screenshot
   * 
   * @param handle - Screenshot handle from writeScreenshot or addScreenshotToLibrary
   * @param location - Location string (e.g., map name, level name)
   * @returns True if location was set successfully
   * 
   * @remarks
   * The location is displayed in the Steam screenshot viewer and helps users
   * remember where screenshots were taken.
   * 
   * @example Tag screenshot with location
   * ```typescript
   * const handle = steam.screenshots.addScreenshotToLibrary(
   *   '/path/to/screenshot.jpg',
   *   null,
   *   1920,
   *   1080
   * );
   * 
   * if (handle !== INVALID_SCREENSHOT_HANDLE) {
   *   steam.screenshots.setLocation(handle, 'World 3 - Lava Caves');
   *   steam.screenshots.setLocation(handle, 'Boss: Fire Dragon');
   * }
   * ```
   */
  setLocation(handle: ScreenshotHandle, location: string): boolean {
    const screenshots = this.getScreenshotsInterface();
    if (!screenshots) {
      SteamLogger.error('[Steamworks] Screenshots interface not available');
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamScreenshots_SetLocation(
        screenshots,
        handle,
        location
      );
    } catch (error) {
      SteamLogger.error('[Steamworks] Error setting screenshot location:', error);
      return false;
    }
  }

  /**
   * Tags a Steam user as being visible in the screenshot
   * 
   * @param handle - Screenshot handle from writeScreenshot or addScreenshotToLibrary
   * @param steamId - Steam ID of the user to tag (as BigInt)
   * @returns True if user was tagged successfully
   * 
   * @remarks
   * - You can tag up to 32 users per screenshot
   * - Tagged users will see the screenshot in their profile
   * - Users can untag themselves from screenshots
   * 
   * @example Tag friends in screenshot
   * ```typescript
   * const handle = steam.screenshots.addScreenshotToLibrary(
   *   '/path/to/group_photo.jpg',
   *   null,
   *   1920,
   *   1080
   * );
   * 
   * if (handle !== INVALID_SCREENSHOT_HANDLE) {
   *   // Tag all friends visible in the screenshot
   *   const friends = steam.friends.getAllFriends();
   *   for (const friend of friends.slice(0, 5)) {
   *     steam.screenshots.tagUser(handle, friend.steamId);
   *   }
   * }
   * ```
   */
  tagUser(handle: ScreenshotHandle, steamId: bigint): boolean {
    const screenshots = this.getScreenshotsInterface();
    if (!screenshots) {
      SteamLogger.error('[Steamworks] Screenshots interface not available');
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamScreenshots_TagUser(
        screenshots,
        handle,
        steamId
      );
    } catch (error) {
      SteamLogger.error('[Steamworks] Error tagging user in screenshot:', error);
      return false;
    }
  }

  /**
   * Tags a Workshop item as being visible in the screenshot
   * 
   * @param handle - Screenshot handle from writeScreenshot or addScreenshotToLibrary
   * @param publishedFileId - Workshop item ID to tag (as BigInt)
   * @returns True if item was tagged successfully
   * 
   * @remarks
   * - You can tag up to 32 Workshop items per screenshot
   * - Useful for showing mods/custom content in screenshots
   * - Tagged items will show the screenshot on their Workshop page
   * 
   * @example Tag Workshop items in screenshot
   * ```typescript
   * const handle = steam.screenshots.addScreenshotToLibrary(
   *   '/path/to/modded_screenshot.jpg',
   *   null,
   *   1920,
   *   1080
   * );
   * 
   * if (handle !== INVALID_SCREENSHOT_HANDLE) {
   *   // Tag the Workshop mods visible in this screenshot
   *   const modId = BigInt('123456789');
   *   steam.screenshots.tagPublishedFile(handle, modId);
   *   
   *   // Set location too
   *   steam.screenshots.setLocation(handle, 'Custom Map: Epic Arena');
   * }
   * ```
   */
  tagPublishedFile(handle: ScreenshotHandle, publishedFileId: bigint): boolean {
    const screenshots = this.getScreenshotsInterface();
    if (!screenshots) {
      SteamLogger.error('[Steamworks] Screenshots interface not available');
      return false;
    }

    try {
      return this.libraryLoader.SteamAPI_ISteamScreenshots_TagPublishedFile(
        screenshots,
        handle,
        publishedFileId
      );
    } catch (error) {
      SteamLogger.error('[Steamworks] Error tagging published file in screenshot:', error);
      return false;
    }
  }

  /**
   * Adds a VR screenshot to the user's Steam library from files on disk
   * 
   * @param type - The type of VR screenshot
   * @param filename - Path to the normal 2D image for library view (JPEG, TGA, or PNG)
   * @param vrFilename - Path to the VR-specific image matching the type
   * @returns Screenshot handle, or INVALID_SCREENSHOT_HANDLE on failure
   * 
   * @remarks
   * - Supported formats: JPEG, TGA, PNG
   * - The filename is used for the library thumbnail view
   * - The vrFilename should contain the appropriate VR format for the type
   * 
   * @example Add VR screenshot
   * ```typescript
   * const handle = steam.screenshots.addVRScreenshotToLibrary(
   *   EVRScreenshotType.Stereo,
   *   '/path/to/preview.jpg',
   *   '/path/to/stereo_screenshot.jpg'
   * );
   * 
   * if (handle !== INVALID_SCREENSHOT_HANDLE) {
   *   steam.screenshots.setLocation(handle, 'VR Level - Space Station');
   * }
   * ```
   */
  addVRScreenshotToLibrary(
    type: EVRScreenshotType,
    filename: string,
    vrFilename: string
  ): ScreenshotHandle {
    const screenshots = this.getScreenshotsInterface();
    if (!screenshots) {
      SteamLogger.error('[Steamworks] Screenshots interface not available');
      return INVALID_SCREENSHOT_HANDLE;
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamScreenshots_AddVRScreenshotToLibrary(
        screenshots,
        type,
        filename,
        vrFilename
      );
      return handle;
    } catch (error) {
      SteamLogger.error('[Steamworks] Error adding VR screenshot to library:', error);
      return INVALID_SCREENSHOT_HANDLE;
    }
  }
}
