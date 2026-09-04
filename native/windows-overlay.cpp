// Windows OpenGL Overlay for Steam Integration

#ifdef _WIN32

#include <node_api.h>
#include <string>
#include <mutex>
#include <cstdio>

#include <windows.h>
#include <GL/gl.h>
#include <dwmapi.h>
#include <d3d11.h>
#include <dxgi1_2.h>
#include <dcomp.h>
#pragma comment(lib, "opengl32.lib")
#pragma comment(lib, "dwmapi.lib")
#pragma comment(lib, "d3d11.lib")
#pragma comment(lib, "dxgi.lib")
#pragma comment(lib, "dcomp.lib")
#pragma comment(lib, "gdi32.lib")
#pragma comment(lib, "user32.lib")

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

// WGL_ARB_pixel_format constants (not in the SDK GL/gl.h).
#define WGL_DRAW_TO_WINDOW_ARB     0x2001
#define WGL_ACCELERATION_ARB       0x2003
#define WGL_SUPPORT_OPENGL_ARB     0x2010
#define WGL_DOUBLE_BUFFER_ARB      0x2011
#define WGL_PIXEL_TYPE_ARB         0x2013
#define WGL_COLOR_BITS_ARB         0x2014
#define WGL_ALPHA_BITS_ARB         0x201B
#define WGL_DEPTH_BITS_ARB         0x2022
#define WGL_FULL_ACCELERATION_ARB  0x2027
#define WGL_TYPE_RGBA_ARB          0x202B

// SetWindowCompositionAttribute: undocumented, but it is the route most apps
// actually use for per-pixel alpha, and it takes a different DWM path from
// DwmEnableBlurBehindWindow -- which measured opaque on a machine where
// Chromium transparent windows composite fine.
enum ACCENT_STATE {
    ACCENT_DISABLED = 0,
    ACCENT_ENABLE_GRADIENT = 1,
    ACCENT_ENABLE_TRANSPARENTGRADIENT = 2,
    ACCENT_ENABLE_BLURBEHIND = 3,
};
struct ACCENT_POLICY {
    ACCENT_STATE AccentState;
    DWORD AccentFlags;
    DWORD GradientColor;
    DWORD AnimationId;
};
enum WINDOWCOMPOSITIONATTRIB { WCA_ACCENT_POLICY = 19 };
struct WINDOWCOMPOSITIONATTRIBDATA {
    WINDOWCOMPOSITIONATTRIB Attrib;
    PVOID pvData;
    SIZE_T cbData;
};
typedef BOOL (WINAPI *PFNSETWINDOWCOMPOSITIONATTRIBUTE)(HWND, WINDOWCOMPOSITIONATTRIBDATA*);

static bool EnableAccentTransparency(HWND hwnd) {
    HMODULE user32 = GetModuleHandleA("user32.dll");
    if (!user32) return false;
    auto setAttr = (PFNSETWINDOWCOMPOSITIONATTRIBUTE)
        GetProcAddress(user32, "SetWindowCompositionAttribute");
    if (!setAttr) return false;
    ACCENT_POLICY policy = {};
    policy.AccentState = ACCENT_ENABLE_TRANSPARENTGRADIENT;
    policy.AccentFlags = 2;
    policy.GradientColor = 0x00000000;  // fully transparent
    WINDOWCOMPOSITIONATTRIBDATA data = { WCA_ACCENT_POLICY, &policy, sizeof(policy) };
    return setAttr(hwnd, &data) != FALSE;
}

typedef BOOL (WINAPI *PFNWGLCHOOSEPIXELFORMATARBPROC)(
    HDC, const int*, const FLOAT*, UINT, int*, UINT*);

