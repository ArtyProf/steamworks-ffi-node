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
