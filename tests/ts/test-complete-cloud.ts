/**
 * Comprehensive test covering all 14 Steam Cloud API functions (TypeScript)
 * This test demonstrates the complete Steamworks FFI cloud storage functionality
 */

import SteamworksSDK from '../../src/index';

async function testAllCloudFunctions(): Promise<void> {
  console.log('🌥️  Complete Steamworks Cloud API Test (TypeScript)');
  console.log('==================================================');
  
  const steam = SteamworksSDK.getInstance();
  
  // Initialize with Spacewar
  console.log('\n1. Initializing Steam API (AppID 480 - Spacewar)...');
  const initialized = steam.init({ appId: 480 });
  
  if (!initialized) {
    console.error('❌ Failed to initialize Steam API');
    console.error('   Make sure Steam is running and you are logged in');
    return;
  }
  
  console.log('✅ Steam API initialized!');
  
  // Check cloud status
  console.log('\n2. Checking Steam Cloud Status...');
  const accountEnabled = steam.cloud.isCloudEnabledForAccount();
  const appEnabled = steam.cloud.isCloudEnabledForApp();
  
  console.log(`   Account Cloud: ${accountEnabled ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   App Cloud: ${appEnabled ? '✅ Enabled' : '❌ Disabled'}`);
  
  if (!accountEnabled) {
    console.warn('⚠️  Cloud is disabled in your Steam settings!');
    console.warn('   Enable it in Steam > Settings > Cloud');
  }
  
  // Check quota
  console.log('\n3. Checking Cloud Quota...');
  const quota = steam.cloud.getQuota();
  console.log(`   Total: ${quota.totalBytes} bytes (${(quota.totalBytes / 1024).toFixed(2)} KB)`);
  console.log(`   Used: ${quota.usedBytes} bytes`);
  console.log(`   Available: ${quota.availableBytes} bytes (${(quota.availableBytes / 1024).toFixed(2)} KB)`);
  console.log(`   Usage: ${quota.percentUsed.toFixed(1)}%`);
  
  // Write a test file
  console.log('\n4. Writing Test File...');
  const testData = {
    timestamp: new Date().toISOString(),
    message: 'Hello from Steamworks FFI!',
    score: 12345
  };
  
  const testFilename = 'steamworks_ffi_test.json';
  const buffer = Buffer.from(JSON.stringify(testData, null, 2));
  
  const written = steam.cloud.fileWrite(testFilename, buffer);
  if (written) {
    console.log(`✅ File written: ${testFilename} (${buffer.length} bytes)`);
  } else {
    console.error(`❌ Failed to write file`);
  }
  
  // Check quota after upload
  console.log('\n   Quota after upload:');
  const quotaAfterWrite = steam.cloud.getQuota();
  console.log(`   Total: ${quotaAfterWrite.totalBytes} bytes (${(quotaAfterWrite.totalBytes / 1024).toFixed(2)} KB)`);
  console.log(`   Used: ${quotaAfterWrite.usedBytes} bytes (${(quotaAfterWrite.usedBytes / 1024).toFixed(2)} KB)`);
  console.log(`   Available: ${quotaAfterWrite.availableBytes} bytes (${(quotaAfterWrite.availableBytes / 1024).toFixed(2)} KB)`);
  console.log(`   Usage: ${quotaAfterWrite.percentUsed.toFixed(2)}%`);
  
  // Check if file exists
  console.log('\n5. Checking File Existence...');
  const exists = steam.cloud.fileExists(testFilename);
  console.log(`   ${testFilename}: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
  
  if (exists) {
    // Get file info
    const size = steam.cloud.getFileSize(testFilename);
    const timestamp = steam.cloud.getFileTimestamp(testFilename);
    const persisted = steam.cloud.filePersisted(testFilename);
    
    console.log(`   Size: ${size} bytes`);
    console.log(`   Modified: ${new Date(timestamp * 1000).toLocaleString()}`);
    console.log(`   Persisted: ${persisted ? '✅ Yes' : '⏳ Uploading...'}`);
  }
  
  // Read file back
  console.log('\n6. Reading File Back...');
  const result = steam.cloud.fileRead(testFilename);
  
  if (result.success && result.data) {
    console.log(`✅ File read successfully (${result.bytesRead} bytes)`);
    const readData = JSON.parse(result.data.toString());
    console.log('   Content:');
    console.log(`   ${JSON.stringify(readData, null, 2).split('\n').join('\n   ')}`);
  } else {
    console.error('❌ Failed to read file');
  }
  
  // List all files
  console.log('\n7. Listing All Cloud Files...');
  const fileCount = steam.cloud.getFileCount();
  console.log(`   Total files: ${fileCount}`);
  
  if (fileCount > 0) {
    console.log('\n   Using getAllFiles():');
    const files = steam.cloud.getAllFiles();
    files.forEach((file, i) => {
      const date = new Date(file.timestamp * 1000);
      const sizeKB = (file.size / 1024).toFixed(2);
      console.log(`   ${i + 1}. ${file.name}`);
      console.log(`      Size: ${sizeKB} KB | Modified: ${date.toLocaleDateString()}`);
    });
    
    console.log('\n   Using getFileNameAndSize() (manual iteration):');
    for (let i = 0; i < fileCount; i++) {
      const fileInfo = steam.cloud.getFileNameAndSize(i);
      if (fileInfo) {
        console.log(`   ${i + 1}. ${fileInfo.name} - ${fileInfo.size} bytes`);
      }
    }
  }
  
  // Test setCloudEnabledForApp
  console.log('\n8. Testing Cloud Enable/Disable for App...');
  const originalAppState = steam.cloud.isCloudEnabledForApp();
  console.log(`   Current state: ${originalAppState ? 'Enabled' : 'Disabled'}`);
  
  // Disable cloud (if enabled)
  if (originalAppState) {
    console.log('   Disabling cloud for app...');
    steam.cloud.setCloudEnabledForApp(false);
    const afterDisable = steam.cloud.isCloudEnabledForApp();
    console.log(`   After disable: ${afterDisable ? '❌ Still Enabled' : '✅ Disabled'}`);
    
    // Re-enable it
    console.log('   Re-enabling cloud for app...');
    steam.cloud.setCloudEnabledForApp(true);
    const afterEnable = steam.cloud.isCloudEnabledForApp();
    console.log(`   After re-enable: ${afterEnable ? '✅ Enabled' : '❌ Still Disabled'}`);
  } else {
    console.log('   ⚠️  Cloud is currently disabled, skipping enable/disable test');
  }
  
  // Cleanup - delete test file
  console.log('\n9. Cleaning Up...');
  const deleted = steam.cloud.fileDelete(testFilename);
  if (deleted) {
    console.log(`✅ Test file deleted: ${testFilename}`);
  } else {
    console.error('❌ Failed to delete test file');
  }
  
  // Verify deletion
  const stillExists = steam.cloud.fileExists(testFilename);
  console.log(`   Verification: ${stillExists ? '❌ Still exists' : '✅ Successfully deleted'}`);
  
  // Final quota check
  console.log('\n10. Final Quota Check...');
  const finalQuota = steam.cloud.getQuota();
  console.log(`   Total: ${finalQuota.totalBytes} bytes (${(finalQuota.totalBytes / 1024).toFixed(2)} KB)`);
  console.log(`   Used: ${finalQuota.usedBytes} bytes`);
  console.log(`   Available: ${finalQuota.availableBytes} bytes (${(finalQuota.availableBytes / 1024).toFixed(2)} KB)`);
  console.log(`   Usage: ${finalQuota.percentUsed.toFixed(1)}%`);
  
  console.log('\n✅ Test Complete!');
  console.log('==================================================');
  
  // Shutdown
  steam.shutdown();
}

// Run test
testAllCloudFunctions().catch(console.error);
