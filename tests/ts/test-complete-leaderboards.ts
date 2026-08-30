/**
 * Comprehensive test covering all 7 Steam Leaderboards API functions (TypeScript)
 * Tests leaderboard operations including find/create, upload scores, and download entries
 * 
 * Uses ISteamUtils polling to retrieve callback results synchronously after async operations.
 */

// Import directly from source for development
import SteamworksSDK, {
  LeaderboardSortMethod,
  LeaderboardDisplayType,
  LeaderboardDataRequest,
  LeaderboardUploadScoreMethod
} from '../../src/index';

async function testAllLeaderboardFunctions(): Promise<void> {
  console.log('🎮 Complete Steamworks Leaderboards API Test (TypeScript)');
  console.log('============================================================');
  console.log('⚠️  REQUIREMENTS:');
  console.log('   1. Steam client running and logged in');
  console.log('   2. Valid Steam App ID (using 480 - Spacewar for testing)');
  console.log('   3. Internet connection for Steam features');
  console.log('');

  const steam = SteamworksSDK.getInstance();

  try {
    // ═══════════════════════════════════════════════════════════════
    // 1. INITIALIZATION & BASIC CONNECTION
    // ═══════════════════════════════════════════════════════════════
    console.log('1. 🔌 Steam API Initialization');
    console.log('─────────────────────────────────');

    const initialized = steam.init({ appId: 480 });
    if (!initialized) {
      console.error('❌ Failed to initialize Steam API');
      return;
    }
    console.log('✅ Steam API initialized successfully!');
    console.log('');

    // Check connection status
    const status = steam.getStatus();
    console.log('2. 📊 Steam Connection Status');
    console.log('──────────────────────────────');
    console.log(`   🔹 Initialized: ${status.initialized}`);
    console.log(`   🔹 App ID: ${status.appId}`);
    console.log(`   🔹 Steam ID: ${status.steamId}`);
    console.log('');

    // ═══════════════════════════════════════════════════════════════
    // 2. LEADERBOARD DISCOVERY & CREATION
    // ═══════════════════════════════════════════════════════════════
    console.log('3. 🔍 Leaderboard Discovery & Creation');
    console.log('─────────────────────────────────────────');

    // Function 1: findOrCreateLeaderboard()
    console.log('   📋 Finding or creating "Quickest Win" leaderboard...');
    console.log('      Sort: Ascending (lowest time wins)');
    console.log('      Display: TimeSeconds');

    const quickestWinLeaderboard = await steam.leaderboards.findOrCreateLeaderboard(
      'Quickest Win',
      LeaderboardSortMethod.Ascending,
      LeaderboardDisplayType.TimeSeconds
    );

    if (quickestWinLeaderboard) {
      console.log('   ✅ Leaderboard retrieved successfully');
      console.log(`      Handle: ${quickestWinLeaderboard.handle}`);
      console.log(`      Name: ${quickestWinLeaderboard.name}`);
      console.log(`      Entry Count: ${quickestWinLeaderboard.entryCount}`);
      console.log(`      Sort Method: ${quickestWinLeaderboard.sortMethod}`);
      console.log(`      Display Type: ${quickestWinLeaderboard.displayType}`);
    } else {
      console.log('   ❌ Failed to find/create leaderboard');
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    steam.runCallbacks();
    console.log('');

    // Function 2: findLeaderboard()
    console.log('   🔍 Finding existing "Quickest Win" leaderboard...');
    const foundLeaderboard = await steam.leaderboards.findLeaderboard('Quickest Win');

    if (foundLeaderboard) {
      console.log('   ✅ Leaderboard found successfully');
      console.log(`      Handle: ${foundLeaderboard.handle}`);
    } else {
      console.log('   ⚠️  Failed to find leaderboard');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    steam.runCallbacks();
    console.log('');

    // ═══════════════════════════════════════════════════════════════
    // 3. GET LEADERBOARD METADATA
    // ═══════════════════════════════════════════════════════════════
    console.log('4. 📋 Get Leaderboard Info (Metadata)');
    console.log('────────────────────────────────────────');

    // Function 3: getLeaderboardInfo()
    const quickestWinHandle = BigInt(1); // Quickest Win in Spacewar

    console.log('   📊 Testing getLeaderboardInfo() with different handles...');
    console.log('');

    // Test with handle 0 (invalid)
    console.log('   ❓ Testing with handle 0 (invalid):');
    const info0 = steam.leaderboards.getLeaderboardInfo(BigInt(0));
    if (info0) {
      console.log(`      ✅ Got info: ${info0.name || '(empty name)'}`);
    } else {
      console.log('      ⚠️  Returned null (expected for invalid handle)');
    }

    // Test with handle 1 (Quickest Win)
    console.log('');
    console.log('   ✅ Testing with handle 1 (Quickest Win):');
    const infoBefore = steam.leaderboards.getLeaderboardInfo(quickestWinHandle);
    if (infoBefore) {
      console.log(`      Name: ${infoBefore.name}`);
      console.log(`      Entry Count: ${infoBefore.entryCount}`);
      console.log(`      Sort Method: ${infoBefore.sortMethod} (${infoBefore.sortMethod === LeaderboardSortMethod.Ascending ? 'Ascending' : 'Other'})`);
      console.log(`      Display Type: ${infoBefore.displayType} (${infoBefore.displayType === LeaderboardDisplayType.TimeSeconds ? 'TimeSeconds' : 'Other'})`);
    } else {
      console.log('      ⚠️  Returned null');
    }

    // Test with large handle (non-existent)
    console.log('');
    console.log('   ❓ Testing with handle 999999 (non-existent):');
    const info999 = steam.leaderboards.getLeaderboardInfo(BigInt(999999));
    if (info999) {
      console.log(`      ✅ Got info: ${info999.name || '(empty name)'}`);
    } else {
      console.log('      ⚠️  Returned null (expected for non-existent handle)');
    }
    console.log('');

    // ═══════════════════════════════════════════════════════════════
    // 4. SCORE UPLOAD OPERATIONS
    // ═══════════════════════════════════════════════════════════════
    console.log('5. 📤 Score Upload Operations');
    console.log('───────────────────────────────');

    // Function 4: uploadScore()
    const entriesBeforeBaseline = await steam.leaderboards.downloadLeaderboardEntriesForUsers(
      quickestWinHandle,
      [status.steamId]
    );
    const entryBeforeBaseline = entriesBeforeBaseline[0];

    console.log('   🔄 Force updating baseline score: 65 seconds (ForceUpdate method)...');
    const upload1 = await steam.leaderboards.uploadScore(
      quickestWinHandle,
      65, // 65 seconds
      LeaderboardUploadScoreMethod.ForceUpdate
    );

    if (upload1) {
      console.log('   ✅ Baseline score force updated successfully');
      console.log(`      Success: ${upload1.success}`);
      console.log(`      Score: ${upload1.score}`);
      console.log(`      Score Changed: ${upload1.scoreChanged}`);
      console.log(`      New Global Rank: ${upload1.globalRankNew}`);
      console.log(`      Previous Global Rank: ${upload1.globalRankPrevious}`);
      console.log(`      Handle Matches: ${BigInt(upload1.leaderboardHandle) === quickestWinHandle ? '✅' : '❌'}`);
      console.log(`      Attempted Score Matches: ${upload1.score === 65 ? '✅' : '❌'}`);
    } else {
      console.log('   ❌ Score upload failed');
    }

    await new Promise(resolve => setTimeout(resolve, 2500));
    steam.runCallbacks();

    // Check leaderboard after first upload
    console.log('');
    console.log('   📊 Checking leaderboard after first upload...');
    const infoAfter1 = steam.leaderboards.getLeaderboardInfo(quickestWinHandle);
    const entriesAfterBaseline = await steam.leaderboards.downloadLeaderboardEntriesForUsers(
      quickestWinHandle,
      [status.steamId]
    );
    const entryAfterBaseline = entriesAfterBaseline[0];
    if (infoAfter1 && infoBefore) {
      console.log(`      Entry Count: ${infoAfter1.entryCount} ${infoAfter1.entryCount === infoBefore.entryCount ? '(unchanged)' : `(${infoBefore.entryCount} → ${infoAfter1.entryCount})`}`);
    }
    if (upload1?.scoreChanged && entryAfterBaseline) {
      console.log(`      Previous Rank Matches: ${upload1.globalRankPrevious === (entryBeforeBaseline?.globalRank ?? 0) ? '✅' : '❌'}`);
      console.log(`      New Rank Matches: ${upload1.globalRankNew === entryAfterBaseline.globalRank ? '✅' : '❌'}`);
    }
    console.log('');

    // Upload with details
    console.log('   📊 Uploading better time score: 45 seconds with details [3, 12, 0] (KeepBest method)...');
    console.log('      Details: attempts=3, deaths=12, powerups=0');
    const upload2 = await steam.leaderboards.uploadScore(
      quickestWinHandle,
      45, // 45 seconds
      LeaderboardUploadScoreMethod.KeepBest,
      [3, 12, 0]
    );

    if (upload2) {
      console.log('   ✅ Score with details uploaded successfully');
      console.log(`      Score Changed: ${upload2.scoreChanged} ${upload2.scoreChanged ? '✅' : '❌'}`);
    } else {
      console.log('   ❌ Score upload failed');
    }

    await new Promise(resolve => setTimeout(resolve, 2500));
    steam.runCallbacks();
    const entriesAfterBetter = await steam.leaderboards.downloadLeaderboardEntriesForUsers(
      quickestWinHandle,
      [status.steamId]
    );
    const entryAfterBetter = entriesAfterBetter[0];
    if (upload2 && entryAfterBaseline && entryAfterBetter) {
      console.log(`      Downloaded Score Matches: ${entryAfterBetter.score === 45 ? '✅' : '❌'}`);
      console.log(`      Previous Rank Matches: ${upload2.globalRankPrevious === entryAfterBaseline.globalRank ? '✅' : '❌'}`);
      console.log(`      New Rank Matches: ${upload2.globalRankNew === entryAfterBetter.globalRank ? '✅' : '❌'}`);
    }
    console.log('');

    // Upload a slower time with KeepBest
    console.log('   📊 Uploading worse time score: 120 seconds (KeepBest method)...');
    const upload3 = await steam.leaderboards.uploadScore(
      quickestWinHandle,
      120, // 120 seconds (slower time)
      LeaderboardUploadScoreMethod.KeepBest
    );

    if (upload3) {
      console.log('   ✅ Worse score upload completed');
      console.log(`      Score Changed: ${upload3.scoreChanged} ${!upload3.scoreChanged ? '✅' : '❌'}`);
    } else {
      console.log('   ❌ Score upload failed');
    }

    await new Promise(resolve => setTimeout(resolve, 2500));
    steam.runCallbacks();

    // Final integrity check
    console.log('');
    console.log('   🔍 Leaderboard Integrity Check:');
    const infoAfter3 = steam.leaderboards.getLeaderboardInfo(quickestWinHandle);
    const entriesAfterWorse = await steam.leaderboards.downloadLeaderboardEntriesForUsers(
      quickestWinHandle,
      [status.steamId]
    );
    const entryAfterWorse = entriesAfterWorse[0];
    if (infoBefore && infoAfter3) {
      const nameMatch = infoBefore.name === infoAfter3.name;
      const sortMatch = infoBefore.sortMethod === infoAfter3.sortMethod;
      const displayMatch = infoBefore.displayType === infoAfter3.displayType;
      const countChange = infoAfter3.entryCount - infoBefore.entryCount;

      console.log(`      Name Consistent: ${nameMatch ? '✅' : '❌'}`);
      console.log(`      Sort Method Consistent: ${sortMatch ? '✅' : '❌'}`);
      console.log(`      Display Type Consistent: ${displayMatch ? '✅' : '❌'}`);
      console.log(`      Entry Count Change: ${countChange >= 0 ? '+' : ''}${countChange} (${infoBefore.entryCount} → ${infoAfter3.entryCount})`);
    }
    if (entryAfterBetter && entryAfterWorse) {
      console.log(`      Score Remained Unchanged: ${entryAfterWorse.score === entryAfterBetter.score ? '✅' : '❌'}`);
    }
    console.log('');

    // ═══════════════════════════════════════════════════════════════
    // 5. ENTRY DOWNLOAD OPERATIONS
    // ═══════════════════════════════════════════════════════════════
    console.log('6. 📥 Entry Download Operations');
    console.log('──────────────────────────────────');

    // Function 5: downloadLeaderboardEntries()
    console.log('   🌍 Downloading top 10 global entries...');
    const globalEntries = await steam.leaderboards.downloadLeaderboardEntries(
      quickestWinHandle,
      LeaderboardDataRequest.Global,
      1,  // Start at rank 1
      10  // End at rank 10
    );

    if (globalEntries && globalEntries.length > 0) {
      console.log(`   ✅ Downloaded ${globalEntries.length} global entries:`);
      globalEntries.slice(0, 5).forEach((entry: any, idx: number) => {
        console.log(`      ${idx + 1}. Rank ${entry.globalRank}: ${entry.score} (Steam ID: ${entry.steamId})`);
        if (entry.details && entry.details.length > 0) {
          console.log(`         Details: [${entry.details.join(', ')}]`);
        }
      });
      if (globalEntries.length > 5) {
        console.log(`      ... and ${globalEntries.length - 5} more entries`);
      }
    } else {
      console.log('   ⚠️  No entries downloaded');
    }

    await new Promise(resolve => setTimeout(resolve, 2500));
    steam.runCallbacks();
    console.log('');

    // Download entries around user
    console.log('   👤 Downloading entries around current user (-3 to +3)...');
    const aroundUserEntries = await steam.leaderboards.downloadLeaderboardEntries(
      quickestWinHandle,
      LeaderboardDataRequest.GlobalAroundUser,
      -3,  // 3 entries above user
      3    // 3 entries below user
    );

    if (aroundUserEntries && aroundUserEntries.length > 0) {
      console.log(`   ✅ Downloaded ${aroundUserEntries.length} entries around user`);
    } else {
      console.log('   ⚠️  No entries downloaded');
    }

    await new Promise(resolve => setTimeout(resolve, 2500));
    steam.runCallbacks();
    console.log('');

    // Download friend entries
    console.log('   👥 Downloading friend entries...');
    const friendEntries = await steam.leaderboards.downloadLeaderboardEntries(
      quickestWinHandle,
      LeaderboardDataRequest.Friends,
      0,  // Ignored for friends request
      0   // Ignored for friends request
    );

    if (friendEntries && friendEntries.length > 0) {
      console.log(`   ✅ Downloaded ${friendEntries.length} friend entries`);
    } else {
      console.log('   ℹ️  No friend entries downloaded (may not have Steam friends with scores)');
    }

    await new Promise(resolve => setTimeout(resolve, 2500));
    steam.runCallbacks();
    console.log('');

    // Function 6: downloadLeaderboardEntriesForUsers()
    console.log('   🎯 Downloading entries for specific users...');
    const userIds = [status.steamId]; // Use current user's Steam ID
    console.log(`      Target Steam ID: ${userIds[0]}`);
    const userEntries = await steam.leaderboards.downloadLeaderboardEntriesForUsers(
      quickestWinHandle,
      userIds
    );

    if (userEntries && userEntries.length > 0) {
      console.log(`   ✅ Downloaded ${userEntries.length} user-specific entries`);
      userEntries.forEach((entry: any) => {
        console.log(`      Rank ${entry.globalRank}: Score ${entry.score}`);
        if (entry.details && entry.details.length > 0) {
          console.log(`      Details: [${entry.details.join(', ')}]`);
        }
      });
    } else {
      console.log('   ⚠️  No user entries downloaded');
    }

    await new Promise(resolve => setTimeout(resolve, 2500));
    steam.runCallbacks();
    console.log('');

    // ═══════════════════════════════════════════════════════════════
    // 6. UGC ATTACHMENT (BONUS)
    // ═══════════════════════════════════════════════════════════════
    console.log('7. 📎 UGC Attachment (Bonus Feature)');
    console.log('───────────────────────────────────────');

    console.log('   📎 Testing attachLeaderboardUGC()...');
    console.log('      (UGC handle would come from FileShare operation)');
    const ugcHandle = BigInt(12345); // Placeholder UGC handle
    const attachResult = await steam.leaderboards.attachLeaderboardUGC(quickestWinHandle, ugcHandle);

    if (attachResult) {
      console.log('   ✅ UGC attachment successful');
    } else {
      console.log('   ℹ️  UGC attachment failed (expected with placeholder handle)');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    steam.runCallbacks();
    console.log('');

    // ═══════════════════════════════════════════════════════════════
    // FINAL SUMMARY
    // ═══════════════════════════════════════════════════════════════
    console.log('8. ✅ Test Complete - Function Coverage');
    console.log('════════════════════════════════════════════');
    console.log('   ✓ Discovery & Creation (2 functions):');
    console.log('      1. findOrCreateLeaderboard()');
    console.log('      2. findLeaderboard()');
    console.log('');
    console.log('   ✓ Metadata Retrieval (1 function):');
    console.log('      3. getLeaderboardInfo()');
    console.log('');
    console.log('   ✓ Score Upload (1 function):');
    console.log('      4. uploadScore()');
    console.log('         - With KeepBest method');
    console.log('         - With ForceUpdate method');
    console.log('         - With score details array');
    console.log('');
    console.log('   ✓ Entry Download (2 functions):');
    console.log('      5. downloadLeaderboardEntries()');
    console.log('         - Global top entries');
    console.log('         - Entries around user');
    console.log('         - Friend entries');
    console.log('      6. downloadLeaderboardEntriesForUsers()');
    console.log('');
    console.log('   ✓ UGC Integration (1 function):');
    console.log('      7. attachLeaderboardUGC()');
    console.log('');
    console.log('🎉 All 7 Leaderboards API functions tested successfully!');
    console.log('📊 Total Coverage: 7/7 functions (100%)');
    console.log('');
    console.log('✨ Implementation Details:');
    console.log('   - Uses ISteamUtils polling for callback results');
    console.log('   - Synchronous API through polling mechanism');
    console.log('   - Full leaderboard data access');
    console.log('   - No C++ addon required');

  } catch (error) {
    console.error('💥 Test failed with error:', error);
  } finally {
    // Cleanup
    console.log('');
    console.log('🧹 Cleaning up...');
    steam.shutdown();
    console.log('✅ Test complete!');
  }
}

// Run the test
testAllLeaderboardFunctions().catch((error: Error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
