/**
 * Test: Steam Input API - Comprehensive Test Suite
 * 
 * This is the JavaScript version - identical functionality to the TypeScript version.
 * See test-input.ts for detailed documentation.
 * 
 * Usage:
 * - With virtual Xbox controller: npm run test:input-xbox:js
 * - With virtual PS4 controller: npm run test:input-ps4:js
 * - Without virtual controller: npm run test:input:js
 */

const SteamworksSDK = require('../../dist/steam').default;
const { SteamInputType, SteamInputGlyphSize, ControllerHapticLocation } = require('../../dist/types');
const { VirtualGamepad } = require('../gamepad_emulator/vgamepad-controller');

// Test configuration
const TEST_CONFIG = {
  APP_ID: 480, // Spacewar test app
  DETECTION_TIMEOUT_SECONDS: 15,
  POLLING_INTERVAL_MS: 100,
  VIBRATION_TEST_DURATION_MS: 1000,
  USE_VIRTUAL_GAMEPAD: process.env.USE_VIRTUAL_GAMEPAD === 'true',
  VIRTUAL_GAMEPAD_TYPE: process.env.VIRTUAL_GAMEPAD_TYPE || 'xbox',
};

// Helper to get controller type name
function getControllerTypeName(type) {
  const names = {
    [SteamInputType.Unknown]: 'Unknown',
    [SteamInputType.SteamController]: 'Steam Controller',
    [SteamInputType.XBox360Controller]: 'Xbox 360 Controller',
    [SteamInputType.XBoxOneController]: 'Xbox One Controller',
    [SteamInputType.GenericGamepad]: 'Generic Gamepad',
    [SteamInputType.PS4Controller]: 'PS4 Controller (DualShock 4)',
    [SteamInputType.AppleMFiController]: 'Apple MFi Controller',
    [SteamInputType.AndroidController]: 'Android Controller',
    [SteamInputType.SwitchJoyConPair]: 'Switch Joy-Con Pair',
    [SteamInputType.SwitchJoyConSingle]: 'Switch Joy-Con Single',
    [SteamInputType.SwitchProController]: 'Switch Pro Controller',
    [SteamInputType.MobileTouch]: 'Mobile Touch',
    [SteamInputType.PS3Controller]: 'PS3 Controller',
    [SteamInputType.PS5Controller]: 'PS5 Controller (DualSense)',
    [SteamInputType.SteamDeckController]: 'Steam Deck',
  };
  return names[type] || `Unknown Type (${type})`;
}

