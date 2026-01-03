/**
 * Steam Authentication types
 * 
 * Types related to Steam session tickets, authentication, and user verification.
 * Used by SteamAuthManager for multiplayer authentication and Web API authentication.
 * 
 * @see {@link https://partner.steamgames.com/doc/api/ISteamUser}
 */

/**
 * Handle to an authentication ticket.
 * Used to identify active auth sessions.
 */
export type HAuthTicket = number;

/**
 * Invalid auth ticket constant
 */
export const k_HAuthTicketInvalid = 0;

/**
 * Results from BeginAuthSession
 * 
 * Indicates the result of beginning an auth session to validate a ticket.
 * 
 * @see {@link https://partner.steamgames.com/doc/api/ISteamUser#EBeginAuthSessionResult}
 */
export enum EBeginAuthSessionResult {
  /** Ticket is valid for this game and this steamID */
  OK = 0,
  /** Ticket is not valid */
  InvalidTicket = 1,
  /** A ticket has already been submitted for this steamID */
  DuplicateRequest = 2,
  /** Ticket is from an incompatible interface version */
  InvalidVersion = 3,
  /** Ticket is not for this game */
  GameMismatch = 4,
  /** Ticket has expired */
  ExpiredTicket = 5,
}

/**
 * Callback values for ValidateAuthTicketResponse_t
 * 
 * Response to BeginAuthSession indicating the current state of the auth session.
 * 
 * @see {@link https://partner.steamgames.com/doc/api/ISteamUser#EAuthSessionResponse}
 */
export enum EAuthSessionResponse {
  /** Steam has verified the user is online, ticket is valid and not reused */
  OK = 0,
  /** The user in question is not connected to Steam */
  UserNotConnectedToSteam = 1,
  /** The license has expired */
  NoLicenseOrExpired = 2,
  /** The user is VAC banned for this game */
  VACBanned = 3,
  /** The user account has logged in elsewhere */
  LoggedInElseWhere = 4,
  /** VAC has been unable to perform anti-cheat checks on this user */
  VACCheckTimedOut = 5,
  /** The ticket has been canceled by the issuer */
  AuthTicketCanceled = 6,
  /** This ticket has already been used, it is not valid */
  AuthTicketInvalidAlreadyUsed = 7,
  /** This ticket is not from a user instance currently connected to steam */
  AuthTicketInvalid = 8,
  /** The user is banned for this game (ban via web api, not VAC) */
  PublisherIssuedBan = 9,
  /** The network identity in the ticket does not match the server */
  AuthTicketNetworkIdentityFailure = 10,
}

/**
 * Results from UserHasLicenseForApp
 * 
 * Used to determine if a user has a license for a specific app/DLC.
 * 
 * @see {@link https://partner.steamgames.com/doc/api/ISteamUser#EUserHasLicenseForAppResult}
 */
export enum EUserHasLicenseForAppResult {
  /** User has a license for specified app */
  HasLicense = 0,
  /** User does not have a license for the specified app */
  DoesNotHaveLicense = 1,
  /** User has not been authenticated */
  NoAuth = 2,
}

/**
 * Result from GetAuthSessionTicket operation
 */
