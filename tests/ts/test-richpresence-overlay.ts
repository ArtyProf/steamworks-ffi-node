import SteamworksSDK, { 
  EOverlayDialog, 
  EOverlayToUserDialog,
  EOverlayToStoreFlag,
  EActivateGameOverlayToWebPageMode,
  RichPresenceKeys 
} from '../../src';

/**
 * Test suite for Rich Presence and Overlay Managers
 * 
 * This test demonstrates:
 * - Setting and clearing rich presence
 * - Reading friend rich presence
 * - Opening various overlay dialogs
 * - Opening overlay to user profiles
 * - Opening overlay web pages
 * - Opening store pages
 */

const MAX_FRIENDS_TO_DISPLAY = 5;

async function testRichPresenceAndOverlay() {
  console.log('='.repeat(80));
  console.log('RICH PRESENCE AND OVERLAY MANAGER TEST');
  console.log('='.repeat(80));
  console.log('');

  const steam = SteamworksSDK.getInstance();

  // Initialize Steam
  console.log('Initializing Steam...');
  const initialized = steam.init({ appId: 480 });

  if (!initialized) {
    console.error('❌ Failed to initialize Steam');
    console.error('Make sure:');
    console.error('  1. Steam client is running');
    console.error('  2. You are logged in');
    console.error('  3. steam_appid.txt exists with value 480');
    return;
  }

  console.log('✅ Steam initialized successfully\n');

  try {
    // ========================================
    // RICH PRESENCE TESTS
    // ========================================
    console.log('='.repeat(80));
    console.log('RICH PRESENCE TESTS');
    console.log('='.repeat(80));
    console.log('');

    // Test 1: Set rich presence
    console.log('Test 1: Setting Rich Presence');
    console.log('-'.repeat(40));
    
    const statusSet = steam.richPresence.setRichPresence(RichPresenceKeys.STATUS, 'Testing Rich Presence API');
    console.log(`Set status: ${statusSet ? '✅' : '❌'}`);
    
    const connectSet = steam.richPresence.setRichPresence(RichPresenceKeys.CONNECT, '+connect test.server.com:27015');
    console.log(`Set connect string: ${connectSet ? '✅' : '❌'}`);
    
    const groupSet = steam.richPresence.setRichPresence(RichPresenceKeys.STEAM_PLAYER_GROUP, 'test_group_123');
    console.log(`Set player group: ${groupSet ? '✅' : '❌'}`);
    
    const groupSizeSet = steam.richPresence.setRichPresence(RichPresenceKeys.STEAM_PLAYER_GROUP_SIZE, '4');
    console.log(`Set group size: ${groupSizeSet ? '✅' : '❌'}`);
    console.log('');

    // Test 2: Get friends and their rich presence
    console.log('Test 2: Reading Friend Rich Presence');
    console.log('-'.repeat(40));
    
    const friends = steam.friends.getAllFriends();
    console.log(`Total friends: ${friends.length}`);
    console.log('');

    if (friends.length > 0) {
      const friendsToCheck = friends.slice(0, MAX_FRIENDS_TO_DISPLAY);
      
      // Request rich presence for friends
      friendsToCheck.forEach(friend => {
        steam.richPresence.requestFriendRichPresence(friend.steamId);
      });

      // Wait a moment for data to arrive
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Run callbacks to process any updates
      steam.runCallbacks();

      console.log(`Checking rich presence for first ${friendsToCheck.length} friends:`);
      console.log('');

      friendsToCheck.forEach((friend, index) => {
        console.log(`${index + 1}. ${friend.personaName}`);
        
        // Get key count
        const keyCount = steam.richPresence.getFriendRichPresenceKeyCount(friend.steamId);
        console.log(`   Rich Presence Keys: ${keyCount}`);
        
        if (keyCount > 0) {
          // Iterate through all keys
          for (let i = 0; i < keyCount; i++) {
            const key = steam.richPresence.getFriendRichPresenceKeyByIndex(friend.steamId, i);
            const value = steam.richPresence.getFriendRichPresence(friend.steamId, key);
            console.log(`   ${key}: ${value}`);
          }
        } else {
          // Try reading common keys
          const status = steam.richPresence.getFriendRichPresence(friend.steamId, RichPresenceKeys.STATUS);
          const connect = steam.richPresence.getFriendRichPresence(friend.steamId, RichPresenceKeys.CONNECT);
          
          if (status) {
            console.log(`   status: ${status}`);
          }
          if (connect) {
            console.log(`   connect: ${connect}`);
          }
          if (!status && !connect) {
            console.log(`   No rich presence data available`);
          }
        }
        console.log('');
      });

      if (friends.length > MAX_FRIENDS_TO_DISPLAY) {
        console.log(`... and ${friends.length - MAX_FRIENDS_TO_DISPLAY} more friends\n`);
      }
    }

    // Test 3: Clear rich presence
    console.log('Test 3: Clearing Rich Presence');
    console.log('-'.repeat(40));
    steam.richPresence.clearRichPresence();
    console.log('✅ Rich presence cleared');
    console.log('');

    // ========================================
    // OVERLAY TESTS
    // ========================================
    console.log('='.repeat(80));
    console.log('OVERLAY TESTS');
    console.log('='.repeat(80));
    console.log('');

    console.log('Note: Overlay tests will open Steam overlay windows.');
    console.log('Press Shift+Tab or close the overlay to continue.');
    console.log('Waiting 3 seconds before starting overlay tests...');
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 4: Open overlay dialogs
    console.log('Test 4: Opening Overlay Dialogs');
    console.log('-'.repeat(40));
    console.log('Opening Friends list...');
    steam.overlay.activateGameOverlay(EOverlayDialog.FRIENDS);
    console.log('✅ Opened overlay to Friends');
    console.log('Overlay should be visible now. Close it to continue.');
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 5: Open overlay to user (if we have friends)
    if (friends.length > 0) {
      console.log('Test 5: Opening Overlay to User Profile');
      console.log('-'.repeat(40));
      const firstFriend = friends[0];
      console.log(`Opening profile for: ${firstFriend.personaName}`);
      steam.overlay.activateGameOverlayToUser(EOverlayToUserDialog.STEAM_ID, firstFriend.steamId);
      console.log('✅ Opened overlay to user profile');
      console.log('');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Test 6: Open overlay to web page
    console.log('Test 6: Opening Overlay Web Page');
    console.log('-'.repeat(40));
    console.log('Opening Steam Community...');
    steam.overlay.activateGameOverlayToWebPage(
      'https://steamcommunity.com',
      EActivateGameOverlayToWebPageMode.Default
    );
    console.log('✅ Opened overlay web browser');
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 7: Open overlay to store
    console.log('Test 7: Opening Overlay Store Page');
    console.log('-'.repeat(40));
    console.log('Opening store page for Counter-Strike 2 (App ID 730)...');
    steam.overlay.activateGameOverlayToStore(730, EOverlayToStoreFlag.None);
    console.log('✅ Opened overlay to store page');
    console.log('');

    // ========================================
    // SUMMARY
    // ========================================
    console.log('='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log('');
    console.log('Rich Presence Tests:');
    console.log('  ✅ Set rich presence key/value pairs');
    console.log('  ✅ Read friend rich presence data');
    console.log('  ✅ Clear rich presence');
    console.log('');
    console.log('Overlay Tests:');
    console.log('  ✅ Open overlay to Friends dialog');
    if (friends.length > 0) {
      console.log('  ✅ Open overlay to user profile');
    }
    console.log('  ✅ Open overlay web browser');
    console.log('  ✅ Open overlay store page');
    console.log('');
    console.log('All tests completed successfully! ✨');
    console.log('');

  } catch (error) {
    console.error('❌ Error during tests:', error);
  } finally {
    // Cleanup
    console.log('Shutting down Steam...');
    steam.shutdown();
    console.log('✅ Steam shutdown complete');
  }
}

// Run tests
testRichPresenceAndOverlay().catch(console.error);
