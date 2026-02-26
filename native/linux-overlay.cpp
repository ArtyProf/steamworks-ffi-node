// Linux OpenGL (GLX) Overlay for Steam Integration
// Uses glXSwapBuffers hook in gameoverlayrenderer64.so to enable Steam overlay (Shift+Tab).

#if defined(__linux__) && !defined(__ANDROID__)

#include <node_api.h>
#include <string>
#include <mutex>
#include <atomic>
#include <thread>
#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <unistd.h>
#include <ctime>

// X11 and OpenGL includes
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/Xatom.h>
#include <X11/extensions/shape.h>
#include <X11/extensions/Xfixes.h>
#include <X11/extensions/Xcomposite.h>
#include <GL/gl.h>
#include <GL/glx.h>
#include <dlfcn.h>

// Global debug flag - controlled from JavaScript via SteamLogger
static bool g_debugMode = false;

// Debug logging macro - only logs when debug mode is enabled
#define OverlayLog(fmt, ...) do { if (g_debugMode) { printf("[Linux Overlay] " fmt "\n", ##__VA_ARGS__); fflush(stdout); } } while(0)
#define OverlayLogError(fmt, ...) do { printf("[Linux Overlay] ERROR: " fmt "\n", ##__VA_ARGS__); fflush(stdout); } while(0)

// OpenGL extensions for modern texture formats
#ifndef GL_BGRA
#define GL_BGRA 0x80E1
#endif

#ifndef GL_CLAMP_TO_EDGE
#define GL_CLAMP_TO_EDGE 0x812F
#endif

// GLX extension function types
typedef GLXContext (*glXCreateContextAttribsARBProc)(Display*, GLXFBConfig, GLXContext, Bool, const int*);
typedef void (*glXSwapIntervalEXTProc)(Display*, GLXDrawable, int);

// Linux OpenGL/GLX Overlay Window — glXSwapBuffers is hooked by gameoverlayrenderer64.so
class LinuxOverlayWindow {
public:
    Display* display = nullptr;
    Window window = 0;
    Window electronWindow = 0; // Electron XID — keyboard/mouse events are forwarded here
    GLXContext glContext = nullptr;
    Colormap colormap = 0;
    GLXFBConfig fbConfig = nullptr;
    XVisualInfo* visualInfo = nullptr;
    
    GLuint texture = 0;
    int texWidth = 0;
    int texHeight = 0;
    
    int width = 0;
    int height = 0;
    std::atomic<bool> isDestroyed{false};
    std::atomic<bool> isMapped{false};  // true while window is XMapRaised, false after XUnmapWindow
    std::mutex renderMutex;

    // Cursor warp suppression on Steam overlay close.
    // When Shift+Tab opens the overlay, Steam saves the cursor position.
    // When the overlay closes, Steam warps the cursor back to that saved position.
    // We detect this by: Shift+Tab sets overlayWasOpened=true, then the next FocusIn
    // (overlay handed focus back to us) triggers a 500ms MotionNotify suppression.
    // The 30px-distance approach doesn't work because lastMouseX/Y is already at the
    // restored position (we receive no MotionNotify while the overlay holds focus).
    bool overlayWasOpened = false;
    long long suppressMotionUntilMs = 0;
    
    // For continuous rendering (Steam overlay requirement)
    std::atomic<bool> renderThreadRunning{false};
    std::thread renderThread;
    std::mutex frameMutex;
    uint8_t* frameBuffer = nullptr;
    int frameWidth = 0;
    int frameHeight = 0;
    std::atomic<bool> hasNewFrame{false};
    
    static long long getMonotonicMs() {
        struct timespec ts;
        clock_gettime(CLOCK_MONOTONIC, &ts);
        return (long long)ts.tv_sec * 1000 + ts.tv_nsec / 1000000;
    }

