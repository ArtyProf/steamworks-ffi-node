// Linux OpenGL/X11 Overlay for Steam Integration
// Enables Steam overlay injection for Electron apps on Linux

#if defined(__linux__) && !defined(__ANDROID__)

#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/Xatom.h>
#include <GL/gl.h>
#include <GL/glx.h>
#include <node_api.h>
#include <cstring>
#include <cstdio>
#include <mutex>

// Global debug flag - controlled from JavaScript via SteamLogger
static bool g_debugMode = false;

// Debug logging macro - only logs when debug mode is enabled
#define OverlayLog(fmt, ...) do { if (g_debugMode) { printf("[OpenGL Overlay] " fmt "\n", ##__VA_ARGS__); } } while(0)
#define OverlayLogError(fmt, ...) do { printf("[OpenGL Overlay] ERROR: " fmt "\n", ##__VA_ARGS__); } while(0)

// OpenGL function pointers (loaded dynamically)
typedef void (*PFNGLGENFRAMEBUFFERSPROC)(GLsizei, GLuint*);
typedef void (*PFNGLBINDFRAMEBUFFERPROC)(GLenum, GLuint);
typedef void (*PFNGLFRAMEBUFFERTEXTURE2DPROC)(GLenum, GLenum, GLenum, GLuint, GLint);
typedef GLenum (*PFNGLCHECKFRAMEBUFFERSTATUSPROC)(GLenum);
typedef void (*PFNGLDELETEFRAMEBUFFERSPROC)(GLsizei, const GLuint*);

// OpenGL Overlay Window class
class GLOverlayWindow {
public:
    Display* display = nullptr;
    Window window = 0;
    GLXContext glContext = nullptr;
    Colormap colormap = 0;
    
    GLuint texture = 0;
    int texWidth = 0;
    int texHeight = 0;
    
    int width = 0;
    int height = 0;
    bool isDestroyed = false;
    std::mutex renderMutex;
    
    bool init(int w, int h, const char* title) {
        width = w;
        height = h;
        
        // Open X display
        display = XOpenDisplay(nullptr);
        if (!display) {
            OverlayLogError("Failed to open X display");
            return false;
        }
        
        // Get default screen
        int screen = DefaultScreen(display);
        Window root = RootWindow(display, screen);
        
        // Choose visual with OpenGL support
        static int visualAttribs[] = {
            GLX_RGBA,
            GLX_DEPTH_SIZE, 24,
            GLX_DOUBLEBUFFER,
            None
        };
        
        XVisualInfo* visual = glXChooseVisual(display, screen, visualAttribs);
        if (!visual) {
            OverlayLogError("Failed to choose visual");
            XCloseDisplay(display);
            display = nullptr;
            return false;
        }
        
        // Create colormap
        colormap = XCreateColormap(display, root, visual->visual, AllocNone);
        
        // Set window attributes
        XSetWindowAttributes attrs;
        attrs.colormap = colormap;
        attrs.event_mask = ExposureMask | StructureNotifyMask;
        attrs.override_redirect = True;  // Borderless
        attrs.background_pixel = 0;
        attrs.border_pixel = 0;
        
        // Create window
        window = XCreateWindow(
            display, root,
            100, 100, w, h,
            0,
            visual->depth,
            InputOutput,
            visual->visual,
            CWColormap | CWEventMask | CWOverrideRedirect | CWBackPixel | CWBorderPixel,
            &attrs
        );
        
        if (!window) {
            OverlayLogError("Failed to create X window");
            XFree(visual);
            XCloseDisplay(display);
            display = nullptr;
            return false;
        }
        
        // Set window title
        XStoreName(display, window, title);
        
        // Make window stay on top
        Atom wmStateAbove = XInternAtom(display, "_NET_WM_STATE_ABOVE", False);
        Atom wmState = XInternAtom(display, "_NET_WM_STATE", False);
        XChangeProperty(display, window, wmState, XA_ATOM, 32, PropModeReplace,
                       (unsigned char*)&wmStateAbove, 1);
        
        // Make window click-through (if supported)
        // This uses the SHAPE extension or input region
        setClickThrough();
        
        // Create OpenGL context
        glContext = glXCreateContext(display, visual, nullptr, True);
        if (!glContext) {
            OverlayLogError("Failed to create GLX context");
            XDestroyWindow(display, window);
            XFree(visual);
            XCloseDisplay(display);
            display = nullptr;
            return false;
        }
        
        XFree(visual);
        
        // Make context current
        if (!glXMakeCurrent(display, window, glContext)) {
            OverlayLogError("Failed to make GLX context current");
            glXDestroyContext(display, glContext);
            XDestroyWindow(display, window);
            XCloseDisplay(display);
            display = nullptr;
            return false;
        }
        
        // Initialize OpenGL
        initGL();
        
        OverlayLog("OpenGL overlay window created: %dx%d", w, h);
        OverlayLog("OpenGL Version: %s", glGetString(GL_VERSION));
        OverlayLog("OpenGL Renderer: %s", glGetString(GL_RENDERER));
        
        return true;
    }
    
