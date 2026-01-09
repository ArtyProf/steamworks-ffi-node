import * as koffi from 'koffi';
import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import { SteamLogger } from './SteamLogger';
import {
  ESteamNetworkingAvailability,
  ESteamNetworkingSocketsDebugOutputType,
  PingLocation,
  RelayNetworkStatus,
  POPInfo,
  PingEstimate,
  popIdToString,
  getAvailabilityName,
  MAX_PING_LOCATION_STRING_LENGTH,
  PING_LOCATION_DATA_SIZE,
  PING_FAILED,
  PING_UNKNOWN,
} from '../types';

/**
 * Manager for Steam Networking Utils API operations
 * 
 * The SteamNetworkingUtilsManager provides access to Steam's network utilities,
 * including ping location estimation, relay network access, data center (POP)
 * information, and network diagnostics.
 * 
 * Features:
 * - Initialize and monitor Steam's relay network
 * - Get local ping location for matchmaking estimates
 * - Estimate ping times between different locations
 * - Query data center (Point of Presence) information
 * - Get ping times to specific data centers
 * - High-precision local timestamps
 * 
 * @remarks
 * This manager requires the Steam API to be initialized. Network features
 * require calling `initRelayNetworkAccess()` first and waiting for the relay
 * network to become available (status `Current`).
 * 
 * The ping location system allows games to estimate network latency between
 * players without sending actual ping packets, using Steam's cached network
 * topology data.
 * 
 * @example Initialize relay network and get status
 * ```typescript
 * const steam = SteamworksSDK.getInstance();
 * steam.init({ appId: 480 });
 * 
 * // Initialize the relay network
 * steam.networkingUtils.initRelayNetworkAccess();
 * 
 * // Wait for network to be ready
 * const waitForNetwork = async () => {
 *   while (true) {
 *     const status = steam.networkingUtils.getRelayNetworkStatus();
 *     console.log(`Network status: ${status.availabilityName}`);
 *     
 *     if (status.availability === ESteamNetworkingAvailability.Current) {
 *       console.log('Relay network ready!');
 *       break;
 *     }
 *     await new Promise(r => setTimeout(r, 100));
 *     steam.runCallbacks();
 *   }
 * };
 * ```
 * 
 * @example Estimate ping between players
 * ```typescript
 * // Get your local ping location
 * const myLocation = steam.networkingUtils.getLocalPingLocation();
 * console.log(`My ping location: ${myLocation?.locationString}`);
 * 
 * // Share this string with other players via matchmaking...
 * // When you receive another player's location string:
 * const theirLocationString = "..."; // received from other player
 * 
 * // Estimate ping between you and them
 * const estimate = steam.networkingUtils.estimatePingFromString(theirLocationString);
 * if (estimate.valid) {
 *   console.log(`Estimated ping to player: ${estimate.pingMs}ms`);
 * }
 * ```
 * 
 * @example Get data center information
 * ```typescript
 * const pops = steam.networkingUtils.getPOPList();
 * console.log(`${pops.length} data centers available:`);
 * 
 * for (const pop of pops.slice(0, 5)) {
 *   console.log(`  ${pop.popCode}: direct=${pop.directPing}ms, relay=${pop.pingViaRelay}ms`);
 * }
 * ```
 * 
 * @see {@link https://partner.steamgames.com/doc/api/ISteamNetworkingUtils ISteamNetworkingUtils Documentation}
 */
export class SteamNetworkingUtilsManager {
  /** Steam library loader for FFI function calls */
  private libraryLoader: SteamLibraryLoader;
  
  /** Steam API core for initialization and status management */
  private apiCore: SteamAPICore;