export interface GetAuthSessionTicketResult {
  /** Whether the operation was successful */
  success: boolean;
  /** The auth ticket handle (0 if failed) */
  authTicket: HAuthTicket;
  /** The ticket data as a Buffer */
  ticketData: Buffer;
  /** The actual ticket size in bytes */
  ticketSize: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Result from GetAuthTicketForWebApi operation
 */
export interface GetAuthTicketForWebApiResult {
  /** Whether the operation was successful */
  success: boolean;
  /** The auth ticket handle (0 if failed) */
  authTicket: HAuthTicket;
  /** The ticket data as a Buffer */
  ticketData: Buffer;
  /** The actual ticket size in bytes */
  ticketSize: number;
  /** The ticket as a hex string (for web API usage) */
  ticketHex: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Result from BeginAuthSession operation
 */
export interface BeginAuthSessionResult {
  /** Whether the initial validation passed */
  success: boolean;
  /** The result code from BeginAuthSession */
  result: EBeginAuthSessionResult;
  /** Error message if failed */
  error?: string;
}

/**
 * Result from ValidateAuthTicketResponse callback
 */
export interface ValidateAuthTicketResult {
  /** The Steam ID of the user being validated */
  steamId: string;
  /** The response from Steam */
  response: EAuthSessionResponse;
  /** The owner's Steam ID (different from steamId if borrowed) */
  ownerSteamId: string;
  /** Whether the validation was successful */
  success: boolean;
}

/**
 * Result from RequestEncryptedAppTicket operation
 */
export interface RequestEncryptedAppTicketResult {
  /** Whether the request was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Result from GetEncryptedAppTicket operation
 */
export interface GetEncryptedAppTicketResult {
  /** Whether the operation was successful */
  success: boolean;
  /** The encrypted ticket data */
  ticketData: Buffer;
  /** The actual ticket size in bytes */
  ticketSize: number;
  /** The ticket as a hex string */
  ticketHex: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Handler for auth session validation events
 */
export type ValidateAuthTicketHandler = (result: ValidateAuthTicketResult) => void;

/**
 * User security information
 */
export interface UserSecurityInfo {
  /** Whether the user's phone number is verified */
  phoneVerified: boolean;
  /** Whether the user has two-factor authentication enabled */
  twoFactorEnabled: boolean;
  /** Whether the user's phone number is identifying */
  phoneIdentifying: boolean;
  /** Whether the user's phone number is awaiting verification */
  phoneRequiringVerification: boolean;
}

/**
 * Market eligibility result
 */
export interface MarketEligibilityResult {
  /** Whether the user is allowed to use the market */
  allowed: boolean;
  /** The reason why the user is not allowed (if not allowed) */
  notAllowedReason: number;
  /** When the user will be allowed to use the market (Unix timestamp) */
  allowedAtTime: number;
  /** Days of Steam Guard required */
  steamGuardRequiredDays: number;
  /** New device cooldown days */
  newDeviceCooldownDays: number;
}

/**
 * Duration control result (for anti-indulgence compliance)
 */
export interface DurationControlResult {
  /** Whether the call was successful */
  success: boolean;
  /** App ID generating playtime */
  appId: number;
  /** Whether duration control is applicable to this user + game */
  applicable: boolean;
  /** Seconds of playtime in last 5 hours */
  secondsLast5Hours: number;
  /** Recommended progress (0 = ok, 1 = exit game) */
  progress: number;
  /** Notification to show (0 = none) */
  notification: number;
  /** Playtime on current calendar day in seconds */
  secondsToday: number;
  /** Playtime remaining until regulatory limit in seconds */
  secondsRemaining: number;
}

/**
 * Duration control online state
 * Used to inform Steam about the game's online state for duration control.
 */
export enum EDurationControlOnlineState {
  /** Default state */
  Invalid = 0,
  /** Player is in offline mode */
  Offline = 1,
  /** Player is online */
  Online = 2,
  /** Player is online but in high priority mode (competitive match, etc.) */
  OnlineHighPri = 3,
}

/**
 * Voice recording result codes
 * 
 * @see {@link https://partner.steamgames.com/doc/api/ISteamUser#EVoiceResult}
 */
export enum EVoiceResult {
  /** Voice call was successful */
  OK = 0,
  /** Steam voice chat has not been initialized */
  NotInitialized = 1,
  /** Voice recording is not active (call StartVoiceRecording first) */
  NotRecording = 2,
  /** No data is available (microphone may be off or silent) */
  NoData = 3,
  /** The provided buffer was too small to hold the data */
  BufferTooSmall = 4,
  /** Voice data is corrupted */
  DataCorrupted = 5,
  /** Voice chat is restricted for this user */
  Restricted = 6,
  /** The voice codec is not supported */
  UnsupportedCodec = 7,
  /** The receiver is using an outdated voice codec */
  ReceiverOutOfDate = 8,
  /** The receiver did not answer the voice call */
  ReceiverDidNotAnswer = 9,
}

/**
 * Result from GetAvailableVoice
 */
export interface GetAvailableVoiceResult {
  /** Voice result code */
  result: EVoiceResult;
  /** Number of compressed bytes available */
  compressedBytes: number;
}

/**
 * Result from GetVoice
 */
export interface GetVoiceResult {
  /** Voice result code */
  result: EVoiceResult;
  /** Buffer containing the compressed voice data (if successful) */
  voiceData: Buffer | null;
  /** Number of bytes written to the buffer */
  bytesWritten: number;
}

/**
 * Result from DecompressVoice
 */
export interface DecompressVoiceResult {
  /** Voice result code */
  result: EVoiceResult;
  /** Buffer containing the decompressed PCM audio data (if successful) */
  audioData: Buffer | null;
  /** Number of bytes written to the buffer */
  bytesWritten: number;
}

/**
 * Result from RequestStoreAuthURL
 */
export interface StoreAuthURLResult {
  /** Whether the request was successful */
  success: boolean;
  /** The authenticated URL for in-game browser checkout */
  url: string | null;
  /** Error message if failed */
  error?: string;
}