    bool init(int w, int h, const char* title) {
        width = w;
        height = h;
        
        OverlayLog("Initializing Linux overlay window: %dx%d", w, h);
        
        XInitThreads(); // Required for multi-threaded X11 access
        
        // Open X display
        display = XOpenDisplay(nullptr);
        if (!display) {
            OverlayLogError("Failed to open X display");
            return false;
        }
        
        // Check for required extensions
        int eventBase, errorBase;
        if (!XShapeQueryExtension(display, &eventBase, &errorBase)) {
            OverlayLogError("X Shape extension not available");
            XCloseDisplay(display);
            display = nullptr;
            return false;
        }
        
        // Check for XFixes (for input shape)
        int fixesEventBase, fixesErrorBase;
        bool hasXFixes = XFixesQueryExtension(display, &fixesEventBase, &fixesErrorBase);
        OverlayLog("XFixes extension: %s", hasXFixes ? "available" : "not available");
        
        // Get default screen
        int screen = DefaultScreen(display);
        Window root = RootWindow(display, screen);
        
        // Choose FBConfig with alpha support for transparency
        static int fbAttribs[] = {
            GLX_X_RENDERABLE, True,
            GLX_DRAWABLE_TYPE, GLX_WINDOW_BIT,
            GLX_RENDER_TYPE, GLX_RGBA_BIT,
            GLX_X_VISUAL_TYPE, GLX_TRUE_COLOR,
            GLX_RED_SIZE, 8,
            GLX_GREEN_SIZE, 8,
            GLX_BLUE_SIZE, 8,
            GLX_ALPHA_SIZE, 8,
            GLX_DEPTH_SIZE, 24,
            GLX_STENCIL_SIZE, 8,
            GLX_DOUBLEBUFFER, True,
            None
        };
        
        int fbCount;
        GLXFBConfig* fbConfigs = glXChooseFBConfig(display, screen, fbAttribs, &fbCount);
        if (!fbConfigs || fbCount == 0) {
            OverlayLogError("Failed to choose FBConfig");
            XCloseDisplay(display);
            display = nullptr;
            return false;
        }
        
        // Pick the first FBConfig
        fbConfig = fbConfigs[0];
        XFree(fbConfigs);
        
        // Get visual info from FBConfig
        visualInfo = glXGetVisualFromFBConfig(display, fbConfig);
        if (!visualInfo) {
            OverlayLogError("Failed to get visual info");
            XCloseDisplay(display);
            display = nullptr;
            return false;
        }
        
        // Create colormap
        colormap = XCreateColormap(display, root, visualInfo->visual, AllocNone);
        
        // Receive ALL input — we forward keyboard/mouse to Electron via XSendEvent.
        // The window must hold X11 keyboard focus for gameoverlayrenderer64.so to
        // intercept Shift+Tab and trigger the Steam overlay.
        XSetWindowAttributes attrs;
        attrs.colormap = colormap;
        attrs.background_pixmap = None;
        attrs.background_pixel = 0;
        attrs.border_pixel = 0;
        attrs.event_mask = ExposureMask | StructureNotifyMask | VisibilityChangeMask
                         | KeyPressMask | KeyReleaseMask
                         | ButtonPressMask | ButtonReleaseMask | PointerMotionMask
                         | FocusChangeMask;
        attrs.override_redirect = True;  // Bypass KWin stacking entirely — window always on top
        
        // Create window with 32-bit depth for alpha
        window = XCreateWindow(
            display, root,
            0, 0, w, h,
            0,
            visualInfo->depth,
            InputOutput,
            visualInfo->visual,
            CWColormap | CWBackPixmap | CWBackPixel | CWBorderPixel | CWEventMask | CWOverrideRedirect,
            &attrs
        );
        
        if (!window) {
            OverlayLogError("Failed to create X window");
            XFree(visualInfo);
            XCloseDisplay(display);
            display = nullptr;
            return false;
        }
        
        // Set window title
        XStoreName(display, window, title);
        
        // STEAM_GAME atom — critical for Steam overlay detection
        const char* steamAppId = getenv("SteamAppId");
        if (steamAppId) {
            uint32_t appId = (uint32_t)atoi(steamAppId);
            Atom steamGameAtom = XInternAtom(display, "STEAM_GAME", False);
            XChangeProperty(display, window, steamGameAtom, XA_CARDINAL, 32, PropModeReplace,
                           (unsigned char*)&appId, 1);
            OverlayLog("Set STEAM_GAME atom to %u", appId);
        }
        
        // _NET_WM_PID
        pid_t pid = getpid();
        Atom wmPid = XInternAtom(display, "_NET_WM_PID", False);
        XChangeProperty(display, window, wmPid, XA_CARDINAL, 32, PropModeReplace,
                       (unsigned char*)&pid, 1);
        OverlayLog("Set _NET_WM_PID to %d", pid);
        
        // Set window type to utility/overlay for better window manager handling
        Atom windowType = XInternAtom(display, "_NET_WM_WINDOW_TYPE", False);
        Atom windowTypeUtility = XInternAtom(display, "_NET_WM_WINDOW_TYPE_UTILITY", False);
        Atom windowTypeDialog = XInternAtom(display, "_NET_WM_WINDOW_TYPE_DIALOG", False);
        Atom types[] = { windowTypeUtility, windowTypeDialog };
        XChangeProperty(display, window, windowType, XA_ATOM, 32, PropModeReplace,
                       (unsigned char*)types, 2);
        
        // Set window states: above, skip taskbar, skip pager
        Atom wmState = XInternAtom(display, "_NET_WM_STATE", False);
        Atom wmStateAbove = XInternAtom(display, "_NET_WM_STATE_ABOVE", False);
        Atom wmStateSkipTaskbar = XInternAtom(display, "_NET_WM_STATE_SKIP_TASKBAR", False);
        Atom wmStateSkipPager = XInternAtom(display, "_NET_WM_STATE_SKIP_PAGER", False);
        Atom states[] = { wmStateAbove, wmStateSkipTaskbar, wmStateSkipPager };
        XChangeProperty(display, window, wmState, XA_ATOM, 32, PropModeReplace,
                       (unsigned char*)states, 3);
        
        // Remove window decorations
        Atom motifHints = XInternAtom(display, "_MOTIF_WM_HINTS", False);
        struct {
            unsigned long flags;
            unsigned long functions;
            unsigned long decorations;
            long inputMode;
            unsigned long status;
        } hints = { 2, 0, 0, 0, 0 };  // flags=2 means decorations field is valid, decorations=0 means none
        XChangeProperty(display, window, motifHints, motifHints, 32, PropModeReplace,
                       (unsigned char*)&hints, 5);
        
        // Advertise WM_TAKE_FOCUS so KWin knows this window accepts focus
        Atom wmProtocols = XInternAtom(display, "WM_PROTOCOLS", False);
        Atom wmTakeFocus = XInternAtom(display, "WM_TAKE_FOCUS", False);
        XChangeProperty(display, window, wmProtocols, XA_ATOM, 32, PropModeReplace,
                       (unsigned char*)&wmTakeFocus, 1);

        // Verify gameoverlayrenderer64.so is LD_PRELOADed (hook must be active)
        {
            FILE* maps = fopen("/proc/self/maps", "r");
            if (maps) {
                char line[512];
                bool found = false;
                while (fgets(line, sizeof(line), maps)) {
                    if (strstr(line, "gameoverlayrenderer64")) {
                        // Trim newline for clean log
                        char* nl = strchr(line, '\n'); if (nl) *nl = 0;
                        printf("[Linux Overlay] gameoverlayrenderer64.so LOADED: %s\n", line);
                        fflush(stdout);
                        found = true;
                        break;
                    }
                }
                fclose(maps);
                if (!found) {
                    printf("[Linux Overlay] WARNING: gameoverlayrenderer64.so NOT in /proc/self/maps — overlay hook inactive!\n");
                    fflush(stdout);
                }
            }
        }

        OverlayLog("Input forwarding mode: all events forwarded to Electron via XSendEvent");
        
        // Create modern OpenGL context using glXCreateContextAttribsARB if available
        glXCreateContextAttribsARBProc glXCreateContextAttribsARB = 
            (glXCreateContextAttribsARBProc)glXGetProcAddressARB((const GLubyte*)"glXCreateContextAttribsARB");
        
        if (glXCreateContextAttribsARB) {
            // Try to create OpenGL 3.3 core context first, fall back to legacy
            static int contextAttribs[] = {
                GLX_CONTEXT_MAJOR_VERSION_ARB, 3,
                GLX_CONTEXT_MINOR_VERSION_ARB, 3,
                GLX_CONTEXT_PROFILE_MASK_ARB, GLX_CONTEXT_COMPATIBILITY_PROFILE_BIT_ARB,
                None
            };
            
            glContext = glXCreateContextAttribsARB(display, fbConfig, nullptr, True, contextAttribs);
            if (!glContext) {
                OverlayLog("Failed to create GL 3.3 context, trying legacy");
            }
        }
        
        // Fall back to legacy context creation
        if (!glContext) {
            glContext = glXCreateContext(display, visualInfo, nullptr, True);
        }
        
        if (!glContext) {
            OverlayLogError("Failed to create GLX context");
            XDestroyWindow(display, window);
            XFree(visualInfo);
            XCloseDisplay(display);
            display = nullptr;
            return false;
        }
        
        // Make context current
        if (!glXMakeCurrent(display, window, glContext)) {
            OverlayLogError("Failed to make GLX context current");
            glXDestroyContext(display, glContext);
            XDestroyWindow(display, window);
            XFree(visualInfo);
            XCloseDisplay(display);
            display = nullptr;
            return false;
        }
        
        // Try to disable vsync for lower latency
        glXSwapIntervalEXTProc glXSwapIntervalEXT = 
            (glXSwapIntervalEXTProc)glXGetProcAddressARB((const GLubyte*)"glXSwapIntervalEXT");
        if (glXSwapIntervalEXT) {
            glXSwapIntervalEXT(display, window, 0);
            OverlayLog("VSync disabled");
        }
        
        // Initialize OpenGL state
        initGL();
        
        XSync(display, False);
        
        OverlayLog("Linux overlay window created successfully");
        OverlayLog("OpenGL Version: %s", glGetString(GL_VERSION));
        OverlayLog("OpenGL Renderer: %s", glGetString(GL_RENDERER));
        
        return true;
    }
    
