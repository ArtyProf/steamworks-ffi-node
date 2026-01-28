// Cross-platform OpenGL Overlay for Steam Integration
// Supports both Windows and Linux with OpenGL

#if defined(_WIN32) || (defined(__linux__) && !defined(__ANDROID__))

#include <node_api.h>
#include <string>
#include <mutex>
#include <cstdio>

// Platform-specific includes
#ifdef _WIN32
    #include <windows.h>
    #include <GL/gl.h>
    #pragma comment(lib, "opengl32.lib")
    #pragma comment(lib, "gdi32.lib")
    #pragma comment(lib, "user32.lib")
#else
    #include <X11/Xlib.h>
    #include <X11/Xutil.h>
    #include <X11/Xatom.h>
    #include <GL/gl.h>
    #include <GL/glx.h>
#endif

// Global debug flag - controlled from JavaScript via SteamLogger
static bool g_debugMode = false;

// Debug logging macro - only logs when debug mode is enabled
#define OverlayLog(fmt, ...) do { if (g_debugMode) { printf("[OpenGL Overlay] " fmt "\n", ##__VA_ARGS__); } } while(0)
#define OverlayLogError(fmt, ...) do { printf("[OpenGL Overlay] ERROR: " fmt "\n", ##__VA_ARGS__); } while(0)

// OpenGL extensions for modern texture formats
#ifndef GL_BGRA
#define GL_BGRA 0x80E1
#endif

#ifndef GL_CLAMP_TO_EDGE
#define GL_CLAMP_TO_EDGE 0x812F
#endif

// OpenGL Overlay Window class
class GLOverlayWindow {
public:
#ifdef _WIN32
    HWND hwnd = nullptr;
    HDC hdc = nullptr;
    HGLRC hglrc = nullptr;
#else
    Display* display = nullptr;
    Window window = 0;
    GLXContext glContext = nullptr;
    Colormap colormap = 0;
#endif
    
    GLuint texture = 0;
    int texWidth = 0;
    int texHeight = 0;
    
    int width = 0;
    int height = 0;
    bool isDestroyed = false;
    std::mutex renderMutex;
    
#ifdef _WIN32
    static LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
        switch (msg) {
            case WM_NCHITTEST:
                // Return HTTRANSPARENT to make clicks pass through to window behind
                return HTTRANSPARENT;
            case WM_DESTROY:
                return 0;
            case WM_CLOSE:
                // Don't close - let the Electron app control the lifecycle
                return 0;
            default:
                return DefWindowProc(hwnd, msg, wParam, lParam);
        }
    }
#endif
    
    bool init(int w, int h, const char* title) {
        width = w;
        height = h;
        
#ifdef _WIN32
        // Windows OpenGL initialization
        // Note: Don't set DPI awareness - inherit from Electron process
        
        // Register window class
        WNDCLASSEX wc = {};
        wc.cbSize = sizeof(WNDCLASSEX);
        wc.style = CS_HREDRAW | CS_VREDRAW | CS_OWNDC;
        wc.lpfnWndProc = WndProc;
        wc.hInstance = GetModuleHandle(nullptr);
        wc.hCursor = LoadCursor(nullptr, IDC_ARROW);
        wc.lpszClassName = "SteamOverlayWindowGL";
        
        static bool classRegistered = false;
        if (!classRegistered) {
            RegisterClassEx(&wc);
            classRegistered = true;
        }
        
        // Create borderless window
        // Note: Don't use WS_EX_LAYERED - it's incompatible with OpenGL rendering
        hwnd = CreateWindowEx(
            WS_EX_TOPMOST | WS_EX_NOACTIVATE,
            "SteamOverlayWindowGL",
            title,
            WS_POPUP,
            100, 100, w, h,
            nullptr, nullptr,
            GetModuleHandle(nullptr),
            nullptr
        );
        
        if (!hwnd) {
            OverlayLogError("Failed to create window");
            return false;
        }
        
        // Get device context
        hdc = GetDC(hwnd);
        if (!hdc) {
            OverlayLogError("Failed to get device context");
            return false;
        }
        
        // Set pixel format for OpenGL
        PIXELFORMATDESCRIPTOR pfd = {};
        pfd.nSize = sizeof(PIXELFORMATDESCRIPTOR);
        pfd.nVersion = 1;
        pfd.dwFlags = PFD_DRAW_TO_WINDOW | PFD_SUPPORT_OPENGL | PFD_DOUBLEBUFFER;
        pfd.iPixelType = PFD_TYPE_RGBA;
        pfd.cColorBits = 32;
        pfd.cAlphaBits = 8;
        pfd.cDepthBits = 24;
        pfd.iLayerType = PFD_MAIN_PLANE;
        
        int pixelFormat = ChoosePixelFormat(hdc, &pfd);
        if (!pixelFormat) {
            OverlayLogError("Failed to choose pixel format");
            return false;
        }
        
        if (!SetPixelFormat(hdc, pixelFormat, &pfd)) {
            OverlayLogError("Failed to set pixel format");
            return false;
        }
        
        // Create OpenGL context
        hglrc = wglCreateContext(hdc);
        if (!hglrc) {
            OverlayLogError("Failed to create OpenGL context");
            return false;
        }
        
        if (!wglMakeCurrent(hdc, hglrc)) {
            OverlayLogError("Failed to make OpenGL context current");
            return false;
        }
        
#else
        // Linux OpenGL initialization
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
#endif
        
        // Initialize OpenGL (common for both platforms)
        initGL();
        
        OverlayLog("OpenGL overlay window created: %dx%d", w, h);
        OverlayLog("OpenGL Version: %s", glGetString(GL_VERSION));
        OverlayLog("OpenGL Renderer: %s", glGetString(GL_RENDERER));
        
        return true;
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
        if (isDestroyed) return;
        
#ifdef _WIN32
        if (hwnd) {
            OverlayLog("Showing overlay window");
            ShowWindow(hwnd, SW_SHOWNOACTIVATE);
            SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, 
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW);
            UpdateWindow(hwnd);
        }