    void setClickThrough() {
        // Try to make window click-through using X11 input shape
        // This requires the XShape extension
        
        // For now, we'll rely on the window manager
        // Steam overlay will capture input when active
        
        // Set window type to utility/splash to reduce WM interference
        Atom wmWindowType = XInternAtom(display, "_NET_WM_WINDOW_TYPE", False);
        Atom wmWindowTypeSplash = XInternAtom(display, "_NET_WM_WINDOW_TYPE_SPLASH", False);
        XChangeProperty(display, window, wmWindowType, XA_ATOM, 32, PropModeReplace,
                       (unsigned char*)&wmWindowTypeSplash, 1);
    }
    
    void initGL() {
        // Set up basic OpenGL state
        glEnable(GL_TEXTURE_2D);
        glDisable(GL_DEPTH_TEST);
        glDisable(GL_LIGHTING);
        
        // Set up orthographic projection for 2D rendering
        glMatrixMode(GL_PROJECTION);
        glLoadIdentity();
        glOrtho(0, width, height, 0, -1, 1);
        
        glMatrixMode(GL_MODELVIEW);
        glLoadIdentity();
        
        // Enable blending for transparency
        glEnable(GL_BLEND);
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
        
        // Set clear color to transparent
        glClearColor(0.0f, 0.0f, 0.0f, 0.0f);
    }
    
    void show() {
        if (display && window && !isDestroyed) {
            XMapWindow(display, window);
            XRaiseWindow(display, window);
            XFlush(display);
        }
    }
    
    void hide() {
        if (display && window && !isDestroyed) {
            XUnmapWindow(display, window);
            XFlush(display);
        }
    }
    
    void setFrame(int x, int y, int w, int h) {
        if (display && window && !isDestroyed) {
            width = w;
            height = h;
            XMoveResizeWindow(display, window, x, y, w, h);
            
            // Update OpenGL viewport and projection
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
        if (isDestroyed || !display || !glContext) return;
        
        std::lock_guard<std::mutex> lock(renderMutex);
        
        // Make context current
        if (!glXMakeCurrent(display, window, glContext)) {
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
            glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, w, h, 0, GL_BGRA, GL_UNSIGNED_BYTE, nullptr);
            
            texWidth = w;
            texHeight = h;
            
            OverlayLog("Created texture: %dx%d", w, h);
        }
        
        // Upload pixel data
        glBindTexture(GL_TEXTURE_2D, texture);
        glTexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, w, h, GL_BGRA, GL_UNSIGNED_BYTE, data);
        
        static int frameCount = 0;
        frameCount++;
        if (frameCount == 1) {
            OverlayLog("First frame uploaded to texture!");
        }
        
        // Clear and render
        glClear(GL_COLOR_BUFFER_BIT);
        