    void initGL() {
        // Set up basic OpenGL state
        glEnable(GL_TEXTURE_2D);
        glDisable(GL_DEPTH_TEST);
        glDisable(GL_LIGHTING);
        glDisable(GL_CULL_FACE);
        
        // Set up orthographic projection for 2D rendering
        glMatrixMode(GL_PROJECTION);
        glLoadIdentity();
        glOrtho(0, width, height, 0, -1, 1);
        
        glMatrixMode(GL_MODELVIEW);
        glLoadIdentity();
        
        // Enable blending for transparency
        glEnable(GL_BLEND);
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
        
        // Set clear color to transparent black
        glClearColor(0.0f, 0.0f, 0.0f, 0.0f);
        
        // Set viewport
        glViewport(0, 0, width, height);
    }
    
    void show() {
        if (isDestroyed) return;
        
        if (display && window) {
            OverlayLog("Showing overlay window");
            isMapped = true;
            XMapRaised(display, window);
            // Wait for the X server to process MapRaised before touching the GL drawable.
            // Without this, glXMakeCurrent may succeed on a not-yet-viewable window
            // and glXSwapBuffers silently no-ops, preventing Steam's hook from firing.
            XSync(display, False);
            // Re-acquire GL context on the now-viewable window
            if (glContext) {
                glXMakeCurrent(display, window, glContext);
            }
            requestFocus();
        }
    }