// Picks a hardware-accelerated RGBA format with a real alpha channel, which is
// what DWM needs before it will composite this window per-pixel. Returns 0 if
// the ARB extension is unavailable, so the caller can fall back.
static int ChooseAlphaPixelFormat(HDC targetDC) {
    // A pixel format can only be set once per window, so the lookup needs its
    // own throwaway window and context.
    WNDCLASSEX dummyClass = {};
    dummyClass.cbSize = sizeof(WNDCLASSEX);
    dummyClass.lpfnWndProc = DefWindowProc;
    dummyClass.hInstance = GetModuleHandle(nullptr);
    dummyClass.lpszClassName = "SteamOverlayGLProbe";
    static bool dummyRegistered = false;
    if (!dummyRegistered) { RegisterClassEx(&dummyClass); dummyRegistered = true; }

    HWND dummyWnd = CreateWindowEx(0, "SteamOverlayGLProbe", "", WS_POPUP,
                                   0, 0, 1, 1, nullptr, nullptr,
                                   GetModuleHandle(nullptr), nullptr);
    if (!dummyWnd) return 0;

    int chosen = 0;
    HDC dummyDC = GetDC(dummyWnd);
    if (dummyDC) {
        PIXELFORMATDESCRIPTOR basic = {};
        basic.nSize = sizeof(basic);
        basic.nVersion = 1;
        basic.dwFlags = PFD_DRAW_TO_WINDOW | PFD_SUPPORT_OPENGL | PFD_DOUBLEBUFFER;
        basic.iPixelType = PFD_TYPE_RGBA;
        basic.cColorBits = 32;
        basic.cAlphaBits = 8;
        int basicFormat = ChoosePixelFormat(dummyDC, &basic);
        if (basicFormat && SetPixelFormat(dummyDC, basicFormat, &basic)) {
            HGLRC dummyCtx = wglCreateContext(dummyDC);
            if (dummyCtx && wglMakeCurrent(dummyDC, dummyCtx)) {
                auto wglChoosePixelFormatARB =
                    (PFNWGLCHOOSEPIXELFORMATARBPROC)wglGetProcAddress("wglChoosePixelFormatARB");
                if (wglChoosePixelFormatARB) {
                    const int attribs[] = {
                        WGL_DRAW_TO_WINDOW_ARB, GL_TRUE,
                        WGL_SUPPORT_OPENGL_ARB, GL_TRUE,
                        WGL_DOUBLE_BUFFER_ARB,  GL_TRUE,
                        WGL_ACCELERATION_ARB,   WGL_FULL_ACCELERATION_ARB,
                        WGL_PIXEL_TYPE_ARB,     WGL_TYPE_RGBA_ARB,
                        WGL_COLOR_BITS_ARB,     32,
                        WGL_ALPHA_BITS_ARB,     8,
                        WGL_DEPTH_BITS_ARB,     24,
                        0
                    };
                    int formats[16];
                    UINT count = 0;
                    if (wglChoosePixelFormatARB(targetDC, attribs, nullptr, 16, formats, &count)
                        && count > 0) {
                        chosen = formats[0];
                    }
                }
                wglMakeCurrent(nullptr, nullptr);
            }
            if (dummyCtx) wglDeleteContext(dummyCtx);
        }
        ReleaseDC(dummyWnd, dummyDC);
    }
    DestroyWindow(dummyWnd);
    return chosen;
}

// OpenGL Overlay Window class
class GLOverlayWindow {
public:
    HWND hwnd = nullptr;
    HDC hdc = nullptr;
    HGLRC hglrc = nullptr;
    
    GLuint texture = 0;
    int texWidth = 0;
    int texHeight = 0;
    
    int width = 0;
    int height = 0;
    bool isDestroyed = false;

    // Transparent mode: the window presents an empty, fully-transparent frame
    // instead of a copy of the game. Steam still draws its overlay into it on
    // the hooked SwapBuffers, so the overlay and its notifications appear,
    // while the real game window shows through everywhere Steam did not draw.
    // That removes the need to mirror frames at all -- and with it the 30fps
    // ceiling that mirroring imposes on what the player sees.
    bool transparent = false;

