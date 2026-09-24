/**
 * Steam interface accessor version-compatibility check.
 *
 * For every interface prefix in INTERFACE_ACCESSOR_PREFIXES, this reflects on each
 * SDK release dropped into test-sdks/ (see test-sdks/README.md) to find which
 * versioned symbol it actually exports -- the same probing logic
 * (findNewestVersionedSymbol) that SteamLibraryLoader uses at runtime, so this test
 * exercises the real resolution path rather than a separate hardcoded expectation.
 *
 * This does NOT need a running Steam client: it only loads each redistributable
 * binary directly and probes its exported symbols, which is exactly what changes
 * when Valve bumps an interface version between SDK releases.
 *
 * Usage:
 *   node tests/js/test-sdk-version-compat.js
 *   node tests/js/test-sdk-version-compat.js --sdk=test-sdks/1.64
 */

const fs = require('fs');
const path = require('path');
const koffi = require('koffi');
const { INTERFACE_ACCESSOR_PREFIXES, findNewestVersionedSymbol } = require('../../dist/internal/SteamLibraryLoader.js');

function resolveLibPath(sdkRoot) {
  const platform = process.platform;
  const arch = process.arch;
  const base = path.join(sdkRoot, 'redistributable_bin');

  if (platform === 'win32') {
    return arch === 'x64' ? path.join(base, 'win64', 'steam_api64.dll') : path.join(base, 'steam_api.dll');
  }
  if (platform === 'darwin') {
    return path.join(base, 'osx', 'libsteam_api.dylib');
  }
  if (platform === 'linux') {
    if (arch === 'arm64') return path.join(base, 'linuxarm64', 'libsteam_api.so');
    if (arch === 'ia32') return path.join(base, 'linux32', 'libsteam_api.so');
    return path.join(base, 'linux64', 'libsteam_api.so');
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

function checkSdk(sdkRoot) {
  const libPath = resolveLibPath(sdkRoot);
  if (!fs.existsSync(libPath)) {
    return { ok: false, error: `no library for this platform at ${libPath}` };
  }

  const lib = koffi.load(libPath);
  const results = {};
  for (const [interfaceName, prefix] of Object.entries(INTERFACE_ACCESSOR_PREFIXES)) {
    results[interfaceName] = findNewestVersionedSymbol(lib, prefix, 'void*', []);
  }
  return { ok: true, libPath, results };
}

function findTargets() {
  const arg = process.argv.find((a) => a.startsWith('--sdk='));
  if (arg) {
    return [path.resolve(process.cwd(), arg.slice('--sdk='.length))];
  }

  const testSdksDir = path.resolve(__dirname, '../../test-sdks');
  if (!fs.existsSync(testSdksDir)) return [];

  return fs
    .readdirSync(testSdksDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(testSdksDir, entry.name));
}

function main() {
  console.log('🧪 Steam interface accessor version-compatibility check\n');

  const targets = findTargets();
  if (targets.length === 0) {
    console.log('⚠️  No SDK folders found under test-sdks/.');
    console.log('   See test-sdks/README.md for how to add SDK 1.64 / 1.65 fixtures.');
    process.exit(0);
  }

  let anyFailure = false;
  let anyChecked = false;

  for (const target of targets) {
    const label = path.basename(target);
    console.log(`=== SDK: ${label} ===`);

    const outcome = checkSdk(target);
    if (!outcome.ok) {
      console.log(`  ⚠️  skipped: ${outcome.error}\n`);
      continue;
    }
    anyChecked = true;

    console.log(`  library: ${outcome.libPath}`);
    for (const [interfaceName, matched] of Object.entries(outcome.results)) {
      if (matched) {
        console.log(`  ✅ ${interfaceName.padEnd(42)} -> ${matched}`);
      } else {
        const prefix = INTERFACE_ACCESSOR_PREFIXES[interfaceName];
        console.log(`  ❌ ${interfaceName.padEnd(42)} -> no "${prefix}*" symbol found`);
        anyFailure = true;
      }
    }
    console.log('');
  }

  if (anyFailure) {
    console.log('❌ One or more interfaces did not resolve against at least one SDK.');
    console.log('   Either the accessor prefix itself changed (rare -- Valve renamed the');
    console.log('   function, not just its version) or MAX_PROBED_INTERFACE_VERSION was');
    console.log('   exceeded. Check INTERFACE_ACCESSOR_PREFIXES in src/internal/SteamLibraryLoader.ts.');
    process.exit(1);
  }

  if (!anyChecked) {
    console.log('⚠️  No SDK library for this platform was found in any target folder -- nothing was checked.');
    process.exit(0);
  }

  console.log('✅ All interface accessors resolved for every SDK under test.');
  process.exit(0);
}

main();
