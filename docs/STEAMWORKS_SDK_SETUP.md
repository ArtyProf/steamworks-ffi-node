# Steamworks SDK Setup Guide

This guide explains how to properly set up the Steamworks SDK redistributables for use with steamworks-ffi-node, in compliance with Valve's licensing requirements.

## ⚠️ Important Legal Notice

**The Steamworks SDK redistributables cannot be bundled with this package due to Valve's licensing terms.** Users must download and install the Steamworks SDK separately from Valve's official source.

## Quick Setup

### 1. Download Steamworks SDK

1. Visit the [Steamworks Partner site](https://partner.steamgames.com/)
2. Log in with your Steam account (you need to be a registered Steamworks developer)
3. Download the latest Steamworks SDK
4. Extract the downloaded archive

> **Note**: This package was built and tested with Steamworks SDK v1.64. While newer versions should be compatible, v1.64 or later is recommended for optimal compatibility.

### 2. Install SDK Redistributables

Copy the `redistributable_bin` folder from the Steamworks SDK to your project:

```
your-project/
├── steamworks_sdk/
│   └── redistributable_bin/
│       ├── win64/
│       │   └── steam_api64.dll
│       ├── steam_api.dll
│       ├── osx/
│       │   └── libsteam_api.dylib
│       ├── linux64/
│       │   └── libsteam_api.so
│       ├── linux32/
│       │   └── libsteam_api.so
│       ├── linuxarm64/
│       │   └── libsteam_api.so
│       └── androidarm64/
│           └── libsteam_api.so
├── package.json
└── your-app-files...
```

### 3. Verify Installation

Run this command to verify the SDK is properly installed:

```bash
npm run verify-sdk
```

This will check your steamworks_sdk installation and provide detailed feedback about any missing files or configuration issues.

## Detailed Setup Instructions

### For Game Developers

1. **Get Steamworks Access**
   - Register as a Steamworks developer at [partner.steamgames.com](https://partner.steamgames.com/)
   - Complete the registration process and pay the one-time fee if required

2. **Download SDK**
   - Go to the "Downloads" section in Steamworks Partner
   - Download the latest Steamworks SDK (typically a .zip file)
   - Extract the archive to a temporary location

3. **Copy Redistributables**
   - Navigate to the extracted SDK folder
   - Find the `redistributable_bin` directory
   - Copy the entire `redistributable_bin` folder to your project's `steamworks_sdk/` directory

### For Open Source Projects / Contributors

If you're contributing to an open source project that uses steamworks-ffi-node:

1. **SDK Access Required**
   - You'll need your own Steamworks developer account to download the SDK
   - The redistributables cannot be shared or bundled due to licensing restrictions

2. **Development Setup**
   - Download the SDK using your own Steamworks account
   - Set up the folder structure as described above
   - Never commit the `steamworks_sdk/` folder to version control

3. **Testing**
   - Use Spacewar (App ID 480) for testing - it's free and available to all developers
   - Either create a `steam_appid.txt` file with content `480` OR pass `480` to `steam.init(480)`

## Supported Platforms and Files

### Windows
- **64-bit**: `steamworks_sdk/redistributable_bin/win64/steam_api64.dll`
- **32-bit**: `steamworks_sdk/redistributable_bin/steam_api.dll`

### macOS
- **Universal**: `steamworks_sdk/redistributable_bin/osx/libsteam_api.dylib`

### Linux
- **x64**: `steamworks_sdk/redistributable_bin/linux64/libsteam_api.so`
- **x86**: `steamworks_sdk/redistributable_bin/linux32/libsteam_api.so`
- **ARM64**: `steamworks_sdk/redistributable_bin/linuxarm64/libsteam_api.so`

### Android
- **ARM64**: `steamworks_sdk/redistributable_bin/androidarm64/libsteam_api.so`

## Project Structure Examples

### Basic Node.js Project
```
my-steam-game/
├── steamworks_sdk/
│   └── redistributable_bin/
│       ├── win64/steam_api64.dll
│       ├── steam_api.dll
│       ├── osx/libsteam_api.dylib
│       ├── linux64/libsteam_api.so
│       ├── linux32/libsteam_api.so
│       ├── linuxarm64/libsteam_api.so
│       └── androidarm64/libsteam_api.so
├── package.json
├── steam_appid.txt
└── src/
    └── main.js
```

### Electron Application
```
my-electron-app/
├── steamworks_sdk/
│   └── redistributable_bin/
│       └── [platform files...]
├── package.json
├── steam_appid.txt
├── src/
│   ├── main.js
│   └── renderer.js
└── dist/
    └── [built app...]
```

### Monorepo Setup
```
my-monorepo/
├── steamworks_sdk/
│   └── redistributable_bin/
│       └── [platform files...]
├── packages/
│   ├── game-client/
│   │   ├── package.json
│   │   └── src/
│   └── game-server/
│       ├── package.json
│       └── src/
└── steam_appid.txt
```

## Troubleshooting

### "Steamworks SDK library not found" Error

This error means the redistributables are not properly installed. Check:

1. ✅ The `steamworks_sdk/redistributable_bin` folder exists in your project root
2. ✅ Platform-specific libraries are in the correct subfolders
3. ✅ File permissions allow reading the library files
4. ✅ You're running from the correct working directory

### "Cannot find function 'SteamAPI_Init'" Error

This usually indicates:
- Wrong library architecture (32-bit vs 64-bit)
- Corrupted or incomplete SDK download
- Incompatible SDK version

**Solution**: Re-download the latest Steamworks SDK and replace the redistributables.

### Permission Issues (macOS/Linux)

If you get permission errors:
```bash
# Make library executable
chmod +x steamworks_sdk/redistributable_bin/osx/libsteam_api.dylib
chmod +x steamworks_sdk/redistributable_bin/linux64/libsteam_api.so
```

## Version Compatibility

- **steamworks-ffi-node v0.5.x**: Compatible with Steamworks SDK v1.58+
- **Always use the latest** Steamworks SDK from Valve for best compatibility
- **Check release notes** for any breaking changes in new SDK versions

## Legal Compliance

### ✅ Allowed
- Downloading SDK with your own Steamworks developer account
- Using redistributables in your own games
- Distributing your game with embedded redistributables

### ❌ Not Allowed
- Redistributing SDK files in npm packages
- Sharing SDK files with non-developers
- Using SDK without proper Steamworks registration

### 📋 Requirements for Distribution
- Register as Steamworks developer
- Agree to Steamworks SDK license
- Include redistributables only with your shipped game

## Support

If you encounter issues:

1. **Check this guide** for common solutions
2. **Verify SDK installation** using the verification script above
3. **Update to latest SDK** from Valve
4. **Open an issue** at [steamworks-ffi-node GitHub](https://github.com/ArtyProf/steamworks-ffi-node/issues)

For Steamworks SDK licensing questions, contact Valve directly through the Steamworks Partner portal.

---

**Note**: This package is not affiliated with Valve Corporation. Steamworks is a trademark of Valve Corporation.