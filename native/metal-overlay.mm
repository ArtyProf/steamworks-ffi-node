#import <Cocoa/Cocoa.h>
#import <Metal/Metal.h>
#import <MetalKit/MetalKit.h>
#import <node_api.h>

// Global debug flag - controlled from JavaScript via SteamLogger
static BOOL g_debugMode = NO;

// Debug logging macro - only logs when debug mode is enabled
#define MetalLog(...) do { if (g_debugMode) NSLog(__VA_ARGS__); } while(0)
// Error logging - always shows
#define MetalLogError(...) NSLog(__VA_ARGS__)

// Custom NSWindow that never becomes key or main - allows Electron to stay focused
@interface MetalOverlayWindow : NSWindow
@end

@implementation MetalOverlayWindow
- (BOOL)canBecomeKeyWindow { return NO; }
- (BOOL)canBecomeMainWindow { return NO; }
@end

// Metal Window wrapper for Steam overlay integration
@interface MetalWindowWrapper : NSObject <MTKViewDelegate>
@property (strong, nonatomic) NSWindow *window;
@property (strong, nonatomic) MTKView *metalView;
@property (strong, nonatomic) id<MTLDevice> device;
@property (strong, nonatomic) id<MTLCommandQueue> commandQueue;
@property (strong, nonatomic) id<MTLTexture> texture;
@property (strong, nonatomic) id<MTLRenderPipelineState> pipelineState;
@property (strong, nonatomic) id<MTLBuffer> vertexBuffer;
@property (strong, nonatomic) id<MTLSamplerState> samplerState;
@property (assign, nonatomic) int width;
@property (assign, nonatomic) int height;
@property (assign, nonatomic) BOOL isDestroyed;
@property (strong, nonatomic) NSWindow *electronWindow;  // Reference to Electron window for input forwarding
@end

@implementation MetalWindowWrapper

- (instancetype)initWithWidth:(int)w height:(int)h title:(NSString *)title {
    self = [super init];
    if (self) {
        _width = w;
        _height = h;
        
        // Initialize Metal device
        _device = MTLCreateSystemDefaultDevice();
        if (!_device) {
            MetalLogError(@"[Metal Overlay] Metal is not supported on this device");
            return nil;
        }
        
        _commandQueue = [_device newCommandQueue];
        
        // Create BORDERLESS window - no title bar, no chrome
        // The Electron window behind provides the title bar and controls
        // Metal window only displays content overlay for Steam
        NSRect windowRect = NSMakeRect(100, 100, w, h);
        _window = [[MetalOverlayWindow alloc] initWithContentRect:windowRect
                                              styleMask:NSWindowStyleMaskBorderless
                                                backing:NSBackingStoreBuffered
                                                  defer:NO];
        
        // Make window transparent so only rendered content shows
        [_window setOpaque:NO];
        [_window setHasShadow:NO];
        
        // Initialize state flags
        _isDestroyed = NO;
        
        // Create Metal view with FULLY TRANSPARENT background
        // This prevents any color from showing - only rendered content visible
        _metalView = [[MTKView alloc] initWithFrame:windowRect device:_device];
        _metalView.clearColor = MTLClearColorMake(0.0, 0.0, 0.0, 0.0);  // Transparent
        _metalView.layer.opaque = NO;
        
        // Configure Metal layer for transparency
        CAMetalLayer *metalLayer = (CAMetalLayer *)_metalView.layer;
        metalLayer.opaque = NO;
        metalLayer.pixelFormat = MTLPixelFormatBGRA8Unorm;  // Format with alpha
        
        _metalView.delegate = self;
        
        // Enable continuous rendering - CRITICAL for Steam overlay
        _metalView.enableSetNeedsDisplay = NO;
        _metalView.paused = NO;
        _metalView.preferredFramesPerSecond = 60;
        
        [_window setContentView:_metalView];
        
        // Position slightly above normal windows but below modal windows
        // This allows the Electron window to appear "active" while Metal is on top
        [_window setLevel:NSNormalWindowLevel + 1];
        
        // CRITICAL: Ignore mouse events so clicks pass through to Electron window behind
        // Steam overlay captures keyboard (Shift+Tab) globally, so it still works
        [_window setIgnoresMouseEvents:YES];
        
        // Note: canBecomeKeyWindow and canBecomeMainWindow are handled by MetalOverlayWindow subclass
        
        // Allow window to join all spaces
        [_window setCollectionBehavior:NSWindowCollectionBehaviorCanJoinAllSpaces | NSWindowCollectionBehaviorFullScreenAuxiliary];
        
        // Set window delegate for close handling
        [_window setReleasedWhenClosed:NO];
        
        // Make window transparent - content comes from rendered frames
        [_window setBackgroundColor:[NSColor clearColor]];
        
        MetalLog(@"[Metal Overlay] Metal window created (borderless, transparent): %dx%d", w, h);
        
        // Set up rendering pipeline
        [self setupRenderPipeline];
    }
    return self;
}

