import * as koffi from 'koffi';
import { 
  InputHandle,
  InputActionSetHandle,
  InputDigitalActionHandle,
  InputAnalogActionHandle,
  InputDigitalActionData,
  InputAnalogActionData,
  InputMotionData,
  SteamInputType,
  ControllerInfo,
  DeviceBindingRevision,
  SteamInputGlyphSize,
  SteamControllerPad,
  ControllerHapticLocation,
  STEAM_INPUT,
} from '../types';
import { SteamLibraryLoader } from './SteamLibraryLoader';

/**
 * Controller type names for display
 */
const CONTROLLER_TYPE_NAMES: { [key: number]: string } = {
  [SteamInputType.Unknown]: 'Unknown',
  [SteamInputType.SteamController]: 'Steam Controller',
  [SteamInputType.XBox360Controller]: 'Xbox 360 Controller',
  [SteamInputType.XBoxOneController]: 'Xbox One Controller',
  [SteamInputType.GenericGamepad]: 'Generic Gamepad',
  [SteamInputType.PS4Controller]: 'PS4 Controller',
  [SteamInputType.AppleMFiController]: 'Apple MFi Controller',
  [SteamInputType.AndroidController]: 'Android Controller',
  [SteamInputType.SwitchJoyConPair]: 'Switch Joy-Con Pair',
  [SteamInputType.SwitchJoyConSingle]: 'Switch Joy-Con Single',
  [SteamInputType.SwitchProController]: 'Switch Pro Controller',
  [SteamInputType.MobileTouch]: 'Mobile Touch',
  [SteamInputType.PS3Controller]: 'PS3 Controller',
  [SteamInputType.PS5Controller]: 'PS5 Controller',
  [SteamInputType.SteamDeckController]: 'Steam Deck',
};

/**
 * SteamInputManager
 * 
 * Manages Steam Input operations for unified controller support.
 * Supports Xbox, PlayStation, Nintendo Switch, Steam Controller, and more.
 * 
 * Features:
 * - Controller detection and enumeration
 * - Action set management
 * - Digital and analog action handling
 * - Motion data (gyro, accelerometer)
 * - Haptic feedback and vibration
 * - LED control
 * - Button glyph display
 * - Configuration UI
 * 
 * @example
 * ```typescript
 * const inputManager = new SteamInputManager(libraryLoader, apiCore);
 * 
 * // Initialize
 * inputManager.init();
 * 
 * // Update every frame
 * inputManager.runFrame();
 * 
 * // Get connected controllers
 * const controllers = inputManager.getConnectedControllers();
 * 
 * // Read actions
 * const jumpHandle = inputManager.getDigitalActionHandle('Jump');
 * const jumpData = inputManager.getDigitalActionData(controllerHandle, jumpHandle);
 * if (jumpData.state) {
 *   console.log('Jump pressed!');
 * }
 * ```
 */
export class SteamInputManager {
  /** Steam library loader for FFI function calls */
  private libraryLoader: SteamLibraryLoader;
  
  /** Cached ISteamInput interface pointer */
  private steamInputInterface: any = null;

  /**
   * Creates a new SteamInputManager instance
   * 
   * @param libraryLoader - The Steam library loader for FFI calls
   */
  constructor(libraryLoader: SteamLibraryLoader) {
    this.libraryLoader = libraryLoader;
  }

  /**
   * Get the ISteamInput interface pointer
   * @private
   */
  private getSteamInputInterface(): any {
    if (!this.steamInputInterface) {
      this.steamInputInterface = this.libraryLoader.SteamAPI_SteamInput_v006();
    }
    return this.steamInputInterface;
  }

  // ========================================
  // Initialization
  // ========================================

  /**
   * Initialize Steam Input
   * 
   * Must be called before using any other Steam Input functions.
   * Should be called after SteamAPI_Init().
   * 
   * @param explicitlyCallRunFrame - If true, you must call runFrame() manually each frame.
   *                                   If false, Steam will automatically update input state.
   *                                   Default is true for explicit control.
   * @returns True if initialization was successful
   * 
   * @example
   * ```typescript
   * if (inputManager.init()) {
   *   console.log('Steam Input initialized successfully');
   * }
   * ```
   */
  init(explicitlyCallRunFrame: boolean = true): boolean {
    const iface = this.getSteamInputInterface();
    if (!iface) {
      console.error('[SteamInput] Failed to get ISteamInput interface');
      return false;
    }

    try {
      const result = this.libraryLoader.SteamAPI_ISteamInput_Init(iface, explicitlyCallRunFrame);
      return result;
    } catch (error) {
      console.error('[SteamInput] Init error:', error);
      return false;
    }
  }

