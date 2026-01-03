/**
 * Steam Callback IDs
 * 
 * Constant values for Steam API callbacks used in async operations.
 * These IDs are used to identify which callback structure to expect
 * when polling for async operation results.
 * 
 * @see {@link https://partner.steamgames.com/doc/api Steam API Documentation}
 */

// ========================================
// Steam Remote Storage Callback IDs
// ========================================

/** Callback for RemoteStorageSubscribePublishedFileResult_t */
export const K_I_REMOTE_STORAGE_SUBSCRIBE_PUBLISHED_FILE_RESULT = 1313;

/** Callback for RemoteStorageUnsubscribePublishedFileResult_t */
export const K_I_REMOTE_STORAGE_UNSUBSCRIBE_PUBLISHED_FILE_RESULT = 1315;

// ========================================
// Steam UGC (Workshop) Callback IDs
// ========================================

/** Callback for SteamUGCQueryCompleted_t */
export const K_I_STEAM_UGC_QUERY_COMPLETED = 3401;

/** Callback for CreateItemResult_t */
export const K_I_CREATE_ITEM_RESULT = 3403;

/** Callback for SubmitItemUpdateResult_t */
export const K_I_SUBMIT_ITEM_UPDATE_RESULT = 3404;

/** Callback for UserFavoriteItemsListChanged_t */
export const K_I_USER_FAVORITE_ITEMS_LIST_CHANGED = 3407;

/** Callback for SetUserItemVoteResult_t */
export const K_I_SET_USER_ITEM_VOTE_RESULT = 3408;

/** Callback for GetUserItemVoteResult_t */
export const K_I_GET_USER_ITEM_VOTE_RESULT = 3409;

/** Callback for DeleteItemResult_t */
export const K_I_DELETE_ITEM_RESULT = 3417;

// ========================================
// Steam Matchmaking Callback IDs
// ========================================

/** Callback for LobbyEnter_t */
export const K_I_LOBBY_ENTER = 504;

/** Callback for LobbyMatchList_t */
export const K_I_LOBBY_MATCH_LIST = 510;

/** Callback for LobbyCreated_t */
export const K_I_LOBBY_CREATED = 513;

// ========================================
// Steam Networking Sockets Callback IDs
// ========================================

/** Callback for SteamNetConnectionStatusChangedCallback_t */
export const K_I_STEAM_NET_CONNECTION_STATUS_CHANGED = 1221;

// ========================================
// Steam User (Authentication) Callback IDs
// ========================================

/** Base callback ID for ISteamUser callbacks (k_iSteamUserCallbacks) */
export const K_I_STEAM_USER_CALLBACKS = 100;

/** Callback for ValidateAuthTicketResponse_t */
export const K_I_VALIDATE_AUTH_TICKET_RESPONSE = 143; // k_iSteamUserCallbacks + 43

/** Callback for EncryptedAppTicketResponse_t */
export const K_I_ENCRYPTED_APP_TICKET_RESPONSE = 154; // k_iSteamUserCallbacks + 54

/** Callback for GetAuthSessionTicketResponse_t */
export const K_I_GET_AUTH_SESSION_TICKET_RESPONSE = 163; // k_iSteamUserCallbacks + 63

/** Callback for StoreAuthURLResponse_t */
export const K_I_STORE_AUTH_URL_RESPONSE = 165; // k_iSteamUserCallbacks + 65

/** Callback for MarketEligibilityResponse_t */
export const K_I_MARKET_ELIGIBILITY_RESPONSE = 166; // k_iSteamUserCallbacks + 66

/** Callback for DurationControl_t */
export const K_I_DURATION_CONTROL = 167; // k_iSteamUserCallbacks + 67

/** Callback for GetTicketForWebApiResponse_t */
export const K_I_GET_TICKET_FOR_WEB_API_RESPONSE = 168; // k_iSteamUserCallbacks + 68