    // Transparency is done with D3D11 + DirectComposition, not WGL.
    //
    // WGL cannot do it: measured on a GeForce/Quadro machine where Chromium
    // transparent windows composite correctly, a GL window stayed pure black
    // through DwmEnableBlurBehindWindow, PFD_SUPPORT_COMPOSITION,
    // wglChoosePixelFormatARB with a real alpha format,
    // DwmExtendFrameIntoClientArea, and SetWindowCompositionAttribute -- every
    // one of which reported success. NVIDIA's GL driver simply does not
    // cooperate with DWM per-pixel alpha. DirectComposition is what Chromium
    // uses, and Steam hooks DXGI at least as readily as it hooks OpenGL.
    //
    // Null unless transparency was requested AND the D3D path came up; the
    // WGL path below is kept as the fallback so a machine that cannot do this
    // still gets an overlay.
    ID3D11Device* d3dDevice = nullptr;
    ID3D11DeviceContext* d3dContext = nullptr;
    IDXGISwapChain1* dxgiSwapChain = nullptr;
    ID3D11RenderTargetView* d3dRenderTarget = nullptr;
    IDCompositionDevice* dcompDevice = nullptr;
    IDCompositionTarget* dcompTarget = nullptr;
    IDCompositionVisual* dcompVisual = nullptr;
    bool usingD3D11 = false;
    // Size the swapchain buffers were last allocated at. setFrame is called on
    // every geometry sync -- which for some callers is every frame -- and
    // ResizeBuffers there unconditionally tears down and reallocates the back
    // buffers, which reads on screen as heavy flicker.
    int swapWidth = 0;
    int swapHeight = 0;

    // The game window this overlay belongs to, when the caller supplies it.
    //
    // Passing it as CreateWindowEx s hWndParent makes this an OWNED window,
    // which is the correct z-order: always above its owner, hidden and
    // minimised with it, and -- crucially -- never above unrelated
    // applications. WS_EX_TOPMOST alone floats the overlay over every other
    // window on the desktop even while the game sits unfocused in the
    // background, so Steam s overlay would paint over whatever the player had
    // switched to.
    HWND ownerHwnd = nullptr;
    std::mutex renderMutex;
    
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
    