  /**
   * Shutdown Steam Input
   * 
   * Should be called before SteamAPI_Shutdown().
   * 
   * @returns True if shutdown was successful
   */
  shutdown(): boolean {
    const iface = this.getSteamInputInterface();
    if (!iface) return false;

    try {
      const result = this.libraryLoader.SteamAPI_ISteamInput_Shutdown(iface);
      return result;
    } catch (error) {
      console.error('[SteamInput] Shutdown error:', error);
      return false;
    }
  }

  /**
   * Set the absolute path to the Input Action Manifest file
   * 
   * Used for games that provide their own input_actions.vdf file.
   * Must be called before init().
   * 
   * @param manifestPath - Absolute path to input_actions.vdf
   * @returns True if successful
   */
  setInputActionManifestFilePath(manifestPath: string): boolean {
    const iface = this.getSteamInputInterface();
    if (!iface) return false;

    try {
      return this.libraryLoader.SteamAPI_ISteamInput_SetInputActionManifestFilePath(iface, manifestPath);
    } catch (error) {
      console.error('[SteamInput] SetInputActionManifestFilePath error:', error);
      return false;
    }
  }

  /**
   * Update input state for all controllers
   * 
   * Must be called every frame if init() was called with explicitlyCallRunFrame=true.
   * Synchronizes controller state and processes input data.
   * 
   * @param reservedValue - Reserved for future use, should be false
   * 
   * @example
   * ```typescript
   * // In your game loop
   * function gameLoop() {
   *   inputManager.runFrame();
   *   // Read input state
   *   // Update game logic
   *   requestAnimationFrame(gameLoop);
   * }
   * ```
   */
  runFrame(reservedValue: boolean = false): void {
    const iface = this.getSteamInputInterface();
    if (!iface) return;

    try {
      this.libraryLoader.SteamAPI_ISteamInput_RunFrame(iface, reservedValue);
    } catch (error) {
      console.error('[SteamInput] RunFrame error:', error);
    }
  }

  // ========================================
  // Controller Enumeration
  // ========================================

  /**
   * Get all currently connected controller handles
   * 
   * Controller handles persist across disconnects/reconnects.
   * 
   * @returns Array of controller handles (max 16 controllers)
   * 
   * @example
   * ```typescript
   * const controllers = inputManager.getConnectedControllers();
   * console.log(`Found ${controllers.length} controller(s)`);
   * 
   * controllers.forEach(handle => {
   *   const type = inputManager.getInputTypeForHandle(handle);
   *   console.log(`Controller: ${handle}, Type: ${type}`);
   * });
   * ```
   */
  getConnectedControllers(): InputHandle[] {
    const iface = this.getSteamInputInterface();
    if (!iface) return [];

    try {
      const handlesArray = new BigUint64Array(STEAM_INPUT.MAX_COUNT);
      const handleBuffer = Buffer.from(handlesArray.buffer);
      
      const count = this.libraryLoader.SteamAPI_ISteamInput_GetConnectedControllers(iface, handleBuffer);
      
      const handles: InputHandle[] = [];
      for (let i = 0; i < count; i++) {
        handles.push(handlesArray[i]);
      }
      
      return handles;
    } catch (error) {
      console.error('[SteamInput] GetConnectedControllers error:', error);
      return [];
    }
  }

  /**
   * Get the input type for a specific controller
   * 
   * @param inputHandle - Controller handle
   * @returns Controller type enum value
   * 
   * @example
   * ```typescript
   * const type = inputManager.getInputTypeForHandle(handle);
   * if (type === SteamInputType.PS5Controller) {
   *   console.log('DualSense detected!');
   * }
   * ```
   */
  getInputTypeForHandle(inputHandle: InputHandle): SteamInputType {
    const iface = this.getSteamInputInterface();
    if (!iface) return SteamInputType.Unknown;

    try {
      return this.libraryLoader.SteamAPI_ISteamInput_GetInputTypeForHandle(iface, inputHandle);
    } catch (error) {
      console.error('[SteamInput] GetInputTypeForHandle error:', error);
      return SteamInputType.Unknown;
    }
  }

