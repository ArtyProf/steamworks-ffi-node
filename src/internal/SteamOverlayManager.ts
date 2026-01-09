import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import { SteamLogger } from './SteamLogger';
import { 
  EOverlayDialog, 
  EOverlayToUserDialog, 
  EOverlayToStoreFlag, 
  EActivateGameOverlayToWebPageMode 
} from '../types';

/**
 * Manager for Steam Overlay API operations
 * 
 * The SteamOverlayManager provides control over the Steam overlay, allowing games
 * to programmatically open various overlay dialogs, web pages, store pages, and
 * invite dialogs. This enables deep integration between your game and Steam's social
 * and store features.
 * 
 * The overlay appears on top of your game window and provides access to:
 * - Friends list and chat
 * - Steam community features
 * - Web browser
 * - Store pages
 * - User profiles
 * - Invite dialogs
 * 
 * @remarks
 * All overlay functions work only when:
 * - Steam client is running
 * - User has the overlay enabled in Steam settings
 * - Your game is running in a graphics mode that supports overlay
 * 
 * The overlay can be disabled by users in Steam settings. Your game should
 * provide alternative methods for critical features if the overlay is unavailable.
 * 
 * @example Open friends list
 * ```typescript
 * const steam = SteamworksSDK.getInstance();
 * steam.init({ appId: 480 });
 * 
 * // Open friends list
 * steam.overlay.activateGameOverlay(EOverlayDialog.FRIENDS);
 * 
 * // Open achievements
 * steam.overlay.activateGameOverlay(EOverlayDialog.ACHIEVEMENTS);
 * ```
 * 
 * @example Open user profile
 * ```typescript
 * const friends = steam.friends.getAllFriends();
 * const friend = friends[0];
 * 
 * // Open friend's profile
 * steam.overlay.activateGameOverlayToUser(
 *   EOverlayToUserDialog.STEAM_ID,
 *   friend.steamId
 * );
 * 
 * // Open chat with friend
 * steam.overlay.activateGameOverlayToUser(
 *   EOverlayToUserDialog.CHAT,
 *   friend.steamId
 * );
 * ```
 * 
 * @example Open store page
 * ```typescript
 * // Open your game's store page
 * steam.overlay.activateGameOverlayToStore(480, EOverlayToStoreFlag.None);
 * 
 * // Open DLC store page and add to cart
 * steam.overlay.activateGameOverlayToStore(12345, EOverlayToStoreFlag.AddToCart);
 * ```
 * 
 * @see {@link https://partner.steamgames.com/doc/api/ISteamFriends ISteamFriends Documentation}
 */
export class SteamOverlayManager {
  /** Steam library loader for FFI function calls */
  private libraryLoader: SteamLibraryLoader;
  
  /** Steam API core for initialization and callback management */
  private apiCore: SteamAPICore;