    bool init(int w, int h, const char* title, bool wantTransparent = false,
              HWND owner = nullptr) {
        transparent = wantTransparent;
        ownerHwnd = owner;
        width = w;
        height = h;
        
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
        // Only fall back to TOPMOST when there is no owner to sit above.
        hwnd = CreateWindowEx(
            (owner ? 0 : WS_EX_TOPMOST) | WS_EX_NOACTIVATE |
                (wantTransparent ? WS_EX_NOREDIRECTIONBITMAP : 0),
            "SteamOverlayWindowGL",
            title,
            WS_POPUP,
            100, 100, w, h,
            owner, nullptr,
            GetModuleHandle(nullptr),
            nullptr
        );
        
        if (!hwnd) {
            OverlayLogError("Failed to create window");
            return false;
        }

        // Per-pixel alpha. A blur-behind with an EMPTY region asks DWM to
        // composite this window using its alpha channel without actually
        // blurring anything -- the standard way to get a transparent
        // hardware-accelerated GL window. Layered windows (WS_EX_LAYERED +
        // UpdateLayeredWindow) cannot do this with an OpenGL context.
        if (transparent && initD3D11()) {
            // D3D11 + DComp is up; the WGL context below is not needed.
            OverlayLog("OpenGL overlay window created: %dx%d (D3D11 transparent)", width, height);
            return true;
        }
        if (transparent) {
            OverlayLogError("D3D11 transparency unavailable; falling back to WGL "
                            "(the overlay will work but will not be transparent)");
        }
        if (transparent) {
            DWM_BLURBEHIND bb = {};
            bb.dwFlags = DWM_BB_ENABLE | DWM_BB_BLURREGION;
            bb.fEnable = TRUE;
            bb.hRgnBlur = CreateRectRgn(0, 0, -1, -1);
            HRESULT hr = DwmEnableBlurBehindWindow(hwnd, &bb);

            // Belt and braces: extending the frame into the whole client area
            // ("sheet of glass") is the other documented route to per-pixel
            // alpha, and some drivers honour it where blur-behind alone is
            // ignored. Harmless alongside it.
            MARGINS margins = { -1, -1, -1, -1 };
            DwmExtendFrameIntoClientArea(hwnd, &margins);

            OverlayLog("Transparent mode: accent transparency %s",
                       EnableAccentTransparency(hwnd) ? "applied" : "UNAVAILABLE");
            if (bb.hRgnBlur) DeleteObject(bb.hRgnBlur);
            if (FAILED(hr)) {
                OverlayLogError("DwmEnableBlurBehindWindow failed (0x%08lX); "
                                "the overlay will be opaque", (unsigned long)hr);
            } else {
                OverlayLog("Transparent mode: DWM alpha compositing enabled");
            }
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
        if (transparent) {
            // Required for DWM to composite this window per-pixel. Without it
            // the alpha channel is ignored and the window renders opaque.
            pfd.dwFlags |= PFD_SUPPORT_COMPOSITION;
        }
        pfd.iPixelType = PFD_TYPE_RGBA;
        pfd.cColorBits = 32;
        pfd.cAlphaBits = 8;
        pfd.cDepthBits = 24;
        pfd.iLayerType = PFD_MAIN_PLANE;
        
        int pixelFormat = 0;
        if (transparent) {
            pixelFormat = ChooseAlphaPixelFormat(hdc);
            if (pixelFormat) {
                OverlayLog("Transparent mode: ARB alpha pixel format %d", pixelFormat);
            } else {
                OverlayLogError("wglChoosePixelFormatARB unavailable; "
                                "falling back to a format DWM will render opaque");
            }
        }
        if (!pixelFormat) pixelFormat = ChoosePixelFormat(hdc, &pfd);
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
        
        // Initialize OpenGL
        initGL();
        
        OverlayLog("OpenGL overlay window created: %dx%d", w, h);
        OverlayLog("OpenGL Version: %s", glGetString(GL_VERSION));
        OverlayLog("OpenGL Renderer: %s", glGetString(GL_RENDERER));
        
        return true;
    }
    
    // Builds the D3D11 device, a composition swapchain and the DComp visual
    // tree that presents it. Returns false on any failure so init() can fall
    // back to WGL rather than leaving the player with no overlay.
    bool initD3D11() {
        D3D_FEATURE_LEVEL levels[] = {
            D3D_FEATURE_LEVEL_11_1, D3D_FEATURE_LEVEL_11_0,
            D3D_FEATURE_LEVEL_10_1, D3D_FEATURE_LEVEL_10_0,
            D3D_FEATURE_LEVEL_9_3,  D3D_FEATURE_LEVEL_9_2,
            D3D_FEATURE_LEVEL_9_1,
        };
        // BGRA_SUPPORT is REQUIRED for DirectComposition interop.
        UINT flags = D3D11_CREATE_DEVICE_BGRA_SUPPORT;
        D3D_FEATURE_LEVEL got;
        HRESULT hr = D3D11CreateDevice(nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr,
                                       flags, levels, ARRAYSIZE(levels),
                                       D3D11_SDK_VERSION, &d3dDevice, &got, &d3dContext);
        if (FAILED(hr)) {
            // WARP ships with Windows, so this is the "no usable GPU driver"
            // path rather than a dead end.
            OverlayLog("D3D11 hardware device failed (0x%08lX); trying WARP", (unsigned long)hr);
            hr = D3D11CreateDevice(nullptr, D3D_DRIVER_TYPE_WARP, nullptr,
                                   flags, levels, ARRAYSIZE(levels),
                                   D3D11_SDK_VERSION, &d3dDevice, &got, &d3dContext);
        }
        if (FAILED(hr)) { OverlayLogError("D3D11CreateDevice failed (0x%08lX)", (unsigned long)hr); return false; }

        IDXGIDevice* dxgiDevice = nullptr;
        if (FAILED(d3dDevice->QueryInterface(__uuidof(IDXGIDevice), (void**)&dxgiDevice))) return false;

        IDXGIAdapter* adapter = nullptr;
        IDXGIFactory2* factory = nullptr;
        bool ok = false;
        if (SUCCEEDED(dxgiDevice->GetAdapter(&adapter)) &&
            SUCCEEDED(adapter->GetParent(__uuidof(IDXGIFactory2), (void**)&factory))) {
            DXGI_SWAP_CHAIN_DESC1 desc = {};
            desc.Width = width;
            desc.Height = height;
            desc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
            desc.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT;
            desc.BufferCount = 2;
            desc.SwapEffect = DXGI_SWAP_EFFECT_FLIP_SEQUENTIAL;
            // The whole point: premultiplied alpha is what lets DWM show what
            // is behind wherever Steam has not drawn.
            desc.AlphaMode = DXGI_ALPHA_MODE_PREMULTIPLIED;
            desc.SampleDesc.Count = 1;
            hr = factory->CreateSwapChainForComposition(d3dDevice, &desc, nullptr, &dxgiSwapChain);
            if (FAILED(hr)) OverlayLogError("CreateSwapChainForComposition failed (0x%08lX)", (unsigned long)hr);
            else ok = true;
        }
        if (factory) factory->Release();
        if (adapter) adapter->Release();

        if (ok) {
            hr = DCompositionCreateDevice(dxgiDevice, __uuidof(IDCompositionDevice), (void**)&dcompDevice);
            if (SUCCEEDED(hr) &&
                SUCCEEDED(dcompDevice->CreateTargetForHwnd(hwnd, TRUE, &dcompTarget)) &&
                SUCCEEDED(dcompDevice->CreateVisual(&dcompVisual)) &&
                SUCCEEDED(dcompVisual->SetContent(dxgiSwapChain)) &&
                SUCCEEDED(dcompTarget->SetRoot(dcompVisual)) &&
                SUCCEEDED(dcompDevice->Commit())) {
                OverlayLog("Transparent mode: D3D11 + DirectComposition ready (feature level 0x%04X)", got);
            } else {
                OverlayLogError("DirectComposition setup failed (0x%08lX)", (unsigned long)hr);
                ok = false;
            }
        }
        dxgiDevice->Release();
        if (ok) ok = createD3DRenderTarget();
        if (ok) { swapWidth = width; swapHeight = height; }
        usingD3D11 = ok;
        return ok;
    }

    bool createD3DRenderTarget() {
        if (d3dRenderTarget) { d3dRenderTarget->Release(); d3dRenderTarget = nullptr; }
        ID3D11Texture2D* backBuffer = nullptr;
        if (FAILED(dxgiSwapChain->GetBuffer(0, __uuidof(ID3D11Texture2D), (void**)&backBuffer))) return false;
        HRESULT hr = d3dDevice->CreateRenderTargetView(backBuffer, nullptr, &d3dRenderTarget);
        backBuffer->Release();
        return SUCCEEDED(hr);
    }

    // Clears to fully transparent and presents. Steam hooks Present, so its
    // overlay is drawn between the clear and the flip -- everything it does
    // not touch stays transparent and the real window shows through.
    void presentD3D11() {
        if (!usingD3D11 || !d3dContext || !dxgiSwapChain || !d3dRenderTarget) return;
        const float clear[4] = { 0.0f, 0.0f, 0.0f, 0.0f };
        d3dContext->OMSetRenderTargets(1, &d3dRenderTarget, nullptr);
        d3dContext->ClearRenderTargetView(d3dRenderTarget, clear);
        dxgiSwapChain->Present(1, 0);
    }

    void resizeD3D11(int w, int h) {
        if (!usingD3D11 || !dxgiSwapChain || w <= 0 || h <= 0) return;
        if (w == swapWidth && h == swapHeight) return;  // nothing changed
        if (d3dRenderTarget) { d3dRenderTarget->Release(); d3dRenderTarget = nullptr; }
        if (d3dContext) d3dContext->OMSetRenderTargets(0, nullptr, nullptr);
        HRESULT hr = dxgiSwapChain->ResizeBuffers(0, w, h, DXGI_FORMAT_UNKNOWN, 0);
        if (FAILED(hr)) { OverlayLogError("ResizeBuffers failed (0x%08lX)", (unsigned long)hr); return; }
        swapWidth = w;
        swapHeight = h;
        createD3DRenderTarget();
        OverlayLog("Resized composition swapchain to %dx%d", w, h);
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
        
        if (hwnd) {
            OverlayLog("Showing overlay window");
            ShowWindow(hwnd, SW_SHOWNOACTIVATE);
            SetWindowPos(hwnd, ownerHwnd ? HWND_TOP : HWND_TOPMOST, 0, 0, 0, 0, 
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW);
            UpdateWindow(hwnd);
        }
    }
    
    void hide() {
        if (isDestroyed) return;
        
        if (hwnd) {
            ShowWindow(hwnd, SW_HIDE);
        }
    }
    
    void setFrame(int x, int y, int w, int h) {
        if (isDestroyed) return;
        
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
            
            SetWindowPos(hwnd, ownerHwnd ? HWND_TOP : HWND_TOPMOST, physX, physY, physW, physH, 
                SWP_NOACTIVATE | SWP_SHOWWINDOW);
            
            // The composition swapchain has its own buffers to resize.
            if (usingD3D11) resizeD3D11(physW, physH);
            
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
    }
    
    void renderFrame(const uint8_t* data, int w, int h) {
        if (isDestroyed) return;
        
        std::lock_guard<std::mutex> lock(renderMutex);
        
        // Transparent mode ignores the pixels entirely: a caller that keeps
        // sending frames costs nothing but still drives the present.
        if (transparent) { presentEmpty(); return; }
        
        if (!hglrc || !hdc) return;
        if (!wglMakeCurrent(hdc, hglrc)) return;
        
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
        SwapBuffers(hdc);
    }
    
    // Presents an empty transparent frame. Steam hooks SwapBuffers, so this
    // is what gives it the chance to draw the overlay and its notifications.
    // No texture, no upload, and nothing for the caller to capture.
    //
    // Caller must hold renderMutex -- this touches the GL context.
    void presentEmpty() {
        if (isDestroyed) return;
        if (usingD3D11) { presentD3D11(); return; }
        if (!hdc || !hglrc) return;
        wglMakeCurrent(hdc, hglrc);
        glClearColor(0.0f, 0.0f, 0.0f, 0.0f);
        glClear(GL_COLOR_BUFFER_BIT);
        SwapBuffers(hdc);
    }

    // Locked wrapper around presentEmpty for callers outside the class.
    // True only when transparency was requested AND actually achieved -- i.e.
    // the D3D11 + DirectComposition path came up. False on the WGL fallback,
    // where the window is opaque.
    bool isTransparent() const { return transparent && usingD3D11; }

    void present() {
        if (isDestroyed) return;
        std::lock_guard<std::mutex> lock(renderMutex);
        presentEmpty();
    }

    void destroy() {
        if (isDestroyed) return;
        isDestroyed = true;

        // Reverse order of creation. Safe when the D3D path was never taken:
        // every one of these is null then.
        if (dcompTarget) { dcompTarget->SetRoot(nullptr); dcompTarget->Release(); dcompTarget = nullptr; }
        if (dcompVisual) { dcompVisual->Release(); dcompVisual = nullptr; }
        if (dcompDevice) { dcompDevice->Commit(); dcompDevice->Release(); dcompDevice = nullptr; }
        if (d3dRenderTarget) { d3dRenderTarget->Release(); d3dRenderTarget = nullptr; }
        if (dxgiSwapChain) { dxgiSwapChain->Release(); dxgiSwapChain = nullptr; }
        if (d3dContext) { d3dContext->ClearState(); d3dContext->Release(); d3dContext = nullptr; }
        if (d3dDevice) { d3dDevice->Release(); d3dDevice = nullptr; }
        usingD3D11 = false;
        
        OverlayLog("Destroying OpenGL overlay...");
        
        // Delete texture
        if (texture) {
            glDeleteTextures(1, &texture);
            texture = 0;
        }
        
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
    napi_value widthVal, heightVal, titleVal, transparentVal;
    napi_get_named_property(env, args[0], "width", &widthVal);
    napi_get_named_property(env, args[0], "height", &heightVal);
    napi_get_named_property(env, args[0], "title", &titleVal);
    napi_get_named_property(env, args[0], "transparent", &transparentVal);
    napi_value ownerVal;
    napi_get_named_property(env, args[0], "ownerHwnd", &ownerVal);

    // Opt-in, so existing callers are unaffected.
    bool transparent = false;
    napi_valuetype transparentType;
    if (napi_typeof(env, transparentVal, &transparentType) == napi_ok &&
        transparentType == napi_boolean) {
        napi_get_value_bool(env, transparentVal, &transparent);
    }
    
    int width, height;
    napi_get_value_int32(env, widthVal, &width);
    napi_get_value_int32(env, heightVal, &height);
    
    char title[256] = "Steam Overlay";
    size_t titleLen;
    napi_get_value_string_utf8(env, titleVal, title, sizeof(title), &titleLen);
    
    // Create window
    GLOverlayWindow* window = new GLOverlayWindow();
    // browserWindow.getNativeWindowHandle() read as a 64-bit integer.
    HWND owner = nullptr;
    napi_valuetype ownerType;
    if (napi_typeof(env, ownerVal, &ownerType) == napi_ok && ownerType == napi_bigint) {
        int64_t raw = 0; bool lossless = false;
        if (napi_get_value_bigint_int64(env, ownerVal, &raw, &lossless) == napi_ok && raw != 0) {
            owner = (HWND)(intptr_t)raw;
        }
    } else if (ownerType == napi_number) {
        double raw = 0;
        if (napi_get_value_double(env, ownerVal, &raw) == napi_ok && raw != 0) {
            owner = (HWND)(intptr_t)(int64_t)raw;
        }
    }

    if (!window->init(width, height, title, transparent, owner)) {
        delete window;
        napi_throw_error(env, nullptr, "Failed to create overlay window");
        return nullptr;
    }
    
    // Wrap pointer
    napi_value external;
    status = napi_create_external(env, window, nullptr, nullptr, &external);
    
    return external;
}

static napi_value IsOverlayTransparent(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    GLOverlayWindow* window = nullptr;
    napi_value result;
    bool transparent = false;
    if (argc >= 1 &&
        napi_get_value_external(env, args[0], (void**)&window) == napi_ok && window) {
        transparent = window->isTransparent();
    }
    napi_get_boolean(env, transparent, &result);
    return result;
}

static napi_value PresentFrame(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    GLOverlayWindow* window;
    if (napi_get_value_external(env, args[0], (void**)&window) != napi_ok || !window) {
        return nullptr;
    }
    window->present();
    return nullptr;
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
        { "createOverlayWindow", nullptr, CreateOverlayWindow, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "showOverlayWindow", nullptr, ShowOverlayWindow, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "hideOverlayWindow", nullptr, HideOverlayWindow, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "setOverlayFrame", nullptr, SetOverlayWindowFrame, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "renderFrame", nullptr, RenderFrame, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "presentFrame", nullptr, PresentFrame, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "isOverlayTransparent", nullptr, IsOverlayTransparent, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "destroyOverlayWindow", nullptr, DestroyOverlayWindow, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "setDebugMode", nullptr, SetDebugMode, nullptr, nullptr, nullptr, napi_default, nullptr }
    };
    
    napi_define_properties(env, exports, sizeof(desc) / sizeof(desc[0]), desc);
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)

#endif // _WIN32
