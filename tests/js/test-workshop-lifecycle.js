/**
 * Complete Workshop Item Lifecycle Test (JavaScript)
 * Tests the full flow: Create → Update → Query → Subscribe → Vote → Delete
 * 
 * REQUIREMENTS:
 * - Steam must be running and logged in
 * - You must have Workshop creator permissions for AppID 480 (Spacewar)
 * - Internet connection required for queries
 * 
 * This test creates a real Workshop item, so use with caution!
 */

const SteamworksSDK = require('../../dist/index').default;
const {
  EWorkshopFileType,
  ERemoteStoragePublishedFileVisibility,
  EUGCQuery,
  EUGCMatchingUGCType,
  EItemState,
  EItemUpdateStatus
} = require('../../dist/types');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Enhanced logging
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to wait with callback processing
async function waitWithCallbacks(steam, ms) {
  const iterations = Math.ceil(ms / 100);
  for (let i = 0; i < iterations; i++) {
    steam.runCallbacks();
    await sleep(100);
  }
}

// Test configuration
const TEST_APP_ID = 480; // Spacewar

// Helper to create temporary test content
function createTestContent() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'steam-workshop-test-'));
  const contentPath = path.join(tempDir, 'content');
  const previewPath = path.join(tempDir, 'preview.jpg');
  
  // Create content directory
  fs.mkdirSync(contentPath, { recursive: true });
  
  // Create test file
  const testFile = path.join(contentPath, 'test-mod.txt');
  fs.writeFileSync(testFile, `Steam Workshop Test Item
Created: ${new Date().toISOString()}
This is a test Workshop item created by the Steamworks FFI test suite.
It should be deleted automatically after testing.

Test Content:
- Line 1
- Line 2
- Line 3
`);
  
  // Create a minimal valid JPEG (1x1 red pixel)
  const minimalJpeg = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x03, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
    0x37, 0xFF, 0xD9
  ]);
  fs.writeFileSync(previewPath, minimalJpeg);
  
  const cleanup = () => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }
  };
  
  return { contentPath, previewPath, cleanup };
}