- (void)setupRenderPipeline {
    // Create vertex buffer for fullscreen quad
    float vertices[] = {
        // Position     TexCoord
        -1.0,  1.0,    0.0, 0.0,  // Top left
         1.0,  1.0,    1.0, 0.0,  // Top right
        -1.0, -1.0,    0.0, 1.0,  // Bottom left
         1.0, -1.0,    1.0, 1.0,  // Bottom right
    };
    
    _vertexBuffer = [_device newBufferWithBytes:vertices
                                         length:sizeof(vertices)
                                        options:MTLResourceStorageModeShared];
    
    // Create sampler state
    MTLSamplerDescriptor *samplerDescriptor = [MTLSamplerDescriptor new];
    samplerDescriptor.minFilter = MTLSamplerMinMagFilterLinear;
    samplerDescriptor.magFilter = MTLSamplerMinMagFilterLinear;
    samplerDescriptor.sAddressMode = MTLSamplerAddressModeClampToEdge;
    samplerDescriptor.tAddressMode = MTLSamplerAddressModeClampToEdge;
    _samplerState = [_device newSamplerStateWithDescriptor:samplerDescriptor];
    
    // Create render pipeline with inline shader
    NSString *shaderSource = @R"(
        #include <metal_stdlib>
        using namespace metal;
        
        struct VertexIn {
            float2 position;
            float2 texCoord;
        };
        
        struct VertexOut {
            float4 position [[position]];
            float2 texCoord;
        };
        
        vertex VertexOut vertexShader(device VertexIn* vertices [[buffer(0)]],
                                       uint vid [[vertex_id]]) {
            VertexOut out;
            out.position = float4(vertices[vid].position, 0.0, 1.0);
            out.texCoord = vertices[vid].texCoord;
            return out;
        }
        
        fragment float4 fragmentShader(VertexOut in [[stage_in]],
                                       texture2d<float> texture [[texture(0)]],
                                       sampler textureSampler [[sampler(0)]]) {
            return texture.sample(textureSampler, in.texCoord);
        }
    )";
    
    NSError *error = nil;
    id<MTLLibrary> library = [_device newLibraryWithSource:shaderSource options:nil error:&error];
    if (!library) {
        MetalLogError(@"[Metal Overlay] Failed to create shader library: %@", error);
        return;
    }
    
    id<MTLFunction> vertexFunction = [library newFunctionWithName:@"vertexShader"];
    id<MTLFunction> fragmentFunction = [library newFunctionWithName:@"fragmentShader"];
    
    MTLRenderPipelineDescriptor *pipelineDescriptor = [MTLRenderPipelineDescriptor new];
    pipelineDescriptor.vertexFunction = vertexFunction;
    pipelineDescriptor.fragmentFunction = fragmentFunction;
    pipelineDescriptor.colorAttachments[0].pixelFormat = _metalView.colorPixelFormat;
    
    _pipelineState = [_device newRenderPipelineStateWithDescriptor:pipelineDescriptor error:&error];
    if (!_pipelineState) {
        MetalLogError(@"[Metal Overlay] Failed to create pipeline state: %@", error);
    }
}

- (void)show {
    [_window orderFront:nil];
    // Don't steal focus from Electron window - use orderFront instead of makeKeyAndOrderFront
}

- (void)hide {
    [_window orderOut:nil];
}

- (void)setPosition:(int)x y:(int)y {
    // Convert from Electron coordinates (top-left origin) to macOS (bottom-left origin)
    NSRect screenFrame = [[NSScreen mainScreen] frame];
    CGFloat macY = screenFrame.size.height - y - _height;
    NSPoint newOrigin = NSMakePoint(x, macY);
    [_window setFrameOrigin:newOrigin];
}

- (void)resize:(int)w height:(int)h {
    _width = w;
    _height = h;
    NSRect newFrame = NSMakeRect(_window.frame.origin.x, _window.frame.origin.y, w, h);
    [_window setFrame:newFrame display:YES animate:NO];
}

