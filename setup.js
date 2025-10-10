#!/usr/bin/env node

/**
 * Setup script for Steamworks FFI
 * This script helps set up the development environment for real Steamworks SDK integration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎮 Steamworks FFI Setup');
console.log('=======================');

// Check if we're on Windows
if (process.platform !== 'win32') {
  console.log('✅ Non-Windows platform detected. FFI dependencies should install normally.');
  console.log('Run: npm install');
  process.exit(0);
}

console.log('🔍 Checking Windows environment...');

// Check for Visual Studio Build Tools
function checkVisualStudio() {
  try {
    const vsPath = 'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools';
    const vsPath2 = 'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community';
    const vsPath3 = 'C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional';
    
    if (fs.existsSync(vsPath) || fs.existsSync(vsPath2) || fs.existsSync(vsPath3)) {
      console.log('✅ Visual Studio Build Tools found');
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Check for Python
function checkPython() {
  try {
    execSync('python --version', { stdio: 'ignore' });
    console.log('✅ Python found');
    return true;
  } catch (error) {
    try {
      execSync('python3 --version', { stdio: 'ignore' });
      console.log('✅ Python3 found');
      return true;
    } catch (error2) {
      return false;
    }
  }
}

// Check Steamworks SDK
function checkSteamworksSDK() {
  const sdkPath = path.join(__dirname, 'steamworks_sdk');
  const dllPath = path.join(sdkPath, 'redistributable_bin', 'win64', 'steam_api64.dll');
  
  if (fs.existsSync(dllPath)) {
    console.log('✅ Steamworks SDK found');
    return true;
  }
  
  console.log('❌ Steamworks SDK not found');
  console.log(`📁 Expected location: ${sdkPath}`);
  return false;
}

// Main setup function
function main() {
  let setupNeeded = false;
  
  // Check Python
  if (!checkPython()) {
    console.log('❌ Python not found');
    console.log('🔧 Installing Python...');
    try {
      execSync('winget install Python.Python.3.11', { stdio: 'inherit' });
      console.log('✅ Python installed');
    } catch (error) {
      console.log('❌ Failed to install Python automatically');
      console.log('💡 Please install Python manually: https://python.org');
      setupNeeded = true;
    }
  }
  
  // Check Visual Studio
  if (!checkVisualStudio()) {
    console.log('❌ Visual Studio Build Tools not found');
    console.log('🔧 Installing Visual Studio Build Tools...');
    try {
      console.log('📥 Downloading Visual Studio Build Tools...');
      execSync('winget install Microsoft.VisualStudio.2022.BuildTools', { stdio: 'inherit' });
      console.log('✅ Visual Studio Build Tools installed');
      console.log('⚠️ You may need to restart your terminal/IDE');
      setupNeeded = true;
    } catch (error) {
      console.log('❌ Failed to install Visual Studio Build Tools automatically');
      console.log('💡 Please install manually:');
      console.log('   1. Download: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022');
      console.log('   2. Install with "C++ build tools" workload');
      setupNeeded = true;
    }
  }
  
  // Check Steamworks SDK
  if (!checkSteamworksSDK()) {
    console.log('📋 Steamworks SDK Setup Instructions:');
    console.log('   1. Download Steamworks SDK from: https://partner.steamgames.com/');
    console.log('   2. Extract to: steamworks_sdk/ in this directory');
    console.log('   3. Ensure this structure exists:');
    console.log('      steamworks_sdk/');
    console.log('      ├── public/steam/');
    console.log('      └── redistributable_bin/');
    console.log('          ├── win64/steam_api64.dll');
    console.log('          ├── steam_api.dll');
    console.log('          ├── osx/libsteam_api.dylib');
    console.log('          └── linux64/libsteam_api.so');
    setupNeeded = true;
  }
  
  if (!setupNeeded) {
    console.log('✅ All dependencies are ready!');
    console.log('🚀 Installing FFI dependencies...');
    try {
      execSync('npm install', { stdio: 'inherit' });
      console.log('✅ Setup complete!');
      console.log('🎮 You can now use real Steamworks SDK integration');
    } catch (error) {
      console.log('❌ Failed to install npm dependencies');
      console.log('💡 Try running: npm install --verbose');
    }
  } else {
    console.log('⚠️ Setup incomplete. Please address the issues above and run this script again.');
    console.log('💡 After installing missing dependencies, run: node setup.js');
  }
}

main();