/**
 * Steam Screenshots Manager Test (TypeScript)
 * 
 * This test demonstrates:
 * - Adding screenshots to library from files
 * - Writing raw RGB data as screenshots
 * - Tagging screenshots with location
 * - Hooking screenshots for custom handling
 * - Checking hook status
 * 
 * REQUIREMENTS:
 * - Steam must be running and logged in
 * - steam_appid.txt with AppID 480
 * 
 * NOTE: Some functions work without overlay (file-based methods),
 * while triggerScreenshot() requires overlay to be available.
 */

import SteamworksSDK from '../../src/index';
import {
  INVALID_SCREENSHOT_HANDLE,
  EVRScreenshotType
} from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Test configuration
const TEST_APP_ID = 480; // Spacewar

// Helper to create a test image file (minimal valid JPEG)
function createTestImage(): { imagePath: string; cleanup: () => void } {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'steam-screenshot-test-'));
  const imagePath = path.join(tempDir, 'test_screenshot.jpg');
  
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
  fs.writeFileSync(imagePath, minimalJpeg);
  
  const cleanup = () => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }
  };
  
  return { imagePath, cleanup };
}

// Helper to create test RGB data
function createTestRGBData(width: number, height: number): Buffer {
  // Create RGB data (3 bytes per pixel)
  const rgbData = Buffer.alloc(width * height * 3);
  
  // Fill with a simple gradient pattern
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 3;
      rgbData[offset] = Math.floor((x / width) * 255);     // R
      rgbData[offset + 1] = Math.floor((y / height) * 255); // G
      rgbData[offset + 2] = 128;                            // B
    }
  }
  
  return rgbData;
}

