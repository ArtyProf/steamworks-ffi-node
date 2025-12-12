/**
 * Test script for Steam Leaderboards API
 * Tests leaderboard operations including find/create, upload scores, and download entries
 * 
 * Uses ISteamUtils polling to retrieve callback results synchronously after async operations.
 */

const SteamworksSDK = require('../../dist/index').default;
const { 
  LeaderboardSortMethod, 
  LeaderboardDisplayType, 
  LeaderboardDataRequest,
  LeaderboardUploadScoreMethod 
} = require('../../dist/index');

async function testLeaderboardsAPI() {
  console.log('🧪 Starting Steam Leaderboards API Test\n');
  
  const steam = SteamworksSDK.getInstance();
  
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
  
  // ===== FIND/CREATE LEADERBOARD TESTS =====
  console.log('=' .repeat(60));
  console.log('LEADERBOARD DISCOVERY TESTS');
  console.log('=' .repeat(60) + '\n');
  
  // Test creating/finding the Quickest Win leaderboard
  console.log('🔍 Finding or creating "Quickest Win" leaderboard...');
  console.log('   Sort: Ascending (lowest time wins)');
  console.log('   Display: TimeSeconds');
  
  const quickestWinLeaderboard = await steam.leaderboards.findOrCreateLeaderboard(
    'Quickest Win',
    LeaderboardSortMethod.Ascending,
    LeaderboardDisplayType.TimeSeconds
  );
  
  if (quickestWinLeaderboard) {
    console.log('✅ Leaderboard retrieved successfully');
    console.log(`   Handle: ${quickestWinLeaderboard.handle}`);
    console.log(`   Name: ${quickestWinLeaderboard.name}`);
    console.log(`   Entry Count: ${quickestWinLeaderboard.entryCount}`);
    console.log(`   Sort Method: ${quickestWinLeaderboard.sortMethod}`);
    console.log(`   Display Type: ${quickestWinLeaderboard.displayType}`);
    
    // Try to get leaderboard info using the handle
    console.log('\n📋 Getting leaderboard info for handle...');
    const leaderboardInfo = await steam.leaderboards.getLeaderboardInfo(quickestWinLeaderboard.handle);
    if (leaderboardInfo) {
      console.log('✅ Retrieved leaderboard info:');
      console.log(`   Name: ${leaderboardInfo.name}`);
      console.log(`   Entry Count: ${leaderboardInfo.entryCount}`);
      console.log(`   Sort Method: ${leaderboardInfo.sortMethod}`);
      console.log(`   Display Type: ${leaderboardInfo.displayType}`);
    } else {
      console.log('⚠️  getLeaderboardInfo returned null');
    }
  } else {
    console.log('❌ Failed to find/create leaderboard');
  }
  
  // Wait for Steam to process
  await new Promise(resolve => setTimeout(resolve, 3000));
  steam.runCallbacks();
  console.log('');
  
  // Test finding existing Quickest Win leaderboard
  console.log('🔍 Finding existing "Quickest Win" leaderboard...');
  const foundLeaderboard = await steam.leaderboards.findLeaderboard('Quickest Win');
  
  if (foundLeaderboard) {
    console.log('✅ Leaderboard found successfully');
    console.log(`   Handle: ${foundLeaderboard.handle}`);
    
    // Try to get info for the found leaderboard
    console.log('\n📋 Getting info for found leaderboard...');
    const foundInfo = await steam.leaderboards.getLeaderboardInfo(foundLeaderboard.handle);
    if (foundInfo) {
      console.log('✅ Retrieved info:');
      console.log(`   Name: ${foundInfo.name}`);
      console.log(`   Entry Count: ${foundInfo.entryCount}`);
    } else {
      console.log('⚠️  getLeaderboardInfo returned null');
    }
  } else {
    console.log('❌ Failed to find leaderboard');
  }

  await new Promise(resolve => setTimeout(resolve, 3000));
  steam.runCallbacks();
  console.log('');  // ===== GET LEADERBOARD INFO TESTS =====
  console.log('=' .repeat(60));
  console.log('GET LEADERBOARD INFO TESTS');
  console.log('=' .repeat(60) + '\n');
  
  // Test with various handle values
  console.log('📋 Testing getLeaderboardInfo with different handles...\n');
  
  // Test with handle 0 (invalid)
  console.log('   Testing with handle 0 (invalid):');
  const info0 = await steam.leaderboards.getLeaderboardInfo(BigInt(0));
  if (info0) {
    console.log(`   ✅ Got info: ${info0.name || '(empty name)'}`);
  } else {
    console.log('   ⚠️  Returned null (expected for invalid handle)');
  }
  
  // Test with handle 1 (Quickest Win in Spacewar)
  console.log('\n   Testing with handle 1 (Quickest Win):');
  const info1 = await steam.leaderboards.getLeaderboardInfo(BigInt(1));
  if (info1) {
    console.log(`   ✅ Got info for: ${info1.name}`);
    console.log(`      Entry Count: ${info1.entryCount}`);
    console.log(`      Sort Method: ${info1.sortMethod} (${info1.sortMethod === LeaderboardSortMethod.Ascending ? 'Ascending' : 'Other'})`);
    console.log(`      Display Type: ${info1.displayType} (${info1.displayType === LeaderboardDisplayType.TimeSeconds ? 'TimeSeconds' : 'Other'})`);
  } else {
    console.log('   ⚠️  Returned null');
  }
  
  // Test with a large handle value
  console.log('\n   Testing with handle 999999 (non-existent):');
  const info999 = await steam.leaderboards.getLeaderboardInfo(BigInt(999999));
  if (info999) {
    console.log(`   ✅ Got info: ${info999.name || '(empty name)'}`);
  } else {
    console.log('   ⚠️  Returned null (expected for non-existent handle)');
  }
  
  console.log('');
  
  // ===== SCORE UPLOAD TESTS =====
  console.log('=' .repeat(60));
  console.log('SCORE UPLOAD TESTS');
  console.log('=' .repeat(60) + '\n');
  
  // Use handle 1 which corresponds to Quickest Win leaderboard
  const quickestWinHandle = BigInt(1);
  
  // Check leaderboard info before uploads
  console.log('� Checking Quickest Win leaderboard before uploads...');
  const infoBefore = await steam.leaderboards.getLeaderboardInfo(quickestWinHandle);
  if (infoBefore) {
    console.log(`   Name: ${infoBefore.name}`);
    console.log(`   Entry Count BEFORE: ${infoBefore.entryCount}`);
  }
  console.log('');
  
  console.log('�📤 Uploading time score: 65 seconds (KeepBest method)...');
  console.log('   Using Quickest Win leaderboard (handle 1)');
  const upload1 = await steam.leaderboards.uploadScore(
    quickestWinHandle,
    65, // 65 seconds
    LeaderboardUploadScoreMethod.KeepBest
  );
  
  if (upload1) {
    console.log('✅ Score uploaded successfully');
    console.log(`   Success: ${upload1.success}`);
    console.log(`   Score: ${upload1.score}`);
    console.log(`   Score Changed: ${upload1.scoreChanged}`);
    console.log(`   New Global Rank: ${upload1.globalRankNew}`);
    console.log(`   Previous Global Rank: ${upload1.globalRankPrevious}`);
  } else {
    console.log('❌ Score upload failed');
  }
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  steam.runCallbacks();
  
  // Check leaderboard info after first upload
  console.log('\n📋 Checking leaderboard after first upload...');
  const infoAfter1 = await steam.leaderboards.getLeaderboardInfo(quickestWinHandle);
  if (infoAfter1 && infoBefore) {
    console.log(`   Name: ${infoAfter1.name} ${infoAfter1.name === infoBefore.name ? '✓' : '✗ CHANGED'}`);
    console.log(`   Entry Count: ${infoAfter1.entryCount} ${infoAfter1.entryCount === infoBefore.entryCount ? '(unchanged)' : `(${infoBefore.entryCount} → ${infoAfter1.entryCount})`}`);
    console.log(`   Sort Method: ${infoAfter1.sortMethod} ${infoAfter1.sortMethod === infoBefore.sortMethod ? '✓' : '✗ CHANGED'}`);
    console.log(`   Display Type: ${infoAfter1.displayType} ${infoAfter1.displayType === infoBefore.displayType ? '✓' : '✗ CHANGED'}`);
  }
  console.log('');
  
  // Upload time score with details
  console.log('📤 Uploading time score: 45 seconds with details [3, 12, 0]...');
  console.log('   Details: attempts=3, deaths=12, powerups=0');
  const upload2 = await steam.leaderboards.uploadScore(
    quickestWinHandle,
    45, // 45 seconds
    LeaderboardUploadScoreMethod.KeepBest,
    [3, 12, 0]
  );
  
  if (upload2) {
    console.log('✅ Score uploaded successfully');
  } else {
    console.log('❌ Score upload failed');
  }
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  steam.runCallbacks();
  
  // Check leaderboard info after second upload
  console.log('\n📋 Checking leaderboard after second upload...');
  const infoAfter2 = await steam.leaderboards.getLeaderboardInfo(quickestWinHandle);
  if (infoAfter2 && infoAfter1) {
    console.log(`   Name: ${infoAfter2.name} ${infoAfter2.name === infoAfter1.name ? '✓' : '✗ CHANGED'}`);
    console.log(`   Entry Count: ${infoAfter2.entryCount} ${infoAfter2.entryCount === infoAfter1.entryCount ? '(unchanged)' : `(${infoAfter1.entryCount} → ${infoAfter2.entryCount})`}`);
    console.log(`   Sort Method: ${infoAfter2.sortMethod} ${infoAfter2.sortMethod === infoAfter1.sortMethod ? '✓' : '✗ CHANGED'}`);
    console.log(`   Display Type: ${infoAfter2.displayType} ${infoAfter2.displayType === infoAfter1.displayType ? '✓' : '✗ CHANGED'}`);
  }
  console.log('');
  
  // Force update with slower time
  console.log('📤 Force updating time score: 120 seconds (ForceUpdate method)...');
  const upload3 = await steam.leaderboards.uploadScore(
    quickestWinHandle,
    120, // 120 seconds (slower time)
    LeaderboardUploadScoreMethod.ForceUpdate
  );
  
  if (upload3) {
    console.log('✅ Score uploaded successfully (forced)');
  } else {
    console.log('❌ Score upload failed');
  }
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  steam.runCallbacks();
  
  // Check leaderboard info after force update
  console.log('\n📋 Checking leaderboard after force update...');
  const infoAfter3 = await steam.leaderboards.getLeaderboardInfo(quickestWinHandle);
  if (infoAfter3 && infoAfter2) {
    console.log(`   Name: ${infoAfter3.name} ${infoAfter3.name === infoAfter2.name ? '✓' : '✗ CHANGED'}`);
    console.log(`   Entry Count: ${infoAfter3.entryCount} ${infoAfter3.entryCount === infoAfter2.entryCount ? '(unchanged)' : `(${infoAfter2.entryCount} → ${infoAfter3.entryCount})`}`);
    console.log(`   Sort Method: ${infoAfter3.sortMethod} ${infoAfter3.sortMethod === infoAfter2.sortMethod ? '✓' : '✗ CHANGED'}`);
    console.log(`   Display Type: ${infoAfter3.displayType} ${infoAfter3.displayType === infoAfter2.displayType ? '✓' : '✗ CHANGED'}`);
  }
  
  // Final summary - check if any values changed throughout the process
  console.log('\n📊 Leaderboard Integrity Check:');
  if (infoBefore && infoAfter3) {
    const nameMatch = infoBefore.name === infoAfter3.name;
    const sortMatch = infoBefore.sortMethod === infoAfter3.sortMethod;
    const displayMatch = infoBefore.displayType === infoAfter3.displayType;
    const countChange = infoAfter3.entryCount - infoBefore.entryCount;
    
    console.log(`   Name Consistent: ${nameMatch ? '✅' : '❌'}`);
    console.log(`   Sort Method Consistent: ${sortMatch ? '✅' : '❌'}`);
    console.log(`   Display Type Consistent: ${displayMatch ? '✅' : '❌'}`);
    console.log(`   Entry Count Change: ${countChange >= 0 ? '+' : ''}${countChange} (${infoBefore.entryCount} → ${infoAfter3.entryCount})`);
    
    if (nameMatch && sortMatch && displayMatch) {
      console.log(`   ✅ All leaderboard properties remain consistent!`);
    } else {
      console.log(`   ⚠️  Some properties changed unexpectedly!`);
    }
  }
  console.log('');
  
  // ===== ENTRY DOWNLOAD TESTS =====
  console.log('=' .repeat(60));
  console.log('ENTRY DOWNLOAD TESTS');
  console.log('=' .repeat(60) + '\n');
  
  // Download global top entries from Quickest Win
  console.log('📥 Downloading top 10 global entries from Quickest Win...');
  const globalEntries = await steam.leaderboards.downloadLeaderboardEntries(
    quickestWinHandle,
    LeaderboardDataRequest.Global,
    1,  // Start at rank 1
    10  // End at rank 10
  );
  
  if (globalEntries && globalEntries.length > 0) {
    console.log(`✅ Downloaded ${globalEntries.length} entries:`);
    globalEntries.forEach((entry, idx) => {
      console.log(`   ${idx + 1}. Rank ${entry.globalRank}: ${entry.score} (Steam ID: ${entry.steamId})`);
      if (entry.details && entry.details.length > 0) {
        console.log(`      Details: [${entry.details.join(', ')}]`);
      }
    });
  } else {
    console.log('⚠️  No entries downloaded');
  }
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  steam.runCallbacks();
  console.log('');
  
  // Download entries around user
  console.log('📥 Downloading entries around current user on Quickest Win (-3 to +3)...');
  const aroundUserEntries = await steam.leaderboards.downloadLeaderboardEntries(
    quickestWinHandle,
    LeaderboardDataRequest.GlobalAroundUser,
    -3,  // 3 entries above user
    3    // 3 entries below user
  );
  
  if (aroundUserEntries && aroundUserEntries.length > 0) {
    console.log(`✅ Downloaded ${aroundUserEntries.length} entries`);
  } else {
    console.log('⚠️  No entries downloaded');
  }
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  steam.runCallbacks();
  console.log('');
  
  // Download friend entries
  console.log('📥 Downloading friend entries from Quickest Win...');
  const friendEntries = await steam.leaderboards.downloadLeaderboardEntries(
    quickestWinHandle,
    LeaderboardDataRequest.Friends,
    0,  // Ignored for friends request
    0   // Ignored for friends request
  );
  
  if (friendEntries && friendEntries.length > 0) {
    console.log(`✅ Downloaded ${friendEntries.length} friend entries`);
  } else {
    console.log('⚠️  No friend entries downloaded');
  }
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  steam.runCallbacks();
  console.log('');
  
  // Download entries for specific users
  console.log('📥 Downloading entries for specific users on Quickest Win...');
  const userIds = [status.steamId]; // Use current user's Steam ID
  const userEntries = await steam.leaderboards.downloadLeaderboardEntriesForUsers(
    quickestWinHandle,
    userIds
  );
  
  if (userEntries && userEntries.length > 0) {
    console.log(`✅ Downloaded ${userEntries.length} user entries`);
  } else {
    console.log('⚠️  No user entries downloaded');
  }
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  steam.runCallbacks();
  console.log('');
  
  // ===== UGC ATTACHMENT TEST =====
  console.log('=' .repeat(60));
  console.log('UGC ATTACHMENT TEST');
  console.log('=' .repeat(60) + '\n');
  
  console.log('📎 Attaching UGC to Quickest Win leaderboard entry...');
  console.log('   (UGC handle would come from FileShare operation)');
  const ugcHandle = BigInt(12345); // Placeholder UGC handle
  const attachResult = await steam.leaderboards.attachLeaderboardUGC(quickestWinHandle, ugcHandle);
  
  if (attachResult) {
    console.log('✅ UGC attached successfully');
  } else {
    console.log('❌ UGC attachment failed');
  }
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  steam.runCallbacks();
  console.log('');
  
  // ===== SUMMARY =====
  console.log('=' .repeat(60));
  console.log('TEST SUMMARY');
  console.log('=' .repeat(60) + '\n');
  
  console.log('📋 Tests Executed:');
  console.log('   ✅ Leaderboard Discovery (find/create)');
  console.log('   ✅ Get Leaderboard Info (metadata retrieval)');
  console.log('   ✅ Score Upload (simple and with details)');
  console.log('   ✅ Entry Download (global, around user, friends, specific users)');
  console.log('   ✅ UGC Attachment\n');
  
  console.log('✨ Implementation:');
  console.log('   - Uses ISteamUtils polling to retrieve callback results');
  console.log('   - Full access to leaderboard data via synchronous polling');
  console.log('   - No C++ addon required\n');
  
  // Shutdown
  console.log('🔧 Shutting down Steam API...');
  steam.shutdown();
  console.log('✅ Test completed!\n');
}

// Run the test
testLeaderboardsAPI().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});
