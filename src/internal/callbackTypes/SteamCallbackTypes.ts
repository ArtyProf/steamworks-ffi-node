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

/**
 * GameLobbyJoinRequested_t callback structure
 *
 * Pushed when the user tries to join a lobby from their friends list, an
 * invite, or Rich Presence -- while the game is already running. If the
 * game is NOT running yet, Steam instead launches it with
 * `+connect_lobby <lobby id>` on the command line, and this callback never
 * fires for that launch; see `SteamMatchmakingManager.getConnectLobbyIdFromCommandLine()`
 * for handling that case.
 */
export interface GameLobbyJoinRequestedType {
  m_steamIDLobby: bigint;
  m_steamIDFriend: bigint;
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

// ========================================
// Authentication Callback Types
// ========================================

/**
 * GetAuthSessionTicketResponse_t callback structure
 * 
 * Result of ISteamUser::GetAuthSessionTicket call
 */
export interface GetAuthSessionTicketResponseType {
  m_hAuthTicket: number;
  m_eResult: number;
}

/**
 * ValidateAuthTicketResponse_t callback structure
 * 
 * Result of ISteamUser::BeginAuthSession validation
 * This is a pushed callback when the auth session status changes.
 */
export interface ValidateAuthTicketResponseType {
  m_SteamID: bigint;
  m_eAuthSessionResponse: number;
  m_OwnerSteamID: bigint;
}

/**
 * GetTicketForWebApiResponse_t callback structure
 * 
 * Result of ISteamUser::GetAuthTicketForWebApi call
 */
export interface GetTicketForWebApiResponseType {
  m_hAuthTicket: number;
  m_eResult: number;
  m_cubTicket: number;
  m_rgubTicket: Buffer;
}

/**
 * EncryptedAppTicketResponse_t callback structure
 * 
 * Result of ISteamUser::RequestEncryptedAppTicket call
 */
export interface EncryptedAppTicketResponseType {
  m_eResult: number;
}

/**
 * MarketEligibilityResponse_t callback structure
 * 
 * Result of ISteamUser::GetMarketEligibility call
 */
export interface MarketEligibilityResponseType {
  m_bAllowed: boolean;
  m_eNotAllowedReason: number;
  m_rtAllowedAtTime: number;
  m_cdaySteamGuardRequiredDays: number;
  m_cdayNewDeviceCooldown: number;
}

/**
 * StoreAuthURLResponse_t callback structure
 * 
 * Result of ISteamUser::RequestStoreAuthURL call
 */
export interface StoreAuthURLResponseType {
  m_szURL: string;
}

/**
 * DurationControl_t callback structure
 * 
 * Result of ISteamUser::GetDurationControl call
 */
export interface DurationControlType {
  m_eResult: number;
  m_appid: number;
  m_bApplicable: boolean;
  m_csecsLast5h: number;
  m_progress: number;
  m_notification: number;
  m_csecsToday: number;
  m_csecsRemaining: number;
}

/**
 * MicroTxnAuthorizationResponse_t callback structure
 *
 * Pushed when the user answers the in-overlay purchase dialog for a
 * microtransaction started via the Web API's ISteamMicroTxn/InitTxn.
 *
 * This struct is NOT decoded with koffi.decode: its layout differs between
 * platforms because the Steam SDK packs callbacks to 8 bytes on Windows and 4
 * on macOS/Linux, and koffi has no custom pack alignment. See
 * MICRO_TXN_AUTHORIZATION_RESPONSE_SIZE_BYTES and the manual parser in
 * SteamUserManager.
 */
export interface MicroTxnAuthorizationResponseType {
  m_unAppID: number;
  m_ulOrderID: bigint;
  m_bAuthorized: boolean;
}