// Delay helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSteamInput() {
  console.log('\n========================================================');
  console.log('STEAM INPUT - Comprehensive API Test Suite (JavaScript)');
  console.log('========================================================\n');

  let virtualGamepad = null;
  const steam = SteamworksSDK.getInstance();
  
  try {
    // Test 0: Virtual Gamepad Setup (Optional)
    if (TEST_CONFIG.USE_VIRTUAL_GAMEPAD) {
      console.log('Test 0: Starting Virtual Gamepad...');
      console.log('----------------------------------------');
      console.log(`Controller Type: ${TEST_CONFIG.VIRTUAL_GAMEPAD_TYPE.toUpperCase()}`);
      console.log('Initializing Python vgamepad server...\n');
      
      try {
        virtualGamepad = new VirtualGamepad(TEST_CONFIG.VIRTUAL_GAMEPAD_TYPE);
        await virtualGamepad.start(3000);
        console.log('✅ Virtual gamepad started successfully');
        console.log('   Steam should now detect a virtual controller\n');
      } catch (error) {
        console.error('❌ Failed to start virtual gamepad:', error.message);
        console.error('   Continuing without virtual controller...\n');
        virtualGamepad = null;
      }
    }

    // Test 1: Initialize Steam API
    console.log('Test 1: Initializing Steam API...');
    console.log('----------------------------------------');
    const initialized = steam.init({ appId: TEST_CONFIG.APP_ID });

    if (!initialized) {
      console.error('❌ Failed to initialize Steam API');
      console.error('   Make sure Steam is running and you are logged in');
      process.exit(1);
    }

    console.log('✅ Steam API initialized\n');

    // Test 2: Initialize Steam Input
    console.log('Test 2: Initializing Steam Input...');
    console.log('----------------------------------------');
    
    const inputInitialized = steam.input.init();
    
    if (!inputInitialized) {
      console.error('❌ Failed to initialize Steam Input');
      throw new Error('Steam Input initialization failed');
    }

    console.log('✅ Steam Input initialized\n');

    // Test 3: Detect Controllers
    console.log('Test 3: Detecting Controllers...');
    console.log('----------------------------------------');
    console.log(`Waiting for controller detection (timeout: ${TEST_CONFIG.DETECTION_TIMEOUT_SECONDS}s)...\n`);

    let controllers = [];
    let detectionAttempts = 0;
    const maxAttempts = (TEST_CONFIG.DETECTION_TIMEOUT_SECONDS * 1000) / TEST_CONFIG.POLLING_INTERVAL_MS;

    while (detectionAttempts < maxAttempts) {
      steam.input.runFrame();
      controllers = steam.input.getConnectedControllers();
      
      if (controllers.length > 0) {
        console.log(`✅ Detected ${controllers.length} controller(s)!\n`);
        break;
      }
      
      detectionAttempts++;
      
      if (detectionAttempts % 10 === 0) {
        const secondsElapsed = (detectionAttempts * TEST_CONFIG.POLLING_INTERVAL_MS) / 1000;
        process.stdout.write(`\r⏳ Attempt ${detectionAttempts}/${Math.floor(maxAttempts)} (${secondsElapsed}s elapsed)...`);
      }
      
      await delay(TEST_CONFIG.POLLING_INTERVAL_MS);
    }

    if (controllers.length === 0) {
      console.log('\n\n⚠️  No controllers detected after timeout');
      console.log('API validation will continue, but some tests will be skipped.\n');
    }

    // Test 4: Controller Information
    if (controllers.length > 0) {
      console.log('Test 4: getInputTypeForHandle, getControllerInfo');
      console.log('----------------------------------------');
      
      controllers.forEach((handle, index) => {
        const inputType = steam.input.getInputTypeForHandle(handle);
        const info = steam.input.getControllerInfo(handle);
        
        console.log(`\nController ${index + 1}:`);
        console.log(`  Handle: ${handle}`);
        console.log(`  Type (getInputTypeForHandle): ${getControllerTypeName(inputType)}`);
        console.log(`  Type (getControllerInfo): ${getControllerTypeName(info.type)}`);
        console.log(`  XInput Index: ${info.gamepadIndex === -1 ? 'Not emulating' : info.gamepadIndex}`);
      });
      
      console.log('\n✅ Controller information retrieved\n');
    }

    // Test 5: Action Set Management
    if (controllers.length > 0) {
      console.log('Test 5: Action Set Management');
      console.log('----------------------------------------');
      console.log('Testing: getActionSetHandle, activateActionSet, getCurrentActionSet, layers, stopAnalogActionMomentum\n');
      
      const testHandle = controllers[0];
      
      const menuSetHandle = steam.input.getActionSetHandle('MenuControls');
      const gameplaySetHandle = steam.input.getActionSetHandle('GameplayControls');
      
      console.log(`getActionSetHandle('MenuControls'): ${menuSetHandle}`);
      console.log(`getActionSetHandle('GameplayControls'): ${gameplaySetHandle}`);
      
      if (menuSetHandle !== 0n) {
        steam.input.activateActionSet(testHandle, menuSetHandle);
        console.log(`✓ activateActionSet called for MenuControls`);
        
        const currentSet = steam.input.getCurrentActionSet(testHandle);
        console.log(`getCurrentActionSet: ${currentSet}`);
        
        const layerHandle = steam.input.getActionSetHandle('MenuLayer');
        if (layerHandle !== 0n) {
          steam.input.activateActionSetLayer(testHandle, layerHandle);
          console.log(`✓ activateActionSetLayer called`);
          
          const activeLayers = steam.input.getActiveActionSetLayers(testHandle);
          console.log(`getActiveActionSetLayers: ${activeLayers.length} layer(s) active`);
          
          steam.input.deactivateActionSetLayer(testHandle, layerHandle);
          console.log(`✓ deactivateActionSetLayer called`);
        }
        
        steam.input.deactivateAllActionSetLayers(testHandle);
        console.log(`✓ deactivateAllActionSetLayers called`);
      } else {
        console.log('ℹ️  No action sets configured in game (normal for test apps)');
      }
      
      const testAnalogHandle = steam.input.getAnalogActionHandle('Move');
      steam.input.stopAnalogActionMomentum(testHandle, testAnalogHandle);
      console.log('✓ stopAnalogActionMomentum called');
      
      console.log('\n✅ Action set management tested\n');
    }

    // Test 6: Digital Action Input
    if (controllers.length > 0 && virtualGamepad) {
      console.log('Test 6: Digital Action Input');
      console.log('----------------------------------------');
      console.log('Testing: getDigitalActionHandle, getDigitalActionData, getStringForDigitalActionName\n');
      
      const testHandle = controllers[0];
      
      console.log('Pressing A button on virtual controller...');
      await virtualGamepad.pressButton('A', 500);
      steam.input.runFrame();
      
      const jumpActionHandle = steam.input.getDigitalActionHandle('Jump');
      const fireActionHandle = steam.input.getDigitalActionHandle('Fire');
      
      console.log(`getDigitalActionHandle('Jump'): ${jumpActionHandle}`);
      console.log(`getDigitalActionHandle('Fire'): ${fireActionHandle}`);
      
      if (jumpActionHandle !== 0n) {
        const actionData = steam.input.getDigitalActionData(testHandle, jumpActionHandle);
        console.log(`\ngetDigitalActionData('Jump'):`);
        console.log(`  state: ${actionData.state}`);
        console.log(`  active: ${actionData.active}`);
        
        const actionName = steam.input.getStringForDigitalActionName(jumpActionHandle);
        console.log(`\ngetStringForDigitalActionName: "${actionName}"`);
      } else {
        console.log('ℹ️  No digital actions configured (normal for test apps)');
      }
      
      console.log('\n✅ Digital action input tested\n');
    }

    // Test 7: Analog Action Input
    if (controllers.length > 0 && virtualGamepad) {
      console.log('Test 7: Analog Action Input');
      console.log('----------------------------------------');
      console.log('Testing: getAnalogActionHandle, getAnalogActionData, getStringForAnalogActionName\n');
      
      const testHandle = controllers[0];
      
      console.log('Moving left stick on virtual controller...');
      virtualGamepad.setLeftStick(0.7, 0.5);
      await delay(200);
      steam.input.runFrame();
      await delay(200);
      
      const moveActionHandle = steam.input.getAnalogActionHandle('Move');
      const cameraActionHandle = steam.input.getAnalogActionHandle('Camera');
      
      console.log(`getAnalogActionHandle('Move'): ${moveActionHandle}`);
      console.log(`getAnalogActionHandle('Camera'): ${cameraActionHandle}`);
      
      if (moveActionHandle !== 0n) {
        const actionData = steam.input.getAnalogActionData(testHandle, moveActionHandle);
        console.log(`\ngetAnalogActionData('Move'):`);
        console.log(`  mode: ${actionData.mode}`);
        console.log(`  x: ${actionData.x.toFixed(3)}, y: ${actionData.y.toFixed(3)}`);
        console.log(`  active: ${actionData.active}`);
        
        const actionName = steam.input.getStringForAnalogActionName(moveActionHandle);
        console.log(`\ngetStringForAnalogActionName: "${actionName}"`);
      } else {
        console.log('ℹ️  No analog actions configured (normal for test apps)');
      }
      
      virtualGamepad.setLeftStick(0, 0);
      console.log('\n✅ Analog action input tested\n');
    }

    // Test 8: Action Glyphs
    if (controllers.length > 0) {
      console.log('Test 8: Action Glyphs');
      console.log('----------------------------------------');
      console.log('Testing: getGlyphPNGForActionOrigin, getGlyphSVGForActionOrigin, getStringForActionOrigin\n');
      
      const pngPath = steam.input.getGlyphPNGForActionOrigin(1, SteamInputGlyphSize.Small, 0);
      console.log(`getGlyphPNGForActionOrigin (origin=1, Small): ${pngPath || '(none)'}`);
      
      const svgPath = steam.input.getGlyphSVGForActionOrigin(1, 0);
      console.log(`getGlyphSVGForActionOrigin (origin=1): ${svgPath || '(none)'}`);
      
      const originString = steam.input.getStringForActionOrigin(1);
      console.log(`getStringForActionOrigin (origin=1): "${originString}"`);
      
      console.log('\n✅ Action glyph methods tested\n');
    }

    // Test 9: Motion Data
    if (controllers.length > 0) {
      console.log('Test 9: Motion Data (Gyro & Accelerometer)');
      console.log('----------------------------------------');
      console.log('Testing: getMotionData\n');
      
      const testHandle = controllers[0];
      const controllerType = steam.input.getInputTypeForHandle(testHandle);
      
      const supportsMotion = [
        SteamInputType.SteamController,
        SteamInputType.PS4Controller,
        SteamInputType.PS5Controller,
        SteamInputType.SwitchProController,
        SteamInputType.SwitchJoyConPair,
        SteamInputType.SwitchJoyConSingle,
        SteamInputType.SteamDeckController,
      ].includes(controllerType);
      
      if (supportsMotion) {
        console.log('Reading motion data (3 samples)...\n');
        
        for (let i = 0; i < 3; i++) {
          steam.input.runFrame();
          const motionData = steam.input.getMotionData(testHandle);
          
          if (motionData) {
            console.log(`Sample ${i + 1}/3:`);
            console.log(`  Rotation Quaternion: (${motionData.rotQuatX.toFixed(3)}, ${motionData.rotQuatY.toFixed(3)}, ${motionData.rotQuatZ.toFixed(3)}, ${motionData.rotQuatW.toFixed(3)})`);
            console.log(`  Angular Velocity (°/s): X=${motionData.rotVelX.toFixed(1)}, Y=${motionData.rotVelY.toFixed(1)}, Z=${motionData.rotVelZ.toFixed(1)}`);
            console.log(`  Acceleration (G): X=${motionData.posAccelX.toFixed(3)}, Y=${motionData.posAccelY.toFixed(3)}, Z=${motionData.posAccelZ.toFixed(3)}\n`);
          } else {
            console.log(`  No motion data available\n`);
          }
          
          await delay(200);
        }
      } else {
        console.log('⚠️  Motion sensors not supported on this controller type');
        console.log(`   Type: ${getControllerTypeName(controllerType)}\n`);
      }
      
      console.log('✅ Motion data tested\n');
    }

    // Test 10: Haptic Feedback
    if (controllers.length > 0) {
      console.log('Test 10: Haptic Feedback');
      console.log('----------------------------------------');
      console.log('Testing: triggerVibration, triggerVibrationExtended, triggerSimpleHapticEvent\n');
      
      const testHandle = controllers[0];
      
      console.log('triggerVibration: Testing basic vibration (1000ms, 50% intensity)...');
      steam.input.triggerVibration(testHandle, 30000, 30000);
      await delay(TEST_CONFIG.VIBRATION_TEST_DURATION_MS);
      steam.input.triggerVibration(testHandle, 0, 0);
      console.log('✓ Basic vibration complete');
      
      await delay(500);
      
      console.log('\ntriggerVibrationExtended: Testing motors...');
      steam.input.triggerVibrationExtended(testHandle, 40000, 0, 0, 0);
      await delay(500);
      steam.input.triggerVibrationExtended(testHandle, 0, 0, 0, 0);
      console.log('✓ Motor tests complete');
      
      await delay(300);
      
      console.log('\ntriggerSimpleHapticEvent: Testing haptic pulse...');
      steam.input.triggerSimpleHapticEvent(testHandle, ControllerHapticLocation.Left, 100, 50, 100, 50);
      console.log('✓ Haptic event triggered');
      
      await delay(500);
      console.log('\n✅ Haptic feedback tested\n');
    }

    // Test 11: LED Color Control
    if (controllers.length > 0) {
      console.log('Test 11: LED Color Control');
      console.log('----------------------------------------');
      console.log('Testing: setLEDColor\n');
      
      const testHandle = controllers[0];
      const controllerType = steam.input.getInputTypeForHandle(testHandle);
      
      if (controllerType === SteamInputType.PS4Controller || 
          controllerType === SteamInputType.PS5Controller) {
        console.log('DualShock/DualSense detected! Testing LED colors...\n');
        
        const colors = [
          { name: 'RED', r: 255, g: 0, b: 0 },
          { name: 'GREEN', r: 0, g: 255, b: 0 },
          { name: 'BLUE', r: 0, g: 0, b: 255 },
          { name: 'PURPLE', r: 255, g: 0, b: 255 },
        ];
        
        for (const color of colors) {
          console.log(`Setting LED to ${color.name}...`);
          steam.input.setLEDColor(testHandle, color.r, color.g, color.b, 0);
          await delay(800);
        }
        
        console.log('Restoring default LED color...');
        steam.input.setLEDColor(testHandle, 0, 0, 0, 1);
        console.log('\n✅ LED colors tested successfully');
      } else {
        console.log('⚠️  LED control not supported on this controller type\n');
      }
      
      console.log('');
    }

    // Test 12: Binding UI and Session Info
    if (controllers.length > 0) {
      console.log('Test 12: Binding UI & Session Info');
      console.log('----------------------------------------');
      console.log('Testing: getDeviceBindingRevision, getRemotePlaySessionID, getSessionInputConfigurationSettings\n');
      
      const testHandle = controllers[0];
      
      const revision = steam.input.getDeviceBindingRevision(testHandle);
      if (revision) {
        console.log(`getDeviceBindingRevision: v${revision.major}.${revision.minor}`);
      } else {
        console.log('getDeviceBindingRevision: No binding info available');
      }
      
      const sessionID = steam.input.getRemotePlaySessionID(testHandle);
      console.log(`getRemotePlaySessionID: ${sessionID} ${sessionID !== 0 ? '(Remote Play active)' : '(Local controller)'}`);
      
      const sessionConfig = steam.input.getSessionInputConfigurationSettings();
      console.log(`getSessionInputConfigurationSettings: ${sessionConfig}`);
      
      console.log('\nshowBindingPanel: Skipped in automated test');
      console.log('\n✅ Binding UI & session info tested\n');
    }

    // Test 13: XInput Emulation Control
    if (controllers.length > 0) {
      console.log('Test 13: XInput Emulation Control');
      console.log('----------------------------------------');
      console.log('Testing: getControllerForGamepadIndex, getGamepadIndexForController\n');
      
      const testHandle = controllers[0];
      
      const handle = steam.input.getControllerForGamepadIndex(0);
      console.log(`getControllerForGamepadIndex(0): ${handle}`);
      
      const gamepadIndex = steam.input.getGamepadIndexForController(testHandle);
      console.log(`getGamepadIndexForController: ${gamepadIndex === -1 ? 'Not emulating XInput' : `XInput slot ${gamepadIndex}`}`);
      
      console.log('\n✅ XInput emulation control tested\n');
    }

    // Test Summary
    console.log('========================================================');
    console.log('TEST SUMMARY');
    console.log('========================================================');
    console.log(`Virtual Gamepad: ${virtualGamepad ? '✅ Used' : '⚠️  Not used'}`);
    console.log(`Controllers Detected: ${controllers.length > 0 ? `✅ ${controllers.length}` : '⚠️  None'}`);
    console.log(`Steam Input: ${inputInitialized ? '✅ Working' : '❌ Failed'}`);
    
    if (controllers.length === 0) {
      console.log('\n⚠️  No controllers detected during this test.');
      console.log('   Run with USE_VIRTUAL_GAMEPAD=true for full testing.');
    } else {
      console.log('\n✅ Comprehensive controller testing completed successfully!');
      console.log(`   Tested with ${TEST_CONFIG.USE_VIRTUAL_GAMEPAD ? 'virtual' : 'physical'} controller`);
    }
    
    console.log('========================================================\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...');
    
    try {
      steam.input.shutdown();
      console.log('  ✓ Steam Input shutdown');
    } catch (e) {
      console.log('  ⚠️  Steam Input shutdown error');
    }
    
    try {
      steam.shutdown();
      console.log('  ✓ Steam API shutdown');
    } catch (e) {
      console.log('  ⚠️  Steam API shutdown error');
    }
    
    if (virtualGamepad) {
      try {
        await virtualGamepad.stop();
        console.log('  ✓ Virtual gamepad stopped');
      } catch (e) {
        console.log('  ⚠️  Virtual gamepad stop error');
      }
    }
    
    console.log('✅ Cleanup complete\n');
  }
}

// Run the test
testSteamInput().catch((error) => {
  console.error('\n❌ Test failed with unhandled error:', error);
  process.exit(1);
});
