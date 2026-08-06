import { SteamLogger } from "./SteamLogger";

/**
 * Steam Overlay Integration for Electron
 *
 * Provides cross-platform Steam overlay support for Electron apps:
 * - **macOS**: Metal rendering
 * - **Windows**: OpenGL rendering
 * - **Linux**: OpenGL (GLX) rendering
 *
 * This enables Steam overlay (Shift+Tab) to work with Electron applications by:
 * 1. Creating a native graphics window (Metal/OpenGL)
 * 2. Rendering Electron's content to the native surface
 * 3. Allowing Steam to inject its overlay renderer
 *
 * @remarks
 * Supported platforms:
 * - macOS 10.15+ (Metal)
 * - Windows 10+ (OpenGL)
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
    // macOS: Metal, Windows: OpenGL, Linux: OpenGL
    const platform = process.platform;
    const arch = process.arch;
    const supportedPlatforms = ["darwin", "win32", "linux"];

    if (supportedPlatforms.includes(platform)) {
      const prebuildPath = `../../prebuilds/${platform}-${arch}/steam-overlay.node`;
      const localBuildPath = "../../native/build/Release/steam-overlay.node";

      let loaded = false;
      let loadError: any = null;

      try {
        this.nativeModule = require(localBuildPath);
        loaded = true;
        SteamLogger.debug(`[Steam Overlay] Loaded local build from ${localBuildPath}`);
      } catch (e) {
        loadError = e;
      }

      if (!loaded) {
        try {
          this.nativeModule = require(prebuildPath);
          loaded = true;
          SteamLogger.debug(`[Steam Overlay] Loaded prebuild from ${prebuildPath}`);
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

        const rendererName = platform === "darwin" ? "Metal" : platform === "linux" ? "OpenGL (GLX)" : "OpenGL";
        SteamLogger.debug(
          `[Steam Overlay] Native module loaded (${rendererName})`,
        );
      } else {
        // Native module not available - this is expected and fine
        SteamLogger.debug("[Steam Overlay] Native module not available");
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
   * 2. Set up frame rendering from El to native
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
    },
  ): boolean {
    if (!this.isInitialized || !this.nativeModule) {
      SteamLogger.error(
        "[Steam Overlay] Cannot add overlay: Native module not initialized",
      );
      return false;
    }

    const supportedPlatforms = ["darwin", "win32", "linux"];
    if (!supportedPlatforms.includes(process.platform)) {
      SteamLogger.warn(
        `[Steam Overlay] Platform ${process.platform} not supported`,
      );
      return false;
    }

    try {
      // Get content bounds (excludes title bar) for overlay window
      const contentBounds = browserWindow.getContentBounds();
      const fps = options?.fps || 60;

      // Create overlay window matching Electron's content area (not full window)
      const overlayWindowOptions = {
        width: contentBounds.width,
        height: contentBounds.height,
        title: options?.title || "Electron Steam App",
        fps: fps,
        vsync: options?.vsync !== false,
      };

      this.overlayWindow =
        this.nativeModule.createOverlayWindow(overlayWindowOptions);

      if (!this.overlayWindow) {
        SteamLogger.error("[Steam Overlay] Failed to create overlay window");
        return false;
      }

      // On Linux: tag the Electron window with STEAM_GAME and wire up input forwarding
      if (process.platform === "linux") {
        try {
          const nativeHandle = browserWindow.getNativeWindowHandle();
          // On 64-bit Linux, XID is stored as uint64 LE (value fits in 32 bits)
          const xid = nativeHandle.length >= 8
            ? Number(nativeHandle.readBigUInt64LE(0))
            : nativeHandle.readUInt32LE(0);
          const appId = parseInt(process.env["SteamAppId"] || "0", 10);

          if (xid > 0 && appId > 0 && this.nativeModule.setSteamGameAtomOnWindow) {
            this.nativeModule.setSteamGameAtomOnWindow(xid, appId);
            SteamLogger.debug(`[Steam Overlay] Tagged Electron window with STEAM_GAME (XID: 0x${xid.toString(16)}, appId: ${appId})`);
          }

          // Wire up input forwarding: overlay window forwards all key/mouse events to Electron
          if (xid > 0 && this.overlayWindow && this.nativeModule.setElectronWindow) {
            this.nativeModule.setElectronWindow(this.overlayWindow, xid);
            SteamLogger.debug(`[Steam Overlay] Wired input forwarding → Electron XID 0x${xid.toString(16)}`);
          }
        } catch (e) {
          SteamLogger.debug(`[Steam Overlay] Could not set up Linux window properties: ${e}`);
        }
      }

      SteamLogger.debug(
        "[Steam Overlay] Overlay window created, setting up frame subscription...",
      );

      let captureActive = true;
      let frameCount = 0;

      // Prevent Chromium from pausing the renderer when the native overlay
      // window occludes the Electron window (macOS occlusion tracking).
      // Without this, rAF and beginFrameSubscription stop firing while the
      // Steam overlay is open, causing the native window to show a frozen frame.
      browserWindow.webContents.setBackgroundThrottling(false);

      // setFrameRate controls the paint rate in offscreen rendering (OSR) mode.
      // On non-OSR windows setFrameRate has no effect but the subscription still
      // fires in sync with the compositor — more efficient than the old
      // setInterval + capturePage() approach (no forced GPU→CPU readback stalls).
      browserWindow.webContents.setFrameRate(fps);

      const frameSubscription = (image: any) => {
        if (!captureActive || !this.overlayWindow || !this.nativeModule) return;
        const size = image.getSize();
        if (size.width > 0 && size.height > 0) {
          frameCount++;
          if (frameCount <= 3) {
            SteamLogger.debug(
              `[Steam Overlay] Frame ${frameCount}: ${size.width}x${size.height}`,
            );
          }
          this.nativeModule.renderFrame(
            this.overlayWindow,
            image.getBitmap(),
            size.width,
            size.height,
          );
        }
      };

      SteamLogger.debug(`[Steam Overlay] Starting frame subscription at ${fps} FPS`);
      browserWindow.webContents.beginFrameSubscription(false, frameSubscription);

      // Function to sync overlay window frame with Electron's CONTENT area
      // Overlay window is borderless, so it only covers the content, not title bar
      const syncOverlayFrame = () => {
        if (
          this.overlayWindow &&
          this.nativeModule &&
          !browserWindow.isDestroyed() &&
          !browserWindow.isMinimized()
        ) {
          // Use getContentBounds() to get the content area (excludes title bar)
          const contentBounds = browserWindow.getContentBounds();
          this.nativeModule.setOverlayFrame(
            this.overlayWindow,
            contentBounds.x,
            contentBounds.y,
            contentBounds.width,
            contentBounds.height,
          );
        }
      };

      // Track overlay visibility to prevent duplicate show/hide calls.
      // On Linux/Gamescope 'show'+'restore' fire together on restore, and
      // 'hide'+'minimize' fire together on minimize — deduplication is critical.
      let overlayVisible = false;

      const showOverlay = (reason: string) => {
        if (this.overlayWindow && this.nativeModule && !overlayVisible) {
          this.nativeModule.showOverlayWindow(this.overlayWindow);
          overlayVisible = true;
          SteamLogger.debug(`[Steam Overlay] Overlay window shown (${reason})`);
        }
      };

      const hideOverlay = (reason: string) => {
        if (this.overlayWindow && this.nativeModule && overlayVisible) {
          this.nativeModule.hideOverlayWindow(this.overlayWindow);
          overlayVisible = false;
          SteamLogger.debug(`[Steam Overlay] Overlay window hidden (${reason})`);
        }
      };

      // Handle window resize/move — 'resized'/'moved' are completion events.
      // On KDE/KWin they may not fire during live drag; add throttled fallbacks.
      let resizeThrottle: NodeJS.Timeout | null = null;
      const syncOverlayFrameThrottled = () => {
        if (resizeThrottle) return;
        resizeThrottle = setTimeout(() => {
          resizeThrottle = null;
          syncOverlayFrame();
        }, 100);
      };
      browserWindow.on("resized", syncOverlayFrame);
      browserWindow.on("resize", syncOverlayFrameThrottled);
      browserWindow.on("moved", syncOverlayFrame);
      browserWindow.on("move", syncOverlayFrameThrottled);

      // Handle maximize/unmaximize — WM needs a moment to finalize bounds
      browserWindow.on("maximize", () => setTimeout(syncOverlayFrame, 100));
      browserWindow.on("unmaximize", () => setTimeout(syncOverlayFrame, 100));

      // Minimize → hide overlay
      browserWindow.on("minimize", () => hideOverlay("minimize"));

      // Restore from minimize → show overlay, then sync frame after WM settles.
      // On Linux/Gamescope the 'show' event fires BEFORE 'restore' during the restore
      // animation with wrong bounds (y=0); the 200ms delay lets the WM finalize position.
      browserWindow.on("restore", () => {
        showOverlay("restore");
        setTimeout(syncOverlayFrame, process.platform === "linux" ? 200 : 0);
      });

      // On Linux: 'hide' fires alongside 'minimize' and 'show' fires alongside 'restore'
      // but the overlayVisible dedup flag prevents double calls.
      // We still need both events for hide-to-tray / open-from-tray support.
      browserWindow.on("show", () => {
        showOverlay("show");
        syncOverlayFrame();
      });
      browserWindow.on("hide", () => hideOverlay("hide"));

      // Do NOT hide the overlay on blur. When the Steam overlay (Shift+Tab)
      // opens, it steals focus from the Electron window, firing a blur event.
      // Hiding on blur would remove our overlay during the Steam overlay session.
      // Visibility is already managed by minimize / restore / show / hide events.
      // On focus, sync the overlay frame position in case the window moved.
      browserWindow.on("focus", () => {
        if (!browserWindow.isMinimized()) {
          showOverlay("focus");
          syncOverlayFrame();
        }
      });

      // Handle window close.
      // IMPORTANT: on macOS the 'close' event fires even when the window is
      // only being hidden (red X + e.preventDefault() in the app's close handler).
      // Calling endFrameSubscription() here would permanently kill the subscription,
      // so frames would never arrive after the window is re-shown.
      // We only hide the native overlay; captureActive stays true so the
      // subscription resumes automatically when the compositor starts rendering again.
      // Electron cleans up the subscription automatically when webContents is destroyed.
      browserWindow.on("close", () => {
        hideOverlay("close");
      });
      browserWindow.on("closed", () => {
        captureActive = false;
      });

      // Position overlay window over Electron window initially
      syncOverlayFrame();

      // Show the overlay window (it floats above Electron but ignores mouse)
      if (this.nativeModule) {
        this.nativeModule.showOverlayWindow(this.overlayWindow);
        overlayVisible = true;
        SteamLogger.debug(
          "[Steam Overlay] Overlay window shown (pass-through mode)",
        );
      }

      // On Linux: do NOT call moveTop() — the GLX window must stay above Electron.
      // On other platforms focus + raise ensures Electron is on top.
      if (process.platform !== "linux") {
        setImmediate(() => {
          if (!browserWindow.isDestroyed()) {
            browserWindow.focus();
            browserWindow.moveTop();
            SteamLogger.debug("[Steam Overlay] Electron window focused for input");
          }
        });
      }

      SteamLogger.debug(
        "[Steam Overlay] Successfully added Steam overlay to Electron window",
      );

      return true;
    } catch (error) {
      SteamLogger.error("[Steam Overlay] Error adding overlay:", error);
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
        this.nativeModule.destroyOverlayWindow(this.overlayWindow);
        this.overlayWindow = null;
        SteamLogger.debug("[Steam Overlay] Overlay window destroyed");
      } catch (error) {
        SteamLogger.error(
          "[Steam Overlay] Error destroying overlay window:",
          error,
        );
      }
    }
  }

  /**
   * Check if Steam overlay is available on this system
   *
   * @returns True if Steam overlay can be used
   */
  isAvailable(): boolean {
    const supportedPlatforms = ["darwin", "win32", "linux"];
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