- (void)setFrame:(int)x y:(int)y width:(int)w height:(int)h {
    _width = w;
    _height = h;
    // Convert from Electron coordinates (top-left origin) to macOS (bottom-left origin)
    NSRect screenFrame = [[NSScreen mainScreen] frame];
    CGFloat macY = screenFrame.size.height - y - h;
    NSRect newFrame = NSMakeRect(x, macY, w, h);
    [_window setFrame:newFrame display:YES animate:NO];
}

- (void)renderFrame:(const void *)buffer width:(int)w height:(int)h {
    // Safety check - don't render if destroyed
    if (_isDestroyed || !_device || !_metalView) {
        return;
    }
    
    @autoreleasepool {
        static int frameCount = 0;
        frameCount++;
        
        // Create or recreate texture if size changed
        if (!_texture || _texture.width != w || _texture.height != h) {
            MTLTextureDescriptor *textureDescriptor = [MTLTextureDescriptor texture2DDescriptorWithPixelFormat:MTLPixelFormatBGRA8Unorm
                                                                                                          width:w
                                                                                                         height:h
                                                                                                      mipmapped:NO];
            textureDescriptor.usage = MTLTextureUsageShaderRead;
            _texture = [_device newTextureWithDescriptor:textureDescriptor];
            MetalLog(@"[Metal Overlay] Created texture: %dx%d", w, h);
        }
        
        // Upload pixel data to texture
        MTLRegion region = MTLRegionMake2D(0, 0, w, h);
        [_texture replaceRegion:region mipmapLevel:0 withBytes:buffer bytesPerRow:w * 4];
        
        if (frameCount == 1) {
            MetalLog(@"[Metal Overlay] First frame uploaded to texture!");
        }
        
        // Trigger redraw
        [_metalView setNeedsDisplay:YES];
    }
}

- (void)mtkView:(MTKView *)view drawableSizeWillChange:(CGSize)size {
    // Handle resize
}

- (void)drawInMTKView:(MTKView *)view {
    // Safety check - don't draw if destroyed
    if (_isDestroyed || !_commandQueue) {
        return;
    }
    
    @autoreleasepool {
        static int drawCount = 0;
        drawCount++;
        
        id<CAMetalDrawable> drawable = view.currentDrawable;
        MTLRenderPassDescriptor *renderPassDescriptor = view.currentRenderPassDescriptor;
        
        if (!drawable || !renderPassDescriptor) {
            return;
        }
        
        id<MTLCommandBuffer> commandBuffer = [_commandQueue commandBuffer];
        if (!commandBuffer) {
            return;
        }
        
        id<MTLRenderCommandEncoder> renderEncoder = [commandBuffer renderCommandEncoderWithDescriptor:renderPassDescriptor];
        if (!renderEncoder) {
            return;
        }
        
        // If we have a texture and pipeline, render it
        if (_texture && _pipelineState) {
            [renderEncoder setRenderPipelineState:_pipelineState];
            [renderEncoder setVertexBuffer:_vertexBuffer offset:0 atIndex:0];
            [renderEncoder setFragmentTexture:_texture atIndex:0];
            [renderEncoder setFragmentSamplerState:_samplerState atIndex:0];
            [renderEncoder drawPrimitives:MTLPrimitiveTypeTriangleStrip vertexStart:0 vertexCount:4];
            
            if (drawCount == 1) {
                MetalLog(@"[Metal Overlay] First draw call with texture!");
            }
        } else {
            if (drawCount == 1) {
                MetalLogError(@"[Metal Overlay] WARNING: No texture or pipeline state! texture=%p pipeline=%p", _texture, _pipelineState);
            }
        }
        
        [renderEncoder endEncoding];
        [commandBuffer presentDrawable:drawable];
        [commandBuffer commit];
    }
}

- (void)destroy {
    if (_isDestroyed) {
        MetalLog(@"[Metal Overlay] Already destroyed, skipping");
        return;
    }
    _isDestroyed = YES;
    
    MetalLog(@"[Metal Overlay] Destroying Metal window...");
    
    // Stop the Metal view first to prevent any more draw calls
    if (_metalView) {
        _metalView.paused = YES;
        _metalView.delegate = nil;
    }
    
    // Close the window
    if (_window) {
        [_window orderOut:nil];
        [_window close];
    }
    
    // Clear all references
    _window = nil;
    _metalView = nil;
    _texture = nil;
    _pipelineState = nil;
    _vertexBuffer = nil;
    _samplerState = nil;
    _commandQueue = nil;
    _device = nil;
    _electronWindow = nil;
    
    MetalLog(@"[Metal Overlay] Metal window destroyed");
}

@end

// N-API wrapper functions