    void requestFocus() {
        // With override_redirect=True, KWin ignores EWMH messages for our window.
        // XSetInputFocus is the only way to grab keyboard focus.
        // Guard with isMapped: calling XSetInputFocus on an unmapped window
        // generates a BadMatch X error and fights the minimize animation.
        if (!display || !window || !isMapped) return;
        XSetInputFocus(display, window, RevertToPointerRoot, CurrentTime);
        XFlush(display);
    }

    void hide() {
        if (isDestroyed) return;
        
        if (display && window) {
            OverlayLog("Hiding overlay window");
            isMapped = false;
            // Release GL context before unmapping to prevent stale drawable state
            glXMakeCurrent(display, None, nullptr);
            XUnmapWindow(display, window);
            XFlush(display);
        }
    }
    
    void setFrame(int x, int y, int w, int h) {
        if (isDestroyed) return;
        
        OverlayLog("Setting frame: x=%d, y=%d, w=%d, h=%d", x, y, w, h);
        
        width = w;
        height = h;
        
        if (display && window) {
            XMoveResizeWindow(display, window, x, y, w, h);
            
            // Update OpenGL viewport
            if (glContext) {
                glXMakeCurrent(display, window, glContext);
                glViewport(0, 0, w, h);
                
                glMatrixMode(GL_PROJECTION);
                glLoadIdentity();
                glOrtho(0, w, h, 0, -1, 1);
                
                glMatrixMode(GL_MODELVIEW);
                glLoadIdentity();
            }
            
            XFlush(display);
        }
    }
    