  /**
   * Get comprehensive controller information
   * 
   * Convenience method that combines multiple queries into one object.
   * 
   * @param inputHandle - Controller handle
   * @returns Controller information object
   */
  getControllerInfo(inputHandle: InputHandle): ControllerInfo {
    const type = this.getInputTypeForHandle(inputHandle);
    const gamepadIndex = this.getGamepadIndexForController(inputHandle);
    
    return {
      handle: inputHandle,
      type,
      typeName: CONTROLLER_TYPE_NAMES[type] || `Unknown (${type})`,
      gamepadIndex,
    };
  }

  /**
   * Get the controller handle for a specific gamepad index
   * 
   * Useful for mapping XInput indices to Steam Input handles.
   * 
   * @param gamepadIndex - XInput gamepad index (0-3)
   * @returns Controller handle, or 0n if not found
   */
  getControllerForGamepadIndex(gamepadIndex: number): InputHandle {
    const iface = this.getSteamInputInterface();
    if (!iface) return BigInt(0);

    try {
      return this.libraryLoader.SteamAPI_ISteamInput_GetControllerForGamepadIndex(iface, gamepadIndex);
    } catch (error) {
      console.error('[SteamInput] GetControllerForGamepadIndex error:', error);
      return BigInt(0);
    }
  }

  /**
   * Get the gamepad index for a controller handle
   * 
   * @param inputHandle - Controller handle
   * @returns XInput gamepad index (0-3), or -1 if not emulating gamepad
   */
  getGamepadIndexForController(inputHandle: InputHandle): number {
    const iface = this.getSteamInputInterface();
    if (!iface) return -1;

    try {
      return this.libraryLoader.SteamAPI_ISteamInput_GetGamepadIndexForController(iface, inputHandle);
    } catch (error) {
      console.error('[SteamInput] GetGamepadIndexForController error:', error);
      return -1;
    }
  }

  // ========================================
  // Action Sets
  // ========================================

  /**
   * Get the handle for an action set by name
   * 
   * Action sets group related actions together (e.g., "MenuControls", "GameplayControls").
   * Should be queried once at startup and cached.
   * 
   * @param actionSetName - Name of the action set from input_actions.vdf
   * @returns Action set handle
   * 
   * @example
   * ```typescript
   * const menuSet = inputManager.getActionSetHandle('MenuControls');
   * const gameSet = inputManager.getActionSetHandle('GameplayControls');
   * ```
   */
  getActionSetHandle(actionSetName: string): InputActionSetHandle {
    const iface = this.getSteamInputInterface();
    if (!iface) return BigInt(0);

    try {
      return this.libraryLoader.SteamAPI_ISteamInput_GetActionSetHandle(iface, actionSetName);
    } catch (error) {
      console.error('[SteamInput] GetActionSetHandle error:', error);
      return BigInt(0);
    }
  }

  /**
   * Activate an action set for a controller
   * 
   * Only one action set can be active at a time (plus layers).
   * 
   * @param inputHandle - Controller handle
   * @param actionSetHandle - Action set handle to activate
   * 
   * @example
   * ```typescript
   * const gameSet = inputManager.getActionSetHandle('GameplayControls');
   * inputManager.activateActionSet(controllerHandle, gameSet);
   * ```
   */
  activateActionSet(inputHandle: InputHandle, actionSetHandle: InputActionSetHandle): void {
    const iface = this.getSteamInputInterface();
    if (!iface) return;

    try {
      this.libraryLoader.SteamAPI_ISteamInput_ActivateActionSet(iface, inputHandle, actionSetHandle);
    } catch (error) {
      console.error('[SteamInput] ActivateActionSet error:', error);
    }
  }

  /**
   * Get the currently active action set for a controller
   * 
   * @param inputHandle - Controller handle
   * @returns Currently active action set handle
   */
  getCurrentActionSet(inputHandle: InputHandle): InputActionSetHandle {
    const iface = this.getSteamInputInterface();
    if (!iface) return BigInt(0);

    try {
      return this.libraryLoader.SteamAPI_ISteamInput_GetCurrentActionSet(iface, inputHandle);
    } catch (error) {
      console.error('[SteamInput] GetCurrentActionSet error:', error);
      return BigInt(0);
    }
  }

