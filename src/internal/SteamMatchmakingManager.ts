import * as koffi from 'koffi';
import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import { SteamCallbackPoller } from './SteamCallbackPoller';
import {
  K_I_LOBBY_CREATED,
  K_I_LOBBY_ENTER,
  K_I_LOBBY_MATCH_LIST,
  LobbyCreatedType,
  LobbyEnterType,
  LobbyMatchListType,
} from './callbackTypes';
import {
  ELobbyType,
  ELobbyComparison,
  ELobbyDistanceFilter,
  EChatEntryType,
  EChatRoomEnterResponse,
  LobbyId,
  LobbyChatEntry,
  LobbyChatMessageEvent,
  LobbyChatHandler,
  LobbyCreateResult,
  LobbyJoinResult,
  LobbyListResult,
  LobbyGameServer,
  FavoriteGame,
} from '../types/matchmaking';

// Define Koffi struct types for callbacks
const LobbyCreated_t = koffi.struct('LobbyCreated_t', {
  m_eResult: 'int32',
  m_ulSteamIDLobby: 'uint64',
});

const LobbyEnter_t = koffi.struct('LobbyEnter_t', {
  m_ulSteamIDLobby: 'uint64',
  m_rgfChatPermissions: 'uint32',
  m_bLocked: 'bool',
  m_EChatRoomEnterResponse: 'uint32',
});

const LobbyMatchList_t = koffi.struct('LobbyMatchList_t', {
  m_nLobbiesMatching: 'uint32',
});

/**
 * SteamMatchmakingManager
 * 
 * Manages Steam lobby matchmaking operations for multiplayer games.
 * Handles lobby creation, discovery, joining, and communication.
 * 
 * ## Features
 * 
 * - **Lobby Creation**: Create public, private, or friends-only lobbies
 * - **Lobby Discovery**: Search for lobbies with filters
 * - **Lobby Management**: Set/get lobby data, manage members
 * - **Lobby Chat**: Send and receive chat messages
 * - **Game Server**: Associate game servers with lobbies
 * - **Favorite Servers**: Manage favorite game servers
 * 
 * ## Key Concepts
 * 
 * - **Lobby Types**: Private, FriendsOnly, Public, Invisible
 * - **Lobby Data**: Key-value metadata attached to lobbies
 * - **Member Data**: Per-member metadata within lobbies
 * - **Callbacks**: Async results via Steam callback system
 * 
 * @example
 * ```typescript
 * // Create a public lobby
 * const result = await steam.matchmaking.createLobby(ELobbyType.Public, 4);
 * if (result.success) {
 *   console.log(`Created lobby: ${result.lobbyId}`);
 *   
 *   // Set lobby metadata
 *   steam.matchmaking.setLobbyData(result.lobbyId, 'game_mode', 'deathmatch');
 *   steam.matchmaking.setLobbyData(result.lobbyId, 'map', 'dm_arena');
 * }
 * ```
 * 
 * @see {@link https://partner.steamgames.com/doc/api/ISteamMatchmaking}
 */
export class SteamMatchmakingManager {
  private libraryLoader: SteamLibraryLoader;
  private apiCore: SteamAPICore;
  private callbackPoller: SteamCallbackPoller;
  
  // Simple chat polling state - tracks last read message index per lobby
  private lobbyChatIndexes: Map<string, number> = new Map();
  
  // Event handlers
  private chatMessageHandlers: LobbyChatHandler[] = [];
  
