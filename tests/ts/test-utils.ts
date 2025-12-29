/**
 * Steam Utils Manager Test
 * Tests ISteamUtils functionality including:
 * - System information (battery, country, server time)
 * - Steam Deck and Big Picture mode detection
 * - Overlay notification positioning
 * - Image loading from Steam cache
 * - Device environment information
 */

import SteamworksSDK, { 
  ENotificationPosition,
  EGamepadTextInputMode,
  EGamepadTextInputLineMode,
  BATTERY_POWER_AC
} from '../../src';

// Get Steam instance
const steam = SteamworksSDK.getInstance();

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║              STEAM UTILS MANAGER TEST                                 ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');
console.log();

// Initialize Steam API
console.log('Initializing Steam API...');
const initResult = steam.init({ appId: 480 });
if (!initResult) {
  console.error('❌ Failed to initialize Steam API. Make sure Steam is running.');
  process.exit(1);
}

const status = steam.getStatus();
console.log(`✅ Steam API initialized`);
console.log(`   App ID: ${status.appId}`);
console.log(`   Steam ID: ${status.steamId}`);
console.log();

// ============================================
// Test 1: System Information
// ============================================
console.log('┌──────────────────────────────────────────────────────────────────────┐');
console.log('│ Test 1: System Information                                           │');
console.log('└──────────────────────────────────────────────────────────────────────┘');

try {
  // IP Country
  const country = steam.utils.getIPCountry();
  console.log(`📍 IP Country: ${country || 'Unknown'}`);
  
  // App ID
  const appId = steam.utils.getAppID();
  console.log(`🎮 App ID: ${appId}`);
  
  // Server Time
  const serverTime = steam.utils.getServerRealTime();
  const serverDate = steam.utils.getServerRealTimeAsDate();
  console.log(`⏰ Server Time: ${serverTime} (${serverDate.toISOString()})`);
  
  // Activity times
  const appActiveTime = steam.utils.getSecondsSinceAppActive();
  const computerActiveTime = steam.utils.getSecondsSinceComputerActive();
  console.log(`⏱️  Seconds since app active: ${appActiveTime}`);
  console.log(`⏱️  Seconds since computer active: ${computerActiveTime}`);
  
  // Connected universe
  const universe = steam.utils.getConnectedUniverse();
  const universeNames: { [key: number]: string } = {
    0: 'Invalid',
    1: 'Public',
    2: 'Beta',
    3: 'Internal',
    4: 'Dev'
  };
  console.log(`🌐 Connected Universe: ${universeNames[universe] || universe}`);
  
  // Steam UI Language
  const uiLanguage = steam.utils.getSteamUILanguage();
  console.log(`🗣️  Steam UI Language: ${uiLanguage}`);
  
  console.log();
} catch (error) {
  console.error('❌ Error getting system info:', error);
}

// ============================================
// Test 2: Battery Status
// ============================================
console.log('┌──────────────────────────────────────────────────────────────────────┐');
console.log('│ Test 2: Battery Status                                               │');
console.log('└──────────────────────────────────────────────────────────────────────┘');

try {
  const battery = steam.utils.getCurrentBatteryPower();
  const isOnBattery = steam.utils.isOnBattery();
  
  if (battery === BATTERY_POWER_AC) {
    console.log('🔌 Power Status: Connected to AC power');
    console.log(`   Battery value: ${battery} (BATTERY_POWER_AC)`);
  } else {
    console.log(`🔋 Battery Level: ${battery}%`);
    if (battery < 20) {
      console.log('   ⚠️  Low battery warning!');
    }
  }
  
  console.log(`   isOnBattery(): ${isOnBattery}`);
  console.log();
} catch (error) {
  console.error('❌ Error getting battery status:', error);
}

// ============================================
// Test 3: Device Detection
// ============================================
console.log('┌──────────────────────────────────────────────────────────────────────┐');
console.log('│ Test 3: Device Detection                                             │');
console.log('└──────────────────────────────────────────────────────────────────────┘');

