/**
 * Types and enums for Steam Networking Utils API
 * 
 * These types are used by the SteamNetworkingUtilsManager for network
 * utilities including ping location estimation, relay network access,
 * and data center ping times.
 * 
 * @see {@link https://partner.steamgames.com/doc/api/ISteamNetworkingUtils ISteamNetworkingUtils Documentation}
 */

// ========================================
// Networking Availability Enum
// ========================================

/**
 * Describes the status of a particular network resource
 */
export enum ESteamNetworkingAvailability {
  /** A dependent resource is missing, so this service is unavailable */
  CannotTry = -102,
  /** We have tried for enough time that we would expect to have been successful by now. We have never been successful */
  Failed = -101,
  /** We tried and were successful at one time, but now it looks like we have a problem */
  Previously = -100,
  /** We previously failed and are currently retrying */
  Retrying = -10,
  /** We don't know because we haven't ever checked/tried */
  NeverTried = 1,
  /** We're waiting on a dependent resource to be acquired */
  Waiting = 2,
  /** We're actively trying now, but are not yet successful */
  Attempting = 3,
  /** Resource is online/available */
  Current = 100,
  /** Internal dummy/sentinel, or value is not applicable in this context */
  Unknown = 0,
}

/**
 * Human-readable names for ESteamNetworkingAvailability
 */
export const NetworkingAvailabilityNames: Record<number, string> = {
  [-102]: 'Cannot Try',
  [-101]: 'Failed',
  [-100]: 'Previously Working',
  [-10]: 'Retrying',
  [0]: 'Unknown',
  [1]: 'Never Tried',
  [2]: 'Waiting',
  [3]: 'Attempting',
  [100]: 'Current/Available',
};

// ========================================
// Fake IP Type Enum
// ========================================

/**
 * "Fake IPs" are assigned to hosts to make it easier to interface
 * with older code that assumed all hosts have an IPv4 address
 */
export enum ESteamNetworkingFakeIPType {
  /** Error, argument was not even an IP address */
  Invalid = 0,
  /** Argument was a valid IP, but was not from the reserved "fake" range */
  NotFake = 1,
  /** Globally unique (for a given app) IPv4 address. Address space managed by Steam */
  GlobalIPv4 = 2,
  /** Locally unique IPv4 address. Address space managed by the local process */
  LocalIPv4 = 3,
}

// ========================================
// Config Enums
// ========================================

/**
 * Configuration values can be applied to different types of objects
 */
export enum ESteamNetworkingConfigScope {
  /** Get/set global option, or defaults */
  Global = 1,
  /** Options specific to a particular interface */
  SocketsInterface = 2,
  /** Options specific to a listen socket */
  ListenSocket = 3,
  /** Options specific to a connection */
  Connection = 4,
}

/**
 * Data types for configuration values
 */
export enum ESteamNetworkingConfigDataType {
  Int32 = 1,
  Int64 = 2,
  Float = 3,
  String = 4,
  Ptr = 5,
}

/**
 * Configuration value identifiers
 */
export enum ESteamNetworkingConfigValue {
  Invalid = 0,
  
  // Connection options
  TimeoutInitial = 24,
  TimeoutConnected = 25,
  SendBufferSize = 9,
  RecvBufferSize = 47,
  SendRateMin = 10,
  SendRateMax = 11,
  NagleTime = 12,
  
  // Callbacks
  Callback_ConnectionStatusChanged = 201,
  Callback_AuthStatusChanged = 202,
  Callback_RelayNetworkStatusChanged = 203,
  Callback_MessagesSessionRequest = 204,
  Callback_MessagesSessionFailed = 205,
  Callback_FakeIPResult = 206,
  
  // P2P settings
  P2P_STUN_ServerList = 103,
  P2P_Transport_ICE_Enable = 104,
  P2P_Transport_ICE_Penalty = 105,
  P2P_Transport_SDR_Penalty = 106,
  P2P_TURN_ServerList = 107,
  P2P_TURN_UserList = 108,
  P2P_TURN_PassList = 109,
  
  // Log levels
  LogLevel_AckRTT = 13,
  LogLevel_PacketDecode = 14,
  LogLevel_Message = 15,
  LogLevel_PacketGaps = 16,
  LogLevel_P2PRendezvous = 17,
  LogLevel_SDRRelayPings = 18,
}

/**
 * Debug output types for SetDebugOutputFunction
 */
