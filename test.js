/**
 * Real Steamworks SDK Test
 * This test connects to actual Steam client and SDK
 */

async function testRealSteam() {
  console.log('🎮 Real Steamworks SDK Test');
  console.log('===========================');
  
  console.log('⚠️  IMPORTANT: This test requires:');
  console.log('   1. Steam client running and logged in');
  console.log('   2. Steamworks SDK in steamworks_sdk/ directory');
  console.log('   3. Valid Steam App ID (using 480 - Spacewar for testing)');
  console.log('');
  
  try {
    // Import the real Steamworks implementation
    const Steam = require('./dist/steam.js').default;
    
    console.log('1. 🔌 Creating Steam instance...');
    const steam = Steam.getInstance();
    
    console.log('2. 🚀 Initializing Steam API...');
    // Use Spacewar (App ID 480) for testing - it's free and available to all Steam users
    const initialized = steam.init({ appId: 480 });
    
    if (!initialized) {
      console.log('❌ Steam API initialization failed!');
      console.log('💡 Make sure:');
      console.log('   - Steam client is running');
      console.log('   - You are logged into Steam');
      console.log('   - Steamworks SDK is properly installed');
      console.log(`   - You have Spacewar in your Steam library (it's free)`);
      return;
    }
    
    console.log('✅ Steam API initialized successfully!');
    
    // Get Steam status
    console.log('\n3. 📊 Getting Steam status...');
    const status = steam.getStatus();
    console.log(`   Initialized: ${status.initialized}`);
    console.log(`   App ID: ${status.appId}`);
    console.log(`   Steam ID: ${status.steamId}`);
    console.log(`   Steam Running: ${steam.isSteamRunning()}`);
    
    // Helper function to display achievement status
    const displayAchievements = async (title) => {
      console.log(`\n${title}`);
      const achs = await steam.getAllAchievements();
      achs.forEach((ach, index) => {
        const status = ach.unlocked ? '✅' : '⭕';
        console.log(`   ${index + 1}. ${status} ${ach.displayName} (${ach.apiName})`);
      });
      const total = await steam.getTotalAchievementCount();
      const unlocked = await steam.getUnlockedAchievementCount();
      console.log(`   📈 Progress: ${unlocked}/${total} achievements unlocked`);
      return achs;
    };
    
    // Get achievements from real Steam
    console.log('\n4. 🏆 Getting achievements from Steam...');
    const achievements = await steam.getAllAchievements();
    
    if (achievements.length === 0) {
      console.log('   📋 No achievements found for this app');
      console.log('   💡 Note: Spacewar (App ID 480) may not have achievements configured');
    } else {
      console.log(`   📋 Found ${achievements.length} achievements:`);
      
      achievements.forEach((ach, index) => {
        const status = ach.unlocked ? '✅' : '⭕';
        console.log(`   ${index + 1}. ${status} ${ach.displayName} (${ach.apiName})`);
        console.log(`      ${ach.description}`);
      });
      
      // Get achievement statistics
      const total = await steam.getTotalAchievementCount();
      const unlocked = await steam.getUnlockedAchievementCount();
      console.log(`\n   📈 Progress: ${unlocked}/${total} achievements unlocked`);
      
      // STEP 1: Clear ALL achievements
      console.log('\n5. 🔒 STEP 1: Clearing ALL achievements...');
      console.log('   ⚠️  This will clear all achievements in Steam (for testing)!');
      
      let clearedCount = 0;
      for (const ach of achievements) {
        if (ach.unlocked) {
          const cleared = await steam.clearAchievement(ach.apiName);
          if (cleared) {
            clearedCount++;
          }
        }
      }
      console.log(`   ✅ Cleared ${clearedCount} achievements`);
      
      // Show status after clearing all
      const afterClearAll = await displayAchievements('   📋 Achievement status after clearing all:');
      
      // STEP 2: Unlock ONE achievement
      console.log('\n6. 🔓 STEP 2: Unlocking ONE achievement...');
      const firstAchievement = achievements[0];
      console.log(`   Target: ${firstAchievement.displayName} (${firstAchievement.apiName})`);
      
      const unlockResult = await steam.unlockAchievement(firstAchievement.apiName);
      if (unlockResult) {
        console.log('   ✅ Achievement unlocked successfully!');
        
        // Verify it's unlocked
        const isUnlocked = await steam.isAchievementUnlocked(firstAchievement.apiName);
        console.log(`   🔍 Verification: ${isUnlocked ? 'Confirmed unlocked' : 'Failed'}`);
      }
      
      // Show status after unlocking one
      await displayAchievements('   📋 Achievement status after unlocking one:');
      
      // STEP 3: Clear ALL achievements again
      console.log('\n7. 🔒 STEP 3: Clearing ALL achievements again...');
      
      let clearedCount2 = 0;
      const currentAchievements = await steam.getAllAchievements();
      for (const ach of currentAchievements) {
        if (ach.unlocked) {
          const cleared = await steam.clearAchievement(ach.apiName);
          if (cleared) {
            clearedCount2++;
          }
        }
      }
      console.log(`   ✅ Cleared ${clearedCount2} achievement(s)`);
      
      // Show final status
      await displayAchievements('   📋 Final achievement status (all cleared):');
      
      // Restore all achievements to original state
      console.log('\n8. 🔄 Restoring all achievements to original state...');
      let restoredCount = 0;
      for (const originalAch of achievements) {
        if (originalAch.unlocked) {
          const restored = await steam.unlockAchievement(originalAch.apiName);
          if (restored) {
            restoredCount++;
          }
        }
      }
      console.log(`   ✅ Restored ${restoredCount} achievements`);
      
      // Show restored status
      await displayAchievements('   📋 Achievement status after restoration:');
    }
    
    // Test Steam callbacks
    console.log('\n9. 🔄 Processing Steam callbacks...');
    steam.runCallbacks();
    console.log('   ✅ Steam callbacks processed');
    
    console.log('\n✅ Real Steam integration test completed successfully!');
    console.log('🎮 You are now connected to the actual Steam client and servers!');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    
    if (error.message.includes('Cannot find module')) {
      console.log('   1. Run: npm run setup');
      console.log('   2. Run: npm install');
      console.log('   3. Run: npm run build');
    } else if (error.message.includes('library not found')) {
      console.log('   1. Download Steamworks SDK to steamworks_sdk/ directory');
      console.log('   2. Verify SDK directory structure matches README');
    } else if (error.message.includes('SteamAPI_Init')) {
      console.log('   1. Make sure Steam client is running');
      console.log(`   2. Make sure you're logged into Steam`);
      console.log('   3. Add Spacewar (free) to your Steam library if using App ID 480');
    } else {
      console.log('   1. Check that Visual Studio C++ Build Tools are installed');
      console.log('   2. Verify Python is installed');
      console.log('   3. Try running as Administrator');
    }
    
  } finally {
    // Cleanup
    try {
      const Steam = require('./dist/steam.js').default;
      const steam = Steam.getInstance();
      console.log('\n🧹 Cleaning up...');
      steam.shutdown();
      console.log('✅ Steam API shutdown complete');
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Interrupted, shutting down Steam API...');
  try {
    const Steam = require('./dist/steam.js').default;
    const steam = Steam.getInstance();
    steam.shutdown();
  } catch (error) {
    // Ignore errors during cleanup
  }
  process.exit(0);
});

// Run the test
testRealSteam().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});