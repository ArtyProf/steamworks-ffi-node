/**
 * DLL Function Inspector
 * Check what functions are exported by steam_api64.dll
 */

async function inspectSteamDLL() {
  console.log('🔍 Steam DLL Function Inspector');
  console.log('===============================');
  
  try {
    const koffi = require('koffi');
    const path = require('path');
    
    const dllPath = path.join(__dirname, 'steamworks_sdk', 'redistributable_bin', 'win64', 'steam_api64.dll');
    console.log(`📚 Loading: ${dllPath}`);
    
    // Try to load the library
    const steamLib = koffi.load(dllPath);
    console.log('✅ Library loaded successfully!');
    
    // Test some basic function definitions to see what's available
    const testFunctions = [
      'SteamAPI_Init',
      'SteamAPI_InitSafe', 
      'SteamAPI_Shutdown',
      'SteamAPI_RunCallbacks',
      'SteamAPI_IsSteamRunning',
      'SteamInternal_SteamAPI_Init',
      'SteamAPI_SteamUserStats_v012',
      'SteamAPI_SteamUserStats_v013',
      'SteamAPI_SteamUserStats',
      'SteamUserStats',
      'SteamAPI_ISteamUserStats_GetNumAchievements',
      'SteamUserStats_GetNumAchievements',
      'SteamAPI_SteamUser_v023',
      'SteamAPI_SteamUser',
      'SteamUser',
      'SteamAPI_ISteamUserStats_RequestCurrentStats',
      'SteamAPI_ISteamUserStats_RequestUserStats',
      'SteamAPI_ISteamUserStats_GetAchievementName',
      'SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute', 
      'SteamAPI_ISteamUserStats_GetAchievement',
      'SteamAPI_ISteamUserStats_SetAchievement',
      'SteamAPI_ISteamUserStats_ClearAchievement',
      'SteamAPI_ISteamUserStats_StoreStats',
      'SteamAPI_ISteamUser_GetSteamID'
    ];
    
    console.log('\n🧪 Testing function availability:');
    
    for (const funcName of testFunctions) {
      try {
        const func = steamLib.func(funcName, 'bool', []);
        console.log(`   ✅ ${funcName} - Available`);
      } catch (error) {
        console.log(`   ❌ ${funcName} - Not found`);
      }
    }
    
    // Try to use dumpbin or objdump to list exports (if available)
    console.log('\n📋 Attempting to list all exported functions:');
    try {
      const { execSync } = require('child_process');
      
      // Try using PowerShell to inspect DLL exports
      const result = execSync(`
        Add-Type -AssemblyName System.Reflection
        $assembly = [System.Reflection.Assembly]::LoadFile("${dllPath.replace(/\\/g, '\\\\')}")
        $assembly.GetExportedTypes() | Select-Object Name
      `, { encoding: 'utf-8', shell: 'powershell' });
      
      console.log('DLL exports:', result);
    } catch (error) {
      console.log('   ⚠️ Could not list exports automatically');
      console.log('   💡 Try using: dumpbin /exports steam_api64.dll');
    }
    
  } catch (error) {
    console.error('❌ Error inspecting DLL:', error.message);
  }
}

inspectSteamDLL();