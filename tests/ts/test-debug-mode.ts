/**
 * Test Debug Mode Feature
 * 
 * This test demonstrates the debug logging functionality added in v0.8.8.
 * It shows how to enable/disable debug logs for troubleshooting SDK loading
 * and initialization issues.
 * 
 * Usage:
 *   npx tsx tests/ts/test-debug-mode.ts
 */

import SteamworksSDK from '../../src/index';

console.log('='.repeat(80));
console.log('Debug Mode Test - steamworks-ffi-node v0.8.8');
console.log('='.repeat(80));
console.log();

// Get Steam instance
const steam = SteamworksSDK.getInstance();

console.log('Phase 1: Testing WITH debug mode enabled');
console.log('-'.repeat(80));

// Enable debug mode BEFORE any Steam operations
steam.setDebug(true);
console.log('✅ Debug mode enabled\n');

// If using custom SDK path, set it here (optional)
// steam.setSdkPath('vendor/steamworks_sdk');

console.log('✅ No restart needed\n');

// Initialize Steam API
// Debug logs will show initialization steps
console.log('Initializing Steam API...');
const initialized = steam.init({ appId: 480 });

if (!initialized) {
  console.error('\n❌ Failed to initialize Steam API');
  console.error('Make sure:');
  console.error('  1. Steam client is running');
  console.error('  2. You are logged in');
  console.error('  3. Steamworks SDK is set up correctly');
  process.exit(1);
}

console.log('✅ Steam API initialized\n');

// Get status with debug mode on
const status = steam.getStatus();
console.log('Steam Status (debug mode ON):');
console.log(`  Initialized: ${status.initialized}`);
console.log(`  App ID: ${status.appId}`);
console.log(`  Steam ID: ${status.steamId}`);
console.log();

console.log('='.repeat(80));
console.log('Phase 2: Testing WITH debug mode disabled');
console.log('-'.repeat(80));

// Disable debug mode
steam.setDebug(false);
console.log('✅ Debug mode disabled\n');

// Operations with debug mode off - no debug logs should appear
console.log('Running callbacks (no debug logs should appear)...');
steam.runCallbacks();
console.log('✅ Callbacks processed\n');

// Check if Steam is running (no debug logs)
const steamRunning = steam.isSteamRunning();
console.log(`Steam Running: ${steamRunning}\n`);

console.log('='.repeat(80));
console.log('Phase 3: Re-enable debug mode and shutdown');
console.log('-'.repeat(80));

// Re-enable debug mode to see shutdown logs
steam.setDebug(true);
console.log('✅ Debug mode re-enabled\n');

// Shutdown with debug logs
console.log('Shutting down Steam API...');
steam.shutdown();
console.log('✅ Shutdown complete\n');

console.log('='.repeat(80));
console.log('✅ Debug Mode Test Complete!');
console.log('='.repeat(80));
console.log();
console.log('Summary:');
console.log('  - Debug mode can be enabled/disabled at any time');
console.log('  - Debug logs show SDK loading and initialization details');
console.log('  - Errors and warnings always appear regardless of debug mode');
console.log('  - Use steam.setDebug(true) for troubleshooting');
console.log('  - Use steam.setDebug(false) for production');
console.log();