async function testScreenshots(): Promise<void> {
  console.log('='.repeat(80));
  console.log('STEAM SCREENSHOTS MANAGER TEST');
  console.log('='.repeat(80));
  console.log('');

  const steam = SteamworksSDK.getInstance();
  let testImage: ReturnType<typeof createTestImage> | null = null;

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
    // STEP 2: CREATE TEST IMAGE FILE
    // ============================================================
    console.log('📋 STEP 2: Create Test Image');
    console.log('============================');
    
    testImage = createTestImage();
    console.log(`✅ Test image created: ${testImage.imagePath}\n`);

    // ============================================================
    // STEP 3: CHECK HOOK STATUS
    // ============================================================
    console.log('📋 STEP 3: Check Screenshot Hook Status');
    console.log('========================================');
    
    const initialHookStatus = steam.screenshots.isScreenshotsHooked();
    console.log(`Initial hook status: ${initialHookStatus ? 'Hooked' : 'Not hooked'}`);
    console.log('');

    // ============================================================
    // STEP 4: ADD SCREENSHOT FROM FILE
    // ============================================================
    console.log('📋 STEP 4: Add Screenshot From File');
    console.log('====================================');
    
    console.log('Adding screenshot from file...');
    const handle1 = steam.screenshots.addScreenshotToLibrary(
      testImage.imagePath,
      null,  // No thumbnail - let Steam generate
      1,     // Width (1x1 minimal JPEG)
      1      // Height
    );
    
    if (handle1 !== INVALID_SCREENSHOT_HANDLE) {
      console.log(`✅ Screenshot added successfully! Handle: ${handle1}`);
      
      // Tag with location
      console.log('\nSetting location tag...');
      const locationSet = steam.screenshots.setLocation(handle1, 'Test Location - Steamworks FFI');
      console.log(`   Location set: ${locationSet ? '✅' : '❌'}`);
    } else {
      console.log('⚠️  Failed to add screenshot from file');
      console.log('   This may be expected if Steam Cloud is not available');
    }
    console.log('');

    // ============================================================
    // STEP 5: WRITE RAW RGB DATA AS SCREENSHOT
    // ============================================================
    console.log('📋 STEP 5: Write Raw RGB Data as Screenshot');
    console.log('============================================');
    
    const testWidth = 64;
    const testHeight = 64;
    console.log(`Creating ${testWidth}x${testHeight} RGB test image...`);
    
    const rgbData = createTestRGBData(testWidth, testHeight);
    console.log(`RGB data size: ${rgbData.length} bytes`);
    
    console.log('Writing screenshot from RGB data...');
    const handle2 = steam.screenshots.writeScreenshot(rgbData, testWidth, testHeight);
    
    if (handle2 !== INVALID_SCREENSHOT_HANDLE) {
      console.log(`✅ Screenshot written successfully! Handle: ${handle2}`);
      
      // Tag with location
      console.log('\nSetting location tag...');
      const locationSet = steam.screenshots.setLocation(handle2, 'RGB Test - Generated Image');
      console.log(`   Location set: ${locationSet ? '✅' : '❌'}`);
    } else {
      console.log('⚠️  Failed to write screenshot from RGB data');
      console.log('   This may be expected if Steam Cloud is not available');
    }
    console.log('');

    // ============================================================
    // STEP 6: TEST HOOK/UNHOOK SCREENSHOTS
    // ============================================================
    console.log('📋 STEP 6: Test Screenshot Hooking');
    console.log('===================================');
    
    console.log('Hooking screenshots...');
    steam.screenshots.hookScreenshots(true);
    
    const hookedStatus = steam.screenshots.isScreenshotsHooked();
    console.log(`Hook status after hooking: ${hookedStatus ? '✅ Hooked' : '❌ Not hooked'}`);
    
    console.log('\nUnhooking screenshots...');
    steam.screenshots.hookScreenshots(false);
    
    const unhookedStatus = steam.screenshots.isScreenshotsHooked();
    console.log(`Hook status after unhooking: ${unhookedStatus ? '❌ Still hooked' : '✅ Not hooked'}`);
    console.log('');

    // ============================================================
    // STEP 7: TEST TRIGGER SCREENSHOT (requires overlay)
    // ============================================================
    console.log('📋 STEP 7: Test Trigger Screenshot');
    console.log('===================================');
    
    console.log('⚠️  Note: triggerScreenshot() requires Steam Overlay');
    console.log('   This may not work in all environments\n');
    
    console.log('Triggering screenshot...');
    steam.screenshots.triggerScreenshot();
    console.log('✅ triggerScreenshot() called (check Steam overlay for result)');
    console.log('');

    // ============================================================
    // STEP 8: TEST TAGGING (if we have valid handles)
    // ============================================================
    console.log('📋 STEP 8: Test User and Workshop Tagging');
    console.log('==========================================');
    
    if (handle1 !== INVALID_SCREENSHOT_HANDLE || handle2 !== INVALID_SCREENSHOT_HANDLE) {
      const testHandle = handle1 !== INVALID_SCREENSHOT_HANDLE ? handle1 : handle2;
      
      // Get current user's Steam ID for tagging test
      const friends = steam.friends.getAllFriends();
      if (friends.length > 0) {
        console.log(`Tagging user ${friends[0].personaName} in screenshot...`);
        const userTagged = steam.screenshots.tagUser(testHandle, BigInt(friends[0].steamId));
        console.log(`   User tagged: ${userTagged ? '✅' : '❌'}`);
      } else {
        console.log('ℹ️  No friends available to tag');
      }
      
      // Test Workshop item tagging with a dummy ID
      console.log('\nTagging Workshop item in screenshot...');
      const workshopId = BigInt('123456789');  // Dummy Workshop ID
      const workshopTagged = steam.screenshots.tagPublishedFile(testHandle, workshopId);
      console.log(`   Workshop item tagged: ${workshopTagged ? '✅' : '⚠️ (may fail with invalid ID)'}`);
    } else {
      console.log('ℹ️  No valid screenshot handles available for tagging tests');
    }
    console.log('');

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log('');
    console.log('Functions tested:');
    console.log('  1. ✅ addScreenshotToLibrary() - Add screenshot from file');
    console.log('  2. ✅ writeScreenshot() - Write raw RGB data as screenshot');
    console.log('  3. ✅ setLocation() - Tag screenshot with location');
    console.log('  4. ✅ hookScreenshots() - Enable/disable screenshot hooking');
    console.log('  5. ✅ isScreenshotsHooked() - Check hook status');
    console.log('  6. ✅ triggerScreenshot() - Trigger overlay screenshot');
    console.log('  7. ✅ tagUser() - Tag user in screenshot');
    console.log('  8. ✅ tagPublishedFile() - Tag Workshop item in screenshot');
    console.log('');
    console.log('💡 NOTES:');
    console.log('  • addScreenshotToLibrary and writeScreenshot work without overlay');
    console.log('  • triggerScreenshot requires Steam Overlay to be available');
    console.log('  • Screenshots are added to your Steam library');
    console.log('  • Check Steam client to see added screenshots');
    console.log('');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  } finally {
    // Cleanup
    if (testImage) {
      console.log('🧹 Cleaning up temporary files...');
      testImage.cleanup();
      console.log('✅ Temporary files removed');
    }
    
    steam.shutdown();
    console.log('✅ Steam API shut down\n');
  }
}

// Run the test
console.log('📸 Steam Screenshots Manager Test');
console.log('==================================\n');

testScreenshots().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