    void renderFrame(const uint8_t* data, int w, int h) {
        if (isDestroyed) return;
        if (!isMapped) return;  // Don't render/swap when hidden — avoids GL errors on unmapped window
        
        std::lock_guard<std::mutex> lock(renderMutex);
        
        if (!display || !glContext || !window) return;
        
        if (!glXMakeCurrent(display, window, glContext)) {
            OverlayLogError("Failed to make context current in renderFrame");
            return;
        }
        
        // Create or update texture
        if (texture == 0 || w != texWidth || h != texHeight) {
            if (texture != 0) {
                glDeleteTextures(1, &texture);
            }
            
            glGenTextures(1, &texture);
            glBindTexture(GL_TEXTURE_2D, texture);
            
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
            
            // Allocate texture storage (BGRA format from Electron)
            glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, w, h, 0, GL_BGRA, GL_UNSIGNED_BYTE, nullptr);
            
            texWidth = w;
            texHeight = h;
            
            OverlayLog("Created texture: %dx%d", w, h);
        }
        
        // Upload pixel data
        glBindTexture(GL_TEXTURE_2D, texture);
        glTexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, w, h, GL_BGRA, GL_UNSIGNED_BYTE, data);
        
        // Clear with transparent color
        glClear(GL_COLOR_BUFFER_BIT);
        
        // Render textured quad
        glEnable(GL_TEXTURE_2D);
        glBindTexture(GL_TEXTURE_2D, texture);
        
        glColor4f(1.0f, 1.0f, 1.0f, 1.0f);
        
        // Draw full-screen quad
        glBegin(GL_QUADS);
            glTexCoord2f(0.0f, 0.0f); glVertex2f(0.0f, 0.0f);
            glTexCoord2f(1.0f, 0.0f); glVertex2f((float)width, 0.0f);
            glTexCoord2f(1.0f, 1.0f); glVertex2f((float)width, (float)height);
            glTexCoord2f(0.0f, 1.0f); glVertex2f(0.0f, (float)height);
        glEnd();
        
        // Swap buffers
        glXSwapBuffers(display, window);
        
        // Process any pending X events
        while (XPending(display)) {
            XEvent event;
            XNextEvent(display, &event);

            if (event.type == KeyPress || event.type == KeyRelease) {
                bool isShiftTab = (event.xkey.keycode == 23 && (event.xkey.state & ShiftMask));
                OverlayLog("%s: keycode=%d state=0x%x%s",
                    event.type == KeyPress ? "KeyPress" : "KeyRelease",
                    event.xkey.keycode, event.xkey.state,
                    isShiftTab ? " [Shift+Tab - overlay opening]" : "");

                // Shift+Tab: do NOT forward to Electron — Steam's hook consumes it.
                if (!isShiftTab && electronWindow) {
                    event.xkey.window    = electronWindow;
                    event.xkey.subwindow = None;
                    XSendEvent(display, electronWindow, True, NoEventMask, &event);
                }

            } else if (electronWindow && (
                    event.type == ButtonPress || event.type == ButtonRelease ||
                    event.type == MotionNotify)) {

                if (event.type == MotionNotify) {
                    // Suppress motion during the cursor-restore window after overlay close
                    if (getMonotonicMs() < suppressMotionUntilMs) {
                        continue;
                    }
                }

                // Forward mouse event to Electron
                event.xkey.window    = electronWindow;
                event.xkey.subwindow = None;
                XSendEvent(display, electronWindow, True, NoEventMask, &event);

                if (event.type == ButtonPress) {
                    // Real click — cancel any remaining suppression and re-grab focus
                    suppressMotionUntilMs = 0;
                    requestFocus();
                }

            } else if (event.type == FocusOut) {
                // Steam overlay is stealing focus — it will save cursor position now
                // and warp back to it when it closes. Mark so FocusIn suppresses that warp.
                if (isMapped) {
                    OverlayLog("FocusOut: overlay stealing focus, marking for cursor warp suppression");
                    overlayWasOpened = true;
                    requestFocus();
                }
            } else if (event.type == FocusIn) {
                OverlayLog("FocusIn: overlay window has keyboard focus");
                if (overlayWasOpened) {
                    // Overlay just closed — Steam is about to warp cursor back to saved position.
                    // Suppress MotionNotify for 500ms so Electron doesn't snap hover state.
                    overlayWasOpened = false;
                    suppressMotionUntilMs = getMonotonicMs() + 500;
                    OverlayLog("FocusIn after overlay: suppressing cursor warp for 500ms");
                }
            }
            // Expose/other events: handled on next renderFrame
        }
        
        // Ensure GL commands are flushed
        glFlush();
    }
    
    void destroy() {
        if (isDestroyed.exchange(true)) return;
        
        OverlayLog("Destroying Linux overlay window...");
        
        // Stop render thread if running
        renderThreadRunning = false;
        if (renderThread.joinable()) {
            renderThread.join();
        }
        
        // Free frame buffer
        if (frameBuffer) {
            delete[] frameBuffer;
            frameBuffer = nullptr;
        }
        
        // Delete texture
        if (texture && display && glContext) {
            glXMakeCurrent(display, window, glContext);
            glDeleteTextures(1, &texture);
            texture = 0;
        }
        
        if (glContext && display) {
            glXMakeCurrent(display, None, nullptr);
            glXDestroyContext(display, glContext);
            glContext = nullptr;
        }
        
        if (window && display) {
            XDestroyWindow(display, window);
            window = 0;
        }
        
        if (colormap && display) {
            XFreeColormap(display, colormap);
            colormap = 0;
        }
        
        if (visualInfo) {
            XFree(visualInfo);
            visualInfo = nullptr;
        }
        
        if (display) {
            XCloseDisplay(display);
            display = nullptr;
        }
        
        OverlayLog("Linux overlay window destroyed");
    }
    
    ~LinuxOverlayWindow() {
        destroy();
    }
};