  // Queued chat messages (for polling approach)
  private pendingChatMessages: LobbyChatMessageEvent[] = [];

  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
    this.callbackPoller = new SteamCallbackPoller(libraryLoader, apiCore);
  }

  // ============================================================================
  // Chat Message Polling (Simple Approach)
  // ============================================================================

  /**
   * Start tracking chat messages for a lobby
   * 
   * Call this after joining a lobby to enable chat message polling.
   * 
   * @param lobbyId - Steam ID of the lobby to track
   */
  startChatPolling(lobbyId: LobbyId): void {
    // Start from index 0 - we'll read all existing messages
    // Or set to -1 to skip existing messages and only get new ones
    this.lobbyChatIndexes.set(lobbyId, 0);
  }

  /**
   * Stop tracking chat messages for a lobby
   * 
   * Call this when leaving a lobby.
   * 
   * @param lobbyId - Steam ID of the lobby to stop tracking
   */
  stopChatPolling(lobbyId: LobbyId): void {
    this.lobbyChatIndexes.delete(lobbyId);
  }

  /**
   * Poll for new chat messages in all tracked lobbies
   * 
   * Call this regularly in your game loop. It will check for new messages
   * in all lobbies you're tracking and dispatch them to handlers.
   * 
   * @returns Number of new messages found
   * 
   * @example
   * ```typescript
   * // After joining a lobby:
   * steam.matchmaking.startChatPolling(lobbyId);
   * 
   * // In your game loop:
   * steam.runCallbacks();
   * steam.matchmaking.pollChatMessages();
   * 
   * // When leaving:
   * steam.matchmaking.stopChatPolling(lobbyId);
   * ```
   */
  pollChatMessages(): number {
    let newMessageCount = 0;

    for (const [lobbyId, lastIndex] of this.lobbyChatIndexes.entries()) {
      // Try to read messages starting from lastIndex
      let currentIndex = lastIndex;
      
      while (true) {
        const entry = this.getLobbyChatEntry(lobbyId, currentIndex);
        
        if (!entry) {
          // No more messages at this index
          break;
        }

        // Found a message!
        const event: LobbyChatMessageEvent = {
          lobbyId,
          senderId: entry.senderId,
          chatId: currentIndex,
          entryType: entry.entryType,
          message: entry.message
        };

        // Add to pending queue
        this.pendingChatMessages.push(event);

        // Notify handlers
        for (const handler of this.chatMessageHandlers) {
          try {
            handler(event);
          } catch (err) {
            console.error('[Steamworks] Chat message handler error:', (err as Error).message);
          }
        }

        newMessageCount++;
        currentIndex++;
      }

      // Update the last read index
      if (currentIndex > lastIndex) {
        this.lobbyChatIndexes.set(lobbyId, currentIndex);
      }
    }

    return newMessageCount;
  }
  
  /**
   * Subscribe to lobby chat message events
   * 
   * Registers a handler that will be called whenever a chat message is received.
   * You must call `startChatPolling(lobbyId)` after joining a lobby and
   * `pollChatMessages()` regularly to receive messages.
   * 
   * @param handler - Function to call when a chat message is received
   * @returns Unsubscribe function to remove the handler
   * 
   * @example
   * ```typescript
   * const unsubscribe = steam.matchmaking.onChatMessage((event) => {
   *   console.log(`[${event.senderId}]: ${event.message}`);
   * });
   * 
   * // Later, to stop receiving events:
   * unsubscribe();
   * ```
   */
  onChatMessage(handler: LobbyChatHandler): () => void {
    this.chatMessageHandlers.push(handler);
    return () => {
      const index = this.chatMessageHandlers.indexOf(handler);
      if (index > -1) {
        this.chatMessageHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Get pending chat messages (alternative to event handlers)
   * 
   * Returns and clears all queued chat messages received since the last call.
   * Use this if you prefer polling over event handlers.
   * 
   * @returns Array of pending chat message events
   * 
   * @example
   * ```typescript
   * // In your game loop:
   * steam.matchmaking.pollChatMessages();
   * const messages = steam.matchmaking.getPendingChatMessages();
   * for (const msg of messages) {
   *   console.log(`${msg.senderId}: ${msg.message}`);
   * }
   * ```
   */
  getPendingChatMessages(): LobbyChatMessageEvent[] {
    const messages = [...this.pendingChatMessages];
    this.pendingChatMessages = [];
    return messages;
  }

  // ============================================================================
  // Lobby Creation and Joining
  // ============================================================================

  /**
   * Create a new lobby
   * 
   * Creates a lobby on the Steam servers. The lobby is joined automatically
   * and ready to use when the async operation completes.
   * 
   * @param lobbyType - Type of lobby (Private, FriendsOnly, Public, Invisible)
   * @param maxMembers - Maximum number of members allowed (1-250)
   * @returns Promise resolving to lobby creation result
   * 
   * @example
   * ```typescript
   * // Create a public 4-player lobby
   * const result = await steam.matchmaking.createLobby(ELobbyType.Public, 4);
   * if (result.success) {
   *   console.log(`Lobby created: ${result.lobbyId}`);
   * }
   * 
   * // Create a private lobby for friends
   * const privateResult = await steam.matchmaking.createLobby(ELobbyType.FriendsOnly, 8);
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_CreateLobby()` - Create lobby
   */
  async createLobby(lobbyType: ELobbyType, maxMembers: number): Promise<LobbyCreateResult> {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) {
      return { success: false, error: 'Matchmaking interface not available' };
    }

    try {
      const apiCall = this.libraryLoader.SteamAPI_ISteamMatchmaking_CreateLobby(
        matchmaking,
        lobbyType,
        maxMembers
      );

      if (!apiCall || apiCall === BigInt(0)) {
        return { success: false, error: 'Failed to initiate lobby creation' };
      }

      // Wait for callback using poll method
      const result = await this.callbackPoller.poll<LobbyCreatedType>(
        apiCall,
        LobbyCreated_t,
        K_I_LOBBY_CREATED,
        100, // maxRetries
        100  // delayMs (100 * 100 = 10 second timeout)
      );

      if (!result) {
        return { success: false, error: 'Lobby creation timed out' };
      }

      // Result code 1 = success (k_EResultOK)
      if (result.m_eResult !== 1) {
        return { success: false, error: `Lobby creation failed with result code: ${result.m_eResult}` };
      }

      return {
        success: true,
        lobbyId: result.m_ulSteamIDLobby.toString()
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Join an existing lobby
   * 
   * Joins a lobby by its ID. You can get lobby IDs from search results
   * or from invites.
   * 
   * @param lobbyId - Steam ID of the lobby to join
   * @returns Promise resolving to join result
   * 
   * @example
   * ```typescript
   * const result = await steam.matchmaking.joinLobby(lobbyIdFromInvite);
   * if (result.success) {
   *   console.log('Joined lobby successfully!');
   *   const members = steam.matchmaking.getLobbyMembers(result.lobbyId);
   * } else {
   *   console.log(`Failed to join: ${result.response}`);
   * }
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_JoinLobby()` - Join lobby
   */
  async joinLobby(lobbyId: LobbyId): Promise<LobbyJoinResult> {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) {
      return { 
        success: false, 
        response: EChatRoomEnterResponse.Error, 
        locked: false,
        error: 'Matchmaking interface not available' 
      };
    }

    try {
      const lobbyIdNum = BigInt(lobbyId);
      const apiCall = this.libraryLoader.SteamAPI_ISteamMatchmaking_JoinLobby(
        matchmaking,
        lobbyIdNum
      );

      if (!apiCall || apiCall === BigInt(0)) {
        return { 
          success: false, 
          response: EChatRoomEnterResponse.Error,
          locked: false,
          error: 'Failed to initiate lobby join' 
        };
      }

      // Wait for callback using poll method
      const result = await this.callbackPoller.poll<LobbyEnterType>(
        apiCall,
        LobbyEnter_t,
        K_I_LOBBY_ENTER,
        100, // maxRetries
        100  // delayMs
      );

      if (!result) {
        return { 
          success: false, 
          response: EChatRoomEnterResponse.Error,
          locked: false,
          error: 'Lobby join timed out' 
        };
      }

      const success = result.m_EChatRoomEnterResponse === EChatRoomEnterResponse.Success;
      return {
        success,
        lobbyId: result.m_ulSteamIDLobby.toString(),
        response: result.m_EChatRoomEnterResponse as EChatRoomEnterResponse,
        locked: result.m_bLocked,
        error: success ? undefined : `Join failed with response: ${result.m_EChatRoomEnterResponse}`
      };
    } catch (error) {
      return { 
        success: false, 
        response: EChatRoomEnterResponse.Error,
        locked: false,
        error: (error as Error).message 
      };
    }
  }

  /**
   * Leave a lobby
   * 
   * Leaves a lobby you're currently in. Other members will be notified
   * via LobbyChatUpdate callback.
   * 
   * @param lobbyId - Steam ID of the lobby to leave
   * 
   * @example
   * ```typescript
   * steam.matchmaking.leaveLobby(currentLobbyId);
   * console.log('Left the lobby');
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_LeaveLobby()` - Leave lobby
   */
  leaveLobby(lobbyId: LobbyId): void {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) {
      console.warn('[Steamworks] Cannot leave lobby: Matchmaking interface not available');
      return;
    }

    try {
      const lobbyIdNum = BigInt(lobbyId);
      this.libraryLoader.SteamAPI_ISteamMatchmaking_LeaveLobby(matchmaking, lobbyIdNum);
    } catch (error) {
      console.error('[Steamworks] Error leaving lobby:', (error as Error).message);
    }
  }

  /**
   * Invite a user to the lobby
   * 
   * Sends an invite to another Steam user. The target user will receive
   * a LobbyInvite callback notification.
   * 
   * @param lobbyId - Steam ID of the lobby
   * @param steamIdInvitee - Steam ID of the user to invite
   * @returns true if invite was sent successfully
   * 
   * @example
   * ```typescript
   * const sent = steam.matchmaking.inviteUserToLobby(myLobbyId, friendSteamId);
   * if (sent) {
   *   console.log('Invite sent!');
   * }
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_InviteUserToLobby()` - Send invite
   */
  inviteUserToLobby(lobbyId: LobbyId, steamIdInvitee: string): boolean {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) {
      return false;
    }

    try {
      const lobbyIdNum = BigInt(lobbyId);
      const inviteeIdNum = BigInt(steamIdInvitee);
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_InviteUserToLobby(
        matchmaking,
        lobbyIdNum,
        inviteeIdNum
      );
    } catch (error) {
      console.error('[Steamworks] Error inviting user to lobby:', (error as Error).message);
      return false;
    }
  }

  // ============================================================================
  // Lobby Discovery
  // ============================================================================

  /**
   * Request a list of lobbies
   * 
   * Searches for lobbies matching previously set filters. Call filter methods
   * before this to narrow results.
   * 
   * @returns Promise resolving to list of matching lobby IDs
   * 
   * @example
   * ```typescript
   * // Set filters first
   * steam.matchmaking.addRequestLobbyListStringFilter('game_mode', 'deathmatch', ELobbyComparison.Equal);
   * steam.matchmaking.addRequestLobbyListNumericalFilter('skill', 50, ELobbyComparison.Equal);
   * steam.matchmaking.addRequestLobbyListResultCountFilter(20);
   * 
   * // Then request list
   * const result = await steam.matchmaking.requestLobbyList();
   * if (result.success) {
   *   console.log(`Found ${result.count} lobbies`);
   *   for (const lobbyId of result.lobbies) {
   *     const gameMode = steam.matchmaking.getLobbyData(lobbyId, 'game_mode');
   *     console.log(`Lobby ${lobbyId}: ${gameMode}`);
   *   }
   * }
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_RequestLobbyList()` - Request lobby list
   * - `SteamAPI_ISteamMatchmaking_GetLobbyByIndex()` - Get lobby from results
   */
  async requestLobbyList(): Promise<LobbyListResult> {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) {
      return { success: false, count: 0, lobbies: [] };
    }

    try {
      const apiCall = this.libraryLoader.SteamAPI_ISteamMatchmaking_RequestLobbyList(matchmaking);

      if (!apiCall || apiCall === BigInt(0)) {
        return { success: false, count: 0, lobbies: [] };
      }

      // Wait for callback using poll method
      const result = await this.callbackPoller.poll<LobbyMatchListType>(
        apiCall,
        LobbyMatchList_t,
        K_I_LOBBY_MATCH_LIST,
        100, // maxRetries
        100  // delayMs
      );

      if (!result) {
        return { success: false, count: 0, lobbies: [] };
      }

      // Get all lobby IDs from results
      const lobbies: LobbyId[] = [];
      for (let i = 0; i < result.m_nLobbiesMatching; i++) {
        const lobbyId = this.libraryLoader.SteamAPI_ISteamMatchmaking_GetLobbyByIndex(matchmaking, i);
        if (lobbyId && lobbyId !== BigInt(0)) {
          lobbies.push(lobbyId.toString());
        }
      }

      return {
        success: true,
        count: result.m_nLobbiesMatching,
        lobbies
      };
    } catch (error) {
      console.error('[Steamworks] Error requesting lobby list:', (error as Error).message);
      return { success: false, count: 0, lobbies: [] };
    }
  }

  /**
   * Add a string filter for lobby list requests
   * 
   * Must be called before requestLobbyList(). Filters are cleared after each request.
   * 
   * @param key - Lobby data key to match
   * @param value - Value to compare against
   * @param comparison - Comparison type
   * 
   * @example
   * ```typescript
   * steam.matchmaking.addRequestLobbyListStringFilter('map', 'dm_arena', ELobbyComparison.Equal);
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_AddRequestLobbyListStringFilter()`
   */
  addRequestLobbyListStringFilter(key: string, value: string, comparison: ELobbyComparison): void {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return;

    this.libraryLoader.SteamAPI_ISteamMatchmaking_AddRequestLobbyListStringFilter(
      matchmaking,
      key,
      value,
      comparison
    );
  }

  /**
   * Add a numerical filter for lobby list requests
   * 
   * @param key - Lobby data key to match
   * @param value - Numerical value to compare against
   * @param comparison - Comparison type
   * 
   * @example
   * ```typescript
   * steam.matchmaking.addRequestLobbyListNumericalFilter('min_level', 10, ELobbyComparison.EqualToOrGreaterThan);
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_AddRequestLobbyListNumericalFilter()`
   */
  addRequestLobbyListNumericalFilter(key: string, value: number, comparison: ELobbyComparison): void {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return;

    this.libraryLoader.SteamAPI_ISteamMatchmaking_AddRequestLobbyListNumericalFilter(
      matchmaking,
      key,
      value,
      comparison
    );
  }

  /**
   * Add a near value filter for lobby list requests
   * 
   * Sorts results to return lobbies with values closest to the specified value first.
   * 
   * @param key - Lobby data key to match
   * @param value - Value to be close to
   * 
   * @example
   * ```typescript
   * // Find lobbies with skill levels close to player's skill
   * steam.matchmaking.addRequestLobbyListNearValueFilter('skill', playerSkill);
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_AddRequestLobbyListNearValueFilter()`
   */
  addRequestLobbyListNearValueFilter(key: string, value: number): void {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return;

    this.libraryLoader.SteamAPI_ISteamMatchmaking_AddRequestLobbyListNearValueFilter(
      matchmaking,
      key,
      value
    );
  }

  /**
   * Filter lobbies by available slots
   * 
   * @param slotsAvailable - Number of open slots required
   * 
   * @example
   * ```typescript
   * // Only show lobbies with at least 2 open slots
   * steam.matchmaking.addRequestLobbyListFilterSlotsAvailable(2);
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_AddRequestLobbyListFilterSlotsAvailable()`
   */
  addRequestLobbyListFilterSlotsAvailable(slotsAvailable: number): void {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return;

    this.libraryLoader.SteamAPI_ISteamMatchmaking_AddRequestLobbyListFilterSlotsAvailable(
      matchmaking,
      slotsAvailable
    );
  }

  /**
   * Set distance filter for lobby searches
   * 
   * @param distance - Distance filter (Close, Default, Far, Worldwide)
   * 
   * @example
   * ```typescript
   * // Only nearby lobbies for low latency
   * steam.matchmaking.addRequestLobbyListDistanceFilter(ELobbyDistanceFilter.Close);
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_AddRequestLobbyListDistanceFilter()`
   */
  addRequestLobbyListDistanceFilter(distance: ELobbyDistanceFilter): void {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return;

    this.libraryLoader.SteamAPI_ISteamMatchmaking_AddRequestLobbyListDistanceFilter(
      matchmaking,
      distance
    );
  }

  /**
   * Limit the number of lobby results
   * 
   * @param maxResults - Maximum number of results to return
   * 
   * @example
   * ```typescript
   * // Only get top 10 results
   * steam.matchmaking.addRequestLobbyListResultCountFilter(10);
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_AddRequestLobbyListResultCountFilter()`
   */
  addRequestLobbyListResultCountFilter(maxResults: number): void {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return;

    this.libraryLoader.SteamAPI_ISteamMatchmaking_AddRequestLobbyListResultCountFilter(
      matchmaking,
      maxResults
    );
  }

  /**
   * Filter for lobbies compatible with specified members
   * 
   * @param lobbyId - Lobby whose members to check compatibility with
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_AddRequestLobbyListCompatibleMembersFilter()`
   */
  addRequestLobbyListCompatibleMembersFilter(lobbyId: LobbyId): void {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return;

    this.libraryLoader.SteamAPI_ISteamMatchmaking_AddRequestLobbyListCompatibleMembersFilter(
      matchmaking,
      BigInt(lobbyId)
    );
  }

  // ============================================================================
  // Lobby Data
  // ============================================================================

  /**
   * Get lobby metadata value
   * 
   * Retrieves a metadata value from the lobby. Returns empty string if
   * key doesn't exist.
   * 
   * @param lobbyId - Steam ID of the lobby
   * @param key - Metadata key to retrieve
   * @returns Value for the key, or empty string if not set
   * 
   * @example
   * ```typescript
   * const gameMode = steam.matchmaking.getLobbyData(lobbyId, 'game_mode');
   * const map = steam.matchmaking.getLobbyData(lobbyId, 'map');
   * console.log(`Mode: ${gameMode}, Map: ${map}`);
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_GetLobbyData()`
   */
  getLobbyData(lobbyId: LobbyId, key: string): string {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return '';

    try {
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_GetLobbyData(
        matchmaking,
        BigInt(lobbyId),
        key
      ) || '';
    } catch (error) {
      console.error('[Steamworks] Error getting lobby data:', (error as Error).message);
      return '';
    }
  }

  /**
   * Set lobby metadata value
   * 
   * Sets a key/value pair in the lobby metadata. Only the lobby owner can
   * set lobby data. All members receive LobbyDataUpdate callback.
   * 
   * @param lobbyId - Steam ID of the lobby
   * @param key - Metadata key (max 255 characters)
   * @param value - Metadata value (set to "" to remove)
   * @returns true if successful
   * 
   * @example
   * ```typescript
   * steam.matchmaking.setLobbyData(lobbyId, 'game_mode', 'capture_the_flag');
   * steam.matchmaking.setLobbyData(lobbyId, 'max_score', '100');
   * steam.matchmaking.setLobbyData(lobbyId, 'status', 'waiting');
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_SetLobbyData()`
   */
  setLobbyData(lobbyId: LobbyId, key: string, value: string): boolean {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return false;

    try {
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_SetLobbyData(
        matchmaking,
        BigInt(lobbyId),
        key,
        value
      );
    } catch (error) {
      console.error('[Steamworks] Error setting lobby data:', (error as Error).message);
      return false;
    }
  }

  /**
   * Delete a lobby metadata key
   * 
   * Removes a key from the lobby metadata. Only the lobby owner can do this.
   * 
   * @param lobbyId - Steam ID of the lobby
   * @param key - Metadata key to remove
   * @returns true if successful
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_DeleteLobbyData()`
   */
  deleteLobbyData(lobbyId: LobbyId, key: string): boolean {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return false;

    try {
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_DeleteLobbyData(
        matchmaking,
        BigInt(lobbyId),
        key
      );
    } catch (error) {
      console.error('[Steamworks] Error deleting lobby data:', (error as Error).message);
      return false;
    }
  }

  /**
   * Get the number of metadata keys set on a lobby
   * 
   * @param lobbyId - Steam ID of the lobby
   * @returns Number of metadata keys
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_GetLobbyDataCount()`
   */
  getLobbyDataCount(lobbyId: LobbyId): number {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return 0;

    try {
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_GetLobbyDataCount(
        matchmaking,
        BigInt(lobbyId)
      );
    } catch (error) {
      console.error('[Steamworks] Error getting lobby data count:', (error as Error).message);
      return 0;
    }
  }

  /**
   * Get all lobby metadata as key-value pairs
   * 
   * @param lobbyId - Steam ID of the lobby
   * @returns Object with all lobby metadata
   * 
   * @example
   * ```typescript
   * const allData = steam.matchmaking.getAllLobbyData(lobbyId);
   * console.log('Lobby metadata:', allData);
   * // { game_mode: 'deathmatch', map: 'dm_arena', status: 'waiting' }
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_GetLobbyDataCount()`
   * - `SteamAPI_ISteamMatchmaking_GetLobbyDataByIndex()`
   */
  getAllLobbyData(lobbyId: LobbyId): Record<string, string> {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return {};

    const data: Record<string, string> = {};
    const count = this.getLobbyDataCount(lobbyId);

    const keyBuffer = Buffer.alloc(256);
    const valueBuffer = Buffer.alloc(8192);

    for (let i = 0; i < count; i++) {
      try {
        const success = this.libraryLoader.SteamAPI_ISteamMatchmaking_GetLobbyDataByIndex(
          matchmaking,
          BigInt(lobbyId),
          i,
          keyBuffer,
          256,
          valueBuffer,
          8192
        );

        if (success) {
          const key = keyBuffer.toString('utf8').split('\0')[0];
          const value = valueBuffer.toString('utf8').split('\0')[0];
          if (key) {
            data[key] = value;
          }
        }
      } catch (error) {
        console.error('[Steamworks] Error getting lobby data by index:', (error as Error).message);
      }
    }

    return data;
  }

  // ============================================================================
  // Lobby Member Data
  // ============================================================================

  /**
   * Get member-specific metadata
   * 
   * @param lobbyId - Steam ID of the lobby
   * @param memberId - Steam ID of the member
   * @param key - Metadata key
   * @returns Value for the key, or empty string if not set
   * 
   * @example
   * ```typescript
   * const readyStatus = steam.matchmaking.getLobbyMemberData(lobbyId, memberId, 'ready');
   * const team = steam.matchmaking.getLobbyMemberData(lobbyId, memberId, 'team');
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_GetLobbyMemberData()`
   */
  getLobbyMemberData(lobbyId: LobbyId, memberId: string, key: string): string {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return '';

    try {
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_GetLobbyMemberData(
        matchmaking,
        BigInt(lobbyId),
        BigInt(memberId),
        key
      ) || '';
    } catch (error) {
      console.error('[Steamworks] Error getting lobby member data:', (error as Error).message);
      return '';
    }
  }

  /**
   * Set member-specific metadata (for yourself only)
   * 
   * Sets metadata for the local user in the lobby. Other members receive
   * LobbyDataUpdate callback.
   * 
   * @param lobbyId - Steam ID of the lobby
   * @param key - Metadata key
   * @param value - Metadata value
   * 
   * @example
   * ```typescript
   * steam.matchmaking.setLobbyMemberData(lobbyId, 'ready', 'true');
   * steam.matchmaking.setLobbyMemberData(lobbyId, 'team', 'red');
   * steam.matchmaking.setLobbyMemberData(lobbyId, 'character', 'warrior');
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_SetLobbyMemberData()`
   */
  setLobbyMemberData(lobbyId: LobbyId, key: string, value: string): void {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return;

    try {
      this.libraryLoader.SteamAPI_ISteamMatchmaking_SetLobbyMemberData(
        matchmaking,
        BigInt(lobbyId),
        key,
        value
      );
    } catch (error) {
      console.error('[Steamworks] Error setting lobby member data:', (error as Error).message);
    }
  }

  // ============================================================================
  // Lobby Members
  // ============================================================================

  /**
   * Get the number of members in a lobby
   * 
   * @param lobbyId - Steam ID of the lobby
   * @returns Number of members
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_GetNumLobbyMembers()`
   */
  getNumLobbyMembers(lobbyId: LobbyId): number {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return 0;

    try {
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_GetNumLobbyMembers(
        matchmaking,
        BigInt(lobbyId)
      );
    } catch (error) {
      console.error('[Steamworks] Error getting lobby member count:', (error as Error).message);
      return 0;
    }
  }

  /**
   * Get a lobby member by index
   * 
   * @param lobbyId - Steam ID of the lobby
   * @param memberIndex - Index of the member (0 to getNumLobbyMembers - 1)
   * @returns Steam ID of the member, or empty string if invalid
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_GetLobbyMemberByIndex()`
   */
  getLobbyMemberByIndex(lobbyId: LobbyId, memberIndex: number): string {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return '';

    try {
      const memberId = this.libraryLoader.SteamAPI_ISteamMatchmaking_GetLobbyMemberByIndex(
        matchmaking,
        BigInt(lobbyId),
        memberIndex
      );
      return memberId ? memberId.toString() : '';
    } catch (error) {
      console.error('[Steamworks] Error getting lobby member by index:', (error as Error).message);
      return '';
    }
  }

  /**
   * Get all members in a lobby
   * 
   * @param lobbyId - Steam ID of the lobby
   * @returns Array of member Steam IDs
   * 
   * @example
   * ```typescript
   * const members = steam.matchmaking.getLobbyMembers(lobbyId);
   * console.log(`${members.length} players in lobby`);
   * for (const memberId of members) {
   *   const name = steam.friends.getFriendPersonaName(memberId);
   *   const ready = steam.matchmaking.getLobbyMemberData(lobbyId, memberId, 'ready');
   *   console.log(`${name}: ${ready === 'true' ? 'Ready' : 'Not Ready'}`);
   * }
   * ```
   */
  getLobbyMembers(lobbyId: LobbyId): string[] {
    const count = this.getNumLobbyMembers(lobbyId);
    const members: string[] = [];

    for (let i = 0; i < count; i++) {
      const memberId = this.getLobbyMemberByIndex(lobbyId, i);
      if (memberId) {
        members.push(memberId);
      }
    }

    return members;
  }

  /**
   * Get the lobby owner's Steam ID
   * 
   * @param lobbyId - Steam ID of the lobby
   * @returns Steam ID of the owner
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_GetLobbyOwner()`
   */
  getLobbyOwner(lobbyId: LobbyId): string {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return '';

    try {
      const ownerId = this.libraryLoader.SteamAPI_ISteamMatchmaking_GetLobbyOwner(
        matchmaking,
        BigInt(lobbyId)
      );
      return ownerId ? ownerId.toString() : '';
    } catch (error) {
      console.error('[Steamworks] Error getting lobby owner:', (error as Error).message);
      return '';
    }
  }

  /**
   * Set a new lobby owner
   * 
   * Transfers ownership of the lobby to another member. You must be the
   * current owner to do this.
   * 
   * @param lobbyId - Steam ID of the lobby
   * @param newOwnerId - Steam ID of the new owner
   * @returns true if successful
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_SetLobbyOwner()`
   */
  setLobbyOwner(lobbyId: LobbyId, newOwnerId: string): boolean {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return false;

    try {
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_SetLobbyOwner(
        matchmaking,
        BigInt(lobbyId),
        BigInt(newOwnerId)
      );
    } catch (error) {
      console.error('[Steamworks] Error setting lobby owner:', (error as Error).message);
      return false;
    }
  }

  // ============================================================================
  // Lobby Settings
  // ============================================================================

  /**
   * Get the maximum number of members allowed in the lobby
   * 
   * @param lobbyId - Steam ID of the lobby
   * @returns Maximum member count, or 0 if no limit
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_GetLobbyMemberLimit()`
   */
  getLobbyMemberLimit(lobbyId: LobbyId): number {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return 0;

    try {
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_GetLobbyMemberLimit(
        matchmaking,
        BigInt(lobbyId)
      );
    } catch (error) {
      console.error('[Steamworks] Error getting lobby member limit:', (error as Error).message);
      return 0;
    }
  }

  /**
   * Set the maximum number of members allowed
   * 
   * @param lobbyId - Steam ID of the lobby
   * @param maxMembers - New maximum member count
   * @returns true if successful
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_SetLobbyMemberLimit()`
   */
  setLobbyMemberLimit(lobbyId: LobbyId, maxMembers: number): boolean {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return false;

    try {
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_SetLobbyMemberLimit(
        matchmaking,
        BigInt(lobbyId),
        maxMembers
      );
    } catch (error) {
      console.error('[Steamworks] Error setting lobby member limit:', (error as Error).message);
      return false;
    }
  }

  /**
   * Change the lobby type
   * 
   * @param lobbyId - Steam ID of the lobby
   * @param lobbyType - New lobby type
   * @returns true if successful
   * 
   * @example
   * ```typescript
   * // Make lobby private when game starts
   * steam.matchmaking.setLobbyType(lobbyId, ELobbyType.Private);
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_SetLobbyType()`
   */
  setLobbyType(lobbyId: LobbyId, lobbyType: ELobbyType): boolean {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return false;

    try {
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_SetLobbyType(
        matchmaking,
        BigInt(lobbyId),
        lobbyType
      );
    } catch (error) {
      console.error('[Steamworks] Error setting lobby type:', (error as Error).message);
      return false;
    }
  }

  /**
   * Set whether the lobby is joinable
   * 
   * @param lobbyId - Steam ID of the lobby
   * @param joinable - Whether users can join
   * @returns true if successful
   * 
   * @example
   * ```typescript
   * // Prevent new joins when game starts
   * steam.matchmaking.setLobbyJoinable(lobbyId, false);
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_SetLobbyJoinable()`
   */
  setLobbyJoinable(lobbyId: LobbyId, joinable: boolean): boolean {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return false;

    try {
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_SetLobbyJoinable(
        matchmaking,
        BigInt(lobbyId),
        joinable
      );
    } catch (error) {
      console.error('[Steamworks] Error setting lobby joinable:', (error as Error).message);
      return false;
    }
  }

  // ============================================================================
  // Lobby Chat
  // ============================================================================

  /**
   * Send a chat message to all lobby members
   * 
   * @param lobbyId - Steam ID of the lobby
   * @param message - Message to send (up to 4KB)
   * @returns true if message was sent
   * 
   * @example
   * ```typescript
   * steam.matchmaking.sendLobbyChatMsg(lobbyId, 'Hello everyone!');
   * steam.matchmaking.sendLobbyChatMsg(lobbyId, 'Ready to start?');
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_SendLobbyChatMsg()`
   */
  sendLobbyChatMsg(lobbyId: LobbyId, message: string): boolean {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return false;

    try {
      const messageBuffer = Buffer.from(message + '\0', 'utf8');
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_SendLobbyChatMsg(
        matchmaking,
        BigInt(lobbyId),
        messageBuffer,
        messageBuffer.length
      );
    } catch (error) {
      console.error('[Steamworks] Error sending lobby chat message:', (error as Error).message);
      return false;
    }
  }

  /**
   * Get a chat message from the lobby
   * 
   * Call this when you receive a LobbyChatMsg callback to retrieve
   * the message content.
   * 
   * @param lobbyId - Steam ID of the lobby
   * @param chatId - Chat entry ID from the callback
   * @returns Chat entry with sender and message, or null if failed
   * 
   * @example
   * ```typescript
   * // In your callback handler for LobbyChatMsg:
   * const entry = steam.matchmaking.getLobbyChatEntry(callback.lobbyId, callback.chatId);
   * if (entry) {
   *   console.log(`${entry.senderId}: ${entry.message}`);
   * }
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_GetLobbyChatEntry()`
   */
  getLobbyChatEntry(lobbyId: LobbyId, chatId: number): LobbyChatEntry | null {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return null;

    try {
      const senderIdBuffer = Buffer.alloc(8);
      const messageBuffer = Buffer.alloc(4096);
      const entryTypeBuffer = Buffer.alloc(4);

      const bytesRead = this.libraryLoader.SteamAPI_ISteamMatchmaking_GetLobbyChatEntry(
        matchmaking,
        BigInt(lobbyId),
        chatId,
        senderIdBuffer,
        messageBuffer,
        4096,
        entryTypeBuffer
      );

      if (bytesRead <= 0) return null;

      const senderId = senderIdBuffer.readBigUInt64LE(0).toString();
      const message = messageBuffer.toString('utf8', 0, bytesRead).replace(/\0+$/, '');
      const entryType = entryTypeBuffer.readInt32LE(0) as EChatEntryType;

      return {
        senderId,
        message,
        entryType
      };
    } catch (error) {
      console.error('[Steamworks] Error getting lobby chat entry:', (error as Error).message);
      return null;
    }
  }

  // ============================================================================
  // Game Server
  // ============================================================================

  /**
   * Set the game server associated with the lobby
   * 
   * After calling this, all lobby members will receive LobbyGameCreated callback
   * with the server details.
   * 
   * @param lobbyId - Steam ID of the lobby
   * @param ip - Server IP address (as 32-bit integer)
   * @param port - Server port
   * @param steamId - Steam ID of game server (optional, use '0' if not using Steam game server)
   * 
   * @example
   * ```typescript
   * // Using IP/port
   * const ip = (192 << 24) | (168 << 16) | (1 << 8) | 100; // 192.168.1.100
   * steam.matchmaking.setLobbyGameServer(lobbyId, ip, 27015, '0');
   * 
   * // Using Steam game server ID
   * steam.matchmaking.setLobbyGameServer(lobbyId, 0, 0, gameServerSteamId);
   * ```
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_SetLobbyGameServer()`
   */
  setLobbyGameServer(lobbyId: LobbyId, ip: number, port: number, steamId: string): void {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return;

    try {
      this.libraryLoader.SteamAPI_ISteamMatchmaking_SetLobbyGameServer(
        matchmaking,
        BigInt(lobbyId),
        ip,
        port,
        BigInt(steamId)
      );
    } catch (error) {
      console.error('[Steamworks] Error setting lobby game server:', (error as Error).message);
    }
  }

  /**
   * Get the game server associated with the lobby
   * 
   * @param lobbyId - Steam ID of the lobby
   * @returns Server info, or null if no server is set
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_GetLobbyGameServer()`
   */
  getLobbyGameServer(lobbyId: LobbyId): LobbyGameServer | null {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return null;

    try {
      const ipBuffer = Buffer.alloc(4);
      const portBuffer = Buffer.alloc(2);
      const steamIdBuffer = Buffer.alloc(8);

      const hasServer = this.libraryLoader.SteamAPI_ISteamMatchmaking_GetLobbyGameServer(
        matchmaking,
        BigInt(lobbyId),
        ipBuffer,
        portBuffer,
        steamIdBuffer
      );

      if (!hasServer) return null;

      return {
        ip: ipBuffer.readUInt32LE(0),
        port: portBuffer.readUInt16LE(0),
        steamId: steamIdBuffer.readBigUInt64LE(0).toString()
      };
    } catch (error) {
      console.error('[Steamworks] Error getting lobby game server:', (error as Error).message);
      return null;
    }
  }

  /**
   * Request lobby data for a lobby you're not in
   * 
   * Use this to get metadata for a lobby before joining it.
   * Results come via LobbyDataUpdate callback.
   * 
   * @param lobbyId - Steam ID of the lobby
   * @returns true if request was sent
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_RequestLobbyData()`
   */
  requestLobbyData(lobbyId: LobbyId): boolean {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return false;

    try {
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_RequestLobbyData(
        matchmaking,
        BigInt(lobbyId)
      );
    } catch (error) {
      console.error('[Steamworks] Error requesting lobby data:', (error as Error).message);
      return false;
    }
  }

  /**
   * Link two lobbies for compatibility checking
   * 
   * @param lobbyId - Steam ID of the first lobby
   * @param dependentLobbyId - Steam ID of the dependent lobby
   * @returns true if successful
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_SetLinkedLobby()`
   */
  setLinkedLobby(lobbyId: LobbyId, dependentLobbyId: LobbyId): boolean {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return false;

    try {
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_SetLinkedLobby(
        matchmaking,
        BigInt(lobbyId),
        BigInt(dependentLobbyId)
      );
    } catch (error) {
      console.error('[Steamworks] Error setting linked lobby:', (error as Error).message);
      return false;
    }
  }

  // ============================================================================
  // Favorite Game Servers
  // ============================================================================

  /**
   * Get the number of favorite game servers
   * 
   * @returns Number of favorites
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_GetFavoriteGameCount()`
   */
  getFavoriteGameCount(): number {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return 0;

    try {
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_GetFavoriteGameCount(matchmaking);
    } catch (error) {
      console.error('[Steamworks] Error getting favorite game count:', (error as Error).message);
      return 0;
    }
  }

  /**
   * Get favorite game server by index
   * 
   * @param index - Index of the favorite (0 to getFavoriteGameCount - 1)
   * @returns Favorite game server info, or null if invalid index
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_GetFavoriteGame()`
   */
  getFavoriteGame(index: number): FavoriteGame | null {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return null;

    try {
      const appIdBuffer = Buffer.alloc(4);
      const ipBuffer = Buffer.alloc(4);
      const connectPortBuffer = Buffer.alloc(2);
      const queryPortBuffer = Buffer.alloc(2);
      const flagsBuffer = Buffer.alloc(4);
      const lastPlayedBuffer = Buffer.alloc(4);

      const success = this.libraryLoader.SteamAPI_ISteamMatchmaking_GetFavoriteGame(
        matchmaking,
        index,
        appIdBuffer,
        ipBuffer,
        connectPortBuffer,
        queryPortBuffer,
        flagsBuffer,
        lastPlayedBuffer
      );

      if (!success) return null;

      return {
        appId: appIdBuffer.readUInt32LE(0),
        ip: ipBuffer.readUInt32LE(0),
        connectPort: connectPortBuffer.readUInt16LE(0),
        queryPort: queryPortBuffer.readUInt16LE(0),
        flags: flagsBuffer.readUInt32LE(0),
        lastPlayedOnServer: lastPlayedBuffer.readUInt32LE(0)
      };
    } catch (error) {
      console.error('[Steamworks] Error getting favorite game:', (error as Error).message);
      return null;
    }
  }

  /**
   * Add a game server to favorites
   * 
   * @param appId - App ID
   * @param ip - Server IP (as 32-bit integer)
   * @param connectPort - Connection port
   * @param queryPort - Query port
   * @param flags - EFavoriteFlags
   * @param lastPlayedOnServer - Unix timestamp
   * @returns Index of the favorite, or -1 on failure
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_AddFavoriteGame()`
   */
  addFavoriteGame(
    appId: number,
    ip: number,
    connectPort: number,
    queryPort: number,
    flags: number,
    lastPlayedOnServer: number
  ): number {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return -1;

    try {
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_AddFavoriteGame(
        matchmaking,
        appId,
        ip,
        connectPort,
        queryPort,
        flags,
        lastPlayedOnServer
      );
    } catch (error) {
      console.error('[Steamworks] Error adding favorite game:', (error as Error).message);
      return -1;
    }
  }

  /**
   * Remove a game server from favorites
   * 
   * @param appId - App ID
   * @param ip - Server IP
   * @param connectPort - Connection port
   * @param queryPort - Query port
   * @param flags - EFavoriteFlags
   * @returns true if removed
   * 
   * Steamworks SDK Functions:
   * - `SteamAPI_ISteamMatchmaking_RemoveFavoriteGame()`
   */
  removeFavoriteGame(
    appId: number,
    ip: number,
    connectPort: number,
    queryPort: number,
    flags: number
  ): boolean {
    const matchmaking = this.apiCore.getMatchmakingInterface();
    if (!matchmaking) return false;

    try {
      return this.libraryLoader.SteamAPI_ISteamMatchmaking_RemoveFavoriteGame(
        matchmaking,
        appId,
        ip,
        connectPort,
        queryPort,
        flags
      );
    } catch (error) {
      console.error('[Steamworks] Error removing favorite game:', (error as Error).message);
      return false;
    }
  }
}
