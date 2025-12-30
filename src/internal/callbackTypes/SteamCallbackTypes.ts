/**
 * TypeScript interfaces for Steam API callback structures
 * 
 * These interfaces match the C++ callback structures from the Steam SDK.
 * Used for type-safe handling of async operation results.
 */

// ========================================
// Workshop/UGC Callback Types
// ========================================

/**
 * CreateItemResult_t callback structure
 * 
 * Result of ISteamUGC::CreateItem call
 */
export interface CreateItemResultType {
  m_eResult: number;
  m_nPublishedFileId: bigint;
  m_bUserNeedsToAcceptWorkshopLegalAgreement: boolean;
}

/**
 * SubmitItemUpdateResult_t callback structure
 * 
 * Result of ISteamUGC::SubmitItemUpdate call
 */
export interface SubmitItemUpdateResultType {
  m_eResult: number;
  m_bUserNeedsToAcceptWorkshopLegalAgreement: boolean;
  m_nPublishedFileId: bigint;
}

/**
 * RemoteStorageSubscribePublishedFileResult_t callback structure
 * 
 * Result of ISteamUGC::SubscribeItem call
 */
export interface RemoteStorageSubscribePublishedFileResultType {
  m_eResult: number;
  m_nPublishedFileId: bigint;
}

/**
 * RemoteStorageUnsubscribePublishedFileResult_t callback structure
 * 
 * Result of ISteamUGC::UnsubscribeItem call
 */
export interface RemoteStorageUnsubscribePublishedFileResultType {
  m_eResult: number;
  m_nPublishedFileId: bigint;
}

/**
 * SteamUGCQueryCompleted_t callback structure
 * 
 * Result of ISteamUGC::SendQueryUGCRequest call
 */
export interface SteamUGCQueryCompletedType {
  m_handle: bigint;
  m_eResult: number;
  m_unNumResultsReturned: number;
  m_unTotalMatchingResults: number;
  m_bCachedData: boolean;
}

/**
 * SetUserItemVoteResult_t callback structure
 * 
 * Result of ISteamUGC::SetUserItemVote call
 */
export interface SetUserItemVoteResultType {
  m_nPublishedFileId: bigint;
  m_eResult: number;
  m_bVoteUp: boolean;
}

/**
 * GetUserItemVoteResult_t callback structure
 * 
 * Result of ISteamUGC::GetUserItemVote call
 */
export interface GetUserItemVoteResultType {
  m_nPublishedFileId: bigint;
  m_eResult: number;
  m_bVotedUp: boolean;
  m_bVotedDown: boolean;
  m_bVoteSkipped: boolean;
}

/**
 * UserFavoriteItemsListChanged_t callback structure
 * 
 * Result of ISteamUGC::AddItemToFavorites or RemoveItemFromFavorites calls
 */
export interface UserFavoriteItemsListChangedType {
  m_nPublishedFileId: bigint;
  m_eResult: number;
  m_bWasAddRequest: boolean;
}

/**
 * DeleteItemResult_t callback structure
 * 
 * Result of ISteamUGC::DeleteItem call
 */
export interface DeleteItemResultType {
  m_eResult: number;
  m_nPublishedFileId: bigint;
}

// ========================================
// Matchmaking Callback Types
// ========================================

/**
 * LobbyCreated_t callback structure
 * 
 * Result of ISteamMatchmaking::CreateLobby call
 */
export interface LobbyCreatedType {
  m_eResult: number;
  m_ulSteamIDLobby: bigint;
}

/**
 * LobbyEnter_t callback structure
 * 
 * Result of ISteamMatchmaking::JoinLobby call
 */
export interface LobbyEnterType {
  m_ulSteamIDLobby: bigint;
  m_rgfChatPermissions: number;
  m_bLocked: boolean;
  m_EChatRoomEnterResponse: number;
}

/**
 * LobbyMatchList_t callback structure
 * 
 * Result of ISteamMatchmaking::RequestLobbyList call
 */
export interface LobbyMatchListType {
  m_nLobbiesMatching: number;
}

// ========================================
// Networking Sockets Callback Types
// ========================================

/**
 * SteamNetConnectionStatusChangedCallback_t structure
 * 
 * Pushed callback when any connection state changes.
 * Used with SetGlobalCallback_SteamNetConnectionStatusChanged.
 */
export interface SteamNetConnectionStatusChangedCallbackType {
  /** Connection handle */
  m_hConn: number;
  /** Full connection info */
  m_info: {
    /** Remote peer identity (Steam ID as string) */
    identityRemote: string;
    /** User data associated with connection */
    userData: bigint;
    /** Listen socket this came from (0 if outgoing) */
    listenSocket: number;
    /** Remote address (if applicable) */
    remoteAddress: string;
    /** Remote POP ID */
    popIdRemote: number;
    /** Relay POP ID */
    popIdRelay: number;
    /** Current connection state */
    state: number;
    /** State name for debugging */
    stateName: string;
    /** End reason code */
    endReason: number;
    /** End debug message */
    endDebugMessage: string;
    /** Connection description */
    connectionDescription: string;
  };
  /** Previous connection state */
  m_eOldState: number;
}
