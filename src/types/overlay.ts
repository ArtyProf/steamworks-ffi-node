/**
 * Types for Steam Overlay API
 */

/**
 * Overlay dialog types for ActivateGameOverlay
 */
export enum EOverlayDialog {
  /** Opens the friends list */
  FRIENDS = 'Friends',
  /** Opens the Steam community hub */
  COMMUNITY = 'Community',
  /** Opens the players list (for in-game) */
  PLAYERS = 'Players',
  /** Opens Steam settings */
  SETTINGS = 'Settings',
  /** Opens official game group */
  OFFICIAL_GAME_GROUP = 'OfficialGameGroup',
  /** Opens stats page */
  STATS = 'Stats',
  /** Opens achievements page */
  ACHIEVEMENTS = 'Achievements',
}

/**
 * Overlay user dialog types for ActivateGameOverlayToUser
 */
export enum EOverlayToUserDialog {
  /** Opens overlay web browser to user's Steam profile */
  STEAM_ID = 'steamid',
  /** Opens chat window to the user or joins group chat */
  CHAT = 'chat',
  /** Opens window to Steam Trading session (requires ISteamEconomy/StartTrade Web API) */
  JOIN_TRADE = 'jointrade',
  /** Opens overlay web browser to user's stats */
  STATS = 'stats',
  /** Opens overlay web browser to user's achievements */
  ACHIEVEMENTS = 'achievements',
  /** Opens overlay prompting to add user as friend */
  FRIEND_ADD = 'friendadd',
  /** Opens overlay prompting to remove user as friend */
  FRIEND_REMOVE = 'friendremove',
  /** Opens overlay prompting to accept incoming friend invite */
  FRIEND_REQUEST_ACCEPT = 'friendrequestaccept',
  /** Opens overlay prompting to ignore incoming friend invite */
  FRIEND_REQUEST_IGNORE = 'friendrequestignore',
}

/**
 * Overlay to store flags
 */
export enum EOverlayToStoreFlag {
  /** No special behavior */
  None = 0,
  /** Add item to cart */
  AddToCart = 1,
  /** Add to cart and show the cart */
  AddToCartAndShow = 2,
}

/**
 * Web page overlay modes
 */
export enum EActivateGameOverlayToWebPageMode {
  /** 
   * Browser opens next to other overlay windows.
   * Window remains open even if overlay is closed and reopened.
   */
  Default = 0,
  /**
   * Browser opens in modal configuration hiding other overlay windows.
   * Browser and overlay close together.
   */
  Modal = 1,
}
