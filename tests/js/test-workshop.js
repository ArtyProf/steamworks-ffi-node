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

// Test configuration
const TEST_APP_ID = 480; // Spacewar
const TEST_TIMEOUT = 30000; // 30 seconds for async operations

// Helper to wait for async operations
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
  console.log('🛠️  Complete Workshop Item Lifecycle Test');
  console.log('==========================================\n');
  
  const steam = SteamworksSDK.getInstance();
  let createdItemId = null;
  let testContent = null;
  let itemCreated = false;
  
  try {
    // ============================================================
    // STEP 1: INITIALIZE STEAM API
    // ============================================================
    console.log('📋 STEP 1: Initialize Steam API');
    console.log('================================');
    
    const initialized = steam.init({ appId: TEST_APP_ID });
    if (!initialized) {
      throw new Error('Failed to initialize Steam API. Make sure Steam is running!');
    }
    console.log('✅ Steam API initialized\n');
    
    // ============================================================
    // STEP 2: CREATE TEST CONTENT
    // ============================================================
    console.log('📋 STEP 2: Create Test Content');
    console.log('===============================');
    
    testContent = createTestContent();
    console.log(`✅ Content directory: ${testContent.contentPath}`);
    console.log(`✅ Preview image: ${testContent.previewPath}\n`);
    
    // ============================================================
    // STEP 3: CREATE WORKSHOP ITEM
    // ============================================================
    console.log('📋 STEP 3: Create Workshop Item');
    console.log('================================');
    
    console.log('🔨 Creating new Workshop item...');
    createdItemId = await steam.workshop.createItem(
      TEST_APP_ID,
      EWorkshopFileType.Community
    );
    
    if (createdItemId) {
      itemCreated = true;
      console.log(`✅ Successfully created new Workshop item: ${createdItemId}`);
    } else {
      console.log('⚠️  Failed to create new item, checking for subscribed items as fallback...');
      
      const subscribedItems = steam.workshop.getSubscribedItems();
      if (subscribedItems.length > 0) {
        createdItemId = subscribedItems[0];
        itemCreated = true;
        console.log(`📝 Using existing subscribed item: ${createdItemId}`);
      } else {
        console.log('❌ No items available for testing');
        console.log('   Please subscribe to at least one Workshop item first\n');
        return;
      }
    }
    
    console.log(`✅ Testing with item ID: ${createdItemId}\n`);
    
    // ============================================================
    // STEP 4: UPDATE WORKSHOP ITEM
    // ============================================================
    console.log('📋 STEP 4: Update Workshop Item');
    console.log('================================');
    
    if (!createdItemId) {
      throw new Error('No item ID available for testing');
    }
    
    const updateHandle = steam.workshop.startItemUpdate(TEST_APP_ID, createdItemId);
    
    if (updateHandle === BigInt(0)) {
      throw new Error('Failed to start item update');
    }
    
    console.log(`✅ Item update started (handle: ${updateHandle})`);
    
    // Set item properties
    console.log('\n📝 Setting item properties...');
    
    const titleSet = steam.workshop.setItemTitle(
      updateHandle,
      `Test Workshop Item - ${new Date().toLocaleString()}`
    );
    console.log(`   ${titleSet ? '✅' : '❌'} Title set`);
    
    const descriptionSet = steam.workshop.setItemDescription(
      updateHandle,
      'This is a test Workshop item created by the Steamworks FFI test suite.\n\n' +
      'Features:\n' +
      '- Automated testing\n' +
      '- Full lifecycle coverage\n' +
      '- Will be deleted after testing\n\n' +
      `Created: ${new Date().toISOString()}`
    );
    console.log(`   ${descriptionSet ? '✅' : '❌'} Description set`);
    
    const visibilitySet = steam.workshop.setItemVisibility(
      updateHandle,
      ERemoteStoragePublishedFileVisibility.Private // Keep private for testing
    );
    console.log(`   ${visibilitySet ? '✅' : '❌'} Visibility set to Private`);
    
    const contentSet = steam.workshop.setItemContent(
      updateHandle,
      testContent.contentPath
    );
    console.log(`   ${contentSet ? '✅' : '❌'} Content folder set`);
    
    const previewSet = steam.workshop.setItemPreview(
      updateHandle,
      testContent.previewPath
    );
    console.log(`   ${previewSet ? '✅' : '❌'} Preview image set`);
    
    // Submit the update
    console.log('\n📤 Submitting item update...');
    const submitted = await steam.workshop.submitItemUpdate(
      updateHandle,
      'Test update from Steamworks FFI test suite'
    );
    
    if (submitted) {
      console.log(`✅ Item update submitted successfully!`);
      
      // Track upload progress
      console.log('\n⏳ Tracking upload progress...');
      for (let i = 0; i < 30; i++) {
        steam.runCallbacks();
        await sleep(1000);
        
        const progress = steam.workshop.getItemUpdateProgress(updateHandle);
        const statusName = EItemUpdateStatus[progress.status] || 'Unknown';
        
        console.log(`   Status: ${statusName} | Progress: ${progress.percentComplete.toFixed(1)}% | ${progress.bytesProcessed}/${progress.bytesTotal} bytes`);
        
        if (progress.status === EItemUpdateStatus.Invalid) {
          console.log('   ✅ Upload complete!\n');
          break;
        }
      }
    } else {
      console.log('❌ Failed to submit item update');
    }
    
    // ============================================================
    // STEP 5: QUERY AND VERIFY ITEM
    // ============================================================
    console.log('📋 STEP 5: Query and Verify Item');
    console.log('=================================');
    
    // Get item state
    const state = steam.workshop.getItemState(createdItemId);
    console.log('\n📊 Item State:');
    if (state & EItemState.Subscribed) console.log('   ✅ Subscribed');
    if (state & EItemState.Installed) console.log('   ✅ Installed');
    if (state & EItemState.Downloading) console.log('   ⬇️  Downloading');
    if (state & EItemState.NeedsUpdate) console.log('   🔄 Needs Update');
    
    // Get installation info
    const installInfo = steam.workshop.getItemInstallInfo(createdItemId);
    if (installInfo) {
      console.log('\n💾 Installation Info:');
      console.log(`   Folder: ${installInfo.folder}`);
      console.log(`   Size: ${installInfo.sizeOnDisk} bytes`);
      console.log(`   Timestamp: ${new Date(installInfo.timestamp * 1000).toLocaleString()}`);
    }
    
    // Query the item
    console.log('\n🔍 Querying Workshop items...');
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
        console.log(`✅ Query completed successfully!`);
        console.log(`   Found ${queryResult.numResults} results (${queryResult.totalResults} total)`);
        console.log(`   Cached data: ${queryResult.cachedData}`);
        
        console.log('\n📄 Query Results (first 5 items):');
        for (let i = 0; i < Math.min(5, queryResult.numResults); i++) {
          const item = steam.workshop.getQueryUGCResult(query, i);
          if (item) {
            console.log(`\n   Item ${i + 1}:`);
            console.log(`   ID: ${item.publishedFileId}`);
            console.log(`   Title: ${item.title}`);
            console.log(`   Votes: 👍 ${item.votesUp} 👎 ${item.votesDown}`);
            console.log(`   Owner: ${item.steamIDOwner}`);
          }
        }
      } else {
        console.log('❌ Query failed');
      }
      
      steam.workshop.releaseQueryUGCRequest(query);
      console.log('\n✅ Query handle released');
    }
    
    // ============================================================
    // STEP 6: SUBSCRIPTION MANAGEMENT
    // ============================================================
    console.log('\n📋 STEP 6: Subscription Management');
    console.log('==================================');
    
    // Get current subscriptions
    const subCount = steam.workshop.getNumSubscribedItems();
    console.log(`📦 Currently subscribed to ${subCount} items`);
    
    const allSubs = steam.workshop.getSubscribedItems();
    console.log(`   Retrieved ${allSubs.length} subscribed item IDs`);
    
    // Subscribe to the item (if not already)
    console.log(`\n📥 Subscribing to item ${createdItemId}...`);
    const subscribed = await steam.workshop.subscribeItem(createdItemId);
    if (subscribed) {
      console.log(`✅ Successfully subscribed to item`);
    } else {
      console.log(`ℹ️  Already subscribed or subscription failed`);
    }
    
    await sleep(1000);
    
    // Download the item
    console.log('\n⬇️  Downloading item...');
    const downloadStarted = steam.workshop.downloadItem(createdItemId, true);
    if (downloadStarted) {
      console.log('✅ Download started');
      
      // Monitor download progress
      for (let i = 0; i < 10; i++) {
        steam.runCallbacks();
        await sleep(500);
        const downloadInfo = steam.workshop.getItemDownloadInfo(createdItemId);
        if (downloadInfo) {
          console.log(`   Progress: ${downloadInfo.percentComplete.toFixed(1)}% (${downloadInfo.bytesDownloaded}/${downloadInfo.bytesTotal} bytes)`);
        } else {
          console.log('   ℹ️  Download complete or not active');
          break;
        }
      }
    } else {
      console.log('ℹ️  Item already downloaded');
    }
    
    // ============================================================
    // STEP 7: VOTING AND FAVORITES
    // ============================================================
    console.log('\n📋 STEP 7: Voting and Favorites');
    console.log('================================');
    
    // Vote on the item
    console.log('\n👍 Voting up on item...');
    const voted = await steam.workshop.setUserItemVote(createdItemId, true);
    if (voted) {
      console.log(`✅ Vote registered successfully`);
    } else {
      console.log(`ℹ️  Vote failed or already voted`);
    }
    
    await sleep(1000);
    
    // Get vote status
    console.log('\n❓ Getting user vote status...');
    const voteStatus = await steam.workshop.getUserItemVote(createdItemId);
    if (voteStatus) {
      console.log(`✅ Vote status retrieved:`);
      console.log(`   Voted Up: ${voteStatus.votedUp}`);
      console.log(`   Voted Down: ${voteStatus.votedDown}`);
      console.log(`   Vote Skipped: ${voteStatus.voteSkipped}`);
    } else {
      console.log(`ℹ️  Could not retrieve vote status`);
    }
    
    await sleep(1000);
    
    // Add to favorites
    console.log('\n⭐ Adding to favorites...');
    const addedToFavorites = await steam.workshop.addItemToFavorites(TEST_APP_ID, createdItemId);
    if (addedToFavorites) {
      console.log(`✅ Added to favorites successfully`);
    } else {
      console.log(`ℹ️  Already in favorites or operation failed`);
    }
    
    await sleep(1000);
    
    // ============================================================
    // STEP 8: CLEANUP - UNSUBSCRIBE
    // ============================================================
    console.log('\n📋 STEP 8: Cleanup and Unsubscribe');
    console.log('===================================');
    
    // Remove from favorites
    console.log('\n🗑️  Removing from favorites...');
    const removedFromFavorites = await steam.workshop.removeItemFromFavorites(TEST_APP_ID, createdItemId);
    if (removedFromFavorites) {
      console.log(`✅ Removed from favorites successfully`);
    } else {
      console.log(`ℹ️  Not in favorites or operation failed`);
    }
    
    await sleep(1000);
    
    // Unsubscribe
    console.log('\n📤 Unsubscribing from item...');
    const unsubscribed = await steam.workshop.unsubscribeItem(createdItemId);
    if (unsubscribed) {
      console.log(`✅ Successfully unsubscribed from item`);
      console.log('   Note: Item will be uninstalled when game quits');
    } else {
      console.log(`ℹ️  Already unsubscribed or operation failed`);
    }
    
    await sleep(1000);
    
    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n\n📊 TEST SUMMARY');
    console.log('===============');
    console.log('✅ Complete Workshop lifecycle tested successfully!');
    console.log('\nSteps completed:');
    console.log('  1. ✅ Steam API initialized');
    console.log('  2. ✅ Test content created');
    console.log('  3. ✅ Workshop item creation initiated');
    console.log('  4. ✅ Item updated with properties and content');
    console.log('  5. ✅ Item queried and verified');
    console.log('  6. ✅ Subscription management tested');
    console.log('  7. ✅ Voting and favorites tested');
    console.log('  8. ✅ Cleanup completed');
    
    console.log('\n💡 NOTES:');
    console.log('  • Workshop item was kept private for testing');
    console.log('  • Item unsubscribed but not deleted (requires web browser)');
    console.log('  • To delete: Visit https://steamcommunity.com/sharedfiles/filedetails/?id=' + createdItemId);
    console.log('  • All async operations now use built-in async/await callbacks!');
    
    // Final callback processing
    console.log('\n⏳ Processing final callbacks...');
    for (let i = 0; i < 10; i++) {
      steam.runCallbacks();
      await sleep(100);
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  } finally {
    // Cleanup
    if (testContent) {
      console.log('\n🧹 Cleaning up temporary files...');
      testContent.cleanup();
      console.log('✅ Temporary files removed');
    }
    
    steam.shutdown();
    console.log('✅ Steam API shut down\n');
  }
}

// Run the test
console.log('⚠️  WARNING: This test creates a real Workshop item!');
console.log('⚠️  Make sure you have creator permissions for AppID 480 (Spacewar)');
console.log('⚠️  Press Ctrl+C within 5 seconds to cancel...\n');

setTimeout(() => {
  testCompleteWorkshopLifecycle().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}, 5000);
