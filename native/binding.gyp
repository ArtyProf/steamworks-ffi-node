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
          "sources": [ "opengl-overlay.cpp" ],
          "libraries": [
            "-lopengl32",
            "-lgdi32",
            "-luser32"
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
            "-lXext",
            "-lXfixes",
            "-lGL"
          ],
          "cflags_cc": [
            "-std=c++17",
            "-fPIC"
          ]
        }]
      ]
    }
  ]
}
