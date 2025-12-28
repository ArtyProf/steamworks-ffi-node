/**
 * Steam Matchmaking Types
 * 
 * Type definitions for Steam lobby matchmaking operations.
 */

// ============================================================================
// Lobby Type Enums
// ============================================================================

/**
 * Type of lobby to create
 * Controls visibility and join restrictions
 */
export enum ELobbyType {
  /** Only way to join is via invite */
  Private = 0,
  /** Shows for friends or invitees, but not in lobby list */
  FriendsOnly = 1,
  /** Visible for friends and in lobby list */
  Public = 2,
  /** Returned by search, but not visible to other friends */
  Invisible = 3,
  /** Private, unique and does not delete when empty - only one may exist per unique keypair set */
  PrivateUnique = 4,
}

/**
 * Comparison operations for lobby search filters
 */
export enum ELobbyComparison {
  EqualToOrLessThan = -2,
  LessThan = -1,
  Equal = 0,
  GreaterThan = 1,
  EqualToOrGreaterThan = 2,
  NotEqual = 3,
}

/**
 * Distance filter for lobby searches
 * Lobby results are sorted from closest to farthest
 */
export enum ELobbyDistanceFilter {
  /** Only lobbies in the same immediate region */
  Close = 0,
  /** Only lobbies in the same region or nearby regions (default) */
  Default = 1,
  /** Lobbies about half-way around the globe */
  Far = 2,
  /** No filtering, worldwide (not recommended - expect high latency) */
  Worldwide = 3,
}

/**
 * Chat member state change flags
 * Used in LobbyChatUpdate callbacks
 */
export enum EChatMemberStateChange {
  /** User has joined or is joining the chat room */
  Entered = 0x0001,
  /** User has left or is leaving the chat room */
  Left = 0x0002,
  /** User disconnected without leaving the chat first */
  Disconnected = 0x0004,
  /** User was kicked */
  Kicked = 0x0008,
  /** User was kicked and banned */
  Banned = 0x0010,
}

/**
 * Chat entry type
 */
export enum EChatEntryType {
  Invalid = 0,
  ChatMsg = 1,
  Typing = 2,
  InviteGame = 3,
  Emote = 4,  // Deprecated
  LeftConversation = 6,
  Entered = 7,
  WasKicked = 8,
  WasBanned = 9,
  Disconnected = 10,
  HistoricalChat = 11,
  LinkBlocked = 14,
}

/**
 * Response code for entering a lobby
 */
export enum EChatRoomEnterResponse {
  /** Successfully entered */
  Success = 1,
  /** The lobby doesn't exist */
  DoesntExist = 2,
  /** Lobby not available (full, closed) */
  NotAllowed = 3,
  /** User is full */
  Full = 4,
  /** A user in this lobby has blocked you */
  Error = 5,
  /** Banned from the lobby */
  Banned = 6,
  /** Too many requests, try again later */
  Limited = 7,
  /** Clan locked, members only */
  ClanDisabled = 8,
  /** User is community banned */
  CommunityBan = 9,
  /** You and member(s) in lobby have blocked each other */
  MemberBlockedYou = 10,
  /** You have blocked member(s) in the lobby */
  YouBlockedMember = 11,
  /** More recent rate limits */
  RateLimitExceeded = 15,
}

// ============================================================================
// Lobby Data Types
// ============================================================================

/** Lobby handle (Steam ID as string) */
export type LobbyId = string;

/**
 * Information about a lobby
 */
export interface LobbyInfo {
  /** Lobby Steam ID */
  lobbyId: LobbyId;
  /** Owner's Steam ID */
  ownerId: string;
  /** Maximum number of members allowed */
  maxMembers: number;
  /** Current number of members */
  memberCount: number;
  /** Lobby metadata as key-value pairs */
  data: Record<string, string>;
}

/**
 * Information about a lobby member
 */
export interface LobbyMember {
  /** Member's Steam ID */
  steamId: string;
  /** Member's persona name (display name) */
  personaName?: string;
  /** Member-specific data as key-value pairs */
  data: Record<string, string>;
}

/**
 * Lobby chat entry
 */
export interface LobbyChatEntry {
  /** Steam ID of the sender */
  senderId: string;
  /** Chat message content */
  message: string;
  /** Entry type (chat, typing, etc.) */
  entryType: EChatEntryType;
}

/**
 * Result from creating a lobby
 */
export interface LobbyCreateResult {
  /** Whether creation was successful */
  success: boolean;
  /** Lobby Steam ID if successful */
  lobbyId?: LobbyId;
  /** Error message if failed */
  error?: string;
}

/**
 * Result from joining a lobby
 */
