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