  /**
   * Activate an action set layer
   * 
   * Layers add additional actions on top of the base action set.
   * Up to 16 layers can be active simultaneously.
   * 
   * @param inputHandle - Controller handle
   * @param actionSetLayerHandle - Action set layer handle
   */
  activateActionSetLayer(inputHandle: InputHandle, actionSetLayerHandle: InputActionSetHandle): void {
    const iface = this.getSteamInputInterface();
    if (!iface) return;

    try {
      this.libraryLoader.SteamAPI_ISteamInput_ActivateActionSetLayer(iface, inputHandle, actionSetLayerHandle);
    } catch (error) {
      console.error('[SteamInput] ActivateActionSetLayer error:', error);
    }
  }

  /**
   * Deactivate an action set layer
   * 
   * @param inputHandle - Controller handle
   * @param actionSetLayerHandle - Action set layer handle
   */
  deactivateActionSetLayer(inputHandle: InputHandle, actionSetLayerHandle: InputActionSetHandle): void {
    const iface = this.getSteamInputInterface();
    if (!iface) return;

    try {
      this.libraryLoader.SteamAPI_ISteamInput_DeactivateActionSetLayer(iface, inputHandle, actionSetLayerHandle);
    } catch (error) {
      console.error('[SteamInput] DeactivateActionSetLayer error:', error);
    }
  }

  /**
   * Deactivate all action set layers
   * 
   * @param inputHandle - Controller handle
   */
  deactivateAllActionSetLayers(inputHandle: InputHandle): void {
    const iface = this.getSteamInputInterface();
    if (!iface) return;

    try {
      this.libraryLoader.SteamAPI_ISteamInput_DeactivateAllActionSetLayers(iface, inputHandle);
    } catch (error) {
      console.error('[SteamInput] DeactivateAllActionSetLayers error:', error);
    }
  }

  /**
   * Get all currently active action set layers
   * 
   * @param inputHandle - Controller handle
   * @returns Array of active layer handles
   */
  getActiveActionSetLayers(inputHandle: InputHandle): InputActionSetHandle[] {
    const iface = this.getSteamInputInterface();
    if (!iface) return [];

    try {
      const layersArray = new BigUint64Array(STEAM_INPUT.MAX_ACTIVE_LAYERS);
      const layerBuffer = Buffer.from(layersArray.buffer);
      
      const count = this.libraryLoader.SteamAPI_ISteamInput_GetActiveActionSetLayers(iface, inputHandle, layerBuffer);
      
      const layers: InputActionSetHandle[] = [];
      for (let i = 0; i < count; i++) {
        layers.push(layersArray[i]);
      }
      
      return layers;
    } catch (error) {
      console.error('[SteamInput] GetActiveActionSetLayers error:', error);
      return [];
    }
  }

  // ========================================
  // Digital Actions (Buttons)
  // ========================================

  /**
   * Get the handle for a digital action by name
   * 
   * Digital actions represent button presses (on/off state).
   * Should be queried once at startup and cached.
   * 
   * @param actionName - Name of the digital action from input_actions.vdf
   * @returns Digital action handle
   * 
   * @example
   * ```typescript
   * const jumpHandle = inputManager.getDigitalActionHandle('Jump');
   * const shootHandle = inputManager.getDigitalActionHandle('Shoot');
   * ```
   */
  getDigitalActionHandle(actionName: string): InputDigitalActionHandle {
    const iface = this.getSteamInputInterface();
    if (!iface) return BigInt(0);

    try {
      return this.libraryLoader.SteamAPI_ISteamInput_GetDigitalActionHandle(iface, actionName);
    } catch (error) {
      console.error('[SteamInput] GetDigitalActionHandle error:', error);
      return BigInt(0);
    }
  }

