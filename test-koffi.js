/**
 * Simple Koffi Test
 * Test if koffi is working without requiring Steamworks SDK
 */

async function testKoffi() {
  console.log('🔧 Koffi FFI Test');
  console.log('=================');
  
  try {
    console.log('1. 📦 Loading Koffi...');
    const koffi = require('koffi');
    console.log('✅ Koffi loaded successfully!');
    
    console.log('2. 🧪 Testing basic FFI functionality...');
    
    // Test loading a system library (kernel32.dll on Windows)
    console.log('3. 📚 Loading system library (kernel32.dll)...');
    const kernel32 = koffi.load('kernel32.dll');
    console.log('✅ System library loaded successfully!');
    
    // Test defining a simple function
    console.log('4. 🔗 Defining function signature...');
    const GetTickCount = kernel32.func('GetTickCount', 'uint32', []);
    console.log('✅ Function signature defined successfully!');
    
    // Test calling the function
    console.log('5. 🚀 Calling function...');
    const ticks = GetTickCount();
    console.log(`✅ Function called successfully! Ticks: ${ticks}`);
    
    console.log('\n🎉 Koffi FFI is working perfectly!');
    console.log('💡 This means npm install was successful and FFI is functional.');
    console.log('📋 Next step: Download Steamworks SDK to test Steam integration.');
    
  } catch (error) {
    console.error('❌ Error testing Koffi:', error.message);
    console.error('💡 Stack trace:', error.stack);
  }
}

// Run the test
testKoffi();