export enum ESteamNetworkingSocketsDebugOutputType {
  None = 0,
  Bug = 1,
  Error = 2,
  Important = 3,
  Warning = 4,
  Msg = 5,
  Verbose = 6,
  Debug = 7,
  Everything = 8,
}

// ========================================
// Interfaces and Types
// ========================================

/**
 * Ping location data - used to estimate ping times between hosts
 * without sending actual packets. This is an opaque binary blob
 * that should be serialized to string for transmission.
 */
export interface PingLocation {
  /** String representation of the ping location (for transmission/storage) */
  locationString: string;
  /** Age of the data in seconds when retrieved (-1 if not available) */
  dataAge: number;
}

/**
 * Relay network status information
 */
export interface RelayNetworkStatus {
  /** Overall availability status */
  availability: ESteamNetworkingAvailability;
  /** Human-readable availability name */
  availabilityName: string;
  /** Whether ping measurement is in progress */
  pingMeasurementInProgress: boolean;
  /** Status of network config availability */
  networkConfigAvailability: ESteamNetworkingAvailability;
  /** Status of relay availability */
  anyRelayAvailability: ESteamNetworkingAvailability;
  /** Debug message (English, not localized) */
  debugMessage: string;
}

/**
 * Information about a Valve Point of Presence (data center)
 */
export interface POPInfo {
  /** POP ID (encoded as 3-4 character code in uint32) */
  popId: number;
  /** POP ID as string (e.g., 'iad', 'lax', 'eat') */
  popCode: string;
  /** Ping time in milliseconds to this POP via relay network */
  pingViaRelay: number;
  /** POP ID of the relay used to reach this POP */
  viaRelayPOP: number;
  /** Via relay POP as string code */
  viaRelayPOPCode: string;
  /** Direct ping time in milliseconds to this POP */
  directPing: number;
}

/**
 * Result of ping estimation between two locations
 */
export interface PingEstimate {
  /** Estimated ping time in milliseconds */
  pingMs: number;
  /** Whether the estimate is valid */
  valid: boolean;
  /** Error message if not valid */
  error?: string;
}

// ========================================
// Constants
// ========================================

/**
 * Max length of a ping location string
 */
export const MAX_PING_LOCATION_STRING_LENGTH = 1024;

/**
 * Size of SteamNetworkPingLocation_t structure in bytes
 */
export const PING_LOCATION_DATA_SIZE = 512;

/**
 * Special ping values
 */
export const PING_FAILED = -1;
export const PING_UNKNOWN = -2;

// ========================================
// Helper Functions
// ========================================

/**
 * Converts a POP ID (uint32) to a readable string code
 * POP IDs are typically 3-4 ASCII characters packed into a uint32.
 * Steam stores these with characters reversed (last char in LSB).
 * For codes with numbers (like ams4), the number is in MSB.
 */
export function popIdToString(popId: number): string {
  if (popId === 0) return '';
  
  const chars: string[] = [];
  let id = popId;
  
  while (id > 0) {
    const char = id & 0xFF;
    if (char >= 32 && char < 127) {
      chars.push(String.fromCharCode(char));
    }
    id = id >>> 8;
  }
  
  // Check if last char is a digit (it would be at the end of chars array)
  // If so, move it to the end of the output string
  if (chars.length > 0) {
    const lastChar = chars[chars.length - 1];
    if (lastChar >= '0' && lastChar <= '9') {
      // Remove the digit from the end, reverse remaining, append digit
      chars.pop();
      return chars.reverse().join('') + lastChar;
    }
  }
  
  // For all-letter codes, just reverse
  return chars.reverse().join('');
}

/**
 * Converts a string POP code to a uint32 POP ID
 * Reverses the storage format used by Steam.
 */
export function stringToPopId(code: string): number {
  if (!code || code.length === 0) return 0;
  
  // Check if last char is a digit
  const lastChar = code[code.length - 1];
  let processedCode = code;
  
  if (lastChar >= '0' && lastChar <= '9') {
    // Move digit to be stored in MSB, reverse the rest
    const letters = code.slice(0, -1);
    processedCode = letters.split('').reverse().join('') + lastChar;
  } else {
    // Just reverse for all-letter codes
    processedCode = code.split('').reverse().join('');
  }
  
  let popId = 0;
  const len = Math.min(processedCode.length, 4);
  for (let i = len - 1; i >= 0; i--) {
    popId = (popId << 8) | (processedCode.charCodeAt(i) & 0xFF);
  }
  
  return popId;
}