static napi_value CreateMetalWindow(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value args[1];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    if (status != napi_ok || argc < 1) {
        napi_throw_error(env, nullptr, "Expected options object");
        return nullptr;
    }
    
    // Parse options
    napi_value widthVal, heightVal, titleVal;
    int width = 1280, height = 720;
    char title[256] = "Electron Steam App";
    
    napi_get_named_property(env, args[0], "width", &widthVal);
    napi_get_named_property(env, args[0], "height", &heightVal);
    napi_get_named_property(env, args[0], "title", &titleVal);
    
    napi_get_value_int32(env, widthVal, &width);
    napi_get_value_int32(env, heightVal, &height);
    
    size_t titleLen;
    napi_get_value_string_utf8(env, titleVal, title, sizeof(title), &titleLen);
    
    // Create Metal window
    MetalWindowWrapper *wrapper = [[MetalWindowWrapper alloc] initWithWidth:width
                                                                      height:height
                                                                       title:[NSString stringWithUTF8String:title]];
    
    if (!wrapper) {
        napi_throw_error(env, nullptr, "Failed to create Metal window");
        return nullptr;
    }
    
    // Wrap pointer in external with destructor callback for proper cleanup
    napi_value external;
    status = napi_create_external(env, (__bridge_retained void *)wrapper, 
        // Destructor callback - called when JS garbage collects the external
        [](napi_env env, void* data, void* hint) {
            if (data) {
                MetalWindowWrapper *w = (__bridge_transfer MetalWindowWrapper *)data;
                if (!w.isDestroyed) {
                    [w destroy];
                }
                // ARC will release the object now due to __bridge_transfer
            }
        }, 
        nullptr, &external);
    
    if (status != napi_ok) {
        napi_throw_error(env, nullptr, "Failed to create external");
        return nullptr;
    }
    
    return external;
}

static napi_value ShowMetalWindow(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value args[1];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    if (status != napi_ok || argc < 1) {
        napi_throw_error(env, nullptr, "Expected window handle");
        return nullptr;
    }
    
    void *data;
    status = napi_get_value_external(env, args[0], &data);
    
    if (status != napi_ok || !data) {
        napi_throw_error(env, nullptr, "Invalid window handle");
        return nullptr;
    }
    
    MetalWindowWrapper *wrapper = (__bridge MetalWindowWrapper *)data;
    [wrapper show];
    
    napi_value result;
    napi_get_undefined(env, &result);
    return result;
}

static napi_value HideMetalWindow(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value args[1];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    if (status != napi_ok || argc < 1) {
        napi_throw_error(env, nullptr, "Expected window handle");
        return nullptr;
    }
    
    void *data;
    status = napi_get_value_external(env, args[0], &data);
    
    if (status != napi_ok || !data) {
        napi_throw_error(env, nullptr, "Invalid window handle");
        return nullptr;
    }
    
    MetalWindowWrapper *wrapper = (__bridge MetalWindowWrapper *)data;
    [wrapper hide];
    
    napi_value result;
    napi_get_undefined(env, &result);
    return result;
}

static napi_value ResizeMetalWindow(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 3;
    napi_value args[3];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    if (status != napi_ok || argc < 3) {
        napi_throw_error(env, nullptr, "Expected window handle, width, height");
        return nullptr;
    }
    
    void *data;
    status = napi_get_value_external(env, args[0], &data);
    
    if (status != napi_ok || !data) {
        napi_throw_error(env, nullptr, "Invalid window handle");
        return nullptr;
    }
    
    int width, height;
    napi_get_value_int32(env, args[1], &width);
    napi_get_value_int32(env, args[2], &height);
    
    MetalWindowWrapper *wrapper = (__bridge MetalWindowWrapper *)data;
    [wrapper resize:width height:height];
    
    napi_value result;
    napi_get_undefined(env, &result);
    return result;
}

static napi_value SetMetalWindowFrame(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 5;
    napi_value args[5];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    if (status != napi_ok || argc < 5) {
        napi_throw_error(env, nullptr, "Expected window handle, x, y, width, height");
        return nullptr;
    }
    
    void *data;
    status = napi_get_value_external(env, args[0], &data);
    
    if (status != napi_ok || !data) {
        napi_throw_error(env, nullptr, "Invalid window handle");
        return nullptr;
    }
    
    int x, y, width, height;
    napi_get_value_int32(env, args[1], &x);
    napi_get_value_int32(env, args[2], &y);
    napi_get_value_int32(env, args[3], &width);
    napi_get_value_int32(env, args[4], &height);
    
    MetalWindowWrapper *wrapper = (__bridge MetalWindowWrapper *)data;
    [wrapper setFrame:x y:y width:width height:height];
    
    napi_value result;
    napi_get_undefined(env, &result);
    return result;
}