// N-API wrapper functions
static napi_value CreateOverlayWindow(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value args[1];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    if (status != napi_ok || argc < 1) {
        napi_throw_error(env, nullptr, "Expected options object");
        return nullptr;
    }
    
    // Get options
    napi_value widthVal, heightVal, titleVal;
    napi_get_named_property(env, args[0], "width", &widthVal);
    napi_get_named_property(env, args[0], "height", &heightVal);
    napi_get_named_property(env, args[0], "title", &titleVal);
    
    int width, height;
    napi_get_value_int32(env, widthVal, &width);
    napi_get_value_int32(env, heightVal, &height);
    
    char title[256] = "Steam Overlay";
    size_t titleLen;
    napi_get_value_string_utf8(env, titleVal, title, sizeof(title), &titleLen);
    
    // Create window
    LinuxOverlayWindow* window = new LinuxOverlayWindow();
    if (!window->init(width, height, title)) {
        delete window;
        napi_throw_error(env, nullptr, "Failed to create overlay window");
        return nullptr;
    }
    
    // Wrap pointer
    napi_value external;
    status = napi_create_external(env, window, nullptr, nullptr, &external);
    
    return external;
}

static napi_value ShowOverlayWindow(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    LinuxOverlayWindow* window;
    napi_get_value_external(env, args[0], (void**)&window);
    
    if (window) {
        window->show();
    }
    
    return nullptr;
}

static napi_value HideOverlayWindow(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    LinuxOverlayWindow* window;
    napi_get_value_external(env, args[0], (void**)&window);
    
    if (window) {
        window->hide();
    }
    
    return nullptr;
}

static napi_value SetOverlayWindowFrame(napi_env env, napi_callback_info info) {
    size_t argc = 5;
    napi_value args[5];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    LinuxOverlayWindow* window;
    napi_get_value_external(env, args[0], (void**)&window);
    
    int x, y, width, height;
    napi_get_value_int32(env, args[1], &x);
    napi_get_value_int32(env, args[2], &y);
    napi_get_value_int32(env, args[3], &width);
    napi_get_value_int32(env, args[4], &height);
    
    if (window) {
        window->setFrame(x, y, width, height);
    }
    
    return nullptr;
}

static napi_value RenderFrame(napi_env env, napi_callback_info info) {
    size_t argc = 4;
    napi_value args[4];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    LinuxOverlayWindow* window;
    napi_get_value_external(env, args[0], (void**)&window);
    
    void* buffer;
    size_t length;
    napi_get_buffer_info(env, args[1], &buffer, &length);
    
    int width, height;
    napi_get_value_int32(env, args[2], &width);
    napi_get_value_int32(env, args[3], &height);
    
    if (window && buffer) {
        window->renderFrame((const uint8_t*)buffer, width, height);
    }
    
    return nullptr;
}

