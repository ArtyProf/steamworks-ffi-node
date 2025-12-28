/**
 * Comprehensive test covering all 14 Steam Cloud API functions (JavaScript)
 * This test demonstrates the complete Steamworks FFI cloud storage functionality
 */

const { SteamworksSDK } = require('../../dist/index.js');

async function testAllCloudFunctions() {
  console.log('🌥️  Complete Steamworks Cloud API Test (JavaScript)');
  console.log('==================================================');
  console.log('⚠️  REQUIREMENTS:');
  console.log('   1. Steam client running and logged in');
  console.log('   2. Valid Steam App ID (using 480 - Spacewar for testing)');
  console.log('   3. Steam Cloud enabled in your Steam settings');
  console.log('');
  
  const steam = SteamworksSDK.getInstance();
  
  // Initialize with Spacewar
  console.log('1. 🔌 Initializing Steam API (AppID 480 - Spacewar)...');
  const initialized = steam.init({ appId: 480 });
  
  if (!initialized) {
    console.error('❌ Failed to initialize Steam API');
    console.error('   Make sure Steam is running and you are logged in');
    return;
  }
  
  console.log('✅ Steam API initialized!');
  console.log('');

  // ═══════════════════════════════════════════════════════════════
  // 1. CLOUD STATUS CHECKING
  // ═══════════════════════════════════════════════════════════════
  console.log('2. ☁️  Checking Steam Cloud Status...');
  console.log('─────────────────────────────────────');
  
  // Function 1: isCloudEnabledForAccount()
  const accountEnabled = steam.cloud.isCloudEnabledForAccount();
  console.log(`   📊 Account Cloud: ${accountEnabled ? '✅ Enabled' : '❌ Disabled'}`);
  
  // Function 2: isCloudEnabledForApp()
  const appEnabled = steam.cloud.isCloudEnabledForApp();
  console.log(`   📊 App Cloud: ${appEnabled ? '✅ Enabled' : '❌ Disabled'}`);
  
  if (!accountEnabled) {
    console.warn('   ⚠️  Cloud is disabled in your Steam settings!');
    console.warn('   Enable it in Steam > Settings > Cloud');
  }
  console.log('');

  // ═══════════════════════════════════════════════════════════════
  // 2. QUOTA MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  console.log('3. 💾 Checking Cloud Quota...');
  console.log('─────────────────────────────');
  
  // Function 3: getQuota()
  const quota = steam.cloud.getQuota();
  console.log(`   📦 Total: ${quota.totalBytes} bytes (${(quota.totalBytes / 1024).toFixed(2)} KB)`);
  console.log(`   📊 Used: ${quota.usedBytes} bytes`);
  console.log(`   📊 Available: ${quota.availableBytes} bytes (${(quota.availableBytes / 1024).toFixed(2)} KB)`);
  console.log(`   📈 Usage: ${quota.percentUsed.toFixed(1)}%`);
  console.log('');

  // ═══════════════════════════════════════════════════════════════
  // 3. FILE WRITE OPERATIONS
  // ═══════════════════════════════════════════════════════════════
  console.log('4. 📝 Writing Test File to Cloud...');
  console.log('───────────────────────────────────');
  
  const testData = {
    timestamp: new Date().toISOString(),
    message: 'Hello from Steamworks FFI JavaScript!',
    score: 12345,
    player: 'TestUser'
  };
  
  const testFilename = 'steamworks_ffi_test.json';
  const buffer = Buffer.from(JSON.stringify(testData, null, 2));
  
  // Function 4: fileWrite()
  const written = steam.cloud.fileWrite(testFilename, buffer);
  if (written) {
    console.log(`   ✅ File written: ${testFilename} (${buffer.length} bytes)`);
  } else {
    console.error('   ❌ Failed to write file');
  }
  
  // Check quota after upload
  console.log('\n   📊 Quota after upload:');
  const quotaAfterWrite = steam.cloud.getQuota();
  console.log(`   Total: ${quotaAfterWrite.totalBytes} bytes (${(quotaAfterWrite.totalBytes / 1024).toFixed(2)} KB)`);
  console.log(`   Used: ${quotaAfterWrite.usedBytes} bytes (${(quotaAfterWrite.usedBytes / 1024).toFixed(2)} KB)`);
  console.log(`   Available: ${quotaAfterWrite.availableBytes} bytes (${(quotaAfterWrite.availableBytes / 1024).toFixed(2)} KB)`);
  console.log(`   Usage: ${quotaAfterWrite.percentUsed.toFixed(2)}%`);
  console.log('');

  // ═══════════════════════════════════════════════════════════════
  // 4. FILE EXISTENCE AND METADATA
  // ═══════════════════════════════════════════════════════════════
  console.log('5. 🔍 Checking File Existence and Metadata...');
  console.log('──────────────────────────────────────────────');
  
  // Function 5: fileExists()
  const exists = steam.cloud.fileExists(testFilename);
  console.log(`   📄 ${testFilename}: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
  
  if (exists) {
    // Function 6: getFileSize()
    const size = steam.cloud.getFileSize(testFilename);
    console.log(`   📏 Size: ${size} bytes`);
    
    // Function 7: getFileTimestamp()
    const timestamp = steam.cloud.getFileTimestamp(testFilename);
    console.log(`   🕐 Modified: ${new Date(timestamp * 1000).toLocaleString()}`);
    
    // Function 8: filePersisted()
    const persisted = steam.cloud.filePersisted(testFilename);
    console.log(`   ☁️  Persisted: ${persisted ? '✅ Yes' : '⏳ Uploading...'}`);
  }
  console.log('');

  // ═══════════════════════════════════════════════════════════════
  // 5. FILE READ OPERATIONS
  // ═══════════════════════════════════════════════════════════════
  console.log('6. 📖 Reading File Back from Cloud...');
  console.log('──────────────────────────────────────');
  
  // Function 9: fileRead()
  const result = steam.cloud.fileRead(testFilename);
  
  if (result.success && result.data) {
    console.log(`   ✅ File read successfully (${result.bytesRead} bytes)`);
    const readData = JSON.parse(result.data.toString());
    console.log('   📄 Content:');
    console.log(`   ${JSON.stringify(readData, null, 2).split('\n').join('\n   ')}`);
  } else {
    console.error('   ❌ Failed to read file');
  }
  console.log('');

  // ═══════════════════════════════════════════════════════════════
  // 6. FILE ITERATION AND LISTING
  // ═══════════════════════════════════════════════════════════════
  console.log('7. 📋 Listing All Cloud Files...');
  console.log('─────────────────────────────────');
  
  // Function 10: getFileCount()
  const fileCount = steam.cloud.getFileCount();
  console.log(`   📊 Total files: ${fileCount}`);
  
  if (fileCount > 0) {
    // Function 11: getAllFiles()
    console.log('\n   📂 Using getAllFiles():');
    const files = steam.cloud.getAllFiles();
    files.forEach((file, i) => {
      const date = new Date(file.timestamp * 1000);
      const sizeKB = (file.size / 1024).toFixed(2);
      console.log(`   ${i + 1}. ${file.name}`);
      console.log(`      📏 Size: ${sizeKB} KB | 🕐 Modified: ${date.toLocaleDateString()}`);
    });
    
    // Function 12: getFileNameAndSize()
    console.log('\n   📂 Using getFileNameAndSize() (manual iteration):');
    for (let i = 0; i < fileCount; i++) {
      const fileInfo = steam.cloud.getFileNameAndSize(i);
      if (fileInfo) {
        console.log(`   ${i + 1}. ${fileInfo.name} - ${fileInfo.size} bytes`);
      }
    }
  }
  console.log('');

  // ═══════════════════════════════════════════════════════════════
  // 7. CLOUD ENABLE/DISABLE CONTROL
  // ═══════════════════════════════════════════════════════════════
  console.log('8. ⚙️  Testing Cloud Enable/Disable for App...');
  console.log('───────────────────────────────────────────────');
  
  const originalAppState = steam.cloud.isCloudEnabledForApp();
  console.log(`   📊 Current state: ${originalAppState ? 'Enabled' : 'Disabled'}`);
  
  // Function 13: setCloudEnabledForApp()
  if (originalAppState) {
    console.log('   🔄 Disabling cloud for app...');
    steam.cloud.setCloudEnabledForApp(false);
    const afterDisable = steam.cloud.isCloudEnabledForApp();
    console.log(`   📊 After disable: ${afterDisable ? '❌ Still Enabled' : '✅ Disabled'}`);
    
    console.log('   🔄 Re-enabling cloud for app...');
    steam.cloud.setCloudEnabledForApp(true);
    const afterEnable = steam.cloud.isCloudEnabledForApp();
    console.log(`   📊 After re-enable: ${afterEnable ? '✅ Enabled' : '❌ Still Disabled'}`);
  } else {
    console.log('   ⚠️  Cloud is currently disabled, skipping enable/disable test');
  }
  console.log('');

  // ═══════════════════════════════════════════════════════════════
  // 8. FILE DELETION AND CLEANUP
  // ═══════════════════════════════════════════════════════════════
  console.log('9. 🗑️  Cleaning Up (Testing File Deletion)...');
  console.log('────────────────────────────────────────────────');
  
  // Function 14: fileDelete()
  const deleted = steam.cloud.fileDelete(testFilename);
  if (deleted) {
    console.log(`   ✅ Test file deleted: ${testFilename}`);
  } else {
    console.error('   ❌ Failed to delete test file');
  }
  
  // Verify deletion
  const stillExists = steam.cloud.fileExists(testFilename);
  console.log(`   📊 Verification: ${stillExists ? '❌ Still exists' : '✅ Successfully deleted'}`);
  console.log('');

  // ═══════════════════════════════════════════════════════════════
  // 9. BATCH WRITE OPERATIONS
  // ═══════════════════════════════════════════════════════════════
  console.log('10. 📦 Testing Batch Write Operations...');
  console.log('────────────────────────────────────────');
  
  // Test beginFileWriteBatch() and endFileWriteBatch()
  console.log('\n   a) Testing manual batch write (beginFileWriteBatch/endFileWriteBatch):');
  
  const batchFile1 = 'batch_test_meta.json';
  const batchFile2 = 'batch_test_world.dat';
  const batchFile3 = 'batch_test_config.json';
  
  const metaData = Buffer.from(JSON.stringify({
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    saveSlot: 1
  }));
  
  const worldData = Buffer.from('WORLD_DATA_BINARY_CONTENT_12345');
  
  const configData = Buffer.from(JSON.stringify({
    graphics: 'high',
    audio: 80,
    controls: 'keyboard'
  }));
  
  // Function 15: beginFileWriteBatch()
  const batchStarted = steam.cloud.beginFileWriteBatch();
  console.log(`      Begin batch: ${batchStarted ? '✅ Success' : '❌ Failed'}`);
  
  if (batchStarted) {
    // Write multiple files within the batch
    const wrote1 = steam.cloud.fileWrite(batchFile1, metaData);
    const wrote2 = steam.cloud.fileWrite(batchFile2, worldData);
    const wrote3 = steam.cloud.fileWrite(batchFile3, configData);
    
    console.log(`      Write ${batchFile1}: ${wrote1 ? '✅' : '❌'}`);
    console.log(`      Write ${batchFile2}: ${wrote2 ? '✅' : '❌'}`);
    console.log(`      Write ${batchFile3}: ${wrote3 ? '✅' : '❌'}`);
    
    // Function 16: endFileWriteBatch()
    const batchEnded = steam.cloud.endFileWriteBatch();
    console.log(`      End batch: ${batchEnded ? '✅ Committed' : '❌ Failed'}`);
    
    // Verify files exist
    const exists1 = steam.cloud.fileExists(batchFile1);
    const exists2 = steam.cloud.fileExists(batchFile2);
    const exists3 = steam.cloud.fileExists(batchFile3);
    console.log(`      Verify files exist: ${exists1 && exists2 && exists3 ? '✅ All exist' : '❌ Some missing'}`);
    
    // Clean up batch test files
    steam.cloud.fileDelete(batchFile1);
    steam.cloud.fileDelete(batchFile2);
    steam.cloud.fileDelete(batchFile3);
    console.log('      Cleaned up batch test files');
  }
  
  // Function 17: writeFilesBatch()
  console.log('\n   b) Testing writeFilesBatch() convenience method:');
  
  const batchFiles = [
    { filename: 'convenience_batch_1.json', data: Buffer.from(JSON.stringify({ slot: 1, name: 'Save 1' })) },
    { filename: 'convenience_batch_2.json', data: Buffer.from(JSON.stringify({ slot: 2, name: 'Save 2' })) },
    { filename: 'convenience_batch_3.bin', data: Buffer.from('BINARY_SAVE_DATA_FOR_SLOT_3') }
  ];
  
  const batchResult = steam.cloud.writeFilesBatch(batchFiles);
  
  console.log(`      Batch success: ${batchResult.success ? '✅ Yes' : '❌ No'}`);
  console.log(`      Files written: ${batchResult.filesWritten}/${batchFiles.length}`);
  
  if (batchResult.failedFiles.length > 0) {
    console.log(`      Failed files: ${batchResult.failedFiles.join(', ')}`);
  }
  
  // Verify all files exist
  let allExist = true;
  for (const file of batchFiles) {
    const fileExists = steam.cloud.fileExists(file.filename);
    if (!fileExists) {
      console.log(`      ❌ Missing: ${file.filename}`);
      allExist = false;
    }
  }
  
  if (allExist) {
    console.log('      ✅ All batch files verified');
  }
  
  // Read back one file to verify content
  const readBack = steam.cloud.fileRead('convenience_batch_1.json');
  if (readBack.success && readBack.data) {
    const parsed = JSON.parse(readBack.data.toString());
    console.log(`      Content verification: ${parsed.slot === 1 && parsed.name === 'Save 1' ? '✅ Correct' : '❌ Mismatch'}`);
  }
  
  // Clean up convenience batch files
  for (const file of batchFiles) {
    steam.cloud.fileDelete(file.filename);
  }
  console.log('      Cleaned up convenience batch files');
  console.log('');

  // ═══════════════════════════════════════════════════════════════
  // 10. FINAL QUOTA VERIFICATION
  // ═══════════════════════════════════════════════════════════════
  console.log('11. 📊 Final Quota Check...');
  console.log('───────────────────────────');
  
  const finalQuota = steam.cloud.getQuota();
  console.log(`   📦 Total: ${finalQuota.totalBytes} bytes (${(finalQuota.totalBytes / 1024).toFixed(2)} KB)`);
  console.log(`   📊 Used: ${finalQuota.usedBytes} bytes`);
  console.log(`   📊 Available: ${finalQuota.availableBytes} bytes (${(finalQuota.availableBytes / 1024).toFixed(2)} KB)`);
  console.log(`   📈 Usage: ${finalQuota.percentUsed.toFixed(1)}%`);
  console.log('');

  console.log('✅ Test Complete - All 17 Cloud Functions Tested!');
  console.log('==================================================');
  console.log('');
  console.log('📋 Functions Tested:');
  console.log('   1. ✅ isCloudEnabledForAccount()');
  console.log('   2. ✅ isCloudEnabledForApp()');
  console.log('   3. ✅ getQuota()');
  console.log('   4. ✅ fileWrite()');
  console.log('   5. ✅ fileExists()');
  console.log('   6. ✅ getFileSize()');
  console.log('   7. ✅ getFileTimestamp()');
  console.log('   8. ✅ filePersisted()');
  console.log('   9. ✅ fileRead()');
  console.log('   10. ✅ getFileCount()');
  console.log('   11. ✅ getAllFiles()');
  console.log('   12. ✅ getFileNameAndSize()');
  console.log('   13. ✅ setCloudEnabledForApp()');
  console.log('   14. ✅ fileDelete()');
  console.log('   15. ✅ beginFileWriteBatch()');
  console.log('   16. ✅ endFileWriteBatch()');
  console.log('   17. ✅ writeFilesBatch()');
  console.log('');
  
  // Shutdown
  steam.shutdown();
}

// Run test
testAllCloudFunctions().catch(console.error);
