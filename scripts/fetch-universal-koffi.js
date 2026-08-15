#!/usr/bin/env node

/**
 * Fetches the missing darwin counterpart of koffi's native binary package,
 * for consumers building a macOS "universal" (x64 + arm64 in one bundle)
 * Electron app.
 *
 * WHY THIS EXISTS:
 * Since koffi 3.x, its native binary ships as separate per-platform
 * optionalDependencies (`@koromix/koffi-<os>-<arch>`); npm installs only the
 * variant matching the current host. A universal build needs BOTH darwin
 * variants present in `node_modules`, but npm's install-time platform gate
 * (EBADPLATFORM) makes it impossible to declare the non-host arch as a
 * normal dependency -- even `npm install --force` gets re-blocked the next
 * time a plain `npm install`/`npm ci` runs.
 *
 * This script fetches the missing counterpart directly from the npm
 * registry (bypassing npm's own install-time platform filter, the same way
 * esbuild/sharp handle this for their own consumers). It is opt-in --
 * nothing in this package runs it automatically -- run it yourself as a
 * step before packaging a universal build:
 *
 *   npx steamworks-fetch-universal-koffi
 *
 * Exits non-zero on failure, unlike a postinstall hook -- this is a
 * deliberate action you're taking, so failures should be visible.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

async function main() {
  if (process.platform !== 'darwin') {
    console.error('This script is only relevant for macOS universal (x64 + arm64) Electron builds.');
    console.error(`Current platform is "${process.platform}" -- nothing to do.`);
    process.exit(1);
  }

  const otherArch = process.arch === 'arm64' ? 'x64' : 'arm64';
  const pkgName = `@koromix/koffi-darwin-${otherArch}`;

  // Resolve koffi's *actual* installed location via Node's own module
  // resolution rather than assuming a fixed path -- npm hoists koffi to the
  // consumer's top-level node_modules as a sibling of steamworks-ffi-node
  // (not nested inside it), and the exact hoist depth can vary by
  // lockfile/workspace layout. `@koromix` must be placed as a sibling of
  // wherever koffi *itself* actually landed, which is also where koffi's
  // own native-module lookup expects to find it.
  let koffiDir, nodeModulesDir, version;
  try {
    koffiDir = path.dirname(require.resolve('koffi'));
    nodeModulesDir = path.dirname(koffiDir);
    // koffi's package.json "exports" doesn't allow requiring the subpath
    // directly (ERR_PACKAGE_PATH_NOT_EXPORTED), so read it as a plain file.
    version = JSON.parse(fs.readFileSync(path.join(koffiDir, 'package.json'), 'utf8')).version;
  } catch (e) {
    console.error('Could not resolve an installed "koffi" package:', e.message);
    console.error('Run `npm install` first, then re-run this script.');
    process.exit(1);
  }

  const targetDir = path.join(nodeModulesDir, '@koromix', `koffi-darwin-${otherArch}`);
  if (fs.existsSync(targetDir)) {
    console.log(`✅ ${pkgName}@${version} is already present at ${targetDir} -- nothing to do.`);
    return;
  }

  const registry = (process.env.npm_config_registry || 'https://registry.npmjs.org/').replace(/\/+$/, '');
  let tmpDir;

  try {
    console.log(`📦 Fetching ${pkgName}@${version} for universal macOS builds...`);

    // Resolve the real tarball URL from registry metadata rather than
    // hand-constructing it, so this keeps working against private
    // registries/mirrors that may use a different tarball URL convention.
    const metaRes = await fetch(`${registry}/${pkgName}/${version}`);
    if (!metaRes.ok) throw new Error(`HTTP ${metaRes.status} fetching package metadata`);
    const meta = await metaRes.json();
    const tarballUrl = meta?.dist?.tarball;
    if (!tarballUrl) throw new Error('No dist.tarball in registry metadata');

    const tarballRes = await fetch(tarballUrl);
    if (!tarballRes.ok) throw new Error(`HTTP ${tarballRes.status} fetching tarball`);

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'koffi-universal-'));
    const tarballPath = path.join(tmpDir, 'package.tgz');
    fs.writeFileSync(tarballPath, Buffer.from(await tarballRes.arrayBuffer()));

    fs.mkdirSync(targetDir, { recursive: true });
    execFileSync('tar', ['-xzf', tarballPath, '-C', targetDir, '--strip-components=1'], { stdio: 'ignore' });

    console.log(`✅ ${pkgName}@${version} installed at ${targetDir}`);
    console.log('   Your universal (x64 + arm64) Electron build can now bundle both koffi binaries.');
  } catch (error) {
    fs.rmSync(targetDir, { recursive: true, force: true }); // avoid leaving a partial/corrupt install
    console.error(`❌ Could not fetch ${pkgName}: ${error.message}`);
    process.exit(1);
  } finally {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
