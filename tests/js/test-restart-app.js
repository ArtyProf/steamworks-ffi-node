/**
 * Test SteamAPI_RestartAppIfNecessary
 * 
 * This test demonstrates how to use restartAppIfNecessary() to ensure
 * your app is launched through Steam.
 * 
 * IMPORTANT: This function should be called BEFORE init() for proper behavior.
 */

const { SteamworksSDK } = require('../../dist/index.js');

function testRestartAppIfNecessary() {
  console.log('🧪 Testing SteamAPI_RestartAppIfNecessary\n');
  console.log('='.repeat(60));
  
  const APP_ID = 480; // Space Wars test app
  
  console.log('\n1️⃣  Calling restartAppIfNecessary() BEFORE init()...');
  console.log(`   App ID: ${APP_ID}`);
  
  const steam = SteamworksSDK.getInstance();
  
  // This is the recommended pattern:
  // Call restartAppIfNecessary BEFORE init()
  const shouldRestart = steam.restartAppIfNecessary(APP_ID);
  
  console.log(`\n   Result: ${shouldRestart}`);
  
  if (shouldRestart) {
    console.log('\n❗ App needs to restart through Steam!');
    console.log('   Normally you would call process.exit(0) here.');
    console.log('   Steam would then relaunch your app properly.');
    console.log('\n   For this test, we\'ll continue anyway...\n');
  } else {
    console.log('\n✅ App was launched correctly!');
    console.log('   - Either launched through Steam client');
    console.log('   - Or steam_appid.txt / SteamAppId env var is present (dev mode)');
    console.log('   - Or Steam is not installed\n');
  }
  
  console.log('='.repeat(60));
  
  console.log('\n2️⃣  Now initializing Steam normally...');
  const initialized = steam.init({ appId: APP_ID });
  
  if (!initialized) {
    console.error('❌ Failed to initialize Steam');
    process.exit(1);
  }
  
  console.log('✅ Steam initialized successfully!\n');
  
  // Show Steam status
  const status = steam.getStatus();
  console.log('Steam Status:');
  console.log(`   - Initialized: ${status.initialized}`);
  console.log(`   - App ID: ${status.appId}`);
  console.log(`   - Steam ID: ${status.steamId}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Test completed!\n');
  
  console.log('📝 Usage Pattern:');
  console.log('```javascript');
  console.log('const { SteamworksSDK } = require("steamworks-ffi-node");');
  console.log('const steam = SteamworksSDK.getInstance();');
  console.log('');
  console.log('// Check BEFORE init()');
  console.log('if (steam.restartAppIfNecessary(480)) {');
  console.log('  console.log("Restarting through Steam...");');
  console.log('  process.exit(0);');
  console.log('}');
  console.log('');
  console.log('// Continue with normal initialization');
  console.log('steam.init({ appId: 480 });');
  console.log('```\n');
  
  console.log('📝 TypeScript/ESM Pattern:');
  console.log('```typescript');
  console.log('import SteamworksSDK from "steamworks-ffi-node";');
  console.log('const steam = SteamworksSDK.getInstance();');
  console.log('');
  console.log('if (steam.restartAppIfNecessary(480)) {');
  console.log('  process.exit(0);');
  console.log('}');
  console.log('steam.init({ appId: 480 });');
  console.log('```\n');
  
  console.log('📝 Electron Example:');
  console.log('```javascript');
  console.log('const { app } = require("electron");');
  console.log('const { SteamworksSDK } = require("steamworks-ffi-node");');
  console.log('');
  console.log('const steam = SteamworksSDK.getInstance();');
  console.log('');
  console.log('app.whenReady().then(() => {');
  console.log('  // Check restart BEFORE init');
  console.log('  if (steam.restartAppIfNecessary(480)) {');
  console.log('    app.quit();');
  console.log('    return;');
  console.log('  }');
  console.log('  ');
  console.log('  steam.init({ appId: 480 });');
  console.log('  // ... rest of app initialization');
  console.log('});');
  console.log('```\n');
  
  steam.shutdown();
  console.log('✅ Test complete!');
}

testRestartAppIfNecessary();