  /**
   * Get the current state of a digital action
   * 
   * @param inputHandle - Controller handle
   * @param digitalActionHandle - Digital action handle
   * @returns Digital action data (state and active status)
   * 
   * @example
   * ```typescript
   * const jumpData = inputManager.getDigitalActionData(controllerHandle, jumpHandle);
   * if (jumpData.state && jumpData.active) {
   *   player.jump();
   * }
   * ```
   */
  getDigitalActionData(inputHandle: InputHandle, digitalActionHandle: InputDigitalActionHandle): InputDigitalActionData {
    const iface = this.getSteamInputInterface();
    if (!iface) {
      return { state: false, active: false };
    }

    try {
      // Allocate buffer for InputDigitalActionData_t struct (bool state + bool active)
      const buffer = Buffer.alloc(2);
      
      this.libraryLoader.SteamAPI_ISteamInput_GetDigitalActionData(iface, inputHandle, digitalActionHandle, buffer);
      
      return {
        state: buffer.readUInt8(0) !== 0,
        active: buffer.readUInt8(1) !== 0,
      };
    } catch (error) {
      console.error('[SteamInput] GetDigitalActionData error:', error);
      return { state: false, active: false };
    }
  }

  /**
   * Get the localized string for a digital action name
   * 
   * @param digitalActionHandle - Digital action handle
   * @returns Localized action name, or empty string if not found
   */
  getStringForDigitalActionName(digitalActionHandle: InputDigitalActionHandle): string {
    const iface = this.getSteamInputInterface();
    if (!iface) return '';

    try {
      return this.libraryLoader.SteamAPI_ISteamInput_GetStringForDigitalActionName(iface, digitalActionHandle) || '';
    } catch (error) {
      console.error('[SteamInput] GetStringForDigitalActionName error:', error);
      return '';
    }
  }

  // ========================================
  // Analog Actions (Sticks, Triggers)
  // ========================================

  /**
   * Get the handle for an analog action by name
   * 
   * Analog actions represent continuous inputs like joysticks and triggers.
   * Should be queried once at startup and cached.
   * 
   * @param actionName - Name of the analog action from input_actions.vdf
   * @returns Analog action handle
   * 
   * @example
   * ```typescript
   * const moveHandle = inputManager.getAnalogActionHandle('Move');
   * const lookHandle = inputManager.getAnalogActionHandle('Look');
   * ```
   */
  getAnalogActionHandle(actionName: string): InputAnalogActionHandle {
    const iface = this.getSteamInputInterface();
    if (!iface) return BigInt(0);

    try {
      return this.libraryLoader.SteamAPI_ISteamInput_GetAnalogActionHandle(iface, actionName);
    } catch (error) {
      console.error('[SteamInput] GetAnalogActionHandle error:', error);
      return BigInt(0);
    }
  }

  /**
   * Get the current state of an analog action
   * 
   * @param inputHandle - Controller handle
   * @param analogActionHandle - Analog action handle
   * @returns Analog action data (mode, x, y values, and active status)
   * 
   * @example
   * ```typescript
   * const moveData = inputManager.getAnalogActionData(controllerHandle, moveHandle);
   * if (moveData.active) {
   *   player.move(moveData.x, moveData.y);
   * }
   * ```
   */
  getAnalogActionData(inputHandle: InputHandle, analogActionHandle: InputAnalogActionHandle): InputAnalogActionData {
    const iface = this.getSteamInputInterface();
    if (!iface) {
      return { mode: 0, x: 0, y: 0, active: false };
    }

    try {
      // Allocate buffer for InputAnalogActionData_t struct
      // EInputSourceMode (4 bytes), float x, float y, bool active
      const buffer = Buffer.alloc(13);
      
      this.libraryLoader.SteamAPI_ISteamInput_GetAnalogActionData(iface, inputHandle, analogActionHandle, buffer);
      
      return {
        mode: buffer.readInt32LE(0),
        x: buffer.readFloatLE(4),
        y: buffer.readFloatLE(8),
        active: buffer.readUInt8(12) !== 0,
      };
    } catch (error) {
      console.error('[SteamInput] GetAnalogActionData error:', error);
      return { mode: 0, x: 0, y: 0, active: false };
    }
  }

  /**
   * Get the localized string for an analog action name
   * 
   * @param analogActionHandle - Analog action handle
   * @returns Localized action name, or empty string if not found
   */
  getStringForAnalogActionName(analogActionHandle: InputAnalogActionHandle): string {
    const iface = this.getSteamInputInterface();
    if (!iface) return '';

    try {
      return this.libraryLoader.SteamAPI_ISteamInput_GetStringForAnalogActionName(iface, analogActionHandle) || '';
    } catch (error) {
      console.error('[SteamInput] GetStringForAnalogActionName error:', error);
      return '';
    }
  }