  /**
   * Creates a new SteamNetworkingUtilsManager instance
   * 
   * @param libraryLoader - The Steam library loader for FFI calls
   * @param apiCore - The Steam API core for lifecycle management
   */
  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
  }

  /**
   * Gets the SteamNetworkingUtils interface pointer
   * @private
   */
  private getNetworkingUtilsInterface(): any {
    const status = this.apiCore.getStatus();
    if (!status.initialized) {
      return null;
    }
    return this.libraryLoader.SteamAPI_SteamNetworkingUtils_SteamAPI_v004();
  }

  // ========================================
  // Relay Network Access Methods
  // ========================================

  /**
   * Initializes the Steam Relay Network access
   * 
   * This must be called before using ping location functions or relay networking.
   * It starts the process of measuring ping times to Steam's data centers and
   * downloading network configuration.
   * 
   * After calling this, poll `getRelayNetworkStatus()` until the status
   * becomes `ESteamNetworkingAvailability.Current` before using other functions.
   * 
   * @example
   * ```typescript
   * steam.networkingUtils.initRelayNetworkAccess();
   * 
   * // Poll until ready
   * const checkReady = () => {
   *   const status = steam.networkingUtils.getRelayNetworkStatus();
   *   if (status.availability === ESteamNetworkingAvailability.Current) {
   *     console.log('Relay network ready!');
   *     return true;
   *   }
   *   console.log(`Status: ${status.availabilityName}`);
   *   return false;
   * };
   * ```
   */
  initRelayNetworkAccess(): void {
    const utils = this.getNetworkingUtilsInterface();
    if (!utils) return;
    
    try {
      this.libraryLoader.SteamAPI_ISteamNetworkingUtils_InitRelayNetworkAccess(utils);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to initialize relay network access:', error);
    }
  }

  /**
   * Gets the current status of the Steam Relay Network
   * 
   * Returns detailed information about the network status including overall
   * availability, whether ping measurements are in progress, and any debug
   * messages.
   * 
   * @returns Current relay network status information
   * 
   * @example
   * ```typescript
   * const status = steam.networkingUtils.getRelayNetworkStatus();
   * 
   * console.log(`Status: ${status.availabilityName}`);
   * console.log(`Ping measurement in progress: ${status.pingMeasurementInProgress}`);
   * console.log(`Network config: ${getAvailabilityName(status.networkConfigAvailability)}`);
   * console.log(`Relay available: ${getAvailabilityName(status.anyRelayAvailability)}`);
   * 
   * if (status.debugMessage) {
   *   console.log(`Debug: ${status.debugMessage}`);
   * }
   * ```
   */
  getRelayNetworkStatus(): RelayNetworkStatus {
    const defaultStatus: RelayNetworkStatus = {
      availability: ESteamNetworkingAvailability.Unknown,
      availabilityName: 'Unknown',
      pingMeasurementInProgress: false,
      networkConfigAvailability: ESteamNetworkingAvailability.Unknown,
      anyRelayAvailability: ESteamNetworkingAvailability.Unknown,
      debugMessage: '',
    };

    const utils = this.getNetworkingUtilsInterface();
    if (!utils) return defaultStatus;
    
    try {
      // Pass null to just get the availability enum
      const availability = this.libraryLoader.SteamAPI_ISteamNetworkingUtils_GetRelayNetworkStatus(utils, null) as number;
      
      return {
        availability,
        availabilityName: getAvailabilityName(availability),
        pingMeasurementInProgress: availability === ESteamNetworkingAvailability.Attempting,
        networkConfigAvailability: availability >= ESteamNetworkingAvailability.Attempting 
          ? ESteamNetworkingAvailability.Current 
          : availability,
        anyRelayAvailability: availability,
        debugMessage: '',
      };
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get relay network status:', error);
      return defaultStatus;
    }
  }

  // ========================================
  // Ping Location Methods
  // ========================================

  /**
   * Gets your local ping location data
   * 
   * Returns a ping location that represents your current network position
   * relative to Steam's data centers. This can be shared with other players
   * to estimate ping times without sending actual packets.
   * 
   * @returns PingLocation object with location string and data age, or null if not available
   * 
   * @remarks
   * - Requires `initRelayNetworkAccess()` to be called first
   * - Returns null if relay network is not ready yet
   * - The locationString should be shared with other players for ping estimation
   * - dataAge indicates how fresh the measurement is (lower is better)
   * 
   * @example
   * ```typescript
   * const location = steam.networkingUtils.getLocalPingLocation();
   * if (location) {
   *   console.log(`Ping location: ${location.locationString}`);
   *   console.log(`Data age: ${location.dataAge}s`);
   *   
   *   // Send locationString to other players via your matchmaking system
   *   sendToMatchmaking({ pingLocation: location.locationString });
   * } else {
   *   console.log('Ping location not available yet');
   * }
   * ```
   */
  getLocalPingLocation(): PingLocation | null {
    const utils = this.getNetworkingUtilsInterface();
    if (!utils) return null;
    
    try {
      // Allocate buffer for SteamNetworkPingLocation_t (512 bytes)
      const pingLocationBuffer = Buffer.alloc(PING_LOCATION_DATA_SIZE);
      
      // Get local ping location - returns age of data as float
      const dataAge = this.libraryLoader.SteamAPI_ISteamNetworkingUtils_GetLocalPingLocation(
        utils, 
        pingLocationBuffer
      ) as number;
      
      // If dataAge is negative, data is not available
      if (dataAge < 0) {
        return null;
      }
      
      // Convert the ping location to a string
      const stringBuffer = Buffer.alloc(MAX_PING_LOCATION_STRING_LENGTH);
      this.libraryLoader.SteamAPI_ISteamNetworkingUtils_ConvertPingLocationToString(
        utils,
        pingLocationBuffer,
        stringBuffer,
        MAX_PING_LOCATION_STRING_LENGTH
      );
      
      const locationString = stringBuffer.toString('utf8').replace(/\0+$/, '');
      
      return {
        locationString,
        dataAge,
      };
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get local ping location:', error);
      return null;
    }
  }

  /**
   * Estimates ping time between two ping location strings
   * 
   * Given two ping location strings (one from each player), estimates the
   * round-trip time in milliseconds. This doesn't send actual packets - it
   * uses Steam's cached network topology data.
   * 
   * @param location1 - First ping location string
   * @param location2 - Second ping location string
   * @returns PingEstimate with estimated ping time or error
   * 
   * @example
   * ```typescript
   * const myLocation = steam.networkingUtils.getLocalPingLocation();
   * const theirLocation = "received from other player...";
   * 
   * const estimate = steam.networkingUtils.estimatePingBetweenLocations(
   *   myLocation.locationString,
   *   theirLocation
   * );
   * 
   * if (estimate.valid) {
   *   console.log(`Estimated ping: ${estimate.pingMs}ms`);
   * } else {
   *   console.log(`Could not estimate: ${estimate.error}`);
   * }
   * ```
   */
  estimatePingBetweenLocations(location1: string, location2: string): PingEstimate {
    const utils = this.getNetworkingUtilsInterface();
    if (!utils) {
      return { pingMs: -1, valid: false, error: 'Networking utils not initialized' };
    }
    
    try {
      // Parse both location strings into ping location structs
      const pingLocation1 = Buffer.alloc(PING_LOCATION_DATA_SIZE);
      const pingLocation2 = Buffer.alloc(PING_LOCATION_DATA_SIZE);
      
      const parsed1 = this.libraryLoader.SteamAPI_ISteamNetworkingUtils_ParsePingLocationString(
        utils, location1, pingLocation1
      );
      
      if (!parsed1) {
        return { pingMs: -1, valid: false, error: 'Invalid first ping location string' };
      }
      
      const parsed2 = this.libraryLoader.SteamAPI_ISteamNetworkingUtils_ParsePingLocationString(
        utils, location2, pingLocation2
      );
      
      if (!parsed2) {
        return { pingMs: -1, valid: false, error: 'Invalid second ping location string' };
      }
      
      // Estimate ping between the two locations
      const pingMs = this.libraryLoader.SteamAPI_ISteamNetworkingUtils_EstimatePingTimeBetweenTwoLocations(
        utils, pingLocation1, pingLocation2
      ) as number;
      
      if (pingMs === PING_FAILED || pingMs === PING_UNKNOWN) {
        return { 
          pingMs, 
          valid: false, 
          error: pingMs === PING_FAILED ? 'Ping estimation failed' : 'Not enough data for estimation' 
        };
      }
      
      return { pingMs, valid: true };
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to estimate ping between locations:', error);
      return { pingMs: -1, valid: false, error: String(error) };
    }
  }

  /**
   * Estimates ping time from your local host to a remote location
   * 
   * Convenience method that estimates ping from your current location
   * to a remote player's location string.
   * 
   * @param remoteLocationString - The other player's ping location string
   * @returns PingEstimate with estimated ping time or error
   * 
   * @example
   * ```typescript
   * // When receiving another player's location from matchmaking:
   * const estimate = steam.networkingUtils.estimatePingFromString(otherPlayerLocation);
   * 
   * if (estimate.valid && estimate.pingMs < 100) {
   *   console.log('Good connection!');
   * } else if (estimate.valid) {
   *   console.log(`High ping: ${estimate.pingMs}ms`);
   * }
   * ```
   */
  estimatePingFromString(remoteLocationString: string): PingEstimate {
    const utils = this.getNetworkingUtilsInterface();
    if (!utils) {
      return { pingMs: -1, valid: false, error: 'Networking utils not initialized' };
    }
    
    try {
      // Parse the remote location string
      const remoteLocation = Buffer.alloc(PING_LOCATION_DATA_SIZE);
      const parsed = this.libraryLoader.SteamAPI_ISteamNetworkingUtils_ParsePingLocationString(
        utils, remoteLocationString, remoteLocation
      );
      
      if (!parsed) {
        return { pingMs: -1, valid: false, error: 'Invalid ping location string' };
      }
      
      // Estimate ping from local host to remote location
      const pingMs = this.libraryLoader.SteamAPI_ISteamNetworkingUtils_EstimatePingTimeFromLocalHost(
        utils, remoteLocation
      ) as number;
      
      if (pingMs === PING_FAILED || pingMs === PING_UNKNOWN) {
        return { 
          pingMs, 
          valid: false, 
          error: pingMs === PING_FAILED ? 'Ping estimation failed' : 'Not enough data for estimation' 
        };
      }
      
      return { pingMs, valid: true };
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to estimate ping from local host:', error);
      return { pingMs: -1, valid: false, error: String(error) };
    }
  }

  /**
   * Checks if ping data is up to date
   * 
   * Returns true if ping location data has been refreshed within the
   * specified age threshold.
   * 
   * @param maxAgeSeconds - Maximum acceptable age of data in seconds
   * @returns True if data is fresh enough, false otherwise
   * 
   * @example
   * ```typescript
   * if (!steam.networkingUtils.checkPingDataUpToDate(60)) {
   *   console.log('Ping data is stale, refreshing...');
   *   steam.networkingUtils.initRelayNetworkAccess();
   * }
   * ```
   */
  checkPingDataUpToDate(maxAgeSeconds: number): boolean {
    const utils = this.getNetworkingUtilsInterface();
    if (!utils) return false;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamNetworkingUtils_CheckPingDataUpToDate(utils, maxAgeSeconds);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to check ping data freshness:', error);
      return false;
    }
  }

  // ========================================
  // POP (Point of Presence) Methods
  // ========================================

  /**
   * Gets the number of Points of Presence (data centers) available
   * 
   * @returns Number of POPs, or 0 on failure
   * 
   * @example
   * ```typescript
   * const popCount = steam.networkingUtils.getPOPCount();
   * console.log(`${popCount} data centers available`);
   * ```
   */
  getPOPCount(): number {
    const utils = this.getNetworkingUtilsInterface();
    if (!utils) return 0;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamNetworkingUtils_GetPOPCount(utils);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get POP count:', error);
      return 0;
    }
  }

  /**
   * Gets a list of all POPs (data centers) with ping information
   * 
   * Returns detailed information about each data center including IDs,
   * codes, and ping times (both direct and via relay).
   * 
   * @returns Array of POPInfo objects, empty on failure
   * 
   * @example
   * ```typescript
   * const pops = steam.networkingUtils.getPOPList();
   * 
   * console.log('Steam Data Centers:');
   * for (const pop of pops) {
   *   console.log(`  ${pop.popCode}: direct=${pop.directPing}ms`);
   * }
   * 
   * // Find closest data center
   * const closest = pops
   *   .filter(p => p.directPing > 0)
   *   .sort((a, b) => a.directPing - b.directPing)[0];
   * if (closest) {
   *   console.log(`Closest: ${closest.popCode} (${closest.directPing}ms)`);
   * }
   * ```
   */
  getPOPList(): POPInfo[] {
    const utils = this.getNetworkingUtilsInterface();
    if (!utils) return [];
    
    try {
      const popCount = this.libraryLoader.SteamAPI_ISteamNetworkingUtils_GetPOPCount(utils);
      if (popCount <= 0) return [];
      
      // Allocate buffer for POP IDs (uint32 array)
      const popIdArray = new Uint32Array(popCount);
      
      const actualCount = this.libraryLoader.SteamAPI_ISteamNetworkingUtils_GetPOPList(
        utils, popIdArray, popCount
      );
      
      const popInfos: POPInfo[] = [];
      
      for (let i = 0; i < actualCount; i++) {
        const popId = popIdArray[i];
        
        // Get ping to this data center
        const viaRelayPopIdPtr = koffi.alloc('uint32', 1);
        const pingViaRelay = this.libraryLoader.SteamAPI_ISteamNetworkingUtils_GetPingToDataCenter(
          utils, popId, viaRelayPopIdPtr
        ) as number;
        
        const viaRelayPOP = koffi.decode(viaRelayPopIdPtr, 'uint32') as number;
        
        // Get direct ping to this POP
        const directPing = this.libraryLoader.SteamAPI_ISteamNetworkingUtils_GetDirectPingToPOP(
          utils, popId
        ) as number;
        
        popInfos.push({
          popId,
          popCode: popIdToString(popId),
          pingViaRelay: pingViaRelay >= 0 ? pingViaRelay : -1,
          viaRelayPOP: viaRelayPOP,
          viaRelayPOPCode: popIdToString(viaRelayPOP),
          directPing: directPing >= 0 ? directPing : -1,
        });
      }
      
      return popInfos;
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get POP list:', error);
      return [];
    }
  }

  /**
   * Gets ping time to a specific data center via the relay network
   * 
   * @param popId - The POP ID (use `stringToPopId()` to convert from string)
   * @returns Object with pingMs and viaRelayPOP, or null on failure
   * 
   * @example
   * ```typescript
   * import { stringToPopId } from 'steamworks-sdk';
   * 
   * const iadPopId = stringToPopId('iad'); // Ashburn, VA
   * const ping = steam.networkingUtils.getPingToDataCenter(iadPopId);
   * 
   * if (ping) {
   *   console.log(`Ping to IAD: ${ping.pingMs}ms`);
   *   console.log(`Via relay: ${popIdToString(ping.viaRelayPOP)}`);
   * }
   * ```
   */
  getPingToDataCenter(popId: number): { pingMs: number; viaRelayPOP: number } | null {
    const utils = this.getNetworkingUtilsInterface();
    if (!utils) return null;
    
    try {
      const viaRelayPopIdPtr = koffi.alloc('uint32', 1);
      const pingMs = this.libraryLoader.SteamAPI_ISteamNetworkingUtils_GetPingToDataCenter(
        utils, popId, viaRelayPopIdPtr
      ) as number;
      
      if (pingMs < 0) return null;
      
      const viaRelayPOP = koffi.decode(viaRelayPopIdPtr, 'uint32') as number;
      return { pingMs, viaRelayPOP };
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get ping to data center:', error);
      return null;
    }
  }

  /**
   * Gets direct ping time to a specific POP (without relay routing)
   * 
   * @param popId - The POP ID
   * @returns Direct ping in milliseconds, or -1 if not available
   * 
   * @example
   * ```typescript
   * const directPing = steam.networkingUtils.getDirectPingToPOP(popId);
   * if (directPing >= 0) {
   *   console.log(`Direct ping: ${directPing}ms`);
   * }
   * ```
   */
  getDirectPingToPOP(popId: number): number {
    const utils = this.getNetworkingUtilsInterface();
    if (!utils) return -1;
    
    try {
      return this.libraryLoader.SteamAPI_ISteamNetworkingUtils_GetDirectPingToPOP(utils, popId);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get direct ping to POP:', error);
      return -1;
    }
  }

  // ========================================
  // Time Methods
  // ========================================

  /**
   * Gets a high-precision local timestamp
   * 
   * Returns a timestamp in microseconds from an arbitrary reference point.
   * Useful for measuring time intervals with high precision. The reference
   * point may vary between sessions but is consistent within a session.
   * 
   * @returns Timestamp in microseconds as BigInt, or 0n on failure
   * 
   * @example
   * ```typescript
   * const start = steam.networkingUtils.getLocalTimestamp();
   * // ... do some work ...
   * const end = steam.networkingUtils.getLocalTimestamp();
   * 
   * const elapsedMicroseconds = end - start;
   * const elapsedMs = Number(elapsedMicroseconds) / 1000;
   * console.log(`Elapsed: ${elapsedMs}ms`);
   * ```
   */
  getLocalTimestamp(): bigint {
    const utils = this.getNetworkingUtilsInterface();
    if (!utils) return 0n;
    
    try {
      // Returns int64 (SteamNetworkingMicroseconds)
      const timestamp = this.libraryLoader.SteamAPI_ISteamNetworkingUtils_GetLocalTimestamp(utils);
      return BigInt(timestamp);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to get local timestamp:', error);
      return 0n;
    }
  }

  // ========================================
  // Debug Methods
  // ========================================

  /**
   * Sets the debug output level for networking
   * 
   * Controls the verbosity of debug output from the networking system.
   * Higher levels produce more output.
   * 
   * @param level - Debug output level (from ESteamNetworkingSocketsDebugOutputType)
   * 
   * @remarks
   * The callback function cannot be easily passed through FFI in this implementation,
   * so this primarily affects internal Steam logging behavior.
   * 
   * @example
   * ```typescript
   * // Enable verbose output for debugging
   * steam.networkingUtils.setDebugOutputLevel(ESteamNetworkingSocketsDebugOutputType.Verbose);
   * 
   * // Disable after debugging
   * steam.networkingUtils.setDebugOutputLevel(ESteamNetworkingSocketsDebugOutputType.None);
   * ```
   */
  setDebugOutputLevel(level: ESteamNetworkingSocketsDebugOutputType): void {
    const utils = this.getNetworkingUtilsInterface();
    if (!utils) return;
    
    try {
      // Pass null for callback since we can't easily handle function pointers in this setup
      this.libraryLoader.SteamAPI_ISteamNetworkingUtils_SetDebugOutputFunction(utils, level, null);
    } catch (error) {
      SteamLogger.error('[Steamworks] Failed to set debug output level:', error);
    }
  }
}
