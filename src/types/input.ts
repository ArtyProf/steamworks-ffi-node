/**
 * Steam Input types
 * 
 * Types for Steam Input API which provides unified controller support
 * across Xbox, PlayStation, Nintendo Switch, Steam Controller, and more.
 */

/**
 * Handle for a specific controller device
 * This handle consistently identifies a controller even across disconnects/reconnects
 */
export type InputHandle = bigint;

/**
 * Handle for an action set
 * Action sets group related actions together (e.g., "MenuControls", "GameplayControls")
 */
export type InputActionSetHandle = bigint;

/**
 * Handle for a digital action (button press)
 */
export type InputDigitalActionHandle = bigint;

/**
 * Handle for an analog action (joystick, trigger, etc.)
 */
export type InputAnalogActionHandle = bigint;

/**
 * Constants for Steam Input
 */
export const STEAM_INPUT = {
  /** Maximum number of controllers supported */
  MAX_COUNT: 16,
  
  /** Maximum number of analog actions */
  MAX_ANALOG_ACTIONS: 24,
  
  /** Maximum number of digital actions */
  MAX_DIGITAL_ACTIONS: 256,
  
  /** Maximum number of origins for an action */
  MAX_ORIGINS: 8,
  
  /** Maximum number of active action set layers */
  MAX_ACTIVE_LAYERS: 16,
  
  /** Special handle to send commands to all controllers */
  HANDLE_ALL_CONTROLLERS: BigInt('0xFFFFFFFFFFFFFFFF'),
  
  /** Min value for analog action data */
  MIN_ANALOG_ACTION_DATA: -1.0,
  
  /** Max value for analog action data */
  MAX_ANALOG_ACTION_DATA: 1.0,
} as const;

/**
 * Input source modes - describes how an analog action gets its data
 */
export enum InputSourceMode {
  None = 0,
  Dpad = 1,
  Buttons = 2,
  FourButtons = 3,
  AbsoluteMouse = 4,
  RelativeMouse = 5,
  JoystickMove = 6,
  JoystickMouse = 7,
  JoystickCamera = 8,
  ScrollWheel = 9,
  Trigger = 10,
  TouchMenu = 11,
  MouseJoystick = 12,
  MouseRegion = 13,
  RadialMenu = 14,
  SingleButton = 15,
  Switches = 16,
}

/**
 * Controller input types
 * Note: This enum is stable and won't change with Steam updates
 */
export enum SteamInputType {
  Unknown = 0,
  SteamController = 1,
  XBox360Controller = 2,
  XBoxOneController = 3,
  GenericGamepad = 4,
  PS4Controller = 5,
  AppleMFiController = 6,
  AndroidController = 7,
  SwitchJoyConPair = 8,
  SwitchJoyConSingle = 9,
  SwitchProController = 10,
  MobileTouch = 11,
  PS3Controller = 12,
  PS5Controller = 13,
  SteamDeckController = 14,
  Count = 15,
  MaximumPossibleValue = 255,
}

/**
 * LED flags for SetLEDColor
 */
export enum SteamInputLEDFlag {
  /** Set the color */
  SetColor = 0,
  /** Restore the default color */
  RestoreUserDefault = 1,
}

/**
 * Glyph sizes for controller button icons
 */
export enum SteamInputGlyphSize {
  Small = 0,
  Medium = 1,
  Large = 2,
  Count = 3,
}

/**
 * Glyph style flags for controller button icons
 */
export enum SteamInputGlyphStyle {
  /** Use the default glyphs for the controller type */
  Knockout = 0x0,
  /** Black detail/borders on white background */
  Light = 0x1,
  /** White detail/borders on black background */
  Dark = 0x2,
  /** ABXY buttons match base color instead of physical colors */
  NeutralColorABXY = 0x10,
  /** ABXY buttons have solid fill */
  SolidABXY = 0x20,
}

/**
 * Haptic locations for Steam Controller
 */
export enum ControllerHapticLocation {
  Left = (1 << 0),
  Right = (1 << 1),
  Both = (1 << 0) | (1 << 1),
}

/**
 * Haptic pad locations for legacy API
 */
export enum SteamControllerPad {
  Left = 0,
  Right = 1,
}

/**
 * Configuration enable types
 */
export enum SteamInputConfigurationEnableType {
  None = 0x0000,
  Playstation = 0x0001,
  Xbox = 0x0002,
  Generic = 0x0004,
  Switch = 0x0008,
}

/**
 * Digital action data (button state)
 */
export interface InputDigitalActionData {
  /** True if the button is currently pressed */
  state: boolean;
  
  /** True if this action is currently available in the active action set */
  active: boolean;
}

/**
 * Analog action data (joystick, trigger, etc.)
 */
export interface InputAnalogActionData {
  /** Type of data (joystick, trigger, etc.) */
  mode: InputSourceMode;
  
  /** X-axis value (-1.0 to 1.0) */
  x: number;
  
  /** Y-axis value (-1.0 to 1.0) */
  y: number;
  
  /** True if this action is currently available in the active action set */
  active: boolean;
}

/**
 * Motion data from controller gyroscope and accelerometer
 */
export interface InputMotionData {
  /** Quaternion X component for absolute rotation */
  rotQuatX: number;
  
  /** Quaternion Y component for absolute rotation */
  rotQuatY: number;
  
  /** Quaternion Z component for absolute rotation */
  rotQuatZ: number;
  
  /** Quaternion W component for absolute rotation */
  rotQuatW: number;
  
  /** Positional acceleration X (right side up is positive) */
  posAccelX: number;
  
  /** Positional acceleration Y (forward side up is positive) */
  posAccelY: number;
  
  /** Positional acceleration Z (sticks up is positive) */
  posAccelZ: number;
  
  /** Angular velocity X (local pitch in degrees/sec) */
  rotVelX: number;
  
  /** Angular velocity Y (local roll in degrees/sec) */
  rotVelY: number;
  
  /** Angular velocity Z (local yaw in degrees/sec) */
  rotVelZ: number;
}

/**
 * Controller information
 */
export interface ControllerInfo {
  /** Controller handle */
  handle: InputHandle;
  
  /** Controller type */
  type: SteamInputType;
  
  /** Human-readable controller type name */
  typeName: string;
  
  /** Gamepad index if emulating XInput (-1 if not) */
  gamepadIndex: number;
}

/**
 * Action origin information for displaying button glyphs
 */
export interface ActionOriginInfo {
  /** Path to PNG file for the button glyph */
  glyphPNG?: string;
  
  /** Path to SVG file for the button glyph */
  glyphSVG?: string;
  
  /** Localized string for the button name */
  localizedString?: string;
}

/**
 * Action set layer information
 */
export interface ActionSetLayer {
  /** Handle for the layer */
  handle: InputActionSetHandle;
  
  /** Name of the layer */
  name: string;
}

/**
 * Device binding revision
 */
export interface DeviceBindingRevision {
  /** Major version */
  major: number;
  
  /** Minor version */
  minor: number;
}

/**
 * Input action configuration for generating VDF files
 */
export interface InputActionConfig {
  /** List of action sets */
  actionSets: Array<{
    /** Name of the action set */
    name: string;
    
    /** Digital actions (buttons) */
    digitalActions?: string[];
    
    /** Analog actions (sticks, triggers) */
    analogActions?: string[];
  }>;
}
