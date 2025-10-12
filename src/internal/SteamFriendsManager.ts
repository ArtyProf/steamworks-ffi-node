import * as koffi from 'koffi';
import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import { 
  EFriendRelationship, 
  EPersonaState, 
  EFriendFlags, 
  FriendInfo, 
  FriendGameInfo 
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
}