static napi_value DestroyOverlayWindow(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    LinuxOverlayWindow* window;
    napi_get_value_external(env, args[0], (void**)&window);
    
    if (window) {
        delete window;
    }
    
    return nullptr;
}

static napi_value SetDebugMode(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    bool enabled;
    napi_get_value_bool(env, args[0], &enabled);
    g_debugMode = enabled;
    
    return nullptr;
}

// setSteamGameAtomOnWindow(xid, appId) — tags an X11 window with STEAM_GAME atom
// and stores it as the Electron target for input forwarding
static napi_value SetSteamGameAtomOnWindow(napi_env env, napi_callback_info info) {
    size_t argc = 2;
    napi_value args[2];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    int64_t xWindowId = 0, appId = 0;
    napi_get_value_int64(env, args[0], &xWindowId);
    napi_get_value_int64(env, args[1], &appId);
    
    if (xWindowId == 0 || appId == 0) {
        napi_value result; napi_get_boolean(env, false, &result); return result;
    }
    
    // Note: linux-overlay.cpp uses per-instance handles, not a global.
    // Open a temporary display connection for this call.
    Display* dpy = XOpenDisplay(nullptr);
    if (!dpy) {
        napi_value result; napi_get_boolean(env, false, &result); return result;
    }
    
    uint32_t appIdInt = (uint32_t)appId;
    Atom steamGameAtom = XInternAtom(dpy, "STEAM_GAME", False);
    XChangeProperty(dpy, (Window)xWindowId, steamGameAtom, XA_CARDINAL, 32,
                   PropModeReplace, (unsigned char*)&appIdInt, 1);
    XFlush(dpy);
    XCloseDisplay(dpy);
    
    OverlayLog("Set STEAM_GAME=%u on Electron window 0x%lx", appIdInt, (unsigned long)xWindowId);
    
    napi_value result; napi_get_boolean(env, true, &result); return result;
}

// setElectronWindow(handle, xid) — stores the Electron XID on the overlay for input forwarding
static napi_value SetElectronWindow(napi_env env, napi_callback_info info) {
    size_t argc = 2;
    napi_value args[2];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    LinuxOverlayWindow* window;
    napi_get_value_external(env, args[0], (void**)&window);
    
    int64_t xid = 0;
    napi_get_value_int64(env, args[1], &xid);
    
    if (window && xid) {
        window->electronWindow = (Window)xid;
        OverlayLog("Stored Electron window 0x%lx for input forwarding", (unsigned long)xid);
    }
    
    return nullptr;
}

// Module initialization - use same function names as other platforms for compatibility
static napi_value Init(napi_env env, napi_value exports) {
    napi_property_descriptor desc[] = {
        { "createOverlayWindow",      nullptr, CreateOverlayWindow,      nullptr, nullptr, nullptr, napi_default, nullptr },
        { "showOverlayWindow",        nullptr, ShowOverlayWindow,        nullptr, nullptr, nullptr, napi_default, nullptr },
        { "hideOverlayWindow",        nullptr, HideOverlayWindow,        nullptr, nullptr, nullptr, napi_default, nullptr },
        { "setOverlayFrame",          nullptr, SetOverlayWindowFrame,    nullptr, nullptr, nullptr, napi_default, nullptr },
        { "renderFrame",              nullptr, RenderFrame,              nullptr, nullptr, nullptr, napi_default, nullptr },
        { "destroyOverlayWindow",     nullptr, DestroyOverlayWindow,     nullptr, nullptr, nullptr, napi_default, nullptr },
        { "setDebugMode",             nullptr, SetDebugMode,             nullptr, nullptr, nullptr, napi_default, nullptr },
        { "setSteamGameAtomOnWindow", nullptr, SetSteamGameAtomOnWindow, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "setElectronWindow",        nullptr, SetElectronWindow,        nullptr, nullptr, nullptr, napi_default, nullptr },
    };
    
    napi_define_properties(env, exports, sizeof(desc) / sizeof(desc[0]), desc);
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)

#endif // __linux__
