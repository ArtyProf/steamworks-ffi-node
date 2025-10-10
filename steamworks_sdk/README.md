# Steamworks SDK Setup

This directory should contain the Steamworks SDK files for real Steam integration.

## 📥 How to Get Steamworks SDK

1. **Register as Steam Partner**: Go to https://partner.steamgames.com/
2. **Download Steamworks SDK**: Available in the partner portal after registration
3. **Extract SDK**: Place the extracted files in this directory

## 📁 Required Directory Structure

```
steamworks_sdk/
├── public/
│   └── steam/
│       ├── steam_api.h
│       ├── isteamuserstate.h
│       └── ... (other header files)
└── redistributable_bin/
    ├── win64/
    │   └── steam_api64.dll     # Windows 64-bit
    ├── steam_api.dll           # Windows 32-bit
    ├── osx/
    │   └── libsteam_api.dylib  # macOS
    └── linux64/
        └── libsteam_api.so     # Linux 64-bit
```

## 🔑 Steam App ID

You'll also need a valid Steam App ID:

1. **Get App ID**: Register your application on Steamworks
2. **Create steam_appid.txt**: Place your App ID in this file in the project root
3. **Environment Variable**: The wrapper will set `SteamAppId` automatically

## 🎮 Testing Without Real App ID

For testing purposes, you can use Steam's test App ID `480` (Spacewar), but this requires:
- Steam client running
- Being logged into Steam
- Having Spacewar in your library (it's free)

## ⚡ Quick Setup

1. Download Steamworks SDK from Steam Partner portal
2. Extract to this directory maintaining the structure above
3. Run: `npm run setup` to verify everything is configured
4. Run: `npm install` to build FFI dependencies
5. Run: `npm start` to test with real Steam integration

## 🚨 Important Notes

- **Keep SDK Private**: Steamworks SDK is under NDA - don't commit it to public repos
- **Platform Specific**: Make sure to include binaries for all target platforms
- **Steam Client Required**: Real integration requires Steam client to be running
- **Valid App ID**: Production use requires a registered Steam application

## 🔧 Troubleshooting

**"Library not found" Error**:
- Verify SDK files are in correct locations
- Check file permissions
- Ensure Visual Studio C++ Redistributable is installed

**"SteamAPI_Init failed" Error**:
- Make sure Steam client is running
- Verify you're logged into Steam
- Check that steam_appid.txt contains valid App ID
- For App ID 480, make sure Spacewar is in your Steam library

**Build Errors**:
- Install Visual Studio Build Tools with C++ workload
- Make sure Python is installed
- Try running as Administrator

## 📚 Documentation

- **Steamworks API Reference**: https://partner.steamgames.com/doc/api
- **Steam Partner Documentation**: Available after partner registration
- **Integration Guides**: Check the official Steamworks documentation