#else
        if (display && window) {
            XMapWindow(display, window);
            XRaiseWindow(display, window);
            XFlush(display);
        }
#endif
    }
    
    void hide() {
        if (isDestroyed) return;
        
#ifdef _WIN32
        if (hwnd) {
            ShowWindow(hwnd, SW_HIDE);
        }
#else
        if (display && window) {
            XUnmapWindow(display, window);
            XFlush(display);
        }
#endif
    }
    
    void setFrame(int x, int y, int w, int h) {
        if (isDestroyed) return;
        
#ifdef _WIN32
        if (hwnd) {
            // Get DPI scale factor for proper coordinate conversion
            // Electron gives logical coordinates, we need physical coordinates
            HDC screen = GetDC(nullptr);
            int dpiX = GetDeviceCaps(screen, LOGPIXELSX);
            ReleaseDC(nullptr, screen);
            float scale = dpiX / 96.0f;
            
            // Scale coordinates from logical (Electron) to physical (screen)
            int physX = (int)(x * scale);
            int physY = (int)(y * scale);
            int physW = (int)(w * scale);
            int physH = (int)(h * scale);
            
            OverlayLog("Setting window frame: logical x=%d, y=%d, w=%d, h=%d -> physical x=%d, y=%d, w=%d, h=%d (scale=%.2f)", 
                x, y, w, h, physX, physY, physW, physH, scale);
            
            width = physW;
            height = physH;
            
            SetWindowPos(hwnd, HWND_TOPMOST, physX, physY, physW, physH, 
                SWP_NOACTIVATE | SWP_SHOWWINDOW);
            
            // Update OpenGL viewport
            if (hglrc && hdc) {
                wglMakeCurrent(hdc, hglrc);
                glViewport(0, 0, physW, physH);
                
                glMatrixMode(GL_PROJECTION);
                glLoadIdentity();
                glOrtho(0, physW, physH, 0, -1, 1);
                
                glMatrixMode(GL_MODELVIEW);
                glLoadIdentity();
            }
        }
#else
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
#endif
    }
    
    void renderFrame(const uint8_t* data, int w, int h) {
        if (isDestroyed) return;
        
        std::lock_guard<std::mutex> lock(renderMutex);
        
#ifdef _WIN32
        if (!hglrc || !hdc) return;
        if (!wglMakeCurrent(hdc, hglrc)) return;
#else
        if (!display || !glContext) return;
        if (!glXMakeCurrent(display, window, glContext)) return;
#endif
        
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
#ifdef _WIN32
        SwapBuffers(hdc);
#else
        glXSwapBuffers(display, window);
        
        // Process any pending X events
        while (XPending(display)) {
            XEvent event;
            XNextEvent(display, &event);
        }
#endif
    }
    
    void destroy() {
        if (isDestroyed) return;
        isDestroyed = true;
        
        OverlayLog("Destroying OpenGL overlay...");
        
        // Delete texture
        if (texture) {
            glDeleteTextures(1, &texture);
            texture = 0;
        }
        
#ifdef _WIN32
        if (hglrc) {
            wglMakeCurrent(nullptr, nullptr);
            wglDeleteContext(hglrc);
            hglrc = nullptr;
        }
        
        if (hdc) {
            ReleaseDC(hwnd, hdc);
            hdc = nullptr;
        }
        
        if (hwnd) {
            DestroyWindow(hwnd);
            hwnd = nullptr;
        }
#else
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
#endif
        
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
    status = napi_create_external(env, window, nullptr, nullptr, &external);
    
    return external;
}

static napi_value ShowOverlayWindow(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    GLOverlayWindow* window;
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
    
    GLOverlayWindow* window;
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
    
    GLOverlayWindow* window;
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
    
    GLOverlayWindow* window;
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
    
    GLOverlayWindow* window;
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

// Module initialization
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

#endif // _WIN32 || __linux__
