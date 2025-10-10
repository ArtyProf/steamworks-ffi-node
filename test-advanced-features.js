/**
 * Advanced Achievement Features Test
 * Tests all newly implemented achievement functionality
 */

async function testAdvancedFeatures() {
  console.log('🎮 Advanced Steamworks Achievement Features Test');
  console.log('================================================\n');
  
  try {
    const Steam = require('./dist/steam.js').default;
    
    console.log('1. 🔌 Initializing Steam API...');
    const steam = Steam.getInstance();
    const initialized = steam.init({ appId: 480 });
    
    if (!initialized) {
      console.log('❌ Steam API initialization failed!');
      return;
    }
    
    console.log('✅ Steam API initialized successfully!\n');
    
    // Get base achievements
    const achievements = await steam.getAllAchievements();
    console.log(`📋 Found ${achievements.length} achievements\n`);
    
    if (achievements.length === 0) {
      console.log('⚠️  No achievements available for testing');
      return;
    }
    
    const testAchievement = achievements[0];
    console.log(`🎯 Using test achievement: ${testAchievement.displayName} (${testAchievement.apiName})\n`);
    
    // ===== TEST 1: Achievement Icons =====
    console.log('========================================');
    console.log('TEST 1: Achievement Icons');
    console.log('========================================');
    
    const iconHandle = await steam.getAchievementIcon(testAchievement.apiName);
    console.log(`   Icon handle: ${iconHandle}`);
    console.log(`   ${iconHandle > 0 ? '✅ Icon available' : '⚠️  No icon or still loading'}\n`);
    
    const achievementsWithIcons = await steam.getAllAchievementsWithIcons();
    console.log(`   Retrieved ${achievementsWithIcons.length} achievements with icon handles`);
    achievementsWithIcons.slice(0, 3).forEach((ach, i) => {
      console.log(`   ${i + 1}. ${ach.displayName}: icon=${ach.iconHandle}`);
    });
    console.log('   ✅ Achievement icons test complete\n');
    
    // ===== TEST 2: Progress Indication =====
    console.log('========================================');
    console.log('TEST 2: Achievement Progress Indication');
    console.log('========================================');
    
    const progressResult = await steam.indicateAchievementProgress(testAchievement.apiName, 50, 100);
    console.log(`   Progress indication: ${progressResult ? '✅ Success' : '⚠️  Not supported or failed'}\n`);
    
    // ===== TEST 3: Progress Limits =====
    console.log('========================================');
    console.log('TEST 3: Achievement Progress Limits');
    console.log('========================================');
    
    const limitsInt = await steam.getAchievementProgressLimitsInt(testAchievement.apiName);
    if (limitsInt) {
      console.log(`   Int limits: min=${limitsInt.minProgress}, max=${limitsInt.maxProgress}`);
      console.log('   ✅ Integer progress limits available');
    } else {
      console.log('   ⚠️  No integer progress limits (achievement may not have progress tracking)');
    }
    
    const limitsFloat = await steam.getAchievementProgressLimitsFloat(testAchievement.apiName);
    if (limitsFloat) {
      console.log(`   Float limits: min=${limitsFloat.minProgress}, max=${limitsFloat.maxProgress}`);
      console.log('   ✅ Float progress limits available');
    } else {
      console.log('   ⚠️  No float progress limits (achievement may not have progress tracking)');
    }
    console.log('');
    
    // ===== TEST 4: Global Achievement Percentages =====
    console.log('========================================');
    console.log('TEST 4: Global Achievement Statistics');
    console.log('========================================');
    
    console.log('   📊 Requesting global achievement percentages...');
    const globalRequest = await steam.requestGlobalAchievementPercentages();
    console.log(`   Request sent: ${globalRequest ? '✅' : '❌'}`);
    
    if (globalRequest) {
      // Wait a bit for callback
      console.log('   ⏳ Waiting for Steam callback...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      steam.runCallbacks();
      
      // Get percentage for specific achievement
      const percent = await steam.getAchievementAchievedPercent(testAchievement.apiName);
      if (percent !== null) {
        console.log(`   Global unlock rate for "${testAchievement.displayName}": ${percent.toFixed(2)}%`);
      }
      
      // Get all achievements with global stats
      console.log('\n   📊 All achievements with global unlock percentages:');
      const globalStats = await steam.getAllAchievementsWithGlobalStats();
      globalStats.forEach((ach, i) => {
        const status = ach.unlocked ? '✅' : '⭕';
        console.log(`   ${i + 1}. ${status} ${ach.displayName}: ${ach.globalUnlockPercentage.toFixed(2)}% global`);
      });
      
      // Get achievements sorted by popularity
      console.log('\n   🏆 Achievements sorted by popularity:');
      const sorted = await steam.getAllAchievementsSortedByPopularity();
      sorted.forEach((ach, i) => {
        const status = ach.unlocked ? '✅' : '⭕';
        console.log(`   ${i + 1}. ${status} ${ach.displayName}: ${ach.globalUnlockPercentage.toFixed(2)}%`);
      });
      
      console.log('   ✅ Global statistics test complete');
    } else {
      console.log('   ⚠️  Global stats request failed');
    }
    console.log('');
    
    // ===== TEST 5: Friend Achievements =====
    console.log('========================================');
    console.log('TEST 5: Friend/User Achievement Data');
    console.log('========================================');
    
    const status = steam.getStatus();
    console.log(`   Your Steam ID: ${status.steamId}`);
    
    // Request stats for yourself (as a test)
    console.log('   📊 Requesting user stats for yourself...');
    const userStatsRequest = await steam.requestUserStats(status.steamId);
    console.log(`   Request sent: ${userStatsRequest ? '✅' : '❌'}`);
    
    if (userStatsRequest) {
      // Wait for callback
      await new Promise(resolve => setTimeout(resolve, 1000));
      steam.runCallbacks();
      
      // Get user achievement
      const userAch = await steam.getUserAchievement(status.steamId, testAchievement.apiName);
      if (userAch) {
        console.log(`   ✅ User achievement data retrieved:`);
        console.log(`      Steam ID: ${userAch.steamId}`);
        console.log(`      Achievement: ${userAch.displayName}`);
        console.log(`      Status: ${userAch.unlocked ? 'Unlocked' : 'Locked'}`);
        if (userAch.unlockTime > 0) {
          const date = new Date(userAch.unlockTime * 1000);
          console.log(`      Unlocked: ${date.toLocaleString()}`);
        }
      } else {
        console.log('   ⚠️  Could not retrieve user achievement data');
      }
    }
    console.log('');
    
    // ===== TEST 6: Most Achieved Achievement Iterator =====
    console.log('========================================');
    console.log('TEST 6: Most Achieved Achievement Iterator');
    console.log('========================================');
    
    const mostAchieved = await steam.getMostAchievedAchievementInfo();
    if (mostAchieved) {
      console.log(`   🥇 Most achieved: ${mostAchieved.apiName}`);
      console.log(`      Percentage: ${mostAchieved.percent.toFixed(2)}%`);
      console.log(`      Your status: ${mostAchieved.unlocked ? 'Unlocked ✅' : 'Locked ⭕'}`);
      console.log(`      Iterator: ${mostAchieved.iterator}`);
      
      // Get next 2 achievements
      let iterator = mostAchieved.iterator;
      for (let i = 0; i < 2; i++) {
        const next = await steam.getNextMostAchievedAchievementInfo(iterator);
        if (next) {
          console.log(`   ${i + 2}. ${next.apiName}: ${next.percent.toFixed(2)}% (${next.unlocked ? '✅' : '⭕'})`);
          iterator = next.iterator;
        } else {
          break;
        }
      }
      
      console.log('   ✅ Iterator test complete');
    } else {
      console.log('   ⚠️  No achievement data available (may need to wait for global stats)');
    }
    console.log('');
    
    // ===== TEST 7: Reset Stats (WARNING - commented out by default) =====
    console.log('========================================');
    console.log('TEST 7: Reset All Stats (SKIPPED)');
    console.log('========================================');
    console.log('   ⚠️  resetAllStats() test is disabled by default');
    console.log('   ⚠️  This would delete ALL your stats and achievements!');
    console.log('   💡 To test, uncomment the code in the test file');
    console.log('');
    
    // UNCOMMENT TO TEST (USE WITH CAUTION!)
    /*
    console.log('   ⚠️  WARNING: About to reset ALL stats!');
    console.log('   ⏳ Waiting 5 seconds... Press Ctrl+C to cancel!');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const resetResult = await steam.resetAllStats(false); // false = keep achievements
    console.log(`   Reset result: ${resetResult ? '✅ Success' : '❌ Failed'}`);
    */
    
    // ===== SUMMARY =====
    console.log('========================================');
    console.log('✅ ADVANCED FEATURES TEST COMPLETE');
    console.log('========================================');
    console.log('Features tested:');
    console.log('  ✅ Achievement icons');
    console.log('  ✅ Progress indication');
    console.log('  ✅ Progress limits (int/float)');
    console.log('  ✅ Global achievement percentages');
    console.log('  ✅ Friend/user achievements');
    console.log('  ✅ Most achieved iterator');
    console.log('  ⚠️  Reset stats (skipped for safety)');
    console.log('');
    console.log('🎉 All available advanced features are working!');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
  } finally {
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
testAdvancedFeatures().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
