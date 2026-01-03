# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.2] - 2026-01-03

### Added
- **User Manager API** - 28 functions for Steam user authentication and management
  - Session ticket generation with optional identity restrictions
  - Web API ticket generation with hex encoding
  - Auth session validation for server-side ticket verification
  - License verification for app/DLC ownership
  - Encrypted app tickets for secure backend authentication
  - User security info (2FA, phone verification, NAT status)
  - Player info (Steam level, badges, data folder)
  - Market eligibility checking
  - Store authentication URLs for in-game browser
  - Duration control for anti-indulgence compliance
  - Voice recording and decompression
  - Game server advertising to friends
- **Identity Restrictions** - Optional ticket security via SteamNetworkingIdentity
  - Restrict by Steam ID, IP address, or generic string identifier
  - Supported in both session tickets and web API tickets
- Enhanced TypeScript type exports for user authentication enums and result types

### Changed
- Updated documentation with comprehensive User Manager API reference
- Enhanced README with user authentication features

### Technical Notes
- `getAuthTicketForWebApi()` uses `GetAuthSessionTicket()` internally (FFI callback limitation workaround)
- Tickets validate correctly with Steam Web API despite format differences
- Service identity binding not supported (documented limitation)

## [0.8.1] - 2025-12-31

### Added
- **Steamworks SDK 1.63 Support**
  - Linux ARM64 platform support (`linuxarm64/libsteam_api.so`)
  - Android ARM64 platform support (`androidarm64/libsteam_api.so`)
  - Linux x86 (32-bit) platform support (`linux32/libsteam_api.so`)
  - Lenovo Legion Go controller support (69 new action origins)
- **EInputActionOrigin TypeScript Enum** - 495 typed values for all controller action origins
  - Steam Controller, PS4, PS5, Xbox 360, Xbox One/Series, Switch, Steam Deck, Horipad, Legion Go
  - Helper function `isOriginFromController()` for controller type detection
- Updated Input Manager functions to accept `EInputActionOrigin | number` for type safety

### Changed
- Updated all documentation to reference SDK v1.63
- Updated platform support documentation with new architectures

## [0.8.0] - 2025-12-28

### Added
- **Networking Sockets API** - 34 functions for P2P connections and reliable messaging
  - Create/accept P2P connections
  - Send/receive reliable and unreliable messages
  - Connection state management and callbacks
  - Platform-specific struct handling
- **Networking Utils API** - 15 functions for network diagnostics
  - Ping location and relay network status
  - Data center information
  - Network configuration
- **Utils API** - 29 functions for system utilities
  - Steam Deck detection
  - Country/language detection
  - Image loading from Steam
  - Text filtering
  - Gamepad text input
- **Matchmaking API** - 30+ functions for multiplayer lobbies
  - Create, join, leave lobbies
  - Lobby search with filters
  - Chat messaging
  - Member state tracking

### Changed
- Enhanced callback system for connection status updates
- Improved cross-platform struct alignment handling

## [0.7.1] - 2025-12-20

### Added
- **Screenshots API** - 9 functions for Steam Screenshots
  - Capture screenshots programmatically
  - Add screenshots to Steam library
  - Tag screenshots with locations/users
  - VR screenshot support
- Workshop item deletion functionality
- Cloud Storage batch write operations for atomic file management

## [0.7.0] - 2025-12-15

### Added
- **Input API** - 35+ functions for Steam Input (controller support)
  - Support for 300+ controller types
  - Action sets and layers
  - Digital/analog action reading
  - Motion data (gyro/accelerometer)
  - Haptic feedback and LED control
  - Glyph/icon retrieval
- **Apps/DLC API** - 28 functions
  - DLC ownership checking
  - App metadata and build info
  - Beta branch management
  - Family sharing detection
  - Install directory information

### Changed
- Deprecated `getCurrentGameLanguage()` in favor of `getCurrentLanguage()`

## [0.6.0] - 2025-12-01

### Added
- **Workshop/UGC API** - 33 functions for Steam Workshop
  - Subscribe/unsubscribe to items
  - Query workshop items with filters
  - Create and update workshop items
  - Upload content and previews
  - Download and installation management
- **Cloud Storage API** - 17 functions
  - File read/write operations
  - Quota management
  - Sync status checking
  - File sharing

### Changed
- Improved CI/CD pipeline for multi-platform testing

## [0.5.0] - 2025-11-15

### Added
- **Friends API** - 22 functions for social features
  - Friends list with relationship status
  - Avatar loading (small, medium, large)
  - Persona state tracking
  - Game activity detection
  - Friend groups/tags
- **Rich Presence API** - 6 functions
  - Set custom status
  - Clear presence
  - Friend presence reading
  - Join game functionality
- **Overlay API** - 7 functions
  - Activate overlay dialogs
  - Open store pages
  - Web browser overlay
  - Notification positioning

## [0.4.0] - 2025-11-01

### Added
- **Leaderboard API** - 7 functions (100% coverage)
  - Find or create leaderboards
  - Upload scores with optional details
  - Download entries (global, friends, around user)
  - UGC attachment support

## [0.3.0] - 2025-10-20

### Added
- **Stats API** - 14 functions (100% coverage)
  - Get/set integer and float stats
  - Average rate stat tracking
  - Friend stat comparisons
  - Global statistics with history

## [0.2.0] - 2025-10-10

### Added
- **Achievement API** - 20 functions (100% coverage)
  - Unlock and clear achievements
  - Progress tracking with notifications
  - Achievement icons (locked/unlocked)
  - Friend achievement comparisons
  - Global unlock percentages

### Changed
- Refactored achievement manager for better organization

## [0.1.1] - 2025-10-01

### Added
- Initial release
- **Core API**
  - Steam initialization and shutdown
  - Callback processing
  - User ID and persona name
  - Language detection
- Cross-platform support (Windows, macOS, Linux)
- TypeScript definitions
- Basic documentation

### Fixed
- Windows CI build configuration

---

## Version History Summary

| Version | Date | Major Features |
|---------|------|----------------|
| 0.8.1 | 2025-12-31 | SDK 1.63, Linux/Android ARM64, Legion Go |
| 0.8.0 | 2025-12-28 | Networking Sockets, Networking Utils, Utils, Matchmaking |
| 0.7.1 | 2025-12-20 | Screenshots, Workshop deletion, Cloud batch writes |
| 0.7.0 | 2025-12-15 | Input (controllers), Apps/DLC |
| 0.6.0 | 2025-12-01 | Workshop/UGC, Cloud Storage |
| 0.5.0 | 2025-11-15 | Friends, Rich Presence, Overlay |
| 0.4.0 | 2025-11-01 | Leaderboards |
| 0.3.0 | 2025-10-20 | Stats |
| 0.2.0 | 2025-10-10 | Achievements |
| 0.1.1 | 2025-10-01 | Initial release, Core API |

[0.8.1]: https://github.com/ArtyProf/steamworks-ffi-node/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/ArtyProf/steamworks-ffi-node/compare/v0.7.1...v0.8.0
[0.7.1]: https://github.com/ArtyProf/steamworks-ffi-node/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/ArtyProf/steamworks-ffi-node/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/ArtyProf/steamworks-ffi-node/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/ArtyProf/steamworks-ffi-node/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/ArtyProf/steamworks-ffi-node/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/ArtyProf/steamworks-ffi-node/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ArtyProf/steamworks-ffi-node/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/ArtyProf/steamworks-ffi-node/releases/tag/v0.1.1