try {
  const isSteamDeck = steam.utils.isSteamRunningOnSteamDeck();
  const isBigPicture = steam.utils.isSteamInBigPictureMode();
  const isVRStreaming = steam.utils.isVRHeadsetStreamingEnabled();
  const isSteamChina = steam.utils.isSteamChinaLauncher();
  
  console.log(`🎮 Steam Deck: ${isSteamDeck ? '✅ Yes' : '❌ No'}`);
  console.log(`📺 Big Picture Mode: ${isBigPicture ? '✅ Yes' : '❌ No'}`);
  console.log(`🥽 VR Streaming: ${isVRStreaming ? '✅ Yes' : '❌ No'}`);
  console.log(`🇨🇳 Steam China: ${isSteamChina ? '✅ Yes' : '❌ No'}`);
  
  if (isSteamDeck) {
    console.log();
    console.log('   🎮 Running on Steam Deck - consider:');
    console.log('      - Target 40Hz for better battery life');
    console.log('      - Enable touch/trackpad controls');
    console.log('      - Optimize for handheld screen');
  }
  
  if (isBigPicture) {
    console.log();
    console.log('   📺 Big Picture Mode detected - consider:');
    console.log('      - Use controller-friendly UI');
    console.log('      - Increase font sizes');
  }
  
  console.log();
} catch (error) {
  console.error('❌ Error detecting device:', error);
}

// ============================================
// Test 4: Device Environment (Convenience Method)
// ============================================
console.log('┌──────────────────────────────────────────────────────────────────────┐');
console.log('│ Test 4: Device Environment Summary                                   │');
console.log('└──────────────────────────────────────────────────────────────────────┘');

try {
  const env = steam.utils.getDeviceEnvironment();
  
  console.log('Device Environment:');
  console.log(`   Steam Deck:      ${env.isSteamDeck}`);
  console.log(`   Big Picture:     ${env.isBigPictureMode}`);
  console.log(`   VR Streaming:    ${env.isVRStreamingEnabled}`);
  console.log(`   Steam China:     ${env.isSteamChina}`);
  console.log(`   On Battery:      ${env.isOnBattery}`);
  console.log(`   Battery Percent: ${env.batteryPercent !== null ? env.batteryPercent + '%' : 'N/A (AC)'}`);
  console.log(`   IP Country:      ${env.ipCountry}`);
  console.log(`   UI Language:     ${env.steamUILanguage}`);
  console.log(`   Universe:        ${env.connectedUniverse}`);
  console.log();
} catch (error) {
  console.error('❌ Error getting device environment:', error);
}

// ============================================
// Test 5: Overlay Notification Position
// ============================================
console.log('┌──────────────────────────────────────────────────────────────────────┐');
console.log('│ Test 5: Overlay Notification Position                                │');
console.log('└──────────────────────────────────────────────────────────────────────┘');

try {
  console.log('Testing notification position settings...');
  
  // Test each position
  const positions = [
    { pos: ENotificationPosition.TopLeft, name: 'Top Left' },
    { pos: ENotificationPosition.TopRight, name: 'Top Right' },
    { pos: ENotificationPosition.BottomLeft, name: 'Bottom Left' },
    { pos: ENotificationPosition.BottomRight, name: 'Bottom Right' },
  ];
  
  for (const { pos, name } of positions) {
    steam.utils.setOverlayNotificationPosition(pos);
    console.log(`   ✅ Set position: ${name}`);
  }
  
  // Set back to default (bottom right)
  steam.utils.setOverlayNotificationPosition(ENotificationPosition.BottomRight);
  console.log('   Reset to default: Bottom Right');
  
  // Test inset
  steam.utils.setOverlayNotificationInset(50, 50);
  console.log('   ✅ Set notification inset: 50px horizontal, 50px vertical');
  
  // Reset inset
  steam.utils.setOverlayNotificationInset(0, 0);
  console.log('   Reset inset to 0');
  
  // Check if overlay needs present
  const needsPresent = steam.utils.overlayNeedsPresent();
  console.log(`   Overlay needs present: ${needsPresent}`);
  
  console.log();
} catch (error) {
  console.error('❌ Error setting notification position:', error);
}

// ============================================
// Test 6: Image Loading
// ============================================
console.log('┌──────────────────────────────────────────────────────────────────────┐');
console.log('│ Test 6: Image Loading                                                │');
console.log('└──────────────────────────────────────────────────────────────────────┘');

