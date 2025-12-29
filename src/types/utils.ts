/**
 * Steam Utils types and enums
 * 
 * Provides types for ISteamUtils API including:
 * - System information (battery, locale)
 * - Steam Deck detection
 * - Image loading from Steam's image cache
 * - Overlay notification positioning
 * - Gamepad text input
 */

// ========================================
// Notification Position Enum
// ========================================

/**
 * Positions for Steam overlay notifications
 * Controls where Steam notifications appear on screen
 */
export enum ENotificationPosition {
  /** Top left corner of the screen */
  TopLeft = 0,
  /** Top right corner of the screen */
  TopRight = 1,
  /** Bottom left corner of the screen */
  BottomLeft = 2,
  /** Bottom right corner of the screen */
  BottomRight = 3,
}

// ========================================
// Gamepad Text Input Enums
// ========================================

/**
 * Controls which input mode is used for the gamepad text input dialog
 */
export enum EGamepadTextInputMode {
  /** Normal text input (visible) */
  Normal = 0,
  /** Password input (hidden text) */
  Password = 1,
}

/**
 * Controls which keyboard type is displayed for gamepad text input
 */
export enum EGamepadTextInputLineMode {
  /** Single line input */
  SingleLine = 0,
  /** Multiple lines allowed */
  MultipleLines = 1,
}

/**
 * Controls floating keyboard behavior
 */
export enum EFloatingGamepadTextInputMode {
  /** Single line input */
  SingleLine = 0,
  /** Multi-line input */
  MultipleLines = 1,
  /** Email input */
  Email = 2,
  /** Numeric keypad */
  Numeric = 3,
}

// ========================================
// Text Filtering Enums
// ========================================

/**
 * Text filtering context for user-generated content
 */
export enum ETextFilteringContext {
  /** Unknown context */
  Unknown = 0,
  /** General game content */
  GameContent = 1,
  /** Chat message */
  Chat = 2,
  /** User name display */
  Name = 3,
}

// ========================================
// Image Data Types
// ========================================

/**
 * Result from querying image dimensions
 */
export interface ImageSize {
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * RGBA image data loaded from Steam's image cache
 */
export interface ImageRGBA {
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Raw RGBA pixel data (4 bytes per pixel) */
  data: Buffer;
}

// ========================================
// Gamepad Text Input Result
// ========================================

/**
 * Result from gamepad text input dialog
 */
export interface GamepadTextInputResult {
  /** Whether text was submitted (true) or cancelled (false) */
  submitted: boolean;
  /** The text entered by the user (empty if cancelled) */
  text: string;
}

// ========================================
// Battery State
// ========================================

/**
 * Value returned when device is running on AC power (not battery)
 */
export const BATTERY_POWER_AC = 255;

// ========================================
// API Call Failure Reason
// ========================================

/**
 * Failure reasons for Steam API calls
 */
export enum ESteamAPICallFailure {
  /** No failure, call succeeded */
  None = -1,
  /** Steam servers returned an error */
  SteamGone = 0,
  /** Network failure */
  NetworkFailure = 1,
  /** The API call handle is invalid */
  InvalidHandle = 2,
  /** Mismatched callback type */
  MismatchedCallback = 3,
}

// ========================================
// Checked App State
// ========================================

/**
 * Result from checking if an app is being updated/installed
 */
export interface CheckAppState {
  /** Whether the app is in a valid state to play */
  valid: boolean;
  /** Percentage of update/install complete (0-100) */
  percentComplete: number;
}
