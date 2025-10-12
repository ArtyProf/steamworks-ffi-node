/**
 * Types for Steam Friends API
 */

/**
 * Friend relationship states
 */
export enum EFriendRelationship {
  None = 0,
  Blocked = 1,
  RequestRecipient = 2,
  Friend = 3,
  RequestInitiator = 4,
  Ignored = 5,
  IgnoredFriend = 6,
  Suggested_DEPRECATED = 7,
  Max = 8,
}

/**
 * User online states
 */
export enum EPersonaState {
  Offline = 0,        // Friend is not currently logged on
  Online = 1,         // Friend is logged on
  Busy = 2,           // User is on, but busy
  Away = 3,           // Auto-away feature
  Snooze = 4,         // Auto-away for a long time
  LookingToTrade = 5, // Online, trading
  LookingToPlay = 6,  // Online, wanting to play
  Invisible = 7,      // Online, but appears offline to friends
  Max = 8,
}

/**
 * Flags for enumerating friends list
 */
export enum EFriendFlags {
  None = 0x00,
  Blocked = 0x01,
  FriendshipRequested = 0x02,
  Immediate = 0x04,              // "regular" friend
  ClanMember = 0x08,
  OnGameServer = 0x10,
  RequestingFriendship = 0x80,
  RequestingInfo = 0x100,
  Ignored = 0x200,
  IgnoredFriend = 0x400,
  ChatMember = 0x1000,
  All = 0xFFFF,
}

/**
 * Friend information
 */
export interface FriendInfo {
  steamId: string;
  personaName: string;
  personaState: EPersonaState;
  relationship: EFriendRelationship;
}

/**
 * Friend game information
 */
export interface FriendGameInfo {
  gameId: string;
  gameIP: number;
  gamePort: number;
  queryPort: number;
  steamIDLobby: string;
}