/**
 * Gets a human-readable name for a networking availability value
 */
export function getAvailabilityName(availability: ESteamNetworkingAvailability): string {
  return NetworkingAvailabilityNames[availability] || `Unknown (${availability})`;
}

// ========================================
// ISteamNetworkingSockets Types
// ========================================

/**
 * Handle to a listen socket (for receiving P2P connections)
 */
export type HSteamListenSocket = number;

/**
 * Handle to a P2P connection
 */
export type HSteamNetConnection = number;

/**
 * Handle to a poll group (for receiving messages from multiple connections)
 */
export type HSteamNetPollGroup = number;

/**
 * Invalid handle constants
 */
export const k_HSteamListenSocket_Invalid: HSteamListenSocket = 0;
export const k_HSteamNetConnection_Invalid: HSteamNetConnection = 0;
export const k_HSteamNetPollGroup_Invalid: HSteamNetPollGroup = 0;

/**
 * Connection state enum
 */
export enum ESteamNetworkingConnectionState {
  /** Dummy value used to indicate an error condition */
  None = 0,
  /** We are trying to establish whether peers can talk to each other */
  Connecting = 1,
  /** We've found each other's location and are trying to setup a route */
  FindingRoute = 2,
  /** The connection has been established, we can send/receive data */
  Connected = 3,
  /** The connection was closed by the peer */
  ClosedByPeer = 4,
  /** A problem was detected locally */
  ProblemDetectedLocally = 5,
  /** Internal connection states */
  FinWait = -1,
  Linger = -2,
  Dead = -3,
}

/**
 * Human-readable names for connection states
 */
export const ConnectionStateNames: Record<number, string> = {
  [0]: 'None',
  [1]: 'Connecting',
  [2]: 'Finding Route',
  [3]: 'Connected',
  [4]: 'Closed By Peer',
  [5]: 'Problem Detected Locally',
  [-1]: 'FinWait',
  [-2]: 'Linger',
  [-3]: 'Dead',
};

/**
 * Identity type for Steam networking
 */
export enum ESteamNetworkingIdentityType {
  Invalid = 0,
  SteamID = 16,
  IPAddress = 1,
  GenericString = 2,
  GenericBytes = 3,
  UnknownType = 4,
}

/**
 * Send message flags
 */
export const k_nSteamNetworkingSend_Unreliable = 0;
export const k_nSteamNetworkingSend_NoNagle = 1;
export const k_nSteamNetworkingSend_UnreliableNoNagle = 0 | 1;
export const k_nSteamNetworkingSend_NoDelay = 4;
export const k_nSteamNetworkingSend_UnreliableNoDelay = 0 | 4 | 1;
export const k_nSteamNetworkingSend_Reliable = 8;
export const k_nSteamNetworkingSend_ReliableNoNagle = 8 | 1;
export const k_nSteamNetworkingSend_UseCurrentThread = 16;
export const k_nSteamNetworkingSend_AutoRestartBrokenSession = 32;

/**
 * EResult values relevant to networking
 */
export enum EResult {
  OK = 1,
  Fail = 2,
  InvalidParam = 8,
  InvalidState = 11,
  NoConnection = 3,
  Ignored = 32,
  LimitExceeded = 25,
}

/**
 * Connection end reason codes
 * Values >= 1000 are application codes
 */
export const k_ESteamNetConnectionEnd_Invalid = 0;
export const k_ESteamNetConnectionEnd_App_Min = 1000;
export const k_ESteamNetConnectionEnd_App_Max = 1999;
export const k_ESteamNetConnectionEnd_AppException_Min = 2000;
export const k_ESteamNetConnectionEnd_AppException_Max = 2999;
export const k_ESteamNetConnectionEnd_Local_Min = 3000;
export const k_ESteamNetConnectionEnd_Local_Max = 3999;
export const k_ESteamNetConnectionEnd_Remote_Min = 4000;
export const k_ESteamNetConnectionEnd_Remote_Max = 4999;
export const k_ESteamNetConnectionEnd_Misc_Min = 5000;
export const k_ESteamNetConnectionEnd_Misc_Max = 5999;

/**
 * SteamNetworkingIdentity structure size
 * Contains: m_eType (4 bytes) + union (128 bytes) + m_cbSize (4 bytes) = 136 bytes
 * But the actual C++ structure is 136 bytes with padding
 */
export const STEAM_NETWORKING_IDENTITY_SIZE = 136;