static napi_value RenderFrame(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 4;
    napi_value args[4];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    if (status != napi_ok || argc < 4) {
        napi_throw_error(env, nullptr, "Expected window handle, buffer, width, height");
        return nullptr;
    }
    
    void *data;
    status = napi_get_value_external(env, args[0], &data);
    
    if (status != napi_ok || !data) {
        napi_throw_error(env, nullptr, "Invalid window handle");
        return nullptr;
    }
    
    void *buffer;
    size_t bufferLength;
    napi_get_buffer_info(env, args[1], &buffer, &bufferLength);
    
    int width, height;
    napi_get_value_int32(env, args[2], &width);
    napi_get_value_int32(env, args[3], &height);
    
    MetalWindowWrapper *wrapper = (__bridge MetalWindowWrapper *)data;
    [wrapper renderFrame:buffer width:width height:height];
    
    napi_value result;
    napi_get_undefined(env, &result);
    return result;
}

static napi_value DestroyMetalWindow(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value args[1];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    if (status != napi_ok || argc < 1) {
        napi_throw_error(env, nullptr, "Expected window handle");
        return nullptr;
    }
    
    void *data;
    status = napi_get_value_external(env, args[0], &data);
    
    if (status != napi_ok || !data) {
        napi_throw_error(env, nullptr, "Invalid window handle");
        return nullptr;
    }
    
    MetalWindowWrapper *wrapper = (__bridge MetalWindowWrapper *)data;
    [wrapper destroy];
    
    napi_value result;
    napi_get_undefined(env, &result);
    return result;
}

// Set debug mode for logging
static napi_value SetDebugMode(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 1;
    napi_value args[1];
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    if (status != napi_ok || argc < 1) {
        napi_throw_error(env, nullptr, "Expected boolean argument");
        return nullptr;
    }
    
    bool enabled;
    status = napi_get_value_bool(env, args[0], &enabled);
    if (status != napi_ok) {
        napi_throw_error(env, nullptr, "Expected boolean argument");
        return nullptr;
    }
    
    g_debugMode = enabled ? YES : NO;
    
    napi_value result;
    napi_get_undefined(env, &result);
    return result;
}

// Module initialization
static napi_value Init(napi_env env, napi_value exports) {
    napi_status status;
    napi_value fn;
    
    // Register setDebugMode first
    status = napi_create_function(env, nullptr, 0, SetDebugMode, nullptr, &fn);
    if (status != napi_ok) return nullptr;
    status = napi_set_named_property(env, exports, "setDebugMode", fn);
    if (status != napi_ok) return nullptr;
    
    status = napi_create_function(env, nullptr, 0, CreateMetalWindow, nullptr, &fn);
    if (status != napi_ok) return nullptr;
    status = napi_set_named_property(env, exports, "createMetalWindow", fn);
    if (status != napi_ok) return nullptr;
    
    status = napi_create_function(env, nullptr, 0, ShowMetalWindow, nullptr, &fn);
    if (status != napi_ok) return nullptr;
    status = napi_set_named_property(env, exports, "showMetalWindow", fn);
    if (status != napi_ok) return nullptr;
    
    status = napi_create_function(env, nullptr, 0, HideMetalWindow, nullptr, &fn);
    if (status != napi_ok) return nullptr;
    status = napi_set_named_property(env, exports, "hideMetalWindow", fn);
    if (status != napi_ok) return nullptr;
    
    status = napi_create_function(env, nullptr, 0, ResizeMetalWindow, nullptr, &fn);
    if (status != napi_ok) return nullptr;
    status = napi_set_named_property(env, exports, "resizeMetalWindow", fn);
    if (status != napi_ok) return nullptr;
    
    status = napi_create_function(env, nullptr, 0, SetMetalWindowFrame, nullptr, &fn);
    if (status != napi_ok) return nullptr;
    status = napi_set_named_property(env, exports, "setMetalWindowFrame", fn);
    if (status != napi_ok) return nullptr;
    
    status = napi_create_function(env, nullptr, 0, RenderFrame, nullptr, &fn);
    if (status != napi_ok) return nullptr;
    status = napi_set_named_property(env, exports, "renderFrame", fn);
    if (status != napi_ok) return nullptr;
    
    status = napi_create_function(env, nullptr, 0, DestroyMetalWindow, nullptr, &fn);
    if (status != napi_ok) return nullptr;
    status = napi_set_named_property(env, exports, "destroyMetalWindow", fn);
    if (status != napi_ok) return nullptr;
    
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
