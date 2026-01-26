{
  "targets": [
    {
      "target_name": "steam-overlay",
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "conditions": [
        ['OS=="mac"', {
          "sources": [ "metal-overlay.mm" ],
          "xcode_settings": {
            "OTHER_CFLAGS": [
              "-ObjC++",
              "-std=c++17"
            ],
            "OTHER_LDFLAGS": [
              "-framework Cocoa",
              "-framework Metal",
              "-framework MetalKit",
              "-framework QuartzCore"
            ]
          }
        }],
        ['OS=="win"', {
          "sources": [ "windows-overlay.cpp" ],
          "libraries": [
            "-ld3d11",
            "-ldxgi"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "AdditionalOptions": [ "/std:c++17" ]
            }
          }
        }],
        ['OS=="linux"', {
          "sources": [ "linux-overlay.cpp" ],
          "libraries": [
            "-lX11",
            "-lGL",
            "-lGLX"
          ],
          "cflags_cc": [
            "-std=c++17"
          ]
        }]
      ]
    }
  ]
}
