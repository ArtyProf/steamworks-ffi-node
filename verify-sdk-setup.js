#!/usr/bin/env node

/**
 * Steamworks SDK Installation Verification Script
 * 
 * This script checks if the Steamworks SDK redistributables are properly installed
 * and provides helpful guidance if they're missing.
 */

const fs = require('fs');
const path = require('path');

function checkSteamworksSDK() {
  console.log('🔍 Steamworks SDK Installation Verification');
  console.log('===========================================');
  console.log('');

  const possibleBasePaths = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '../..'),
  ];

  let foundSdk = false;
  let sdkPath = '';

  // Check for steamworks_sdk folder
  for (const basePath of possibleBasePaths) {
    const checkPath = path.join(basePath, 'steamworks_sdk', 'redistributable_bin');
    if (fs.existsSync(checkPath)) {
      foundSdk = true;
      sdkPath = checkPath;
      console.log(`✅ Found steamworks_sdk at: ${checkPath}`);
      break;
    }
  }

  if (!foundSdk) {
    console.log('❌ Steamworks SDK not found!');
    console.log('');
    console.log('Expected folder structure:');
    console.log('  steamworks_sdk/');
    console.log('  └── redistributable_bin/');
    console.log('      ├── win64/steam_api64.dll');
    console.log('      ├── steam_api.dll');
    console.log('      ├── osx/libsteam_api.dylib');
    console.log('      └── linux64/libsteam_api.so');
    console.log('');
    console.log('📖 Setup Instructions:');
    console.log('1. Download Steamworks SDK from: https://partner.steamgames.com/');
    console.log('2. Extract the SDK archive');
    console.log('3. Copy the "redistributable_bin" folder to "steamworks_sdk/" in your project');
    console.log('4. See https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/STEAMWORKS_SDK_SETUP.md for detailed instructions');
    console.log('');
    console.log('Searched paths:');
    possibleBasePaths.forEach(p => {
      console.log(`  - ${path.join(p, 'steamworks_sdk', 'redistributable_bin')}`);
    });
    return false;
  }

  // Check platform-specific files
  console.log('');
  console.log('🔍 Checking platform-specific libraries...');
  
  const requiredFiles = [
    { path: 'win64/steam_api64.dll', platform: 'Windows 64-bit' },
    { path: 'steam_api.dll', platform: 'Windows 32-bit' },
    { path: 'osx/libsteam_api.dylib', platform: 'macOS' },
    { path: 'linux64/libsteam_api.so', platform: 'Linux 64-bit' }
  ];

  let allFilesPresent = true;
  let currentPlatformFileExists = false;
  const currentPlatform = process.platform;
  const currentArch = process.arch;

  requiredFiles.forEach(file => {
    const filePath = path.join(sdkPath, file.path);
    const exists = fs.existsSync(filePath);
    
    console.log(`  ${exists ? '✅' : '❌'} ${file.platform}: ${file.path}`);
    
    if (!exists) {
      allFilesPresent = false;
    }

    // Check if current platform file exists
    if (currentPlatform === 'win32' && currentArch === 'x64' && file.path === 'win64/steam_api64.dll' && exists) {
      currentPlatformFileExists = true;
    } else if (currentPlatform === 'win32' && currentArch !== 'x64' && file.path === 'steam_api.dll' && exists) {
      currentPlatformFileExists = true;
    } else if (currentPlatform === 'darwin' && file.path === 'osx/libsteam_api.dylib' && exists) {
      currentPlatformFileExists = true;
    } else if (currentPlatform === 'linux' && file.path === 'linux64/libsteam_api.so' && exists) {
      currentPlatformFileExists = true;
    }
  });

  console.log('');

  // Check steam_appid.txt (optional)
  const steamAppIdPath = path.join(process.cwd(), 'steam_appid.txt');
  const hasAppId = fs.existsSync(steamAppIdPath);
  
  console.log('🔍 Checking steam_appid.txt (optional)...');
  if (hasAppId) {
    const appId = fs.readFileSync(steamAppIdPath, 'utf8').trim();
    console.log(`✅ steam_appid.txt found with App ID: ${appId}`);
    if (appId === '480') {
      console.log('   Note: Using Spacewar (480) - perfect for testing!');
    }
  } else {
    console.log('ℹ️  steam_appid.txt not found (this is optional)');
    console.log('   You can either create this file OR pass the App ID to steam.init(appId)');
  }

  console.log('');
  console.log('📊 Summary');
  console.log('==========');

  if (foundSdk && currentPlatformFileExists) {
    console.log('🎉 Great! Your Steamworks SDK setup is ready.');
    console.log('');
    console.log('✅ Steamworks SDK redistributables installed');
    console.log(`✅ ${getCurrentPlatformName()} library available`);
    if (hasAppId) {
      console.log('✅ steam_appid.txt configured');
    } else {
      console.log('ℹ️  steam_appid.txt not found (pass App ID to steam.init() instead)');
    }
    console.log('');
    console.log('You can now use steamworks-ffi-node in your project!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Make sure Steam client is running');
    console.log('2. Import steamworks-ffi-node in your code');
    if (hasAppId) {
      console.log('3. Initialize the SDK with steam.init()');
    } else {
      console.log('3. Initialize the SDK with steam.init(yourAppId) or create steam_appid.txt');
    }
    return true;
  } else {
    console.log('⚠️  Setup incomplete. Please address the issues above.');
    console.log('');
    
    if (!foundSdk) {
      console.log('❌ Steamworks SDK redistributables missing');
    } else if (!currentPlatformFileExists) {
      console.log(`❌ Library for ${getCurrentPlatformName()} missing`);
    }
    
    console.log('');
    console.log('📖 See https://github.com/ArtyProf/steamworks-ffi-node/blob/main/docs/STEAMWORKS_SDK_SETUP.md for detailed setup instructions');
    return false;
  }
}

function getCurrentPlatformName() {
  const platform = process.platform;
  const arch = process.arch;
  
  if (platform === 'win32') {
    return arch === 'x64' ? 'Windows 64-bit' : 'Windows 32-bit';
  } else if (platform === 'darwin') {
    return 'macOS';
  } else if (platform === 'linux') {
    return 'Linux 64-bit';
  } else {
    return `${platform} (${arch})`;
  }
}

// Test basic functionality if SDK is installed
function testBasicFunctionality() {
  console.log('');
  console.log('🧪 Testing Basic Functionality');
  console.log('===============================');
  
  try {
    console.log('Attempting to load steamworks-ffi-node...');
    
    // Try to require the package
    const SteamworksSDK = require('./dist/index.js').default || require('./dist/index.js');
    console.log('✅ Package loaded successfully');
    
    // Try to create instance (this will test SDK loading)
    console.log('Testing SDK initialization...');
    const steam = new SteamworksSDK();
    console.log('✅ SteamworksSDK instance created');
    
    console.log('');
    console.log('🎉 Basic functionality test passed!');
    console.log('Your setup appears to be working correctly.');
    
  } catch (error) {
    console.log('❌ Basic functionality test failed');
    console.log(`Error: ${error.message}`);
    console.log('');
    console.log('This could indicate:');
    console.log('- Package not built (run "npm run build")');
    console.log('- Missing dependencies');
    console.log('- Incorrect SDK installation');
  }
}

// Main execution
if (require.main === module) {
  const success = checkSteamworksSDK();
  
  if (success) {
    testBasicFunctionality();
  }
  
  console.log('');
  console.log('For more help, visit: https://github.com/ArtyProf/steamworks-ffi-node');
}

module.exports = { checkSteamworksSDK };