  /**
   * Stop analog action momentum for trackball mode
   * 
   * If an analog action is in trackball mode (mouse emulation), 
   * this stops the momentum/inertia.
   * 
   * @param inputHandle - Controller handle
   * @param analogActionHandle - Analog action handle
   */
  stopAnalogActionMomentum(inputHandle: InputHandle, analogActionHandle: InputAnalogActionHandle): void {
    const iface = this.getSteamInputInterface();
    if (!iface) return;

    try {
      this.libraryLoader.SteamAPI_ISteamInput_StopAnalogActionMomentum(iface, inputHandle, analogActionHandle);
    } catch (error) {
      console.error('[SteamInput] StopAnalogActionMomentum error:', error);
    }
  }

  // ========================================
  // Motion Data
  // ========================================

  /**
   * Get motion data from controller (gyroscope and accelerometer)
   * 
   * Provides quaternion rotation, positional acceleration, and angular velocity.
   * 
   * @param inputHandle - Controller handle
   * @returns Motion data, or null if not supported
   * 
   * @example
   * ```typescript
   * const motion = inputManager.getMotionData(controllerHandle);
   * if (motion) {
   *   // Use gyro for aiming
   *   camera.rotateByGyro(motion.rotVelX, motion.rotVelY, motion.rotVelZ);
   * }
   * ```
   */
  getMotionData(inputHandle: InputHandle): InputMotionData | null {
    const iface = this.getSteamInputInterface();
    if (!iface) return null;

    try {
      // Allocate buffer for InputMotionData_t struct
      // 4 floats (quat) + 3 floats (posAccel) + 3 floats (rotVel) = 10 floats = 40 bytes
      const buffer = Buffer.alloc(40);
      
      this.libraryLoader.SteamAPI_ISteamInput_GetMotionData(iface, inputHandle, buffer);
      
      return {
        rotQuatX: buffer.readFloatLE(0),
        rotQuatY: buffer.readFloatLE(4),
        rotQuatZ: buffer.readFloatLE(8),
        rotQuatW: buffer.readFloatLE(12),
        posAccelX: buffer.readFloatLE(16),
        posAccelY: buffer.readFloatLE(20),
        posAccelZ: buffer.readFloatLE(24),
        rotVelX: buffer.readFloatLE(28),
        rotVelY: buffer.readFloatLE(32),
        rotVelZ: buffer.readFloatLE(36),
      };
    } catch (error) {
      console.error('[SteamInput] GetMotionData error:', error);
      return null;
    }
  }

  // ========================================
  // Haptics and Rumble
  // ========================================

  /**
   * Trigger vibration/rumble on a controller
   * 
   * @param inputHandle - Controller handle
   * @param leftSpeed - Left motor speed (0-65535)
   * @param rightSpeed - Right motor speed (0-65535)
   * 
   * @example
   * ```typescript
   * // Light rumble
   * inputManager.triggerVibration(handle, 10000, 10000);
   * 
   * // Strong rumble
   * inputManager.triggerVibration(handle, 65535, 65535);
   * 
   * // Stop rumble
   * inputManager.triggerVibration(handle, 0, 0);
   * ```
   */
  triggerVibration(inputHandle: InputHandle, leftSpeed: number, rightSpeed: number): void {
    const iface = this.getSteamInputInterface();
    if (!iface) return;

    try {
      this.libraryLoader.SteamAPI_ISteamInput_TriggerVibration(iface, inputHandle, leftSpeed, rightSpeed);
    } catch (error) {
      console.error('[SteamInput] TriggerVibration error:', error);
    }
  }

  /**
   * Trigger extended vibration with trigger motor support (Xbox controllers)
   * 
   * @param inputHandle - Controller handle
   * @param leftSpeed - Left motor speed (0-65535)
   * @param rightSpeed - Right motor speed (0-65535)
   * @param leftTriggerSpeed - Left trigger motor speed (0-65535)
   * @param rightTriggerSpeed - Right trigger motor speed (0-65535)
   */
  triggerVibrationExtended(
    inputHandle: InputHandle,
    leftSpeed: number,
    rightSpeed: number,
    leftTriggerSpeed: number,
    rightTriggerSpeed: number
  ): void {
    const iface = this.getSteamInputInterface();
    if (!iface) return;

    try {
      this.libraryLoader.SteamAPI_ISteamInput_TriggerVibrationExtended(
        iface,
        inputHandle,
        leftSpeed,
        rightSpeed,
        leftTriggerSpeed,
        rightTriggerSpeed
      );
    } catch (error) {
      console.error('[SteamInput] TriggerVibrationExtended error:', error);
    }
  }