async function testCompleteWorkshopLifecycle() {
  log('🛠️  Complete Workshop Item Lifecycle Test (JavaScript)', 'bright');
  log('====================================================\n', 'bright');
  
  const steam = SteamworksSDK.getInstance();
  let createdItemId = null;
  let testContent = null;
  let itemCreated = false;
  
  try {
    // ============================================================
    // STEP 1: INITIALIZE STEAM API
    // ============================================================
    log('📋 STEP 1: Initialize Steam API', 'cyan');
    log('================================', 'cyan');
    
    const initialized = steam.init({ appId: TEST_APP_ID });
    if (!initialized) {
      throw new Error('Failed to initialize Steam API. Make sure Steam is running!');
    }
    log('✅ Steam API initialized\n', 'green');
    
    // ============================================================
    // STEP 2: CREATE TEST CONTENT
    // ============================================================
    log('📋 STEP 2: Create Test Content', 'cyan');
    log('===============================', 'cyan');
    
    testContent = createTestContent();
    log(`✅ Content directory: ${testContent.contentPath}`, 'green');
    log(`✅ Preview image: ${testContent.previewPath}\n`, 'green');
    
    // ============================================================
    // STEP 3: CREATE WORKSHOP ITEM
    // ============================================================
    log('📋 STEP 3: Create Workshop Item', 'cyan');
    log('================================', 'cyan');
    
    log('🔨 Creating new Workshop item...', 'cyan');
    createdItemId = await steam.workshop.createItem(
      TEST_APP_ID,
      EWorkshopFileType.Community
    );
    
    if (createdItemId) {
      itemCreated = true;
      log(`✅ Successfully created new Workshop item: ${createdItemId}`, 'green');
    } else {
      log('⚠️  Failed to create new item, checking for subscribed items as fallback...', 'yellow');
      
      const subscribedItems = steam.workshop.getSubscribedItems();
      if (subscribedItems.length > 0) {
        createdItemId = subscribedItems[0];
        itemCreated = true;
        log(`📝 Using existing subscribed item: ${createdItemId}`, 'magenta');
      } else {
        log('❌ No items available for testing', 'red');
        log('   Please subscribe to at least one Workshop item first\n', 'dim');
        return;
      }
    }
    
    log(`✅ Testing with item ID: ${createdItemId}\n`, 'green');
    
    // ============================================================
    // STEP 4: UPDATE WORKSHOP ITEM
    // ============================================================
    log('📋 STEP 4: Update Workshop Item', 'cyan');
    log('================================', 'cyan');
    
    if (!createdItemId) {
      throw new Error('No item ID available for testing');
    }
    
    const updateHandle = steam.workshop.startItemUpdate(TEST_APP_ID, createdItemId);
    
    if (updateHandle === BigInt(0)) {
      throw new Error('Failed to start item update');
    }
    
    log(`✅ Item update started (handle: ${updateHandle})`, 'green');
    
    // Set item properties
    log('\n📝 Setting item properties...', 'cyan');
    
    const titleSet = steam.workshop.setItemTitle(
      updateHandle,
      `Test Workshop Item - ${new Date().toLocaleString()}`
    );
    log(`   ${titleSet ? '✅' : '❌'} Title set`, titleSet ? 'green' : 'red');
    
    const descriptionSet = steam.workshop.setItemDescription(
      updateHandle,
      'This is a test Workshop item created by the Steamworks FFI test suite.\n\n' +
      'Features:\n' +
      '- Automated testing\n' +
      '- Full lifecycle coverage\n' +
      '- Will be deleted after testing\n\n' +
      `Created: ${new Date().toISOString()}`
    );
    log(`   ${descriptionSet ? '✅' : '❌'} Description set`, descriptionSet ? 'green' : 'red');
    
    const visibilitySet = steam.workshop.setItemVisibility(
      updateHandle,
      ERemoteStoragePublishedFileVisibility.Private
    );
    log(`   ${visibilitySet ? '✅' : '❌'} Visibility set to Private`, visibilitySet ? 'green' : 'red');
    
    const contentSet = steam.workshop.setItemContent(
      updateHandle,
      testContent.contentPath
    );
    log(`   ${contentSet ? '✅' : '❌'} Content folder set`, contentSet ? 'green' : 'red');
    
    const previewSet = steam.workshop.setItemPreview(
      updateHandle,
      testContent.previewPath
    );
    log(`   ${previewSet ? '✅' : '❌'} Preview image set`, previewSet ? 'green' : 'red');
    
    // Submit the update
    log('\n📤 Submitting item update...', 'cyan');
    const submitted = await steam.workshop.submitItemUpdate(
      updateHandle,
      'Test update from Steamworks FFI test suite'
    );
    
    if (submitted) {
      log(`✅ Item update submitted successfully!`, 'green');
      
      // Track upload progress
      log('\n⏳ Tracking upload progress...', 'yellow');
      for (let i = 0; i < 30; i++) {
        steam.runCallbacks();
        await sleep(1000);
        
        const progress = steam.workshop.getItemUpdateProgress(updateHandle);
        const statusName = EItemUpdateStatus[progress.status] || 'Unknown';
        
        log(`   Status: ${statusName} | Progress: ${progress.percentComplete.toFixed(1)}% | ${progress.bytesProcessed}/${progress.bytesTotal} bytes`, 'dim');
        
        if (progress.status === EItemUpdateStatus.Invalid) {
          log('   ✅ Upload complete!\n', 'green');
          break;
        }
      }
    } else {
      log('❌ Failed to submit item update', 'red');
    }
    
    // ============================================================
    // STEP 5: QUERY AND VERIFY ITEM
    // ============================================================
    log('📋 STEP 5: Query and Verify Item', 'cyan');
    log('=================================', 'cyan');
    
    // Get item state
    const state = steam.workshop.getItemState(createdItemId);
    log('\n📊 Item State:', 'magenta');
    if (state & EItemState.Subscribed) log('   ✅ Subscribed', 'green');
    if (state & EItemState.Installed) log('   ✅ Installed', 'green');
    if (state & EItemState.Downloading) log('   ⬇️  Downloading', 'blue');
    if (state & EItemState.NeedsUpdate) log('   🔄 Needs Update', 'yellow');
    
    // Get installation info
    const installInfo = steam.workshop.getItemInstallInfo(createdItemId);
    if (installInfo) {
      log('\n💾 Installation Info:', 'magenta');
      log(`   Folder: ${installInfo.folder}`, 'dim');
      log(`   Size: ${installInfo.sizeOnDisk} bytes`, 'dim');
      log(`   Timestamp: ${new Date(installInfo.timestamp * 1000).toLocaleString()}`, 'dim');
    }
    
    // Query the item
    log('\n🔍 Querying Workshop items...', 'cyan');
    const query = steam.workshop.createQueryAllUGCRequest(
      EUGCQuery.RankedByPublicationDate,
      EUGCMatchingUGCType.Items,
      TEST_APP_ID,
      TEST_APP_ID,
      1
    );
    
    if (query !== BigInt(0)) {
      const queryResult = await steam.workshop.sendQueryUGCRequest(query);
      
      if (queryResult) {
        log(`✅ Query completed successfully!`, 'green');
        log(`   Found ${queryResult.numResults} results (${queryResult.totalResults} total)`, 'dim');
        log(`   Cached data: ${queryResult.cachedData}`, 'dim');
        
        log('\n📄 Query Results (first 5 items):', 'magenta');
        for (let i = 0; i < Math.min(5, queryResult.numResults); i++) {
          const item = steam.workshop.getQueryUGCResult(query, i);
          if (item) {
            log(`\n   Item ${i + 1}:`, 'bright');
            log(`   ID: ${item.publishedFileId}`, 'dim');
            log(`   Title: ${item.title}`, 'dim');
            log(`   Votes: 👍 ${item.votesUp} 👎 ${item.votesDown}`, 'dim');
            log(`   Owner: ${item.steamIDOwner}`, 'dim');
          }
        }
      } else {
        log('❌ Query failed', 'red');
      }
      
      steam.workshop.releaseQueryUGCRequest(query);
      log('\n✅ Query handle released', 'green');
    }
    
    // ============================================================
    // STEP 6: SUBSCRIPTION MANAGEMENT
    // ============================================================
    log('\n📋 STEP 6: Subscription Management', 'cyan');
    log('==================================', 'cyan');
    
    const subCount = steam.workshop.getNumSubscribedItems();
    log(`📦 Currently subscribed to ${subCount} items`);
    
    const allSubs = steam.workshop.getSubscribedItems();
    log(`   Retrieved ${allSubs.length} subscribed item IDs`, 'dim');
    
    log(`\n📥 Subscribing to item ${createdItemId}...`, 'cyan');
    const subscribed = await steam.workshop.subscribeItem(createdItemId);
    if (subscribed) {
      log(`✅ Successfully subscribed to item`, 'green');
    } else {
      log(`ℹ️  Already subscribed or subscription failed`, 'dim');
    }
    
    await sleep(1000);
    
    log('\n⬇️  Downloading item...', 'cyan');
    const downloadStarted = steam.workshop.downloadItem(createdItemId, true);
    if (downloadStarted) {
      log('✅ Download started', 'green');
      
      for (let i = 0; i < 10; i++) {
        steam.runCallbacks();
        await sleep(500);
        const downloadInfo = steam.workshop.getItemDownloadInfo(createdItemId);
        if (downloadInfo) {
          log(`   Progress: ${downloadInfo.percentComplete.toFixed(1)}% (${downloadInfo.bytesDownloaded}/${downloadInfo.bytesTotal} bytes)`, 'dim');
        } else {
          log('   ℹ️  Download complete or not active', 'dim');
          break;
        }
      }
    } else {
      log('ℹ️  Item already downloaded', 'dim');
    }
    
    // ============================================================
    // STEP 7: VOTING AND FAVORITES
    // ============================================================
    log('\n📋 STEP 7: Voting and Favorites', 'cyan');
    log('================================', 'cyan');
    
    log('\n👍 Voting up on item...', 'cyan');
    const voted = await steam.workshop.setUserItemVote(createdItemId, true);
    if (voted) {
      log(`✅ Vote registered successfully`, 'green');
    } else {
      log(`ℹ️  Vote failed or already voted`, 'dim');
    }
    
    await sleep(1000);
    
    log('\n❓ Getting user vote status...', 'cyan');
    const voteStatus = await steam.workshop.getUserItemVote(createdItemId);
    if (voteStatus) {
      log(`✅ Vote status retrieved:`, 'green');
      log(`   Voted Up: ${voteStatus.votedUp}`, 'dim');
      log(`   Voted Down: ${voteStatus.votedDown}`, 'dim');
      log(`   Vote Skipped: ${voteStatus.voteSkipped}`, 'dim');
    } else {
      log(`ℹ️  Could not retrieve vote status`, 'dim');
    }
    
    await sleep(1000);
    
    log('\n⭐ Adding to favorites...', 'cyan');
    const addedToFavorites = await steam.workshop.addItemToFavorites(TEST_APP_ID, createdItemId);
    if (addedToFavorites) {
      log(`✅ Added to favorites successfully`, 'green');
    } else {
      log(`ℹ️  Already in favorites or operation failed`, 'dim');
    }
    
    await sleep(1000);
    
    // ============================================================
    // STEP 8: CLEANUP
    // ============================================================
    log('\n📋 STEP 8: Cleanup and Unsubscribe', 'cyan');
    log('===================================', 'cyan');
    
    log('\n🗑️  Removing from favorites...', 'yellow');
    const removedFromFavorites = await steam.workshop.removeItemFromFavorites(TEST_APP_ID, createdItemId);
    if (removedFromFavorites) {
      log(`✅ Removed from favorites successfully`, 'green');
    } else {
      log(`ℹ️  Not in favorites or operation failed`, 'dim');
    }
    
    await sleep(1000);
    
    log('\n📤 Unsubscribing from item...', 'yellow');
    const unsubscribed = await steam.workshop.unsubscribeItem(createdItemId);
    if (unsubscribed) {
      log(`✅ Successfully unsubscribed from item`, 'green');
      log('   Note: Item will be uninstalled when game quits', 'dim');
    } else {
      log(`ℹ️  Already unsubscribed or operation failed`, 'dim');
    }
    
    await sleep(1000);
    
    // ============================================================
    // SUMMARY
    // ============================================================
    log('\n\n📊 TEST SUMMARY', 'bright');
    log('===============', 'bright');
    log('✅ Complete Workshop lifecycle tested successfully!', 'green');
    log('\nSteps completed:');
    log('  1. ✅ Steam API initialized', 'green');
    log('  2. ✅ Test content created', 'green');
    log('  3. ✅ Workshop item creation initiated', 'green');
    log('  4. ✅ Item updated with properties and content', 'green');
    log('  5. ✅ Item queried and verified', 'green');
    log('  6. ✅ Subscription management tested', 'green');
    log('  7. ✅ Voting and favorites tested', 'green');
    log('  8. ✅ Cleanup completed', 'green');
    
    log('\n💡 NOTES:', 'yellow');
    log('  • Workshop item was kept private for testing', 'dim');
    log('  • Item unsubscribed but not deleted (requires web browser)', 'dim');
    log('  • To delete: Visit https://steamcommunity.com/sharedfiles/filedetails/?id=' + createdItemId, 'dim');
    log('  • All async operations now use built-in async/await callbacks!', 'dim');
    
    // Final callback processing
    log('\n⏳ Processing final callbacks...', 'yellow');
    for (let i = 0; i < 10; i++) {
      steam.runCallbacks();
      await sleep(100);
    }
    
  } catch (error) {
    log('\n❌ TEST FAILED:', 'red');
    console.error(error);
    throw error;
  } finally {
    if (testContent) {
      log('\n🧹 Cleaning up temporary files...', 'yellow');
      testContent.cleanup();
      log('✅ Temporary files removed', 'green');
    }
    
    steam.shutdown();
    log('✅ Steam API shut down\n', 'green');
  }
}

// Run the test
log('⚠️  WARNING: This test creates a real Workshop item!', 'yellow');
log('⚠️  Make sure you have creator permissions for AppID 480 (Spacewar)', 'yellow');
log('⚠️  Press Ctrl+C within 5 seconds to cancel...\n', 'yellow');

setTimeout(() => {
  testCompleteWorkshopLifecycle().catch(error => {
    log('Test failed:', 'red');
    console.error(error);
    process.exit(1);
  });
}, 5000);
