import * as koffi from 'koffi';
import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import { 
  EFriendRelationship, 
  EPersonaState, 
  EFriendFlags, 
  FriendInfo, 
  FriendGameInfo,
  FriendsGroupID_t,
  INVALID_FRIENDS_GROUP_ID,
  CoplayFriendInfo
} from '../types';

/**
 * Manager for Steam Friends API operations
 * 
 * The SteamFriendsManager provides comprehensive access to Steam's social features,
 * allowing you to retrieve information about the current user and their friends.
 * 
 * - Current user information (persona name, online state)
 * - Friends list retrieval and iteration
 * - Individual friend information (name, state, relationship)
 * - Friend details (Steam level, currently playing game)
 * 
 * @remarks
 * All methods require the Steam API to be initialized. The manager checks initialization
 * status and Friends interface availability before making API calls.
 * 
 * @example Get current user information
 * ```typescript
 * const steam = SteamworksSDK.getInstance();
 * steam.init({ appId: 480 });
 * 
 * const myName = steam.friends.getPersonaName();
 * const myState = steam.friends.getPersonaState();
 * console.log(`${myName} is ${myState === EPersonaState.Online ? 'online' : 'offline'}`);
 * ```
 * 
 * @example Get all friends
 * ```typescript
 * const friends = steam.friends.getAllFriends(EFriendFlags.Immediate);
 * friends.forEach(friend => {
 *   console.log(`${friend.personaName} (${friend.steamId})`);
 *   console.log(`Status: ${friend.personaState}`);
 *   
 *   const gameInfo = steam.friends.getFriendGamePlayed(friend.steamId);
 *   if (gameInfo) {
 *     console.log(`Playing game: ${gameInfo.gameId}`);
 *   }
 * });
 * ```
 * 
 * @example Iterate through friends manually
 * ```typescript
 * const count = steam.friends.getFriendCount(EFriendFlags.Immediate);
 * for (let i = 0; i < count; i++) {
 *   const steamId = steam.friends.getFriendByIndex(i, EFriendFlags.Immediate);
 *   if (steamId) {
 *     const name = steam.friends.getFriendPersonaName(steamId);
 *     const level = steam.friends.getFriendSteamLevel(steamId);
 *     console.log(`${name} - Level ${level}`);
 *   }
 * }
 * ```
 * 
 * @see {@link https://partner.steamgames.com/doc/api/ISteamFriends ISteamFriends Documentation}
 */
export class SteamFriendsManager {
  /** Steam library loader for FFI function calls */
  private libraryLoader: SteamLibraryLoader;
  
  /** Steam API core for initialization and callback management */
  private apiCore: SteamAPICore;

  /** FriendGameInfo_t struct for game information */
  private static FriendGameInfo_t = koffi.struct('FriendGameInfo_t', {
    m_gameID: 'uint64',
    m_unGameIP: 'uint32',
    m_usGamePort: 'uint16',
    m_usQueryPort: 'uint16',
    m_steamIDLobby: 'uint64',
  });