try {
  // Get avatar from current user for testing
  const myName = steam.friends.getPersonaName();
  console.log(`Getting avatar for: ${myName}`);
  
  // Try to get small avatar (32x32)
  const steamId64 = steam.getStatus().steamId;
  const smallAvatarHandle = steam.friends.getSmallFriendAvatar(steamId64);
  console.log(`   Small avatar handle: ${smallAvatarHandle}`);
  
  if (smallAvatarHandle > 0) {
    // Get image size
    const size = steam.utils.getImageSize(smallAvatarHandle);
    if (size) {
      console.log(`   Image size: ${size.width}x${size.height}`);
      
      // Get image RGBA data
      const image = steam.utils.getImageRGBA(smallAvatarHandle);
      if (image) {
        console.log(`   ✅ Loaded RGBA image:`);
        console.log(`      Dimensions: ${image.width}x${image.height}`);
        console.log(`      Buffer size: ${image.data.length} bytes`);
        console.log(`      Expected: ${image.width * image.height * 4} bytes`);
        
        // Show first few pixels (RGBA)
        if (image.data.length >= 16) {
          console.log(`      First 4 pixels (RGBA):`);
          for (let i = 0; i < 4; i++) {
            const offset = i * 4;
            const r = image.data[offset];
            const g = image.data[offset + 1];
            const b = image.data[offset + 2];
            const a = image.data[offset + 3];
            console.log(`        Pixel ${i}: R=${r}, G=${g}, B=${b}, A=${a}`);
          }
        }
      } else {
        console.log('   ⚠️ Failed to load image RGBA data');
      }
    } else {
      console.log('   ⚠️ Failed to get image size');
    }
  } else {
    console.log('   ⚠️ No avatar handle (avatar may not be cached yet)');
  }
  
  // Try medium avatar (64x64)
  const mediumAvatarHandle = steam.friends.getMediumFriendAvatar(steamId64);
  console.log(`   Medium avatar handle: ${mediumAvatarHandle}`);
  if (mediumAvatarHandle > 0) {
    const mediumSize = steam.utils.getImageSize(mediumAvatarHandle);
    if (mediumSize) {
      console.log(`   Medium size: ${mediumSize.width}x${mediumSize.height}`);
    }
  }
  
  console.log();
} catch (error) {
  console.error('❌ Error loading images:', error);
}

// ============================================
// Test 7: IPC Call Count
// ============================================
console.log('┌──────────────────────────────────────────────────────────────────────┐');
console.log('│ Test 7: IPC Call Count (Performance Monitoring)                      │');
console.log('└──────────────────────────────────────────────────────────────────────┘');

try {
  // Get initial count
  const initialCount = steam.utils.getIPCCallCount();
  console.log(`Initial IPC call count: ${initialCount}`);
  
  // Make some API calls
  steam.utils.getIPCountry();
  steam.utils.getAppID();
  steam.utils.getCurrentBatteryPower();
  steam.utils.getServerRealTime();
  steam.friends.getPersonaName();
  
  // Get count after calls
  const afterCount = steam.utils.getIPCCallCount();
  console.log(`After 5 calls: ${afterCount}`);
  console.log(`Calls made: ${afterCount - initialCount}`);
  
  console.log();
} catch (error) {
  console.error('❌ Error getting IPC count:', error);
}

// ============================================
// Test 8: Text Filtering
// ============================================
console.log('┌──────────────────────────────────────────────────────────────────────┐');
console.log('│ Test 8: Text Filtering                                               │');
console.log('└──────────────────────────────────────────────────────────────────────┘');

try {
  // Initialize text filtering
  const initFilter = steam.utils.initFilterText();
  console.log(`Text filter initialized: ${initFilter}`);
  
  if (initFilter) {
    // Test with normal text
    const steamId = steam.getStatus().steamId;
    const normalText = 'Hello World!';
    const filteredNormal = steam.utils.filterText(1, steamId, normalText, 256);
    console.log(`Normal text: "${normalText}" -> "${filteredNormal}"`);
    
    // Test with potentially problematic text
    const testText = 'This is a test message';
    const filteredTest = steam.utils.filterText(2, steamId, testText, 256);
    console.log(`Test text: "${testText}" -> "${filteredTest}"`);
  }
  
  console.log();
} catch (error) {
  console.error('❌ Error with text filtering:', error);
}

// ============================================
// Summary
// ============================================
console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║                        TEST SUMMARY                                   ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');

const env = steam.utils.getDeviceEnvironment();
console.log();
console.log('Device Environment Summary:');
console.log(`  🌍 Country: ${env.ipCountry}`);
console.log(`  🗣️  Language: ${env.steamUILanguage}`);
console.log(`  🎮 Steam Deck: ${env.isSteamDeck ? 'Yes' : 'No'}`);
console.log(`  📺 Big Picture: ${env.isBigPictureMode ? 'Yes' : 'No'}`);
console.log(`  🔋 Power: ${env.isOnBattery ? env.batteryPercent + '%' : 'AC Power'}`);
console.log();

// Shutdown
console.log('Shutting down Steam API...');
steam.shutdown();
console.log('✅ Test completed successfully!');
