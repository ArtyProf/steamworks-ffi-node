# SDK version-compatibility fixtures

Drop extra Steamworks SDK releases here to verify that the interface accessor
resolution in `src/internal/SteamLibraryLoader.ts` finds the right versioned
symbol against each one, independently of whatever SDK is currently installed
at `steamworks_sdk/`.

The loader doesn't hardcode which version number to expect. For each interface
it knows only the stable naming prefix (`INTERFACE_ACCESSOR_PREFIXES`, e.g.
`SteamAPI_SteamUtils_v`) and reflects on the loaded library at runtime
(`findNewestVersionedSymbol`) to find the highest version it actually exports.
This check exercises that exact same probing logic against whatever SDKs you
drop in here.

This does **not** require a running Steam client. The check only loads each
redistributable binary and probes it directly -- exactly what changes when
Valve bumps an interface version.

## Layout

For each SDK release you want to test, create a folder here named after its
version, containing just the `redistributable_bin` directory from that SDK
(the same layout as `steamworks_sdk/`, without the rest of the SDK):

```
test-sdks/
  1.64/
    redistributable_bin/
      win64/steam_api64.dll
      osx/libsteam_api.dylib
      linux64/libsteam_api.so
      ...
  1.65/
    redistributable_bin/
      win64/steam_api64.dll
      osx/libsteam_api.dylib
      linux64/libsteam_api.so
      ...
```

You only need the binary for your current platform/architecture -- the check
skips a folder it can't find a matching library in.

These folders are gitignored (same licensing restriction as `steamworks_sdk/`
itself: Valve does not allow redistributing the SDK). Only this README is
tracked.

## Running the check

```
npm run test:sdk-version-compat:js
# or
npm run test:sdk-version-compat:ts
```

With no folders present, the script just prints a reminder and exits 0. Point
it at a single SDK instead of scanning this whole folder with:

```
node tests/js/test-sdk-version-compat.js --sdk=test-sdks/1.64
```

## What a failure means

If an interface fails to resolve against one of your dropped-in SDKs, it means
no `<prefix>001` through `<prefix>100` symbol exists in that release at all --
either Valve renamed the accessor function itself (not just its version
number), which is rare, or the version number has exceeded
`MAX_PROBED_INTERFACE_VERSION` in `src/internal/SteamLibraryLoader.ts`. Check
that prefix against the SDK's headers and adjust as needed.
