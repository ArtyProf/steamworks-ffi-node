import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import { RichPresenceKeys, RichPresenceLimits } from '../types';

/**
 * Manager for Steam Rich Presence API operations
 * 
 * The SteamRichPresenceManager allows games to set custom status information
 * that appears in the Steam friends list and chat. This provides players with
 * context about what their friends are doing in your game.
 * 
 * Rich Presence is automatically shared between friends who are in the same game.
 * Each user has a set of key/value pairs that can be queried by other players.
 * 
 * @remarks
 * Special keys recognized by Steam:
 * - `status` - UTF-8 string shown in 'view game info' dialog
 * - `connect` - Command-line for how friends can connect to your game
 * - `steam_display` - Localization token for display in user's language
 * - `steam_player_group` - Group identifier for organizing players
 * - `steam_player_group_size` - Total number of players in the group
 * 
 * Limits:
 * - Maximum 30 keys per user
 * - Keys: Max 64 characters
 * - Values: Max 256 characters
 * 
 * @example Set basic rich presence
 * ```typescript
 * const steam = SteamworksSDK.getInstance();
 * steam.init({ appId: 480 });
 * 
 * // Set status visible to friends
 * steam.richPresence.setRichPresence('status', 'Playing Capture the Flag');
 * steam.richPresence.setRichPresence('connect', '+connect 192.168.1.100:27015');
 * 
 * // Clear all rich presence when leaving game
 * steam.richPresence.clearRichPresence();
 * ```
 * 
 * @example Read friend's rich presence
 * ```typescript
 * const friends = steam.friends.getAllFriends();
 * 
 * friends.forEach(friend => {
 *   // Request friend's rich presence data
 *   steam.richPresence.requestFriendRichPresence(friend.steamId);
 *   
 *   // After data arrives, read it
 *   const status = steam.richPresence.getFriendRichPresence(friend.steamId, 'status');
 *   if (status) {
 *     console.log(`${friend.personaName}: ${status}`);
 *   }
 * });
 * ```
 * 
 * @example Player groups
 * ```typescript
 * // Show player is in a squad of 4
 * steam.richPresence.setRichPresence('steam_player_group', 'squad_alpha');
 * steam.richPresence.setRichPresence('steam_player_group_size', '4');
 * steam.richPresence.setRichPresence('status', 'In Squad Alpha (4/4)');
 * ```
 * 
 * @see {@link https://partner.steamgames.com/doc/api/ISteamFriends#richpresencelocalization Rich Presence Localization}
 * @see {@link https://partner.steamgames.com/doc/api/ISteamFriends ISteamFriends Documentation}
 */
export class SteamRichPresenceManager {
  /** Steam library loader for FFI function calls */
  private libraryLoader: SteamLibraryLoader;
  
  /** Steam API core for initialization and callback management */
  private apiCore: SteamAPICore;