  /**
   * Creates a new SteamFriendsManager instance
   * 
   * @param libraryLoader - The Steam library loader for FFI calls
   * @param apiCore - The Steam API core for lifecycle management
   */
  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
  }

  /**
   * Gets the current user's persona name (Steam display name)
   * 
   * @returns The user's Steam display name, or empty string if unavailable
   * 
   * @remarks
   * This returns the name that other users see when they view your profile.
   * It may differ from your account name used for login.
   * 
   * @example
   * ```typescript
   * const myName = steam.friends.getPersonaName();
   * console.log(`Logged in as: ${myName}`);
   * ```
   */
  getPersonaName(): string {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return '';
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return '';
    }

    try {
      const name = this.libraryLoader.SteamAPI_ISteamFriends_GetPersonaName(friendsInterface);
      return name || '';
    } catch (error) {
      console.error('[Steamworks] Error getting persona name:', error);
      return '';
    }
  }

  /**
   * Gets the current user's persona state (online status)
   * 
   * @returns The user's current online status from {@link EPersonaState}
   * 
   * @remarks
   * The persona state indicates the user's current availability:
   * - Offline: User is not logged in
   * - Online: User is online and available
   * - Busy: User is online but marked as busy
   * - Away: User is away from keyboard
   * - Snooze: User is auto-away
   * - LookingToTrade: User is looking to trade items
   * - LookingToPlay: User is looking for a game
   * - Invisible: User appears offline to others
   * 
   * @example
   * ```typescript
   * const state = steam.friends.getPersonaState();
   * if (state === EPersonaState.Online) {
   *   console.log('You are online!');
   * }
   * ```
   */
  getPersonaState(): EPersonaState {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return EPersonaState.Offline;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return EPersonaState.Offline;
    }

    try {
      const state = this.libraryLoader.SteamAPI_ISteamFriends_GetPersonaState(friendsInterface);
      return state;
    } catch (error) {
      console.error('[Steamworks] Error getting persona state:', error);
      return EPersonaState.Offline;
    }
  }

  /**
   * Gets the count of friends matching specified flags
   * 
   * @param friendFlags - Flags to filter which friends to count (default: {@link EFriendFlags.Immediate})
   * @returns The number of friends matching the specified flags
   * 
   * @remarks
   * Common flag combinations:
   * - `EFriendFlags.Immediate`: Regular friends (most common)
   * - `EFriendFlags.All`: All relationships including blocked, ignored, etc.
   * - `EFriendFlags.OnGameServer`: Friends on the same game server
   * 
   * The same flags must be used with {@link getFriendByIndex} to iterate the list.
   * 
   * @example
   * ```typescript
   * const friendCount = steam.friends.getFriendCount(EFriendFlags.Immediate);
   * console.log(`You have ${friendCount} friends`);
   * ```
   * 
   * @see {@link getFriendByIndex}
   * @see {@link getAllFriends}
   */
  getFriendCount(friendFlags: EFriendFlags = EFriendFlags.Immediate): number {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return 0;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return 0;
    }

    try {
      const count = this.libraryLoader.SteamAPI_ISteamFriends_GetFriendCount(friendsInterface, friendFlags);
      return count;
    } catch (error) {
      console.error('[Steamworks] Error getting friend count:', error);
      return 0;
    }
  }

  /**
   * Gets a friend's Steam ID by their index in the friends list
   * 
   * @param index - Zero-based index of the friend (0 to {@link getFriendCount}() - 1)
   * @param friendFlags - Same flags used in {@link getFriendCount} (default: {@link EFriendFlags.Immediate})
   * @returns The friend's Steam ID as a string, or null if the index is invalid
   * 
   * @remarks
   * Use this method to iterate through the friends list:
   * 1. Call {@link getFriendCount} with specific flags
   * 2. Loop from 0 to count-1 calling this method with the same flags
   * 3. Use the returned Steam ID with other methods like {@link getFriendPersonaName}
   * 
   * The flags must match those used in {@link getFriendCount} or you'll get incorrect results.
   * 
   * @example
   * ```typescript
   * const count = steam.friends.getFriendCount(EFriendFlags.Immediate);
   * for (let i = 0; i < count; i++) {
   *   const steamId = steam.friends.getFriendByIndex(i, EFriendFlags.Immediate);
   *   if (steamId) {
   *     const name = steam.friends.getFriendPersonaName(steamId);
   *     console.log(`Friend ${i}: ${name} (${steamId})`);
   *   }
   * }
   * ```
   * 
   * @see {@link getFriendCount}
   * @see {@link getAllFriends}
   */
  getFriendByIndex(index: number, friendFlags: EFriendFlags = EFriendFlags.Immediate): string | null {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return null;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return null;
    }

    try {
      const steamId = this.libraryLoader.SteamAPI_ISteamFriends_GetFriendByIndex(friendsInterface, index, friendFlags);

      if (steamId && steamId !== 0n) {
        const steamIdStr = steamId.toString();
        return steamIdStr;
      }

      return null;
    } catch (error) {
      console.error(`[Steamworks] Error getting friend by index ${index}:`, error);
      return null;
    }
  }

  /**
   * Gets a friend's persona name (Steam display name)
   * 
   * @param steamId - The friend's Steam ID as a string
   * @returns The friend's display name, or empty string if unavailable
   * 
   * @remarks
   * This returns the name that appears in the Steam friends list and chat.
   * If the friend has not been seen by the current user recently, the name
   * may not be immediately available and could return an empty string.
   * 
   * @example
   * ```typescript
   * const steamId = steam.friends.getFriendByIndex(0, EFriendFlags.Immediate);
   * if (steamId) {
   *   const name = steam.friends.getFriendPersonaName(steamId);
   *   console.log(`Friend's name: ${name}`);
   * }
   * ```
   * 
   * @see {@link getPersonaName} for current user's name
   */
  getFriendPersonaName(steamId: string): string {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return '';
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return '';
    }

    try {
      const name = this.libraryLoader.SteamAPI_ISteamFriends_GetFriendPersonaName(friendsInterface, BigInt(steamId));
      return name || '';
    } catch (error) {
      console.error(`[Steamworks] Error getting friend persona name for ${steamId}:`, error);
      return '';
    }
  }

  /**
   * Gets a friend's persona state (online status)
   * 
   * @param steamId - The friend's Steam ID as a string
   * @returns The friend's current online status from {@link EPersonaState}
   * 
   * @remarks
   * Returns the friend's current availability status. Common states include:
   * - Offline (0): Friend is not logged in
   * - Online (1): Friend is online and available
   * - Busy (2): Friend is marked as busy
   * - Away (3): Friend is away from keyboard
   * 
   * @example
   * ```typescript
   * const friends = steam.friends.getAllFriends();
   * const onlineFriends = friends.filter(f => 
   *   steam.friends.getFriendPersonaState(f.steamId) !== EPersonaState.Offline
   * );
   * console.log(`${onlineFriends.length} friends are online`);
   * ```
   * 
   * @see {@link getPersonaState} for current user's state
   * @see {@link EPersonaState}
   */
  getFriendPersonaState(steamId: string): EPersonaState {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return EPersonaState.Offline;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return EPersonaState.Offline;
    }

    try {
      const state = this.libraryLoader.SteamAPI_ISteamFriends_GetFriendPersonaState(friendsInterface, BigInt(steamId));
      return state;
    } catch (error) {
      console.error(`[Steamworks] Error getting friend persona state for ${steamId}:`, error);
      return EPersonaState.Offline;
    }
  }

  /**
   * Gets the relationship status between the current user and another user
   * 
   * @param steamId - The other user's Steam ID as a string
   * @returns The relationship status from {@link EFriendRelationship}
   * 
   * @remarks
   * Possible relationship states include:
   * - None (0): No relationship
   * - Blocked (1): User is blocked
   * - RequestRecipient (2): Received a friend request from this user
   * - Friend (3): Users are friends
   * - RequestInitiator (4): Sent a friend request to this user
   * - Ignored (5): User is ignored
   * - IgnoredFriend (6): User was a friend but is now ignored
   * 
   * @example
   * ```typescript
   * const relationship = steam.friends.getFriendRelationship(friendSteamId);
   * if (relationship === EFriendRelationship.Friend) {
   *   console.log('This user is your friend');
   * } else if (relationship === EFriendRelationship.RequestRecipient) {
   *   console.log('This user sent you a friend request');
   * }
   * ```
   * 
   * @see {@link EFriendRelationship}
   */
  getFriendRelationship(steamId: string): EFriendRelationship {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return EFriendRelationship.None;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return EFriendRelationship.None;
    }

    try {
      const relationship = this.libraryLoader.SteamAPI_ISteamFriends_GetFriendRelationship(friendsInterface, BigInt(steamId));
      return relationship;
    } catch (error) {
      console.error(`[Steamworks] Error getting friend relationship for ${steamId}:`, error);
      return EFriendRelationship.None;
    }
  }

  /**
   * Gets all friends with their complete information in a single call
   * 
   * @param friendFlags - Flags to filter which friends to retrieve (default: {@link EFriendFlags.Immediate})
   * @returns Array of {@link FriendInfo} objects containing friend details
   * 
   * @remarks
   * This is a convenience method that combines {@link getFriendCount}, {@link getFriendByIndex},
   * and several other methods to retrieve complete friend information in one call.
   * 
   * Each {@link FriendInfo} object contains:
   * - steamId: Friend's Steam ID
   * - personaName: Friend's display name
   * - personaState: Friend's online status
   * - relationship: Relationship type with this friend
   * 
   * For large friends lists (100+), this method makes many API calls and may take
   * a moment to complete. Consider using {@link getFriendByIndex} for manual iteration
   * if you need to process friends incrementally.
   * 
   * @example
   * ```typescript
   * const friends = steam.friends.getAllFriends(EFriendFlags.Immediate);
   * console.log(`You have ${friends.length} friends`);
   * 
   * friends.forEach(friend => {
   *   console.log(`${friend.personaName} is ${friend.personaState === EPersonaState.Online ? 'online' : 'offline'}`);
   * });
   * ```
   * 
   * @see {@link getFriendCount}
   * @see {@link getFriendByIndex}
   * @see {@link FriendInfo}
   */
  getAllFriends(friendFlags: EFriendFlags = EFriendFlags.Immediate): FriendInfo[] {
    const friends: FriendInfo[] = [];
    const count = this.getFriendCount(friendFlags);

    for (let i = 0; i < count; i++) {
      const steamId = this.getFriendByIndex(i, friendFlags);
      if (steamId) {
        friends.push({
          steamId,
          personaName: this.getFriendPersonaName(steamId),
          personaState: this.getFriendPersonaState(steamId),
          relationship: this.getFriendRelationship(steamId),
        });
      }
    }

    console.log(`[Steamworks] Retrieved ${friends.length} friends`);
    return friends;
  }

  /**
   * Gets a friend's current Steam level
   * 
   * @param steamId - The friend's Steam ID as a string
   * @returns The friend's Steam level (1-5000+), or 0 if unavailable
   * 
   * @remarks
   * The Steam level indicates how much a user has participated in Steam features
   * like collecting trading cards, crafting badges, and participating in events.
   * 
   * Returns 0 if:
   * - The friend's profile is private
   * - The level hasn't been loaded yet
   * - The API call fails
   * 
   * @example
   * ```typescript
   * const friends = steam.friends.getAllFriends();
   * friends.forEach(friend => {
   *   const level = steam.friends.getFriendSteamLevel(friend.steamId);
   *   console.log(`${friend.personaName} is Level ${level}`);
   * });
   * ```
   * 
   * @example Find highest level friend
   * ```typescript
   * const friends = steam.friends.getAllFriends();
   * const highestLevel = friends.reduce((max, friend) => {
   *   const level = steam.friends.getFriendSteamLevel(friend.steamId);
   *   return level > max.level ? { friend, level } : max;
   * }, { friend: null, level: 0 });
   * 
   * if (highestLevel.friend) {
   *   console.log(`Highest level friend: ${highestLevel.friend.personaName} (Level ${highestLevel.level})`);
   * }
   * ```
   */
  getFriendSteamLevel(steamId: string): number {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return 0;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return 0;
    }

    try {
      const level = this.libraryLoader.SteamAPI_ISteamFriends_GetFriendSteamLevel(friendsInterface, BigInt(steamId));
      return level;
    } catch (error) {
      console.error(`[Steamworks] Error getting friend Steam level for ${steamId}:`, error);
      return 0;
    }
  }

  /**
   * Checks if a friend is currently playing a game and returns game information
   * 
   * @param steamId - The friend's Steam ID as a string
   * @returns {@link FriendGameInfo} object if the friend is playing a game, null otherwise
   * 
   * @remarks
   * When a friend is actively playing a game, this returns detailed information including:
   * - gameId: The Steam App ID of the game being played
   * - gameIP: IP address of the game server (if on a server)
   * - gamePort: Port of the game server
   * - queryPort: Query port for the game server
   * - steamIDLobby: Steam ID of the lobby (if in a lobby)
   * 
   * Returns null if:
   * - Friend is not playing any game
   * - Friend is offline
   * - Game information is not available
   * 
   * @example Check what games friends are playing
   * ```typescript
   * const friends = steam.friends.getAllFriends();
   * friends.forEach(friend => {
   *   const gameInfo = steam.friends.getFriendGamePlayed(friend.steamId);
   *   if (gameInfo) {
   *     console.log(`${friend.personaName} is playing App ${gameInfo.gameId}`);
   *   }
   * });
   * ```
   * 
   * @example Find friends playing a specific game
   * ```typescript
   * const TARGET_GAME_ID = '730'; // CS:GO
   * const friends = steam.friends.getAllFriends();
   * const playingTargetGame = friends.filter(friend => {
   *   const gameInfo = steam.friends.getFriendGamePlayed(friend.steamId);
   *   return gameInfo && gameInfo.gameId === TARGET_GAME_ID;
   * });
   * 
   * console.log(`${playingTargetGame.length} friends are playing CS:GO`);
   * ```
   * 
   * @see {@link FriendGameInfo}
   */
  getFriendGamePlayed(steamId: string): FriendGameInfo | null {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return null;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return null;
    }

    try {
      const gameInfoPtr = koffi.alloc(SteamFriendsManager.FriendGameInfo_t, 1);
      const isPlaying = this.libraryLoader.SteamAPI_ISteamFriends_GetFriendGamePlayed(
        friendsInterface, 
        BigInt(steamId), 
        gameInfoPtr
      );

      if (isPlaying) {
        const gameInfo = koffi.decode(gameInfoPtr, SteamFriendsManager.FriendGameInfo_t);
        
        if (gameInfo.m_gameID && gameInfo.m_gameID !== 0n) {
          const result: FriendGameInfo = {
            gameId: gameInfo.m_gameID.toString(),
            gameIP: gameInfo.m_unGameIP,
            gamePort: gameInfo.m_usGamePort,
            queryPort: gameInfo.m_usQueryPort,
            steamIDLobby: gameInfo.m_steamIDLobby.toString(),
          };
          return result;
        }
      }

      return null;
    } catch (error) {
      console.error(`[Steamworks] Error getting friend game played for ${steamId}:`, error);
      return null;
    }
  }

  // ========================================
  // Avatar Functions
  // ========================================

  /**
   * Gets the handle for a friend's small (32x32) avatar image
   * 
   * @param steamId - The friend's Steam ID as a string
   * @returns Image handle for use with ISteamUtils, or 0 if unavailable
   * 
   * @remarks
   * This returns a handle that can be used with ISteamUtils::GetImageSize() 
   * and ISteamUtils::GetImageRGBA() to retrieve the actual image data.
   * 
   * Small avatars are 32x32 pixels and are suitable for:
   * - Friend list thumbnails
   * - Chat message icons
   * - Compact UI elements
   * 
   * The avatar image is cached by Steam. If it returns 0, the image might
   * still be loading. You can try again after a short delay.
   * 
   * @example
   * ```typescript
   * const avatarHandle = steam.friends.getSmallFriendAvatar(friendSteamId);
   * if (avatarHandle > 0) {
   *   console.log(`Small avatar handle: ${avatarHandle}`);
   *   // Use with ISteamUtils to get actual image data
   * }
   * ```
   * 
   * @see {@link getMediumFriendAvatar}
   * @see {@link getLargeFriendAvatar}
   */
  getSmallFriendAvatar(steamId: string): number {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return 0;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return 0;
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamFriends_GetSmallFriendAvatar(friendsInterface, BigInt(steamId));
      return handle;
    } catch (error) {
      console.error(`[Steamworks] Error getting small friend avatar for ${steamId}:`, error);
      return 0;
    }
  }

  /**
   * Gets the handle for a friend's medium (64x64) avatar image
   * 
   * @param steamId - The friend's Steam ID as a string
   * @returns Image handle for use with ISteamUtils, or 0 if unavailable
   * 
   * @remarks
   * This returns a handle that can be used with ISteamUtils::GetImageSize() 
   * and ISteamUtils::GetImageRGBA() to retrieve the actual image data.
   * 
   * Medium avatars are 64x64 pixels and are suitable for:
   * - User profiles
   * - Game lobby player lists
   * - Standard UI elements
   * 
   * The avatar image is cached by Steam. If it returns 0, the image might
   * still be loading. You can try again after a short delay.
   * 
   * @example
   * ```typescript
   * const avatarHandle = steam.friends.getMediumFriendAvatar(friendSteamId);
   * if (avatarHandle > 0) {
   *   console.log(`Medium avatar handle: ${avatarHandle}`);
   *   // Use with ISteamUtils to get actual image data
   * }
   * ```
   * 
   * @see {@link getSmallFriendAvatar}
   * @see {@link getLargeFriendAvatar}
   */
  getMediumFriendAvatar(steamId: string): number {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return 0;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return 0;
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamFriends_GetMediumFriendAvatar(friendsInterface, BigInt(steamId));
      return handle;
    } catch (error) {
      console.error(`[Steamworks] Error getting medium friend avatar for ${steamId}:`, error);
      return 0;
    }
  }

  /**
   * Gets the handle for a friend's large (184x184) avatar image
   * 
   * @param steamId - The friend's Steam ID as a string
   * @returns Image handle for use with ISteamUtils, or 0 if unavailable
   * 
   * @remarks
   * This returns a handle that can be used with ISteamUtils::GetImageSize() 
   * and ISteamUtils::GetImageRGBA() to retrieve the actual image data.
   * 
   * Large avatars are 184x184 pixels and are suitable for:
   * - Detailed profile views
   * - Full-screen overlays
   * - High-resolution displays
   * 
   * The avatar image is cached by Steam. If it returns 0, the image might
   * still be loading. You can try again after a short delay.
   * 
   * @example
   * ```typescript
   * const avatarHandle = steam.friends.getLargeFriendAvatar(friendSteamId);
   * if (avatarHandle > 0) {
   *   console.log(`Large avatar handle: ${avatarHandle}`);
   *   // Use with ISteamUtils to get actual image data
   * }
   * ```
   * 
   * @see {@link getSmallFriendAvatar}
   * @see {@link getMediumFriendAvatar}
   */
  getLargeFriendAvatar(steamId: string): number {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return 0;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return 0;
    }

    try {
      const handle = this.libraryLoader.SteamAPI_ISteamFriends_GetLargeFriendAvatar(friendsInterface, BigInt(steamId));
      return handle;
    } catch (error) {
      console.error(`[Steamworks] Error getting large friend avatar for ${steamId}:`, error);
      return 0;
    }
  }

  // ========================================
  // Friend Groups Functions
  // ========================================

  /**
   * Gets the number of Steam friend groups (tags) the user has created
   * 
   * @returns The number of friend groups, or 0 if unavailable
   * 
   * @remarks
   * Steam allows users to organize friends into custom groups (also called tags).
   * This returns the total number of groups the current user has created.
   * 
   * Use this with {@link getFriendsGroupIDByIndex} to iterate through all groups.
   * 
   * @example
   * ```typescript
   * const groupCount = steam.friends.getFriendsGroupCount();
   * console.log(`You have ${groupCount} friend groups`);
   * 
   * for (let i = 0; i < groupCount; i++) {
   *   const groupId = steam.friends.getFriendsGroupIDByIndex(i);
   *   const groupName = steam.friends.getFriendsGroupName(groupId);
   *   console.log(`Group ${i}: ${groupName}`);
   * }
   * ```
   * 
   * @see {@link getFriendsGroupIDByIndex}
   * @see {@link getFriendsGroupName}
   */
  getFriendsGroupCount(): number {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return 0;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return 0;
    }

    try {
      const count = this.libraryLoader.SteamAPI_ISteamFriends_GetFriendsGroupCount(friendsInterface);
      return count;
    } catch (error) {
      console.error('[Steamworks] Error getting friends group count:', error);
      return 0;
    }
  }

  /**
   * Gets a friend group ID by its index
   * 
   * @param index - Zero-based index of the group (0 to {@link getFriendsGroupCount}() - 1)
   * @returns The group ID, or {@link INVALID_FRIENDS_GROUP_ID} if the index is invalid
   * 
   * @remarks
   * Use this method to iterate through all friend groups:
   * 1. Call {@link getFriendsGroupCount} to get the total number of groups
   * 2. Loop from 0 to count-1 calling this method to get each group ID
   * 3. Use the returned ID with {@link getFriendsGroupName} and {@link getFriendsGroupMembersList}
   * 
   * @example
   * ```typescript
   * const groupCount = steam.friends.getFriendsGroupCount();
   * for (let i = 0; i < groupCount; i++) {
   *   const groupId = steam.friends.getFriendsGroupIDByIndex(i);
   *   if (groupId !== INVALID_FRIENDS_GROUP_ID) {
   *     const name = steam.friends.getFriendsGroupName(groupId);
   *     const memberCount = steam.friends.getFriendsGroupMembersCount(groupId);
   *     console.log(`Group: ${name} (${memberCount} members)`);
   *   }
   * }
   * ```
   * 
   * @see {@link getFriendsGroupCount}
   * @see {@link getFriendsGroupName}
   * @see {@link INVALID_FRIENDS_GROUP_ID}
   */
  getFriendsGroupIDByIndex(index: number): FriendsGroupID_t {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return INVALID_FRIENDS_GROUP_ID;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return INVALID_FRIENDS_GROUP_ID;
    }

    try {
      const groupId = this.libraryLoader.SteamAPI_ISteamFriends_GetFriendsGroupIDByIndex(friendsInterface, index);
      return groupId;
    } catch (error) {
      console.error(`[Steamworks] Error getting friends group ID by index ${index}:`, error);
      return INVALID_FRIENDS_GROUP_ID;
    }
  }

  /**
   * Gets the name of a friend group
   * 
   * @param groupId - The ID of the friend group
   * @returns The group name, or empty string if unavailable
   * 
   * @remarks
   * Returns the user-defined name for the specified friend group.
   * Group names are created and managed by the user in the Steam client.
   * 
   * @example
   * ```typescript
   * const groupId = steam.friends.getFriendsGroupIDByIndex(0);
   * if (groupId !== INVALID_FRIENDS_GROUP_ID) {
   *   const name = steam.friends.getFriendsGroupName(groupId);
   *   console.log(`First group is named: ${name}`);
   * }
   * ```
   * 
   * @see {@link getFriendsGroupIDByIndex}
   * @see {@link getFriendsGroupMembersCount}
   */
  getFriendsGroupName(groupId: FriendsGroupID_t): string {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return '';
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return '';
    }

    try {
      const name = this.libraryLoader.SteamAPI_ISteamFriends_GetFriendsGroupName(friendsInterface, groupId);
      return name || '';
    } catch (error) {
      console.error(`[Steamworks] Error getting friends group name for ${groupId}:`, error);
      return '';
    }
  }

  /**
   * Gets the number of members in a friend group
   * 
   * @param groupId - The ID of the friend group
   * @returns The number of friends in the group, or 0 if unavailable
   * 
   * @remarks
   * Returns how many friends are assigned to the specified group.
   * Use this with {@link getFriendsGroupMembersList} to retrieve the actual members.
   * 
   * @example
   * ```typescript
   * const groupId = steam.friends.getFriendsGroupIDByIndex(0);
   * const memberCount = steam.friends.getFriendsGroupMembersCount(groupId);
   * console.log(`Group has ${memberCount} members`);
   * ```
   * 
   * @see {@link getFriendsGroupMembersList}
   * @see {@link getFriendsGroupName}
   */
  getFriendsGroupMembersCount(groupId: FriendsGroupID_t): number {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return 0;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return 0;
    }

    try {
      const count = this.libraryLoader.SteamAPI_ISteamFriends_GetFriendsGroupMembersCount(friendsInterface, groupId);
      return count;
    } catch (error) {
      console.error(`[Steamworks] Error getting friends group members count for ${groupId}:`, error);
      return 0;
    }
  }

  /**
   * Gets the list of Steam IDs for all members in a friend group
   * 
   * @param groupId - The ID of the friend group
   * @returns Array of Steam IDs (as strings) of friends in the group
   * 
   * @remarks
   * Returns an array containing the Steam ID of each friend assigned to this group.
   * The array will be empty if the group has no members or if an error occurs.
   * 
   * This method allocates memory for the maximum possible members and then
   * populates it with the actual members. The returned array only contains
   * the actual members, not the full allocated buffer.
   * 
   * @example
   * ```typescript
   * const groupId = steam.friends.getFriendsGroupIDByIndex(0);
   * const groupName = steam.friends.getFriendsGroupName(groupId);
   * const members = steam.friends.getFriendsGroupMembersList(groupId);
   * 
   * console.log(`Group "${groupName}" has ${members.length} members:`);
   * members.forEach(steamId => {
   *   const name = steam.friends.getFriendPersonaName(steamId);
   *   console.log(`  - ${name} (${steamId})`);
   * });
   * ```
   * 
   * @see {@link getFriendsGroupMembersCount}
   * @see {@link getFriendsGroupName}
   */
  getFriendsGroupMembersList(groupId: FriendsGroupID_t): string[] {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return [];
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return [];
    }

    try {
      const memberCount = this.getFriendsGroupMembersCount(groupId);
      if (memberCount === 0) {
        return [];
      }

      const membersPtr = koffi.alloc('uint64', memberCount);
      this.libraryLoader.SteamAPI_ISteamFriends_GetFriendsGroupMembersList(
        friendsInterface, 
        groupId, 
        membersPtr, 
        memberCount
      );

      const membersArray = koffi.decode(membersPtr, koffi.array('uint64', memberCount));
      return membersArray.map((id: bigint) => id.toString());
    } catch (error) {
      console.error(`[Steamworks] Error getting friends group members list for ${groupId}:`, error);
      return [];
    }
  }

  // ========================================
  // Coplay (Recently Played With) Functions
  // ========================================

  /**
   * Gets the number of users the current user has recently played with
   * 
   * @returns The number of coplay friends, or 0 if unavailable
   * 
   * @remarks
   * "Coplay" refers to users you've recently been in multiplayer games with.
   * Steam tracks these relationships automatically when you play games together.
   * 
   * Use this with {@link getCoplayFriend} to iterate through all coplay friends.
   * 
   * @example
   * ```typescript
   * const coplayCount = steam.friends.getCoplayFriendCount();
   * console.log(`You've recently played with ${coplayCount} users`);
   * 
   * for (let i = 0; i < coplayCount; i++) {
   *   const steamId = steam.friends.getCoplayFriend(i);
   *   const name = steam.friends.getFriendPersonaName(steamId);
   *   const time = steam.friends.getFriendCoplayTime(steamId);
   *   console.log(`Played with ${name} at ${new Date(time * 1000)}`);
   * }
   * ```
   * 
   * @see {@link getCoplayFriend}
   * @see {@link getFriendCoplayTime}
   * @see {@link getFriendCoplayGame}
   */
  getCoplayFriendCount(): number {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return 0;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return 0;
    }

    try {
      const count = this.libraryLoader.SteamAPI_ISteamFriends_GetCoplayFriendCount(friendsInterface);
      return count;
    } catch (error) {
      console.error('[Steamworks] Error getting coplay friend count:', error);
      return 0;
    }
  }

  /**
   * Gets a coplay friend's Steam ID by their index
   * 
   * @param index - Zero-based index of the coplay friend (0 to {@link getCoplayFriendCount}() - 1)
   * @returns The friend's Steam ID as a string, or empty string if the index is invalid
   * 
   * @remarks
   * Use this method to iterate through all users you've recently played with:
   * 1. Call {@link getCoplayFriendCount} to get the total number
   * 2. Loop from 0 to count-1 calling this method to get each Steam ID
   * 3. Use the returned ID with {@link getFriendCoplayTime} and {@link getFriendCoplayGame}
   * 
   * @example
   * ```typescript
   * const count = steam.friends.getCoplayFriendCount();
   * for (let i = 0; i < count; i++) {
   *   const steamId = steam.friends.getCoplayFriend(i);
   *   if (steamId) {
   *     const name = steam.friends.getFriendPersonaName(steamId);
   *     const appId = steam.friends.getFriendCoplayGame(steamId);
   *     console.log(`Played with ${name} in app ${appId}`);
   *   }
   * }
   * ```
   * 
   * @see {@link getCoplayFriendCount}
   * @see {@link getFriendCoplayTime}
   */
  getCoplayFriend(index: number): string {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return '';
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return '';
    }

    try {
      const steamId = this.libraryLoader.SteamAPI_ISteamFriends_GetCoplayFriend(friendsInterface, index);
      
      if (steamId && steamId !== 0n) {
        return steamId.toString();
      }

      return '';
    } catch (error) {
      console.error(`[Steamworks] Error getting coplay friend by index ${index}:`, error);
      return '';
    }
  }

  /**
   * Gets the last time you played with a specific user
   * 
   * @param steamId - The friend's Steam ID as a string
   * @returns Unix timestamp of when you last played together, or 0 if never/unavailable
   * 
   * @remarks
   * Returns the Unix timestamp (seconds since January 1, 1970) of the most recent
   * time you were in a multiplayer game with this user.
   * 
   * Returns 0 if:
   * - You've never played with this user
   * - The information is not available
   * - The Steam API is not initialized
   * 
   * @example
   * ```typescript
   * const steamId = steam.friends.getCoplayFriend(0);
   * const timestamp = steam.friends.getFriendCoplayTime(steamId);
   * 
   * if (timestamp > 0) {
   *   const date = new Date(timestamp * 1000);
   *   console.log(`Last played together on: ${date.toLocaleDateString()}`);
   * }
   * ```
   * 
   * @see {@link getCoplayFriend}
   * @see {@link getFriendCoplayGame}
   */
  getFriendCoplayTime(steamId: string): number {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return 0;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return 0;
    }

    try {
      const time = this.libraryLoader.SteamAPI_ISteamFriends_GetFriendCoplayTime(friendsInterface, BigInt(steamId));
      return time;
    } catch (error) {
      console.error(`[Steamworks] Error getting friend coplay time for ${steamId}:`, error);
      return 0;
    }
  }

  /**
   * Gets the App ID of the game you last played with a specific user
   * 
   * @param steamId - The friend's Steam ID as a string
   * @returns The Steam App ID of the game, or 0 if never/unavailable
   * 
   * @remarks
   * Returns the Steam App ID of the game you most recently played together with this user.
   * 
   * Returns 0 if:
   * - You've never played with this user
   * - The information is not available
   * - The Steam API is not initialized
   * 
   * @example
   * ```typescript
   * const count = steam.friends.getCoplayFriendCount();
   * for (let i = 0; i < count; i++) {
   *   const steamId = steam.friends.getCoplayFriend(i);
   *   const name = steam.friends.getFriendPersonaName(steamId);
   *   const appId = steam.friends.getFriendCoplayGame(steamId);
   *   const time = steam.friends.getFriendCoplayTime(steamId);
   *   
   *   console.log(`Played with ${name} in App ${appId}`);
   *   console.log(`Last played: ${new Date(time * 1000).toLocaleDateString()}`);
   * }
   * ```
   * 
   * @example Get all coplay information
   * ```typescript
   * function getAllCoplayInfo(): CoplayFriendInfo[] {
   *   const count = steam.friends.getCoplayFriendCount();
   *   const coplayFriends: CoplayFriendInfo[] = [];
   *   
   *   for (let i = 0; i < count; i++) {
   *     const steamId = steam.friends.getCoplayFriend(i);
   *     if (steamId) {
   *       coplayFriends.push({
   *         steamId,
   *         coplayTime: steam.friends.getFriendCoplayTime(steamId),
   *         coplayGame: steam.friends.getFriendCoplayGame(steamId)
   *       });
   *     }
   *   }
   *   
   *   return coplayFriends;
   * }
   * ```
   * 
   * @see {@link getCoplayFriend}
   * @see {@link getFriendCoplayTime}
   * @see {@link CoplayFriendInfo}
   */
  getFriendCoplayGame(steamId: string): number {
    if (!this.apiCore.isInitialized()) {
      console.warn('[Steamworks] WARNING: Steam API not initialized');
      return 0;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      console.warn('[Steamworks] WARNING: Friends interface not available');
      return 0;
    }

    try {
      const appId = this.libraryLoader.SteamAPI_ISteamFriends_GetFriendCoplayGame(friendsInterface, BigInt(steamId));
      return appId;
    } catch (error) {
      console.error(`[Steamworks] Error getting friend coplay game for ${steamId}:`, error);
      return 0;
    }
  }
}