export interface LobbyJoinResult {
  /** Whether join was successful */
  success: boolean;
  /** Lobby Steam ID if successful */
  lobbyId?: LobbyId;
  /** Enter response code */
  response: EChatRoomEnterResponse;
  /** Whether the lobby is locked */
  locked: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Result from a lobby list request
 */
export interface LobbyListResult {
  /** Whether the request was successful */
  success: boolean;
  /** Number of lobbies found */
  count: number;
  /** List of lobby IDs */
  lobbies: LobbyId[];
}

/**
 * Lobby game server information
 */
export interface LobbyGameServer {
  /** Server IP address (as 32-bit integer) */
  ip: number;
  /** Server port */
  port: number;
  /** Server Steam ID (if using Steam game server) */
  steamId: string;
}

/**
 * Filter for lobby list requests
 */
export interface LobbyFilter {
  /** Filter type */
  type: 'string' | 'numerical' | 'near' | 'slots' | 'distance' | 'resultCount';
  /** Key to filter on (for string/numerical/near) */
  key?: string;
  /** Value to match (for string) */
  stringValue?: string;
  /** Value to match (for numerical/near) */
  numValue?: number;
  /** Comparison type (for string/numerical) */
  comparison?: ELobbyComparison;
  /** Distance filter (for distance type) */
  distance?: ELobbyDistanceFilter;
  /** Number of slots (for slots type) */
  slots?: number;
  /** Max results (for resultCount type) */
  maxResults?: number;
}

// ============================================================================
// Callback Data Types
// ============================================================================

/**
 * Callback data for lobby created event
 */
export interface LobbyCreatedCallback {
  /** Result code */
  result: number;
  /** Created lobby Steam ID (0 if failed) */
  lobbyId: string;
}

/**
 * Callback data for lobby entered event
 */
export interface LobbyEnterCallback {
  /** Lobby Steam ID */
  lobbyId: string;
  /** Chat permissions */
  chatPermissions: number;
  /** Whether the lobby is locked */
  locked: boolean;
  /** Enter response code */
  response: EChatRoomEnterResponse;
}

/**
 * Callback data for lobby data update event
 */
export interface LobbyDataUpdateCallback {
  /** Lobby Steam ID */
  lobbyId: string;
  /** Member Steam ID whose data changed (or lobby ID if lobby data changed) */
  memberId: string;
  /** Whether the update was successful */
  success: boolean;
}

/**
 * Callback data for lobby chat update event (member join/leave)
 */
export interface LobbyChatUpdateCallback {
  /** Lobby Steam ID */
  lobbyId: string;
  /** Steam ID of user whose status changed */
  userChanged: string;
  /** Steam ID of user who made the change (e.g., who kicked) */
  userMakingChange: string;
  /** State change flags (EChatMemberStateChange) */
  stateChange: number;
}

/**
 * Callback data for lobby chat message event
 */
export interface LobbyChatMsgCallback {
  /** Lobby Steam ID */
  lobbyId: string;
  /** Sender Steam ID */
  senderId: string;
  /** Chat entry type */
  entryType: EChatEntryType;
  /** Chat entry index for retrieving message */
  chatId: number;
}

/**
 * Callback data for lobby game created event
 */
export interface LobbyGameCreatedCallback {
  /** Lobby Steam ID */
  lobbyId: string;
  /** Game server Steam ID */
  gameServerId: string;
  /** Server IP */
  ip: number;
  /** Server port */
  port: number;
}

/**
 * Callback data for lobby invite event
 */
export interface LobbyInviteCallback {
  /** Steam ID of user who sent the invite */
  fromUserId: string;
  /** Lobby Steam ID */
  lobbyId: string;
  /** Game ID */
  gameId: string;
}

/**
 * Callback data for lobby match list event
 */
export interface LobbyMatchListCallback {
  /** Number of lobbies matching the search */
  lobbiesMatching: number;
}

/**
 * Callback data for lobby kicked event
 */
export interface LobbyKickedCallback {
  /** Lobby Steam ID */
  lobbyId: string;
  /** Steam ID of admin who kicked (may be lobby ID itself) */
  adminId: string;
  /** Whether kicked due to disconnect */
  kickedDueToDisconnect: boolean;
}

// ============================================================================
// Favorite Game Server Types
// ============================================================================

/**
 * Favorite game server flags
 */
export enum EFavoriteFlags {
  None = 0x00,
  /** Entry is in favorites list */
  Favorite = 0x01,
  /** Entry is in history list */
  History = 0x02,
}

/**
 * Favorite game server entry
 */
export interface FavoriteGame {
  /** App ID */
  appId: number;
  /** Server IP (as 32-bit integer) */
  ip: number;
  /** Connection port */
  connectPort: number;
  /** Query port */
  queryPort: number;
  /** Flags (EFavoriteFlags) */
  flags: number;
  /** Unix timestamp of last played */
  lastPlayedOnServer: number;
}