        glEnable(GL_TEXTURE_2D);
        glBindTexture(GL_TEXTURE_2D, texture);
        
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
            // Handle events if needed
        }
    }
    
    void destroy() {
        if (isDestroyed) return;
        isDestroyed = true;
        
        OverlayLog("Destroying OpenGL overlay...");
        
        if (texture != 0) {
            glDeleteTextures(1, &texture);
            texture = 0;
        }
        
        if (glContext) {
            glXMakeCurrent(display, None, nullptr);
            glXDestroyContext(display, glContext);
            glContext = nullptr;
        }
        
        if (window) {
            XDestroyWindow(display, window);
            window = 0;
        }
        
        if (colormap) {
            XFreeColormap(display, colormap);
            colormap = 0;
        }
        
        if (display) {
            XCloseDisplay(display);
            display = nullptr;
        }
        
        OverlayLog("OpenGL overlay destroyed");
    }
    
    ~GLOverlayWindow() {
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
    GLOverlayWindow* window = new GLOverlayWindow();
    if (!window->init(width, height, title)) {
        delete window;
        napi_throw_error(env, nullptr, "Failed to create overlay window");
        return nullptr;
    }
    
    // Wrap pointer
    napi_value external;
    status = napi_create_external(env, window,
        [](napi_env env, void* data, void* hint) {
            GLOverlayWindow* w = (GLOverlayWindow*)data;
            if (w && !w->isDestroyed) {
                w->destroy();
            }
            delete w;
        },
        nullptr, &external);
    
    if (status != napi_ok) {
        delete window;
        napi_throw_error(env, nullptr, "Failed to create external");
        return nullptr;
    }
    
    return external;
}

static napi_value ShowOverlayWindow(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value args[1];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    void* data;
    napi_get_value_external(env, args[0], &data);
    
    if (data) {
        ((GLOverlayWindow*)data)->show();
    }
    
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    return undefined;
}

static napi_value HideOverlayWindow(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value args[1];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    void* data;
    napi_get_value_external(env, args[0], &data);
    
    if (data) {
        ((GLOverlayWindow*)data)->hide();
    }
    
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    return undefined;
}

static napi_value SetOverlayWindowFrame(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 5;
    napi_value args[5];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    void* data;
    napi_get_value_external(env, args[0], &data);
    
    int x, y, w, h;
    napi_get_value_int32(env, args[1], &x);
    napi_get_value_int32(env, args[2], &y);
    napi_get_value_int32(env, args[3], &w);
    napi_get_value_int32(env, args[4], &h);
    
    if (data) {
        ((GLOverlayWindow*)data)->setFrame(x, y, w, h);
    }
    
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    return undefined;
}

static napi_value RenderFrame(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 4;
    napi_value args[4];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    void* windowData;
    napi_get_value_external(env, args[0], &windowData);
    
    void* bufferData;
    size_t bufferLen;
    napi_get_buffer_info(env, args[1], &bufferData, &bufferLen);
    
    int width, height;
    napi_get_value_int32(env, args[2], &width);
    napi_get_value_int32(env, args[3], &height);
    
    if (windowData && bufferData) {
        ((GLOverlayWindow*)windowData)->renderFrame((uint8_t*)bufferData, width, height);
    }
    
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    return undefined;
}

static napi_value DestroyOverlayWindow(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value args[1];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    void* data;
    napi_get_value_external(env, args[0], &data);
    
    if (data) {
        ((GLOverlayWindow*)data)->destroy();
    }
    
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    return undefined;
}

static napi_value SetDebugMode(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value args[1];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    bool enabled;
    napi_get_value_bool(env, args[0], &enabled);
    g_debugMode = enabled;
    
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    return undefined;
}

// Module initialization
static napi_value Init(napi_env env, napi_value exports) {
    napi_status status;
    napi_value fn;
    
    #define EXPORT_FUNCTION(name, func) \
        status = napi_create_function(env, nullptr, 0, func, nullptr, &fn); \
        if (status != napi_ok) return nullptr; \
        status = napi_set_named_property(env, exports, name, fn); \
        if (status != napi_ok) return nullptr;
    
    EXPORT_FUNCTION("setDebugMode", SetDebugMode)
    EXPORT_FUNCTION("createMetalWindow", CreateOverlayWindow)  // Keep same API names for compatibility
    EXPORT_FUNCTION("showMetalWindow", ShowOverlayWindow)
    EXPORT_FUNCTION("hideMetalWindow", HideOverlayWindow)
    EXPORT_FUNCTION("setMetalWindowFrame", SetOverlayWindowFrame)
    EXPORT_FUNCTION("renderFrame", RenderFrame)
    EXPORT_FUNCTION("destroyMetalWindow", DestroyOverlayWindow)
    
    #undef EXPORT_FUNCTION
    
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)

#endif // __linux__
