/**
 * Types for Steam Rich Presence API
 */

/**
 * Rich presence data for displaying user activity
 * 
 * @remarks
 * Rich Presence allows games to display custom status information
 * that appears in the Steam friends list and chat.
 */
export interface RichPresenceData {
  /** The rich presence key */
  key: string;
  /** The rich presence value */
  value: string;
}

/**
 * Special Rich Presence keys recognized by Steam
 */
export const RichPresenceKeys = {
  /** UTF-8 string shown in 'view game info' dialog */
  STATUS: 'status',
  /** Command-line string for how friends can connect to your game */
  CONNECT: 'connect',
  /** Rich presence localization token for display in user's language */
  STEAM_DISPLAY: 'steam_display',
  /** Group identifier for organizing players together in Steam UI */
  STEAM_PLAYER_GROUP: 'steam_player_group',
  /** Total number of players in the steam_player_group */
  STEAM_PLAYER_GROUP_SIZE: 'steam_player_group_size',
} as const;

/**
 * Maximum limits for Rich Presence
 */
export const RichPresenceLimits = {
  /** Maximum number of rich presence keys per user */
  MAX_KEYS: 30,
  /** Maximum length of a rich presence key */
  MAX_KEY_LENGTH: 64,
  /** Maximum length of a rich presence value */
  MAX_VALUE_LENGTH: 256,
} as const;
