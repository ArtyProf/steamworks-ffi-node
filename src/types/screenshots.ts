/**
 * Types for Steam Screenshots API
 * 
 * Functions for capturing and managing screenshots in the user's Steam library.
 */

/**
 * Screenshot handle type (uint32)
 * Valid for the lifetime of the game process.
 */
export type ScreenshotHandle = number;

/**
 * Invalid screenshot handle constant
 */
export const INVALID_SCREENSHOT_HANDLE: ScreenshotHandle = 0;

/**
 * Maximum number of users that can be tagged in a screenshot
 */
export const K_SCREENSHOT_MAX_TAGGED_USERS = 32;

/**
 * Maximum number of published files that can be tagged in a screenshot
 */
export const K_SCREENSHOT_MAX_TAGGED_PUBLISHED_FILES = 32;

/**
 * Required width for thumbnails provided to AddScreenshotToLibrary
 * If not provided, one will be generated automatically.
 */
export const K_SCREENSHOT_THUMB_WIDTH = 200;

/**
 * VR screenshot types
 */
export enum EVRScreenshotType {
  /** No VR screenshot */
  None = 0,
  /** Mono VR screenshot */
  Mono = 1,
  /** Stereo VR screenshot */
  Stereo = 2,
  /** Mono cubemap VR screenshot */
  MonoCubemap = 3,
  /** Mono panorama VR screenshot */
  MonoPanorama = 4,
  /** Stereo panorama VR screenshot */
  StereoPanorama = 5
}

/**
 * Screenshot info returned when a screenshot is added to the library
 */
export interface ScreenshotInfo {
  /** Handle to reference this screenshot */
  handle: ScreenshotHandle;
  /** Whether the screenshot was successfully added */
  success: boolean;
}

/**
 * Screenshot ready callback result
 */
export interface ScreenshotReadyResult {
  /** The screenshot handle */
  handle: ScreenshotHandle;
  /** Result code (1 = success) */
  result: number;
}