  /**
   * Trigger a simple haptic event (Steam Controller, Steam Deck)
   * 
   * @param inputHandle - Controller handle
   * @param hapticLocation - Left, right, or both
   * @param intensity - Intensity (0-255)
   * @param gainDB - Gain in decibels
   * @param otherIntensity - Intensity for the other pad
   * @param otherGainDB - Gain for the other pad
   */
  triggerSimpleHapticEvent(
    inputHandle: InputHandle,
    hapticLocation: ControllerHapticLocation,
    intensity: number,
    gainDB: number,
    otherIntensity: number,
    otherGainDB: number
  ): void {
    const iface = this.getSteamInputInterface();
    if (!iface) return;

    try {
      this.libraryLoader.SteamAPI_ISteamInput_TriggerSimpleHapticEvent(
        iface,
        inputHandle,
        hapticLocation,
        intensity,
        gainDB,
        otherIntensity,
        otherGainDB
      );
    } catch (error) {
      console.error('[SteamInput] TriggerSimpleHapticEvent error:', error);
    }
  }

  /**
   * Set controller LED color (supported controllers only)
   * 
   * @param inputHandle - Controller handle
   * @param colorR - Red (0-255)
   * @param colorG - Green (0-255)
   * @param colorB - Blue (0-255)
   * @param flags - LED flags (0 = set color, 1 = restore default)
   * 
   * @example
   * ```typescript
   * // Set LED to red
   * inputManager.setLEDColor(handle, 255, 0, 0, 0);
   * 
   * // Set LED to blue
   * inputManager.setLEDColor(handle, 0, 0, 255, 0);
   * 
   * // Restore default LED color
   * inputManager.setLEDColor(handle, 0, 0, 0, 1);
   * ```
   */
  setLEDColor(inputHandle: InputHandle, colorR: number, colorG: number, colorB: number, flags: number = 0): void {
    const iface = this.getSteamInputInterface();
    if (!iface) return;

    try {
      this.libraryLoader.SteamAPI_ISteamInput_SetLEDColor(iface, inputHandle, colorR, colorG, colorB, flags);
    } catch (error) {
      console.error('[SteamInput] SetLEDColor error:', error);
    }
  }

  /**
   * Trigger a legacy haptic pulse (Steam Controller)
   * 
   * @param inputHandle - Controller handle
   * @param targetPad - Left or right pad
   * @param durationMicroSec - Duration in microseconds
   */
  legacyTriggerHapticPulse(inputHandle: InputHandle, targetPad: SteamControllerPad, durationMicroSec: number): void {
    const iface = this.getSteamInputInterface();
    if (!iface) return;

    try {
      this.libraryLoader.SteamAPI_ISteamInput_Legacy_TriggerHapticPulse(iface, inputHandle, targetPad, durationMicroSec);
    } catch (error) {
      console.error('[SteamInput] Legacy_TriggerHapticPulse error:', error);
    }
  }

  // ========================================
  // Glyphs and Localization
  // ========================================

  /**
   * Get the path to a PNG glyph for an action origin
   * 
   * Useful for showing button prompts in your UI.
   * 
   * @param origin - Action origin (button)
   * @param size - Glyph size (small, medium, large)
   * @param flags - Glyph style flags
   * @returns Path to PNG file, or empty string if not available
   * 
   * @example
   * ```typescript
   * const origins = inputManager.getDigitalActionOrigins(handle, actionSet, jumpHandle);
   * if (origins.length > 0) {
   *   const glyphPath = inputManager.getGlyphPNGForActionOrigin(
   *     origins[0],
   *     SteamInputGlyphSize.Medium,
   *     SteamInputGlyphStyle.Dark
   *   );
   *   // Display glyph image in UI
   * }
   * ```
   */
  getGlyphPNGForActionOrigin(origin: number, size: SteamInputGlyphSize, flags: number): string {
    const iface = this.getSteamInputInterface();
    if (!iface) return '';

    try {
      return this.libraryLoader.SteamAPI_ISteamInput_GetGlyphPNGForActionOrigin(iface, origin, size, flags) || '';
    } catch (error) {
      console.error('[SteamInput] GetGlyphPNGForActionOrigin error:', error);
      return '';
    }
  }