  /**
   * Creates a new SteamOverlayManager instance
   * 
   * @param libraryLoader - The Steam library loader for FFI calls
   * @param apiCore - The Steam API core for lifecycle management
   */
  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
  }

  /**
   * Activates the Steam overlay with an optional dialog
   * 
   * @param dialog - The dialog to open (e.g., 'Friends', 'Community', 'Settings')
   * 
   * @remarks
   * Opens the Steam overlay to a specific section. The overlay will appear
   * on top of your game window. Common dialogs:
   * - `Friends` - Friends list
   * - `Community` - Community hub
   * - `Players` - Recent players list
   * - `Settings` - Steam settings
   * - `OfficialGameGroup` - Your game's Steam group
   * - `Stats` - Stats page
   * - `Achievements` - Achievements page
   * - `chatroomgroup/[groupid]` - Specific chat room
   * 
   * @example Open various overlay dialogs
   * ```typescript
   * // Open friends list
   * steam.overlay.activateGameOverlay(EOverlayDialog.FRIENDS);
   * 
   * // Open achievements
   * steam.overlay.activateGameOverlay(EOverlayDialog.ACHIEVEMENTS);
   * 
   * // Open community hub
   * steam.overlay.activateGameOverlay(EOverlayDialog.COMMUNITY);
   * 
   * // Open settings
   * steam.overlay.activateGameOverlay(EOverlayDialog.SETTINGS);
   * 
   * // Open stats
   * steam.overlay.activateGameOverlay(EOverlayDialog.STATS);
   * ```
   * 
   * @example Keyboard shortcut alternative
   * ```typescript
   * // Provide in-game button as alternative to Shift+Tab
   * function onSettingsButtonClick() {
   *   steam.overlay.activateGameOverlay(EOverlayDialog.SETTINGS);
   * }
   * ```
   */
  activateGameOverlay(dialog: EOverlayDialog | string): void {
    if (!this.apiCore.isInitialized()) {
      SteamLogger.error('[Steamworks] Cannot activate overlay: Steam not initialized');
      return;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      SteamLogger.error('[Steamworks] Friends interface not available');
      return;
    }

    try {
      this.libraryLoader.SteamAPI_ISteamFriends_ActivateGameOverlay(
        friendsInterface,
        dialog
      );
    } catch (error) {
      SteamLogger.error('[Steamworks] Error activating overlay:', error);
    }
  }

  /**
   * Activates the Steam overlay to a specific user's page
   * 
   * @param dialog - The type of user dialog to open
   * @param steamId - The target user's Steam ID
   * 
   * @remarks
   * Opens the overlay to a specific user-related page. Available dialogs:
   * - `steamid` - User's Steam profile
   * - `chat` - Chat window with user or group chat
   * - `jointrade` - Steam Trading session (requires ISteamEconomy/StartTrade)
   * - `stats` - User's stats page
   * - `achievements` - User's achievements page
   * - `friendadd` - Prompt to add user as friend
   * - `friendremove` - Prompt to remove friend
   * - `friendrequestaccept` - Accept friend invite
   * - `friendrequestignore` - Ignore friend invite
   * 
   * @example Open friend interactions
   * ```typescript
   * const friends = steam.friends.getAllFriends();
   * const friend = friends[0];
   * 
   * // View friend's profile
   * steam.overlay.activateGameOverlayToUser(
   *   EOverlayToUserDialog.STEAM_ID,
   *   friend.steamId
   * );
   * 
   * // Open chat with friend
   * steam.overlay.activateGameOverlayToUser(
   *   EOverlayToUserDialog.CHAT,
   *   friend.steamId
   * );
   * 
   * // View friend's achievements
   * steam.overlay.activateGameOverlayToUser(
   *   EOverlayToUserDialog.ACHIEVEMENTS,
   *   friend.steamId
   * );
   * ```
   * 
   * @example Friend management
   * ```typescript
   * // Add user as friend
   * steam.overlay.activateGameOverlayToUser(
   *   EOverlayToUserDialog.FRIEND_ADD,
   *   '76561198012345678'
   * );
   * 
   * // Remove friend
   * steam.overlay.activateGameOverlayToUser(
   *   EOverlayToUserDialog.FRIEND_REMOVE,
   *   friend.steamId
   * );
   * ```
   */
  activateGameOverlayToUser(dialog: EOverlayToUserDialog | string, steamId: string): void {
    if (!this.apiCore.isInitialized()) {
      SteamLogger.error('[Steamworks] Cannot activate overlay to user: Steam not initialized');
      return;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      SteamLogger.error('[Steamworks] Friends interface not available');
      return;
    }

    try {
      const steamId64 = BigInt(steamId);
      this.libraryLoader.SteamAPI_ISteamFriends_ActivateGameOverlayToUser(
        friendsInterface,
        dialog,
        steamId64
      );
    } catch (error) {
      SteamLogger.error('[Steamworks] Error activating overlay to user:', error);
    }
  }

  /**
   * Activates the Steam overlay web browser to a specified URL
   * 
   * @param url - The URL to open (must include protocol: http:// or https://)
   * @param mode - Browser display mode (Default or Modal)
   * 
   * @remarks
   * Opens the Steam overlay's built-in web browser to the specified URL.
   * 
   * Modes:
   * - `Default` - Browser opens alongside other overlay windows, stays open
   *   when overlay is closed and reopened
   * - `Modal` - Browser opens alone, hides other overlay windows. Browser and
   *   overlay close together
   * 
   * The URL must include the protocol (http:// or https://).
   * 
   * @example Open web pages
   * ```typescript
   * // Open game's wiki
   * steam.overlay.activateGameOverlayToWebPage(
   *   'https://wiki.example.com/game',
   *   EActivateGameOverlayToWebPageMode.Default
   * );
   * 
   * // Open modal for important announcement
   * steam.overlay.activateGameOverlayToWebPage(
   *   'https://example.com/news/important-update',
   *   EActivateGameOverlayToWebPageMode.Modal
   * );
   * 
   * // Open support page
   * steam.overlay.activateGameOverlayToWebPage(
   *   'https://support.example.com'
   * );
   * ```
   * 
   * @example Context-sensitive help
   * ```typescript
   * function showHelp(topic: string) {
   *   const helpUrl = `https://help.example.com/${topic}`;
   *   steam.overlay.activateGameOverlayToWebPage(
   *     helpUrl,
   *     EActivateGameOverlayToWebPageMode.Modal
   *   );
   * }
   * 
   * // Usage
   * showHelp('getting-started');
   * showHelp('crafting-system');
   * ```
   */
  activateGameOverlayToWebPage(
    url: string, 
    mode: EActivateGameOverlayToWebPageMode = EActivateGameOverlayToWebPageMode.Default
  ): void {
    if (!this.apiCore.isInitialized()) {
      SteamLogger.error('[Steamworks] Cannot activate overlay to web page: Steam not initialized');
      return;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      SteamLogger.error('[Steamworks] Friends interface not available');
      return;
    }

    try {
      this.libraryLoader.SteamAPI_ISteamFriends_ActivateGameOverlayToWebPage(
        friendsInterface,
        url,
        mode
      );
    } catch (error) {
      SteamLogger.error('[Steamworks] Error activating overlay to web page:', error);
    }
  }

  /**
   * Activates the Steam overlay to a specific app's store page
   * 
   * @param appId - The Steam App ID of the game/DLC
   * @param flag - Store page behavior flag
   * 
   * @remarks
   * Opens the Steam overlay to a store page for the specified app.
   * 
   * Flags:
   * - `None` - Just open the store page
   * - `AddToCart` - Open store page and add to cart
   * - `AddToCartAndShow` - Add to cart and show the cart
   * 
   * Useful for:
   * - Showing DLC store pages
   * - Cross-promoting other games
   * - Quick purchase flow for in-game DLC prompts
   * 
   * @example Open store pages
   * ```typescript
   * // Open your game's main store page
   * steam.overlay.activateGameOverlayToStore(480, EOverlayToStoreFlag.None);
   * 
   * // Show DLC and add to cart
   * steam.overlay.activateGameOverlayToStore(12345, EOverlayToStoreFlag.AddToCart);
   * 
   * // Add DLC to cart and show cart
   * steam.overlay.activateGameOverlayToStore(
   *   67890,
   *   EOverlayToStoreFlag.AddToCartAndShow
   * );
   * ```
   * 
   * @example DLC promotion in-game
   * ```typescript
   * function showDLCStore(dlcAppId: number) {
   *   // Show a prompt
   *   const userWantsToBuy = confirm('Open store page for this DLC?');
   *   
   *   if (userWantsToBuy) {
   *     steam.overlay.activateGameOverlayToStore(
   *       dlcAppId,
   *       EOverlayToStoreFlag.AddToCart
   *     );
   *   }
   * }
   * 
   * // Show DLC when player tries to access locked content
   * showDLCStore(12345);
   * ```
   */
  activateGameOverlayToStore(appId: number, flag: EOverlayToStoreFlag = EOverlayToStoreFlag.None): void {
    if (!this.apiCore.isInitialized()) {
      SteamLogger.error('[Steamworks] Cannot activate overlay to store: Steam not initialized');
      return;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      SteamLogger.error('[Steamworks] Friends interface not available');
      return;
    }

    try {
      this.libraryLoader.SteamAPI_ISteamFriends_ActivateGameOverlayToStore(
        friendsInterface,
        appId,
        flag
      );
    } catch (error) {
      SteamLogger.error('[Steamworks] Error activating overlay to store:', error);
    }
  }

  /**
   * Activates the Steam overlay invite dialog for a lobby
   * 
   * @param steamIdLobby - The Steam ID of the lobby to invite friends to
   * 
   * @remarks
   * Opens the Steam overlay with the invite dialog, allowing the player
   * to select friends to invite to the specified lobby.
   * 
   * The lobby must be created first using Steam's matchmaking API.
   * Friends will receive an invite notification that they can accept.
   * 
   * @example Invite friends to multiplayer lobby
   * ```typescript
   * // After creating a lobby
   * const lobbyId = '109775241021923456'; // From matchmaking API
   * 
   * // Show invite dialog
   * steam.overlay.activateGameOverlayInviteDialog(lobbyId);
   * ```
   * 
   * @example Multiplayer host menu
   * ```typescript
   * function onInviteFriendsClick() {
   *   const currentLobby = getCurrentLobbyId();
   *   
   *   if (currentLobby) {
   *     steam.overlay.activateGameOverlayInviteDialog(currentLobby);
   *   } else {
   *     console.log('No active lobby');
   *   }
   * }
   * ```
   */
  activateGameOverlayInviteDialog(steamIdLobby: string): void {
    if (!this.apiCore.isInitialized()) {
      SteamLogger.error('[Steamworks] Cannot activate invite dialog: Steam not initialized');
      return;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      SteamLogger.error('[Steamworks] Friends interface not available');
      return;
    }

    try {
      const lobbyId64 = BigInt(steamIdLobby);
      this.libraryLoader.SteamAPI_ISteamFriends_ActivateGameOverlayInviteDialog(
        friendsInterface,
        lobbyId64
      );
    } catch (error) {
      SteamLogger.error('[Steamworks] Error activating invite dialog:', error);
    }
  }

  /**
   * Activates the Steam overlay Remote Play Together invite dialog
   * 
   * @param steamIdLobby - The Steam ID of the lobby (can be 0 for no specific lobby)
   * 
   * @remarks
   * Opens the Steam overlay with the Remote Play Together invite dialog.
   * Remote Play Together allows friends to play local multiplayer games together
   * online - only the host needs to own the game.
   * 
   * This is a Steam feature that streams your game to friends who join.
   * Your game needs to support local multiplayer for this to work properly.
   * 
   * @example Open Remote Play Together invite
   * ```typescript
   * // Open Remote Play Together invite (no specific lobby)
   * steam.overlay.activateGameOverlayRemotePlayTogetherInviteDialog('0');
   * 
   * // With a specific lobby
   * const lobbyId = getCurrentLobbyId();
   * steam.overlay.activateGameOverlayRemotePlayTogetherInviteDialog(lobbyId);
   * ```
   * 
   * @example Local multiplayer menu
   * ```typescript
   * function onRemotePlayClick() {
   *   console.log('Opening Remote Play Together invite...');
   *   steam.overlay.activateGameOverlayRemotePlayTogetherInviteDialog('0');
   * }
   * ```
   */
  activateGameOverlayRemotePlayTogetherInviteDialog(steamIdLobby: string): void {
    if (!this.apiCore.isInitialized()) {
      SteamLogger.error('[Steamworks] Cannot activate Remote Play invite: Steam not initialized');
      return;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      SteamLogger.error('[Steamworks] Friends interface not available');
      return;
    }

    try {
      const lobbyId64 = BigInt(steamIdLobby);
      this.libraryLoader.SteamAPI_ISteamFriends_ActivateGameOverlayRemotePlayTogetherInviteDialog(
        friendsInterface,
        lobbyId64
      );
    } catch (error) {
      SteamLogger.error('[Steamworks] Error activating Remote Play invite:', error);
    }
  }

  /**
   * Activates the Steam overlay invite dialog with a custom connect string
   * 
   * @param connectString - The connect string that will be sent to invited friends
   * 
   * @remarks
   * Opens the invite dialog where players can select friends to invite.
   * The specified connect string will be sent with the invitation.
   * 
   * When a friend accepts the invite, your game will receive the connect string
   * through the Rich Presence system or command-line (depending on configuration).
   * 
   * The connect string typically contains information needed to join, such as:
   * - Server IP and port
   * - Session ID
   * - Password or token
   * 
   * @example Invite with server info
   * ```typescript
   * // Create connect string with server details
   * const serverIP = '192.168.1.100';
   * const serverPort = 27015;
   * const connectString = `+connect ${serverIP}:${serverPort}`;
   * 
   * // Open invite dialog
   * steam.overlay.activateGameOverlayInviteDialogConnectString(connectString);
   * ```
   * 
   * @example Invite with session ID
   * ```typescript
   * function inviteFriendsToSession(sessionId: string) {
   *   const connectString = `+join_session ${sessionId}`;
   *   steam.overlay.activateGameOverlayInviteDialogConnectString(connectString);
   * }
   * 
   * // Usage
   * const currentSession = 'abc123-def456';
   * inviteFriendsToSession(currentSession);
   * ```
   * 
   * @example Invite with encrypted token
   * ```typescript
   * function inviteToPrivateMatch(matchToken: string) {
   *   const connectString = `+join_match ${matchToken}`;
   *   steam.overlay.activateGameOverlayInviteDialogConnectString(connectString);
   * }
   * ```
   */
  activateGameOverlayInviteDialogConnectString(connectString: string): void {
    if (!this.apiCore.isInitialized()) {
      SteamLogger.error('[Steamworks] Cannot activate invite dialog: Steam not initialized');
      return;
    }

    const friendsInterface = this.apiCore.getFriendsInterface();
    if (!friendsInterface) {
      SteamLogger.error('[Steamworks] Friends interface not available');
      return;
    }

    try {
      this.libraryLoader.SteamAPI_ISteamFriends_ActivateGameOverlayInviteDialogConnectString(
        friendsInterface,
        connectString
      );
    } catch (error) {
      SteamLogger.error('[Steamworks] Error activating invite dialog with connect string:', error);
    }
  }
}
