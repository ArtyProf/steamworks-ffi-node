# Contributing to steamworks-ffi-node

First off, thank you for considering contributing to steamworks-ffi-node! 🎮

This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Style Guidelines](#style-guidelines)
- [Adding New Steam APIs](#adding-new-steam-apis)

## Code of Conduct

This project follows a simple code of conduct:

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Keep discussions on-topic

## Getting Started

### Prerequisites

- **Node.js** 18.0.0 or higher
- **Steam Client** installed and logged in
- **Steamworks SDK** (download from [Steamworks Partner](https://partner.steamgames.com/))
- **TypeScript** knowledge (the project is written in TypeScript)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/steamworks-ffi-node.git
   cd steamworks-ffi-node
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/ArtyProf/steamworks-ffi-node.git
   ```

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Steamworks SDK

Copy the Steamworks SDK redistributable binaries to the project:

```
steamworks_sdk/
└── redistributable_bin/
    ├── win64/steam_api64.dll
    ├── steam_api.dll
    ├── osx/libsteam_api.dylib
    ├── linux64/libsteam_api.so
    ├── linux32/libsteam_api.so
    ├── linuxarm64/libsteam_api.so
    └── androidarm64/libsteam_api.so
```

### 3. Verify Setup

```bash
npm run verify-sdk
```

### 4. Build

```bash
npm run build
```

## Project Structure

```
steamworks-ffi-node/
├── src/
│   ├── index.ts              # Main entry point
│   ├── steam.ts              # SteamworksSDK class (public API)
│   ├── internal/             # Internal manager implementations
│   │   ├── SteamAPICore.ts
│   │   ├── SteamAchievementManager.ts
│   │   ├── SteamLibraryLoader.ts
│   │   └── ...
│   └── types/                # TypeScript type definitions
│       ├── index.ts
│       ├── achievements.ts
│       └── ...
├── docs/                     # API documentation
├── tests/
│   ├── js/                   # JavaScript tests
│   └── ts/                   # TypeScript tests
└── steamworks_sdk/           # SDK binaries (not committed)
```

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes

- Follow the existing code style
- Add/update TypeScript types as needed
- Update documentation if changing public APIs
- Add tests for new functionality

### 3. Commit Guidelines

Use conventional commit messages:

```
feat: add new achievement notification API
fix: correct memory alignment on Linux ARM64
docs: update Workshop API examples
refactor: simplify callback registration
test: add matchmaking host/join tests
chore: update dependencies
```

## Testing

### Running Tests

Tests require Steam client to be running and logged in.

```bash
# Run specific manager tests
npm run test:achievements:ts
npm run test:stats:js
npm run test:cloud:ts

# Available test categories
npm run test:core:ts
npm run test:achievements:ts
npm run test:stats:ts
npm run test:leaderboards:ts
npm run test:friends:ts
npm run test:cloud:ts
npm run test:workshop:ts
npm run test:input:ts
npm run test:screenshots:ts
npm run test:apps:ts
npm run test:utils:ts
```

### Multi-Account Tests

Some features require two Steam accounts (matchmaking, networking):

```bash
# Terminal 1 - Host
npm run test:matchmaking:host:ts

# Terminal 2 - Join (with Steam ID from host)
npm run test:matchmaking:join:ts -- 76561198XXXXXXXXX
```

### TypeScript Compilation Check

```bash
npx tsc --noEmit
```

## Submitting Changes

### 1. Sync with Upstream

```bash
git fetch upstream
git rebase upstream/main
```

### 2. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 3. Create Pull Request

- Go to GitHub and create a Pull Request
- Fill in the PR template
- Link any related issues
- Wait for CI checks to pass

### PR Checklist

- [ ] Code compiles without errors (`npm run build`)
- [ ] TypeScript types are properly defined
- [ ] Tests pass (where applicable)
- [ ] Documentation updated (if changing public API)
- [ ] Commit messages follow conventional format

## Style Guidelines

### TypeScript

- Use `strict: true` TypeScript configuration
- Prefer explicit types over `any`
- Use JSDoc comments for public APIs
- Follow existing naming conventions

### Code Style

```typescript
// Good: Explicit types, descriptive names
function getAchievementUnlockTime(achievementName: string): number | null {
  // Implementation
}

// Good: JSDoc for public methods
/**
 * Unlocks an achievement for the current user
 * @param name - The API name of the achievement
 * @returns True if the achievement was unlocked successfully
 */
unlockAchievement(name: string): boolean {
  // Implementation
}
```

### File Organization

- One manager per file in `src/internal/`
- Types in `src/types/` with category-based files
- Export public types from `src/types/index.ts`

## Adding New Steam APIs

### 1. Create Types

Add type definitions in `src/types/newfeature.ts`:

```typescript
export interface NewFeatureResult {
  success: boolean;
  data: string;
}
```

Export from `src/types/index.ts`:

```typescript
export * from './newfeature';
```

### 2. Add FFI Bindings

In `src/internal/SteamLibraryLoader.ts`:

```typescript
// Add function declaration
public SteamAPI_ISteamNewFeature_DoSomething!: koffi.KoffiFunction;

// Add binding in load()
this.SteamAPI_ISteamNewFeature_DoSomething = this.steamLib.func(
  'SteamAPI_ISteamNewFeature_DoSomething',
  'bool',
  ['void*', 'str']
);
```

### 3. Create Manager

Create `src/internal/SteamNewFeatureManager.ts`:

```typescript
import { SteamLibraryLoader } from './SteamLibraryLoader';
import { NewFeatureResult } from '../types';

export class SteamNewFeatureManager {
  constructor(private libraryLoader: SteamLibraryLoader) {}
  
  doSomething(param: string): NewFeatureResult {
    // Implementation
  }
}
```

### 4. Expose in SteamworksSDK

In `src/steam.ts`, add the manager and expose methods.

### 5. Add Tests

Create tests in both `tests/js/` and `tests/ts/`.

### 6. Add Documentation

Create `docs/NEW_FEATURE_MANAGER.md` with:

- Overview
- Quick reference table
- Detailed function documentation
- Code examples

## Questions?

- Open an issue for bugs or feature requests
- Join our [Discord](https://discord.gg/Ruzx4Z7cKr) for discussions
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🚀