/**
 * SteamNetConnectionInfo_t structure size (approximate - contains padding and reserved space)
 */
export const STEAM_NET_CONNECTION_INFO_SIZE = 696;

/**
 * SteamNetConnectionRealTimeStatus_t structure size
 */
export const STEAM_NET_CONNECTION_REALTIME_STATUS_SIZE = 64;

/**
 * SteamNetworkingIPAddr structure size
 */
export const STEAM_NETWORKING_IP_ADDR_SIZE = 18;

/**
 * Max connection close reason string length
 */
export const k_cchSteamNetworkingMaxConnectionCloseReason = 128;

/**
 * Max connection description string length
 */
export const k_cchSteamNetworkingMaxConnectionDescription = 128;

/**
 * Connection information
 */
export interface ConnectionInfo {
  /** The remote peer's identity (Steam ID as string for SteamID type) */
  identityRemote: string;
  /** User data set on the connection */
  userData: bigint;
  /** Listen socket this connection came from (0 if we initiated) */
  listenSocket: HSteamListenSocket;
  /** Remote IP address (if applicable) */
  remoteAddress: string;
  /** POP ID of remote data center */
  popIdRemote: number;
  /** POP ID of relay being used */
  popIdRelay: number;
  /** Current connection state */
  state: ESteamNetworkingConnectionState;
  /** Human-readable state name */
  stateName: string;
  /** End reason code (if connection ended) */
  endReason: number;
  /** Debug message for end reason */
  endDebugMessage: string;
  /** Connection description string */
  connectionDescription: string;
}

/**
 * Real-time connection status
 */
export interface ConnectionRealTimeStatus {
  /** Current connection state */
  state: ESteamNetworkingConnectionState;
  /** Current ping in milliseconds */
  ping: number;
  /** Connection quality (0-1, higher is better) */
  connectionQualityLocal: number;
  /** Remote connection quality (0-1) */
  connectionQualityRemote: number;
  /** Outgoing rate in bytes per second */
  outPacketsPerSec: number;
  /** Outgoing data in bytes per second */
  outBytesPerSec: number;
  /** Incoming rate in packets per second */
  inPacketsPerSec: number;
  /** Incoming data in bytes per second */
  inBytesPerSec: number;
  /** Estimated bandwidth of the connection */
  sendRateBytesPerSecond: number;
  /** Number of bytes pending to be sent */
  pendingUnreliable: number;
  /** Number of bytes pending reliable send */
  pendingReliable: number;
  /** Bytes of data in sent packets waiting for acknowledgment */
  sentUnackedReliable: number;
  /** Time when the connection was established (microseconds) */
  usecQueueTime: bigint;
}

/**
 * A received network message
 */
export interface NetworkMessage {
  /** The message data */
  data: Buffer;
  /** Size of the message in bytes */
  size: number;
  /** Connection this message came from */
  connection: HSteamNetConnection;
  /** Identity of the sender */
  identityPeer: string;
  /** User data associated with the connection */
  connectionUserData: bigint;
  /** Time the message was received (microseconds) */
  timeReceived: bigint;
  /** Message number assigned by the sender */
  messageNumber: bigint;
  /** Channel number (for lane support) */
  channel: number;
  /** Flags (includes k_nSteamNetworkingSend_Reliable if message was reliable) */
  flags: number;
}

/**
 * Result of sending a message
 */
export interface SendMessageResult {
  /** Whether the message was successfully queued */
  success: boolean;
  /** EResult code */
  result: EResult;
  /** Message number if successful */
  messageNumber: bigint;
}

/**
 * P2P connection request event (for listen sockets)
 */
export interface P2PConnectionRequest {
  /** The connection handle */
  connection: HSteamNetConnection;
  /** Identity of the remote peer */
  identityRemote: string;
  /** The listen socket that received this connection request */
  listenSocket: HSteamListenSocket;
}

/**
 * Connection state change event
 */
export interface ConnectionStateChange {
  /** The connection handle */
  connection: HSteamNetConnection;
  /** Previous connection state */
  oldState: ESteamNetworkingConnectionState;
  /** New connection state */
  newState: ESteamNetworkingConnectionState;
  /** Connection info at the time of the change */
  info: ConnectionInfo;
}

/**
 * Gets a human-readable name for a connection state
 */
export function getConnectionStateName(state: ESteamNetworkingConnectionState): string {
  return ConnectionStateNames[state] || `Unknown (${state})`;
}

