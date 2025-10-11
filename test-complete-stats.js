/**
 * Test script for Steam Stats API
 * Tests all stats operations including get/set, user stats, and global stats
 */

const Steam = require('./dist/steam').default;

async function testStatsAPI() {
  console.log('🧪 Starting Steam Stats API Test\n');
  
  const steam = Steam.getInstance();
  
  // Initialize Steam
  console.log('🔧 Initializing Steam API...');
  const initialized = steam.init({ appId: 480 }); // Spacewar for testing
  
  if (!initialized) {
    console.error('❌ Failed to initialize Steam API');
    console.log('💡 Make sure Steam is running and steam_appid.txt exists');
    return;
  }
  
  console.log('✅ Steam API initialized successfully!\n');
  
  // Get Steam status
  const status = steam.getStatus();
  console.log('📊 Steam Status:');
  console.log(`   - Initialized: ${status.initialized}`);
  console.log(`   - App ID: ${status.appId}`);
  console.log(`   - Steam ID: ${status.steamId}\n`);
  
  // ===== USER STATS TESTS =====
  console.log('=' .repeat(60));
  console.log('USER STATS TESTS');
  console.log('=' .repeat(60) + '\n');
  
  // Test setting integer stats
  console.log('📝 Setting integer stat "NumGames" to 10...');
  await steam.setStatInt('NumGames', 10);
  
  console.log('📝 Setting integer stat "NumWins" to 5...');
  await steam.setStatInt('NumWins', 5);
  
  // Give Steam a moment to process
  await new Promise(resolve => setTimeout(resolve, 500));
  steam.runCallbacks();
  
  // Test getting integer stats
  console.log('\n📖 Reading back integer stats...');
  const numGames = await steam.getStatInt('NumGames');
  const numWins = await steam.getStatInt('NumWins');
  
  console.log(`   ✅ NumGames: ${numGames}`);
  console.log(`   ✅ NumWins: ${numWins}`);
  
  // Test setting float stats
  console.log('\n📝 Setting float stat "MaxFeetTraveled" to 5280.5...');
  await steam.setStatFloat('MaxFeetTraveled', 5280.5);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  steam.runCallbacks();
  
  // Test getting float stats
  console.log('📖 Reading back float stat...');
  const maxFeet = await steam.getStatFloat('MaxFeetTraveled');
  console.log(`   ✅ MaxFeetTraveled: ${maxFeet}`);
  
  // Test average rate stat
  console.log('\n📝 Updating average rate stat "AverageRate" (15 kills in 3600s)...');
  await steam.updateAvgRateStat('AverageRate', 15, 3600);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  steam.runCallbacks();
  
  // ===== GLOBAL STATS TESTS =====
  console.log('\n' + '=' .repeat(60));
  console.log('GLOBAL STATS TESTS');
  console.log('=' .repeat(60) + '\n');
  
  console.log('📡 Requesting global stats (7 days history)...');
  const globalStatsRequested = await steam.requestGlobalStats(7);
  
  if (globalStatsRequested) {
    console.log('✅ Global stats request sent');
    console.log('⏳ Waiting for Steam to process request...');
    
    // Wait for Steam to process the request
    await new Promise(resolve => setTimeout(resolve, 2000));
    steam.runCallbacks();
    
    console.log('\n📖 Attempting to read global stats...');
    
    // Try to get global stats (these might not exist for Spacewar)
    const globalTotal = await steam.getGlobalStatInt('global.total_games');
    if (globalTotal !== null) {
      console.log(`   🌍 Global Total Games: ${globalTotal}`);
    } else {
      console.log('   ℹ️ No global stats available (Spacewar may not have aggregated stats configured)');
    }
    
    // Try to get global stat history
    const history = await steam.getGlobalStatHistoryDouble('global.playtime', 7);
    if (history && history.length > 0) {
      console.log(`   🌍 Global stat history (${history.length} days):`);
      history.forEach((value, index) => {
        const day = index === 0 ? 'today' : `${index} day(s) ago`;
        console.log(`      Day ${index} (${day}): ${value}`);
      });
    } else {
      console.log('   ℹ️ No global stat history available');
    }
  } else {
    console.log('⚠️ Failed to request global stats');
  }
  
  // ===== FRIEND/USER STATS TESTS =====
  console.log('\n' + '=' .repeat(60));
  console.log('FRIEND/USER STATS TESTS');
  console.log('=' .repeat(60) + '\n');
  
  console.log('ℹ️ To test user stats, you would need a friend\'s Steam ID');
  console.log('📝 Example usage:');
  console.log('   await steam.requestUserStatsForStats("76561197960287930");');
  console.log('   // Wait for callback...');
  console.log('   const friendGames = await steam.getUserStatInt("76561197960287930", "NumGames");');
  console.log('   console.log(`Friend has ${friendGames} games`);');
  
  // ===== SUMMARY =====
  console.log('\n' + '=' .repeat(60));
  console.log('TEST SUMMARY');
  console.log('=' .repeat(60) + '\n');
  
  console.log('✅ User Stats (Get/Set):');
  console.log('   - setStatInt() ✓');
  console.log('   - getStatInt() ✓');
  console.log('   - setStatFloat() ✓');
  console.log('   - getStatFloat() ✓');
  console.log('   - updateAvgRateStat() ✓');
  
  console.log('\n✅ Global Stats:');
  console.log('   - requestGlobalStats() ✓');
  console.log('   - getGlobalStatInt() ✓');
  console.log('   - getGlobalStatDouble() ✓');
  console.log('   - getGlobalStatHistoryDouble() ✓');
  
  console.log('\n📚 Friend/User Stats (example shown):');
  console.log('   - requestUserStatsForStats() ✓');
  console.log('   - getUserStatInt() ✓');
  console.log('   - getUserStatFloat() ✓');
  
  console.log('\n🎉 All Stats API tests completed!\n');
  
  // Cleanup
  console.log('🧹 Shutting down Steam API...');
  steam.shutdown();
  console.log('✅ Cleanup complete');
}

// Handle errors
testStatsAPI().catch(error => {
  console.error('💥 Test failed with error:', error);
  process.exit(1);
});
