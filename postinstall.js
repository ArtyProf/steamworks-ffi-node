#!/usr/bin/env node

/**
 * Post-installation script for steamworks-ffi-node
 * 
 * This script provides guidance to users after package installation
 * about setting up the Steamworks SDK redistributables.
 */

console.log('');
console.log('🎉 steamworks-ffi-node installed successfully!');
console.log('');
console.log('📋 Next Steps:');
console.log('==============');
console.log('');
console.log('1. 📥 Download Steamworks SDK redistributables');
console.log('   - Get them from: https://partner.steamgames.com/');
console.log('   - Extract and copy "redistributable_bin" to "steamworks_sdk/" in your project');
console.log('');
console.log('2. 🔧 Configure your Steam App ID');
console.log('   - Option A: Create steam_appid.txt with your App ID');
console.log('   - Option B: Pass App ID to steam.init(yourAppId)');
console.log('   - For testing: Use App ID 480 (Spacewar)');
console.log('');
console.log('3. ✅ Verify setup');
console.log('   Run: npm run verify-sdk');
console.log('');
console.log('📖 Complete setup guide:');
console.log('https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/STEAMWORKS_SDK_SETUP.md');
console.log('');
console.log('⚠️  Legal Notice:');
console.log('Due to Valve\'s licensing terms, the Steamworks SDK redistributables');
console.log('cannot be bundled with this package and must be downloaded separately.');
console.log('');