import { SteamLogger } from './SteamLogger';

/**
 * Steam Overlay Integration for Electron
 * 
 * Provides cross-platform Steam overlay support for Electron apps:
 * - **macOS**: Metal rendering
 * - **Windows**: DirectX 11 rendering
 * - **Linux**: OpenGL rendering
 * 
 * This enables Steam overlay (Shift+Tab) to work with Electron applications by:
 * 1. Creating a native graphics window (Metal/D3D11/OpenGL)
 * 2. Rendering Electron's content to the native surface
 * 3. Allowing Steam to inject its overlay renderer
 * 
 * @remarks
 * Supported platforms:
 * - macOS 10.15+ (Metal)
 * - Windows 10+ (DirectX 11)
 * - Linux with X11 (OpenGL)
 * 
 * @example Basic usage with Electron
 * ```typescript
 * import { app, BrowserWindow } from 'electron';
 * import SteamworksSDK from 'steamworks-ffi-node';
 * 
 * const steam = SteamworksSDK.getInstance();
 * steam.init({ appId: 480 });
 * 
 * const win = new BrowserWindow({
 *   width: 1280,
 *   height: 720
 * });
 * 
 * // Add Steam overlay to the window
 * steam.addElectronSteamOverlay(win);
 * ```
 */
export class SteamOverlay {
  private nativeModule: any = null;
  private isInitialized: boolean = false;
  private overlayWindow: any = null;

  constructor() {
    // Load native overlay module for the current platform
    // macOS: Metal, Windows: DirectX 11, Linux: OpenGL
    const platform = process.platform;
    const arch = process.arch;
    const supportedPlatforms = ['darwin', 'win32', 'linux'];
    
    if (supportedPlatforms.includes(platform)) {
      // Try loading in order of preference:
      // 1. Pre-built binary from prebuilds folder (npm package)
      // 2. Local build from native/build/Release (development)
      const prebuildPath = `../../prebuilds/${platform}-${arch}/steam-overlay.node`;
      const localBuildPath = '../../native/build/Release/steam-overlay.node';
      
      let loaded = false;
      let loadError: any = null;
      
      // Try prebuild first
      try {
        this.nativeModule = require(prebuildPath);
        loaded = true;
        SteamLogger.debug(`[Steam Overlay] Loaded prebuild from ${prebuildPath}`);
      } catch (e) {
        loadError = e;
      }
      
      // Fall back to local build
      if (!loaded) {
        try {
          this.nativeModule = require(localBuildPath);
          loaded = true;
          SteamLogger.debug(`[Steam Overlay] Loaded local build from ${localBuildPath}`);
        } catch (e) {
          loadError = e;
        }
      }
      
      if (loaded && this.nativeModule) {
        this.isInitialized = true;
        // Sync debug mode with native module
        this.nativeModule.setDebugMode(SteamLogger.isDebugEnabled());
        // Listen for debug mode changes
        SteamLogger.onDebugChange((enabled) => this.setDebugMode(enabled));
        
        const rendererName = platform === 'darwin' ? 'Metal' : 
                            platform === 'win32' ? 'DirectX 11' : 'OpenGL';
        SteamLogger.debug(`[Steam Overlay] Native module loaded (${rendererName})`);
      } else {
        // Native module not available - this is expected and fine
        SteamLogger.debug('[Steam Overlay] Native module not available');
        if (loadError) {
          SteamLogger.debug(`[Steam Overlay] Error: ${loadError}`);
        }
      }
    } else {
      SteamLogger.debug(`[Steam Overlay] Platform ${platform} not supported`);
    }
  }

  /**
   * Set debug mode for native overlay logging
   * Call this when SteamLogger debug mode changes
   */
  setDebugMode(enabled: boolean): void {
    if (this.nativeModule) {
      this.nativeModule.setDebugMode(enabled);
    }
  }