  /**
   * Get the path to an SVG glyph for an action origin
   * 
   * @param origin - Action origin (button)
   * @param flags - Glyph style flags
   * @returns Path to SVG file, or empty string if not available
   */
  getGlyphSVGForActionOrigin(origin: number, flags: number): string {
    const iface = this.getSteamInputInterface();
    if (!iface) return '';

    try {
      return this.libraryLoader.SteamAPI_ISteamInput_GetGlyphSVGForActionOrigin(iface, origin, flags) || '';
    } catch (error) {
      console.error('[SteamInput] GetGlyphSVGForActionOrigin error:', error);
      return '';
    }
  }

  /**
   * Get localized string for an action origin
   * 
   * @param origin - Action origin (button)
   * @returns Localized button name (e.g., "A Button", "Cross")
   */
  getStringForActionOrigin(origin: number): string {
    const iface = this.getSteamInputInterface();
    if (!iface) return '';

    try {
      return this.libraryLoader.SteamAPI_ISteamInput_GetStringForActionOrigin(iface, origin) || '';
    } catch (error) {
      console.error('[SteamInput] GetStringForActionOrigin error:', error);
      return '';
    }
  }

  // ========================================
  // Utility
  // ========================================

  /**
   * Open the Steam Input configuration UI
   * 
   * Shows the binding panel where users can customize their controller configuration.
   * 
   * @param inputHandle - Controller handle
   * @returns True if successful
   * 
   * @example
   * ```typescript
   * // In your settings menu
   * if (userClicksConfigureController) {
   *   inputManager.showBindingPanel(controllerHandle);
   * }
   * ```
   */
  showBindingPanel(inputHandle: InputHandle): boolean {
    const iface = this.getSteamInputInterface();
    if (!iface) return false;

    try {
      return this.libraryLoader.SteamAPI_ISteamInput_ShowBindingPanel(iface, inputHandle);
    } catch (error) {
      console.error('[SteamInput] ShowBindingPanel error:', error);
      return false;
    }
  }

  /**
   * Get the binding revision for a device
   * 
   * @param inputHandle - Controller handle
   * @returns Device binding revision, or null if not available
   */
  getDeviceBindingRevision(inputHandle: InputHandle): DeviceBindingRevision | null {
    const iface = this.getSteamInputInterface();
    if (!iface) return null;

    try {
      const majorBuffer = Buffer.alloc(4);
      const minorBuffer = Buffer.alloc(4);
      
      const success = this.libraryLoader.SteamAPI_ISteamInput_GetDeviceBindingRevision(
        iface,
        inputHandle,
        majorBuffer,
        minorBuffer
      );
      
      if (success) {
        return {
          major: majorBuffer.readInt32LE(0),
          minor: minorBuffer.readInt32LE(0),
        };
      }
      
      return null;
    } catch (error) {
      console.error('[SteamInput] GetDeviceBindingRevision error:', error);
      return null;
    }
  }

  /**
   * Get the Remote Play session ID for a controller
   * 
   * @param inputHandle - Controller handle
   * @returns Session ID, or 0 if not in a Remote Play session
   */
  getRemotePlaySessionID(inputHandle: InputHandle): number {
    const iface = this.getSteamInputInterface();
    if (!iface) return 0;

    try {
      return this.libraryLoader.SteamAPI_ISteamInput_GetRemotePlaySessionID(iface, inputHandle);
    } catch (error) {
      console.error('[SteamInput] GetRemotePlaySessionID error:', error);
      return 0;
    }
  }

  /**
   * Get the current session input configuration settings
   * 
   * Returns a bitmask of ESteamInputConfigurationEnableType values.
   * 
   * @returns Configuration settings bitmask
   */
  getSessionInputConfigurationSettings(): number {
    const iface = this.getSteamInputInterface();
    if (!iface) return 0;

    try {
      return this.libraryLoader.SteamAPI_ISteamInput_GetSessionInputConfigurationSettings(iface);
    } catch (error) {
      console.error('[SteamInput] GetSessionInputConfigurationSettings error:', error);
      return 0;
    }
  }
}