  /**
   * Creates a new SteamRichPresenceManager instance
   * 
   * @param libraryLoader - The Steam library loader for FFI calls
   * @param apiCore - The Steam API core for lifecycle management
   */
  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
  }

  /**
   * Sets a Rich Presence key/value pair for the current user
   * 
   * @param key - The rich presence key (max 64 characters)
   * @param value - The rich presence value (max 256 characters), or null/empty to delete the key
   * @returns True if the key was set successfully, false otherwise
   * 
   * @remarks
   * - Setting a value to null or empty string deletes the key
   * - Key/value pairs are automatically shared with friends in the same game
   * - Steam has special handling for keys: 'status', 'connect', 'steam_display', 
   *   'steam_player_group', 'steam_player_group_size'
   * - Changes take effect immediately for friends viewing your status
   * 
   * @example Set game mode status
   * ```typescript
   * // Set status visible in friends list
   * steam.richPresence.setRichPresence('status', 'Playing Capture the Flag');
   * 
   * // Set connect string for join functionality
   * steam.richPresence.setRichPresence('connect', '+connect 192.168.1.100:27015');
   * 
   * // Use localization token
   * steam.richPresence.setRichPresence('steam_display', '#Status_InGame');
   * 
   * // Delete a key
   * steam.richPresence.setRichPresence('connect', '');
   * ```
   * 
   * @example Player group/squad
   * ```typescript
   * // Indicate player is in a group
   * steam.richPresence.setRichPresence('steam_player_group', 'lobby_12345');
   * steam.richPresence.setRichPresence('steam_player_group_size', '8');
   * ```
   * 
   * @see {@link RichPresenceKeys} for standard key names
   * @see {@link RichPresenceLimits} for length limits
   */
  setRichPresence(key: string, value: string | null): boolean {
    if (!this.apiCore.isInitialized()) {
      console.error('[SteamRichPresence] Cannot set rich presence: Steam not initialized');
      return false;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.error('[SteamRichPresence] Friends interface not available');
      return false;
    }

    try {
      const result = this.libraryLoader.SteamAPI_ISteamFriends_SetRichPresence(
        friendsInterface,
        key,
        value || ''
      );
      return result as boolean;
    } catch (error) {
      console.error('[SteamRichPresence] Error setting rich presence:', error);
      return false;
    }
  }

  /**
   * Clears all Rich Presence data for the current user
   * 
   * @remarks
   * This removes all key/value pairs that were set via setRichPresence().
   * Call this when the player leaves your game or exits a match to clear their status.
   * 
   * @example Clear presence on match end
   * ```typescript
   * // During gameplay
   * steam.richPresence.setRichPresence('status', 'Playing Deathmatch');
   * steam.richPresence.setRichPresence('connect', '+connect server:27015');
   * 
   * // When match ends
   * steam.richPresence.clearRichPresence();
   * 
   * // Or set to menu status
   * steam.richPresence.setRichPresence('status', 'In Main Menu');
   * ```
   */
  clearRichPresence(): void {
    if (!this.apiCore.isInitialized()) {
      console.error('[SteamRichPresence] Cannot clear rich presence: Steam not initialized');
      return;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.error('[SteamRichPresence] Friends interface not available');
      return;
    }

    try {
      this.libraryLoader.SteamAPI_ISteamFriends_ClearRichPresence(friendsInterface);
    } catch (error) {
      console.error('[SteamRichPresence] Error clearing rich presence:', error);
    }
  }

  /**
   * Gets a Rich Presence value for a specific friend
   * 
   * @param steamId - The friend's Steam ID
   * @param key - The rich presence key to retrieve
   * @returns The rich presence value, or empty string if not set or unavailable
   * 
   * @remarks
   * - Data may not be immediately available for friends you haven't interacted with recently
   * - Call requestFriendRichPresence() first to ensure data is downloaded
   * - Only works for friends who are playing the same game
   * - Returns empty string if friend has no value for that key
   * 
   * @example Read friend status
   * ```typescript
   * const friends = steam.friends.getAllFriends();
   * 
   * friends.forEach(friend => {
   *   // Request data first
   *   steam.richPresence.requestFriendRichPresence(friend.steamId);
   *   
   *   // Read status
   *   const status = steam.richPresence.getFriendRichPresence(friend.steamId, 'status');
   *   const connect = steam.richPresence.getFriendRichPresence(friend.steamId, 'connect');
   *   
   *   if (status) {
   *     console.log(`${friend.personaName}: ${status}`);
   *     if (connect) {
   *       console.log(`  Join with: ${connect}`);
   *     }
   *   }
   * });
   * ```
   */
  getFriendRichPresence(steamId: string, key: string): string {
    if (!this.apiCore.isInitialized()) {
      console.error('[SteamRichPresence] Cannot get friend rich presence: Steam not initialized');
      return '';
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.error('[SteamRichPresence] Friends interface not available');
      return '';
    }

    try {
      const steamId64 = BigInt(steamId);
      const value = this.libraryLoader.SteamAPI_ISteamFriends_GetFriendRichPresence(
        friendsInterface,
        steamId64,
        key
      );
      return value as string || '';
    } catch (error) {
      console.error('[SteamRichPresence] Error getting friend rich presence:', error);
      return '';
    }
  }

  /**
   * Gets the number of Rich Presence keys set for a specific friend
   * 
   * @param steamId - The friend's Steam ID
   * @returns Number of rich presence keys, or 0 if none set or unavailable
   * 
   * @remarks
   * Use this with getFriendRichPresenceKeyByIndex() to iterate through
   * all rich presence data for a friend.
   * 
   * @example List all rich presence data
   * ```typescript
   * const friends = steam.friends.getAllFriends();
   * 
   * friends.forEach(friend => {
   *   steam.richPresence.requestFriendRichPresence(friend.steamId);
   *   
   *   const keyCount = steam.richPresence.getFriendRichPresenceKeyCount(friend.steamId);
   *   console.log(`${friend.personaName} has ${keyCount} rich presence keys:`);
   *   
   *   for (let i = 0; i < keyCount; i++) {
   *     const key = steam.richPresence.getFriendRichPresenceKeyByIndex(friend.steamId, i);
   *     const value = steam.richPresence.getFriendRichPresence(friend.steamId, key);
   *     console.log(`  ${key}: ${value}`);
   *   }
   * });
   * ```
   */
  getFriendRichPresenceKeyCount(steamId: string): number {
    if (!this.apiCore.isInitialized()) {
      console.error('[SteamRichPresence] Cannot get key count: Steam not initialized');
      return 0;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.error('[SteamRichPresence] Friends interface not available');
      return 0;
    }

    try {
      const steamId64 = BigInt(steamId);
      const count = this.libraryLoader.SteamAPI_ISteamFriends_GetFriendRichPresenceKeyCount(
        friendsInterface,
        steamId64
      );
      return count as number;
    } catch (error) {
      console.error('[SteamRichPresence] Error getting key count:', error);
      return 0;
    }
  }

  /**
   * Gets a Rich Presence key name by index for a specific friend
   * 
   * @param steamId - The friend's Steam ID
   * @param index - Index of the key (0 to getFriendRichPresenceKeyCount() - 1)
   * @returns The key name, or empty string if invalid index
   * 
   * @remarks
   * Use this with getFriendRichPresenceKeyCount() to iterate through all keys.
   * Then use getFriendRichPresence() to get the value for each key.
   * 
   * @example Iterate all rich presence data
   * ```typescript
   * const steamId = '76561198012345678';
   * 
   * steam.richPresence.requestFriendRichPresence(steamId);
   * 
   * const keyCount = steam.richPresence.getFriendRichPresenceKeyCount(steamId);
   * console.log(`Friend has ${keyCount} rich presence keys:`);
   * 
   * for (let i = 0; i < keyCount; i++) {
   *   const key = steam.richPresence.getFriendRichPresenceKeyByIndex(steamId, i);
   *   const value = steam.richPresence.getFriendRichPresence(steamId, key);
   *   console.log(`  ${key} = ${value}`);
   * }
   * ```
   */
  getFriendRichPresenceKeyByIndex(steamId: string, index: number): string {
    if (!this.apiCore.isInitialized()) {
      console.error('[SteamRichPresence] Cannot get key by index: Steam not initialized');
      return '';
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.error('[SteamRichPresence] Friends interface not available');
      return '';
    }

    try {
      const steamId64 = BigInt(steamId);
      const key = this.libraryLoader.SteamAPI_ISteamFriends_GetFriendRichPresenceKeyByIndex(
        friendsInterface,
        steamId64,
        index
      );
      return key as string || '';
    } catch (error) {
      console.error('[SteamRichPresence] Error getting key by index:', error);
      return '';
    }
  }

  /**
   * Requests Rich Presence data for a specific friend
   * 
   * @param steamId - The friend's Steam ID
   * 
   * @remarks
   * This asynchronously downloads rich presence data for the specified friend.
   * Call this before attempting to read a friend's rich presence values.
   * 
   * Data arrival is not immediate - allow a short delay before calling
   * getFriendRichPresence() after requesting.
   * 
   * @example Request and read rich presence
   * ```typescript
   * const friends = steam.friends.getAllFriends();
   * 
   * // Request all friends' rich presence
   * friends.forEach(friend => {
   *   steam.richPresence.requestFriendRichPresence(friend.steamId);
   * });
   * 
   * // Wait a moment for data to arrive
   * setTimeout(() => {
   *   friends.forEach(friend => {
   *     const status = steam.richPresence.getFriendRichPresence(friend.steamId, 'status');
   *     if (status) {
   *       console.log(`${friend.personaName}: ${status}`);
   *     }
   *   });
   * }, 1000);
   * ```
   */
  requestFriendRichPresence(steamId: string): void {
    if (!this.apiCore.isInitialized()) {
      console.error('[SteamRichPresence] Cannot request rich presence: Steam not initialized');
      return;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.error('[SteamRichPresence] Friends interface not available');
      return;
    }

    try {
      const steamId64 = BigInt(steamId);
      this.libraryLoader.SteamAPI_ISteamFriends_RequestFriendRichPresence(
        friendsInterface,
        steamId64
      );
    } catch (error) {
      console.error('[SteamRichPresence] Error requesting rich presence:', error);
    }
  }
}
