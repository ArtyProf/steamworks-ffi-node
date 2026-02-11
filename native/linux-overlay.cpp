// Linux OpenGL Overlay for Steam Integration
// Optimized for X11 with proper click-through and Steam overlay injection support

#if defined(__linux__) && !defined(__ANDROID__)

#include <node_api.h>
#include <string>
#include <mutex>
#include <atomic>
#include <thread>
#include <cstdio>
#include <cstring>

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

// Linux OpenGL Overlay Window class with enhanced Steam overlay support
class LinuxOverlayWindow {
public:
    Display* display = nullptr;
    Window window = 0;
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
    std::mutex renderMutex;
    
    // For continuous rendering (Steam overlay requirement)
    std::atomic<bool> renderThreadRunning{false};
    std::thread renderThread;
    std::mutex frameMutex;
    uint8_t* frameBuffer = nullptr;
    int frameWidth = 0;
    int frameHeight = 0;
    std::atomic<bool> hasNewFrame{false};
    
    bool init(int w, int h, const char* title) {
        width = w;
        height = h;
        
        OverlayLog("Initializing Linux overlay window: %dx%d", w, h);
        
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
        
        // Set window attributes for overlay
        XSetWindowAttributes attrs;
        attrs.colormap = colormap;
        attrs.background_pixmap = None;
        attrs.background_pixel = 0;
        attrs.border_pixel = 0;
        attrs.event_mask = ExposureMask | StructureNotifyMask | VisibilityChangeMask;
        attrs.override_redirect = False;  // Use False to work with window manager
        
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
        
        // CRITICAL: Set input shape to empty rectangle - this makes clicks pass through!
        // The window will still be visible but won't receive any input events
        XRectangle emptyRect = { 0, 0, 0, 0 };
        XShapeCombineRectangles(display, window, ShapeInput, 0, 0, &emptyRect, 0, ShapeSet, YXBanded);
        
        OverlayLog("Set empty input shape for click-through");
        
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
            XMapRaised(display, window);
            
            // Re-apply always-on-top after mapping
            Atom wmState = XInternAtom(display, "_NET_WM_STATE", False);
            Atom wmStateAbove = XInternAtom(display, "_NET_WM_STATE_ABOVE", False);
            
            XEvent event;
            memset(&event, 0, sizeof(event));
            event.type = ClientMessage;
            event.xclient.window = window;
            event.xclient.message_type = wmState;
            event.xclient.format = 32;
            event.xclient.data.l[0] = 1;  // _NET_WM_STATE_ADD
            event.xclient.data.l[1] = wmStateAbove;
            event.xclient.data.l[2] = 0;
            event.xclient.data.l[3] = 1;  // Source: application
            
            XSendEvent(display, DefaultRootWindow(display), False,
                      SubstructureRedirectMask | SubstructureNotifyMask, &event);
            
            XFlush(display);
        }
    }
    
    void hide() {
        if (isDestroyed) return;
        
        if (display && window) {
            OverlayLog("Hiding overlay window");
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
            
            // Re-apply empty input shape after resize
            XRectangle emptyRect = { 0, 0, 0, 0 };
            XShapeCombineRectangles(display, window, ShapeInput, 0, 0, &emptyRect, 0, ShapeSet, YXBanded);
            
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
        
        // Process any pending X events to keep window responsive
        while (XPending(display)) {
            XEvent event;
            XNextEvent(display, &event);
            
            // Handle expose events - redraw
            if (event.type == Expose) {
                // Window needs redraw, will happen on next frame
            }
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

// Module initialization - use same function names as other platforms for compatibility
static napi_value Init(napi_env env, napi_value exports) {
    napi_property_descriptor desc[] = {
        { "createMetalWindow", nullptr, CreateOverlayWindow, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "showMetalWindow", nullptr, ShowOverlayWindow, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "hideMetalWindow", nullptr, HideOverlayWindow, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "setMetalWindowFrame", nullptr, SetOverlayWindowFrame, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "renderFrame", nullptr, RenderFrame, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "destroyMetalWindow", nullptr, DestroyOverlayWindow, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "setDebugMode", nullptr, SetDebugMode, nullptr, nullptr, nullptr, napi_default, nullptr }
    };
    
    napi_define_properties(env, exports, sizeof(desc) / sizeof(desc[0]), desc);
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)

#endif // __linux__