  /**
   * Add Steam overlay support to an Electron BrowserWindow
   * 
   * This method sets up rendering from Electron to a native graphics window,
   * allowing Steam overlay to inject and render on top of your Electron app.
   * 
   * @param browserWindow - The Electron BrowserWindow to add overlay support to
   * @param options - Optional configuration for the overlay window
   * 
   * @remarks
   * This method will:
   * 1. Create a native window (Metal/D3D11/OpenGL based on platform)
   * 2. Set up frame rendering from Electron to native
   * 3. Handle window events (resize, close, etc.)
   * 4. Enable Steam overlay injection
   * 
   * @example Simple integration
   * ```typescript
   * const win = new BrowserWindow({
   *   width: 1280,
   *   height: 720
   * });
   * 
   * steam.addElectronSteamOverlay(win);
   * win.loadFile('index.html');
   * ```
   * 
   * @example With custom options
   * ```typescript
   * steam.addElectronSteamOverlay(win, {
   *   title: 'My Steam Game',
   *   fps: 60,
   *   vsync: true
   * });
   * ```
   */
  addElectronSteamOverlay(
    browserWindow: any,
    options?: {
      title?: string;
      fps?: number;
      vsync?: boolean;
    }
  ): boolean {
    if (!this.isInitialized || !this.nativeModule) {
      SteamLogger.error('[Steam Overlay] Cannot add overlay: Native module not initialized');
      return false;
    }

    const supportedPlatforms = ['darwin', 'win32', 'linux'];
    if (!supportedPlatforms.includes(process.platform)) {
      SteamLogger.warn(`[Steam Overlay] Platform ${process.platform} not supported`);
      return false;
    }

    try {
      // Get content bounds (excludes title bar) for overlay window
      const contentBounds = browserWindow.getContentBounds();
      const fps = options?.fps || 60;
      const frameInterval = Math.floor(1000 / fps);
      
      // Create overlay window matching Electron's content area (not full window)
      const overlayWindowOptions = {
        width: contentBounds.width,
        height: contentBounds.height,
        title: options?.title || 'Electron Steam App',
        fps: fps,
        vsync: options?.vsync !== false
      };

      // Note: Native API uses "createMetalWindow" for all platforms (legacy naming)
      this.overlayWindow = this.nativeModule.createMetalWindow(overlayWindowOptions);
      
      if (!this.overlayWindow) {
        SteamLogger.error('[Steam Overlay] Failed to create overlay window');
        return false;
      }

      SteamLogger.debug('[Steam Overlay] Overlay window created, setting up frame capture...');

      // Store reference for cleanup
      let captureActive = true;
      let frameCount = 0;
      
      // Use capturePage() - more reliable than offscreen rendering
      const captureFrame = async () => {
        if (!captureActive || !this.overlayWindow || !this.nativeModule) {
          return;
        }
        
        try {
          const image = await browserWindow.webContents.capturePage();
          const size = image.getSize();
          
          if (size.width > 0 && size.height > 0) {
            const buffer = image.toBitmap();
            frameCount++;
            
            if (frameCount <= 3) {
              SteamLogger.debug(`[Steam Overlay] Captured frame ${frameCount}: ${size.width}x${size.height}`);
            }
            
            // Send frame to overlay window
            this.nativeModule.renderFrame(this.overlayWindow, buffer, size.width, size.height);
          }
        } catch (error) {
          if (frameCount === 0) {
            SteamLogger.debug(`[Steam Overlay] Capture error: ${error}`);
          }
        }
        
        // Schedule next capture
        if (captureActive) {
          setTimeout(captureFrame, frameInterval);
        }
      };
      
      SteamLogger.debug(`[Steam Overlay] Starting frame capture at ${fps} FPS`);
      captureFrame();

      // Function to sync overlay window frame with Electron's CONTENT area
      // Overlay window is borderless, so it only covers the content, not title bar
      const syncOverlayFrame = () => {
        if (this.overlayWindow && this.nativeModule && !browserWindow.isDestroyed()) {
          // Use getContentBounds() to get the content area (excludes title bar)
          const contentBounds = browserWindow.getContentBounds();
          this.nativeModule.setMetalWindowFrame(
            this.overlayWindow, 
            contentBounds.x, 
            contentBounds.y, 
            contentBounds.width, 
            contentBounds.height
          );
        }
      };

      // Handle window resize - use 'resized' for completed resize
      browserWindow.on('resized', syncOverlayFrame);
      browserWindow.on('resize', syncOverlayFrame);

      // Handle window move - use 'moved' for completed move
      browserWindow.on('moved', syncOverlayFrame);
      browserWindow.on('move', syncOverlayFrame);

      // Handle window maximize/restore - sync frame
      browserWindow.on('maximize', () => setTimeout(syncOverlayFrame, 100));
      browserWindow.on('unmaximize', () => setTimeout(syncOverlayFrame, 100));

      // Handle minimize - HIDE overlay window when Electron minimizes
      browserWindow.on('minimize', () => {
        if (this.overlayWindow && this.nativeModule) {
          this.nativeModule.hideMetalWindow(this.overlayWindow);
          SteamLogger.debug('[Steam Overlay] Overlay window hidden (minimize)');
        }
      });

      // Handle restore from minimize - SHOW overlay window
      browserWindow.on('restore', () => {
        if (this.overlayWindow && this.nativeModule) {
          this.nativeModule.showMetalWindow(this.overlayWindow);
          syncOverlayFrame();
          SteamLogger.debug('[Steam Overlay] Overlay window shown (restore)');
        }
      });

      // Handle show/hide - sync overlay visibility
      browserWindow.on('show', () => {
        if (this.overlayWindow && this.nativeModule) {
          this.nativeModule.showMetalWindow(this.overlayWindow);
          syncOverlayFrame();
        }
      });
      browserWindow.on('hide', () => {
        if (this.overlayWindow && this.nativeModule) {
          this.nativeModule.hideMetalWindow(this.overlayWindow);
        }
      });

      // Handle focus/blur - hide overlay when switching to another app
      // Use delay to avoid hiding when Steam overlay opens (it briefly steals focus)
      let blurTimeout: NodeJS.Timeout | null = null;
      let isBlurred = false;
      
      browserWindow.on('blur', () => {
        isBlurred = true;
        // Wait 150ms before hiding - if focus returns quickly (Steam overlay), don't hide
        blurTimeout = setTimeout(() => {
          if (isBlurred && this.overlayWindow && this.nativeModule) {
            this.nativeModule.hideMetalWindow(this.overlayWindow);
            SteamLogger.debug('[Steam Overlay] Overlay window hidden (app switch)');
          }
        }, 150);
      });
      browserWindow.on('focus', () => {
        isBlurred = false;
        // Cancel pending hide if focus returned quickly
        if (blurTimeout) {
          clearTimeout(blurTimeout);
          blurTimeout = null;
        }
        if (this.overlayWindow && this.nativeModule && !browserWindow.isMinimized()) {
          this.nativeModule.showMetalWindow(this.overlayWindow);
          syncOverlayFrame();
          SteamLogger.debug('[Steam Overlay] Overlay window shown (focus)');
        }
      });

      // Cleanup function
      const cleanup = () => {
        SteamLogger.debug('[Steam Overlay] Cleaning up...');
        captureActive = false;
        this.destroyOverlayWindow();
      };

      // Handle window close - hide immediately then cleanup
      browserWindow.on('close', () => {
        // Hide overlay window immediately when close starts
        if (this.overlayWindow && this.nativeModule) {
          this.nativeModule.hideMetalWindow(this.overlayWindow);
        }
      });
      browserWindow.on('closed', cleanup);

      // IMPORTANT: Also clean up on app quit to prevent crash
      // The crash happens when GC runs after app is shutting down
      const { app } = require('electron');
      app.on('before-quit', () => {
        SteamLogger.debug('[Steam Overlay] App quitting, cleaning up...');
        if (this.overlayWindow && this.nativeModule) {
          this.nativeModule.hideMetalWindow(this.overlayWindow);
        }
        cleanup();
      });

      // Position overlay window over Electron window initially
      syncOverlayFrame();

      // Show the overlay window (it floats above Electron but ignores mouse)
      if (this.nativeModule) {
        this.nativeModule.showMetalWindow(this.overlayWindow);
        SteamLogger.debug('[Steam Overlay] Overlay window shown (pass-through mode)');
      }
      
      // Keep Electron window visible and focused - it receives all input
      // Overlay window floats above it but passes mouse events through
      // Use setImmediate to ensure focus happens after window is shown
      setImmediate(() => {
        if (!browserWindow.isDestroyed()) {
          browserWindow.focus();
          browserWindow.moveTop(); // Ensure Electron is at the window level we need
          SteamLogger.debug('[Steam Overlay] Electron window focused for input');
        }
      });

      SteamLogger.debug('[Steam Overlay] Successfully added Steam overlay to Electron window');
      
      return true;
    } catch (error) {
      SteamLogger.error('[Steam Overlay] Error adding overlay:', error);
      return false;
    }
  }

  /**
   * Destroy the overlay window and clean up resources
   * 
   * @remarks
   * This is called automatically when the Electron window closes,
   * but can be called manually if needed.
   */
  destroyOverlayWindow(): void {
    if (this.overlayWindow && this.nativeModule) {
      try {
        this.nativeModule.destroyMetalWindow(this.overlayWindow);
        this.overlayWindow = null;
        SteamLogger.debug('[Steam Overlay] Overlay window destroyed');
      } catch (error) {
        SteamLogger.error('[Steam Overlay] Error destroying overlay window:', error);
      }
    }
  }

  /**
   * Check if Steam overlay is available on this system
   * 
   * @returns True if Steam overlay can be used
   */
  isAvailable(): boolean {
    const supportedPlatforms = ['darwin', 'win32', 'linux'];
    return this.isInitialized && supportedPlatforms.includes(process.platform);
  }

  /**
   * Get the native overlay window handle
   * 
   * @returns The native window handle or null
   * 
   * @remarks
   * This is for advanced usage only. Most users should use addElectronSteamOverlay()
   */
  getOverlayWindow(): any {
    return this.overlayWindow;
  }
}
