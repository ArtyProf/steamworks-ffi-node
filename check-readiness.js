/**
 * Steam Integration Readiness Test
 * Checks if everything is ready for Steam integration
 */

const fs = require('fs');
const path = require('path');

async function checkSteamReadiness() {
  console.log('🎮 Steam Integration Readiness Check');
  console.log('====================================');
  
  let allGood = true;
  
  // 1. Check Steam client
  console.log('1. 🔍 Checking Steam client...');
  try {
    // Try to check if Steam process is running
    const { execSync } = require('child_process');
    const steamProcess = execSync('tasklist /FI "IMAGENAME eq steam.exe" /FO CSV', { encoding: 'utf-8' });
    
    if (steamProcess.includes('steam.exe')) {
      console.log('   ✅ Steam client is running');
    } else {
      console.log('   ❌ Steam client not detected');
      console.log('   💡 Please start Steam and log in');
      allGood = false;
    }
  } catch (error) {
    console.log('   ⚠️ Could not check Steam process');
  }
  
  // 2. Check Koffi installation
  console.log('\n2. 📦 Checking Koffi installation...');
  try {
    const koffi = require('koffi');
    console.log('   ✅ Koffi FFI library is installed and working');
  } catch (error) {
    console.log('   ❌ Koffi not found - run `npm install`');
    allGood = false;
  }
  
  // 3. Check TypeScript compilation
  console.log('\n3. 🔨 Checking TypeScript compilation...');
  if (fs.existsSync(path.join(__dirname, 'dist', 'steam.js'))) {
    console.log('   ✅ TypeScript compiled successfully');
  } else {
    console.log('   ❌ TypeScript not compiled - run `npm run build`');
    allGood = false;
  }
  
  // 4. Check Steamworks SDK
  console.log('\n4. 📚 Checking Steamworks SDK...');
  const sdkPath = path.join(__dirname, 'steamworks_sdk', 'redistributable_bin', 'win64', 'steam_api64.dll');
  
  if (fs.existsSync(sdkPath)) {
    console.log('   ✅ Steamworks SDK found');
  } else {
    console.log('   ❌ Steamworks SDK not found');
    console.log('   📁 Expected location: steamworks_sdk/redistributable_bin/win64/steam_api64.dll');
    console.log('   💡 Download from: https://partner.steamgames.com/');
    allGood = false;
  }
  
  // 5. Check steam_appid.txt
  console.log('\n5. 📄 Checking steam_appid.txt...');
  const appIdPath = path.join(__dirname, 'steam_appid.txt');
  
  if (fs.existsSync(appIdPath)) {
    const appId = fs.readFileSync(appIdPath, 'utf-8').trim();
    console.log(`   ✅ steam_appid.txt found (App ID: ${appId})`);
  } else {
    console.log('   ⚠️ steam_appid.txt not found (will be created automatically)');
  }
  
  console.log('\n🎯 Summary:');
  if (allGood) {
    console.log('✅ Everything looks good! You can test Steam integration with:');
    console.log('   npm start');
  } else {
    console.log('❌ Some requirements are missing. Please fix the issues above.');
    console.log('\n📋 Quick setup guide:');
    console.log('1. Start Steam client and log in');
    console.log('2. Download Steamworks SDK from Steam Partner Portal');
    console.log('3. Extract SDK to steamworks_sdk/ directory');
    console.log('4. Run `npm run build` to compile TypeScript');
    console.log('5. Run `npm start` to test');
  }
  
  console.log('\n💡 Alternative: Test with Spacewar (App ID 480)');
  console.log('   Spacewar is free and perfect for testing Steam integration.');
  console.log('   Add it to your Steam library, then run the test.');
}

// Run the readiness check
checkSteamReadiness();