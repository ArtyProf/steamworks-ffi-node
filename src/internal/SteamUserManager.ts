import * as koffi from 'koffi';
import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import { SteamCallbackPoller } from './SteamCallbackPoller';
import {
  K_I_GET_AUTH_SESSION_TICKET_RESPONSE,
  K_I_GET_TICKET_FOR_WEB_API_RESPONSE,
  K_I_ENCRYPTED_APP_TICKET_RESPONSE,
  K_I_MARKET_ELIGIBILITY_RESPONSE,
  K_I_DURATION_CONTROL,
  K_I_STORE_AUTH_URL_RESPONSE,
  GetAuthSessionTicketResponseType,
  GetTicketForWebApiResponseType,
  EncryptedAppTicketResponseType,
  MarketEligibilityResponseType,
  DurationControlType,
  StoreAuthURLResponseType,
} from './callbackTypes';
import {
  HAuthTicket,
  k_HAuthTicketInvalid,
  EBeginAuthSessionResult,
  EAuthSessionResponse,
  EUserHasLicenseForAppResult,
  EDurationControlOnlineState,
  EVoiceResult,
  ESteamNetworkingIdentityType,
  SteamNetworkingIdentityOptions,
  GetAuthSessionTicketResult,
  GetAuthTicketForWebApiResult,
  BeginAuthSessionResult,
  RequestEncryptedAppTicketResult,
  GetEncryptedAppTicketResult,
  UserSecurityInfo,
  MarketEligibilityResult,
  DurationControlResult,
  GetAvailableVoiceResult,
  GetVoiceResult,
  DecompressVoiceResult,
  StoreAuthURLResult,
} from '../types/user';

// Define Koffi struct types for callbacks
const GetAuthSessionTicketResponse_t = koffi.struct('GetAuthSessionTicketResponse_t', {
  m_hAuthTicket: 'uint32',
  m_eResult: 'int32',
});

const GetTicketForWebApiResponse_t = koffi.struct('GetTicketForWebApiResponse_t', {
  m_hAuthTicket: 'uint32',
  m_eResult: 'int32',
  m_cubTicket: 'int32',
  m_rgubTicket: koffi.array('uint8', 2560),
});

const EncryptedAppTicketResponse_t = koffi.struct('EncryptedAppTicketResponse_t', {
  m_eResult: 'int32',
});

const MarketEligibilityResponse_t = koffi.struct('MarketEligibilityResponse_t', {
  m_bAllowed: 'bool',
  m_eNotAllowedReason: 'int32',
  m_rtAllowedAtTime: 'uint32',
  m_cdaySteamGuardRequiredDays: 'int32',
  m_cdayNewDeviceCooldown: 'int32',
});

const StoreAuthURLResponse_t = koffi.struct('StoreAuthURLResponse_t', {
  m_szURL: koffi.array('char', 512),
});

const DurationControl_t = koffi.struct('DurationControl_t', {
  m_eResult: 'int32',
  m_appid: 'uint32',
  m_bApplicable: 'bool',
  m_csecsLast5h: 'int32',
  m_progress: 'int32',
  m_notification: 'int32',
  m_csecsToday: 'int32',
  m_csecsRemaining: 'int32',
});

/**
 * SteamUserManager
 * 
 * Provides access to Steam user information and authentication features.
 * Wraps the ISteamUser interface from the Steamworks SDK.
 * 
 * ## Features
 * 
 * - **Session Tickets**: Generate auth tickets for P2P/game server authentication
 * - **Web API Tickets**: Generate tickets for authenticating with web services
 * - **Auth Sessions**: Validate incoming auth tickets from other players
 * - **Encrypted Tickets**: Request/retrieve encrypted app tickets for secure verification
 * - **License Verification**: Check if users own specific apps/DLC
 * - **Security Info**: Query user security settings (2FA, phone verification)
 * - **Duration Control**: Support for anti-indulgence/playtime limits (China compliance)
 * - **Voice Recording**: Record and transmit voice chat audio
 * 
 * ## Key Concepts
 * 
 * - **Auth Ticket**: A signed blob proving user identity, used for game servers
 * - **Web API Ticket**: Ticket format optimized for Steam Web API authentication
 * - **Auth Session**: Server-side tracking of authenticated clients
 * - **Encrypted App Ticket**: Cryptographically signed ticket for backend verification
 * 
 * @example
 * ```typescript
 * // Get a session ticket for P2P authentication
 * const ticket = steam.user.getAuthSessionTicket();
 * if (ticket.success) {
 *   // Send ticket.ticketData to the game server
 *   sendToServer(ticket.ticketData);
 * }
 * 
 * // Get a ticket for web API authentication
 * const webTicket = await steam.user.getAuthTicketForWebApi('my-service');
 * if (webTicket.success) {
 *   // Use webTicket.ticketHex in HTTP headers
 *   fetch('/api/validate', {
 *     headers: { 'X-Steam-Ticket': webTicket.ticketHex }
 *   });
 * }
 * 
 * // Validate an incoming ticket on server
 * const validation = steam.user.beginAuthSession(ticketData, steamId);
 * if (validation.success) {
 *   console.log('Client authenticated!');
 * }
 * ```
 * 
 * @see {@link https://partner.steamgames.com/doc/api/ISteamUser}
 */
export class SteamUserManager {
  private libraryLoader: SteamLibraryLoader;
  private apiCore: SteamAPICore;
  private callbackPoller: SteamCallbackPoller;
  
  // Track active auth tickets for cleanup
  private activeTickets: Map<HAuthTicket, boolean> = new Map();

  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
    this.callbackPoller = new SteamCallbackPoller(libraryLoader, apiCore);
  }

  // ========================================
  // Helper Functions
  // ========================================

  /**
   * Create a SteamNetworkingIdentity buffer (136 bytes)
   * 
   * @param options - Identity options (steamId, ipAddress, or genericString)
   * @returns Buffer containing the SteamNetworkingIdentity struct, or null for no restriction
   */
  private createNetworkingIdentity(options?: SteamNetworkingIdentityOptions): Buffer | null {
    if (!options) {
      return null;
    }

    // SteamNetworkingIdentity structure (136 bytes):
    // offset 0: m_eType (ESteamNetworkingIdentityType, 4 bytes)
    // offset 4: m_cbSize (int32, 4 bytes)
    // offset 8: union of identity data (128 bytes)
    //   - m_steamID64 (uint64 at offset 8)
    //   - m_ip (IPv6 format, 16 bytes at offset 8)
    //   - m_szGenericString (char[128] at offset 8)
    //   - m_genericBytes (uint8[128] at offset 8)

    const identityBuffer = Buffer.alloc(136);

    if (options.steamId) {
      // Type: SteamID
      identityBuffer.writeInt32LE(ESteamNetworkingIdentityType.SteamID, 0);
      identityBuffer.writeInt32LE(8, 4); // Size of uint64
      identityBuffer.writeBigUInt64LE(BigInt(options.steamId), 8);
    } else if (options.ipAddress) {
      // Type: IPAddress (IPv4 mapped to IPv6 format)
      identityBuffer.writeInt32LE(ESteamNetworkingIdentityType.IPAddress, 0);
      identityBuffer.writeInt32LE(16, 4); // Size of IPv6 address

      // Parse IPv4 address and map to IPv6 format (::ffff:192.168.1.1)
      const parts = options.ipAddress.split('.').map(Number);
      if (parts.length === 4 && parts.every(p => p >= 0 && p <= 255)) {
        // IPv4-mapped IPv6: first 10 bytes are 0, next 2 bytes are 0xFF, last 4 bytes are IPv4
        identityBuffer.fill(0, 8, 18); // Clear first 10 bytes
        identityBuffer.writeUInt8(0xFF, 18); // Byte 10 = 0xFF
        identityBuffer.writeUInt8(0xFF, 19); // Byte 11 = 0xFF
        identityBuffer.writeUInt8(parts[0], 20); // Byte 12 = first octet
        identityBuffer.writeUInt8(parts[1], 21); // Byte 13 = second octet
        identityBuffer.writeUInt8(parts[2], 22); // Byte 14 = third octet
        identityBuffer.writeUInt8(parts[3], 23); // Byte 15 = fourth octet
      }
    } else if (options.genericString) {
      // Type: GenericString
      identityBuffer.writeInt32LE(ESteamNetworkingIdentityType.GenericString, 0);
      const strLen = Math.min(options.genericString.length, 127); // Max 127 chars + null terminator
      identityBuffer.writeInt32LE(strLen + 1, 4);
      identityBuffer.write(options.genericString, 8, strLen, 'utf8');
      identityBuffer.writeUInt8(0, 8 + strLen); // Null terminator
    } else {
      // Invalid - return null for no restriction
      return null;
    }

    return identityBuffer;
  }

  // ========================================
  // Login State
  // ========================================

  /**
   * Check if the user is logged into Steam
   * 
   * Returns true if the Steam client is running and the user is logged in
   * with a valid connection to the Steam servers.
   * 
   * @returns true if logged in, false otherwise
   * 
   * @example
   * ```typescript
   * if (steam.user.isLoggedOn()) {
   *   console.log('User is logged into Steam');
   * } else {
   *   console.log('User is offline or not logged in');
   * }
   * ```
   */
  isLoggedOn(): boolean {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return false;
      }
      return this.libraryLoader.SteamAPI_ISteamUser_BLoggedOn(userInterface);
    } catch (error) {
      console.error('[SteamAuthManager] Error checking login status:', error);
      return false;
    }
  }

  // ========================================
  // Session Tickets (P2P / Game Server Auth)
  // ========================================

  /**
   * Get an auth session ticket for P2P or game server authentication
   * 
   * Creates a ticket that can be sent to another player or a game server
   * for authentication. The receiving party should call beginAuthSession()
   * to validate the ticket.
   * 
   * @param identity - Optional: restrict ticket to specific recipient (Steam ID, IP, or string)
   * @returns Result containing the ticket data and handle
   * 
   * @example
   * ```typescript
   * // Get an unrestricted ticket (works with any recipient)
   * const result = steam.user.getAuthSessionTicket();
   * 
   * // Restrict ticket to a specific Steam ID
   * const result = steam.user.getAuthSessionTicket({
   *   steamId: '76561198001234567'
   * });
   * 
   * // Restrict ticket to a specific IP address
   * const result = steam.user.getAuthSessionTicket({
   *   ipAddress: '192.168.1.100'
   * });
   * 
   * // Restrict ticket to a service identifier
   * const result = steam.user.getAuthSessionTicket({
   *   genericString: 'my-dedicated-server'
   * });
   * 
   * if (result.success) {
   *   console.log(`Got ticket handle: ${result.authTicket}`);
   *   console.log(`Ticket size: ${result.ticketSize} bytes`);
   *   
   *   // Send to server for validation
   *   sendToServer({
   *     ticket: result.ticketData,
   *     steamId: steam.getSteamId()
   *   });
   * }
   * ```
   * 
   * @remarks
   * - Call cancelAuthTicket() when done with the ticket
   * - Ticket is valid until cancelled or user logs off
   * - Maximum ticket size is 8192 bytes
   * - If identity is omitted, creates an unrestricted ticket (usable by any recipient)
   * - Identity restriction adds an extra security layer for high-security scenarios
   * 
   * @see cancelAuthTicket
   * @see beginAuthSession
   */
  getAuthSessionTicket(identity?: SteamNetworkingIdentityOptions): GetAuthSessionTicketResult {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return {
          success: false,
          authTicket: k_HAuthTicketInvalid,
          ticketData: Buffer.alloc(0),
          ticketSize: 0,
          error: 'User interface not available',
        };
      }

      const maxTicketSize = 8192;
      const ticketBuffer = Buffer.alloc(maxTicketSize);
      const ticketSizeBuffer = Buffer.alloc(4);

      // Create identity buffer if provided, otherwise null for unrestricted
      const identityBuffer = this.createNetworkingIdentity(identity);

      const authTicket = this.libraryLoader.SteamAPI_ISteamUser_GetAuthSessionTicket(
        userInterface,
        ticketBuffer,
        maxTicketSize,
        ticketSizeBuffer,
        identityBuffer // SteamNetworkingIdentity - null means no restriction
      );

      if (authTicket === k_HAuthTicketInvalid) {
        return {
          success: false,
          authTicket: k_HAuthTicketInvalid,
          ticketData: Buffer.alloc(0),
          ticketSize: 0,
          error: 'Failed to get auth session ticket',
        };
      }

      const actualSize = ticketSizeBuffer.readUInt32LE(0);
      const ticketData = Buffer.from(ticketBuffer.subarray(0, actualSize));
      
      // Track the ticket for potential cleanup
      this.activeTickets.set(authTicket, true);

      return {
        success: true,
        authTicket,
        ticketData,
        ticketSize: actualSize,
      };
    } catch (error) {
      console.error('[SteamAuthManager] Error getting auth session ticket:', error);
      return {
        success: false,
        authTicket: k_HAuthTicketInvalid,
        ticketData: Buffer.alloc(0),
        ticketSize: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get an auth ticket for Steam Web API authentication
   * 
   * Creates a ticket that can be used with Steam Web API authentication.
   * The ticket can be validated using ISteamUserAuth/AuthenticateUserTicket.
   * 
   * @param identity - Optional: restrict ticket to specific recipient (Steam ID, IP, or string)
   * @returns Promise resolving to result with ticket data and hex string
   * 
   * @example
   * ```typescript
   * // Get an unrestricted web API ticket
   * const result = await steam.user.getAuthTicketForWebApi();
   * 
   * // Restrict ticket to a specific Steam ID
   * const result = await steam.user.getAuthTicketForWebApi({
   *   steamId: '76561198001234567'
   * });
   * 
   * // Restrict ticket to a specific IP address
   * const result = await steam.user.getAuthTicketForWebApi({
   *   ipAddress: '192.168.1.100'
   * });
   * 
   * // Restrict ticket to a service identifier
   * const result = await steam.user.getAuthTicketForWebApi({
   *   genericString: 'my-web-service'
   * });
   * 
   * if (result.success) {
   *   // Use hex string for API authentication
   *   const response = await fetch('https://api.example.com/auth', {
   *     method: 'POST',
   *     headers: {
   *       'Content-Type': 'application/json',
   *       'X-Steam-Auth-Ticket': result.ticketHex
   *     },
   *     body: JSON.stringify({ steamId: steam.getSteamId() })
   *   });
   * }
   * ```
   * 
   * @remarks
   * **Implementation Note:** This method uses `getAuthSessionTicket()` internally
   * because the native `GetAuthTicketForWebApi` requires callback registration
   * which is not supported in FFI without native addons.
   * 
   * **Compatibility:** The returned ticket works with Steam's web API validation
   * endpoint (ISteamUserAuth/AuthenticateUserTicket) and provides the same
   * user identity verification.
   * 
   * **Identity Restrictions:** Supports optional identity restrictions (Steam ID,
   * IP address, or generic string) to limit ticket usage to specific recipients.
   * 
   * For most web authentication use cases, this works identically to the native
   * GetAuthTicketForWebApi function.
   * 
   * @see cancelAuthTicket
   * @see getAuthSessionTicket
   */
  async getAuthTicketForWebApi(identity?: SteamNetworkingIdentityOptions): Promise<GetAuthTicketForWebApiResult> {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return {
          success: false,
          authTicket: k_HAuthTicketInvalid,
          ticketData: Buffer.alloc(0),
          ticketSize: 0,
          ticketHex: '',
          error: 'User interface not available',
        };
      }

      // Note: GetAuthTicketForWebApi returns data via callback (GetTicketForWebApiResponse_t)
      // which requires native callback registration. As a workaround, we use GetAuthSessionTicket
      // which returns data synchronously and can be used for web API authentication.
      // The ticket format is compatible - web APIs expect the hex-encoded ticket data.
      
      const sessionTicket = this.getAuthSessionTicket(identity);
      
      if (!sessionTicket.success) {
        return {
          success: false,
          authTicket: k_HAuthTicketInvalid,
          ticketData: Buffer.alloc(0),
          ticketSize: 0,
          ticketHex: '',
          error: sessionTicket.error || 'Failed to get auth ticket',
        };
      }

      // Convert ticket to hex format for web API usage
      const ticketHex = sessionTicket.ticketData.toString('hex').toUpperCase();

      return {
        success: true,
        authTicket: sessionTicket.authTicket,
        ticketData: sessionTicket.ticketData,
        ticketSize: sessionTicket.ticketSize,
        ticketHex,
      };
    } catch (error) {
      console.error('[SteamUserManager] Error getting web API ticket:', error);
      return {
        success: false,
        authTicket: k_HAuthTicketInvalid,
        ticketData: Buffer.alloc(0),
        ticketSize: 0,
        ticketHex: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel an auth ticket previously obtained
   * 
   * Should be called when you no longer need the auth ticket,
   * such as when disconnecting from a game server.
   * 
   * @param authTicket - The ticket handle to cancel
   * 
   * @example
   * ```typescript
   * // Get a ticket
   * const ticket = steam.user.getAuthSessionTicket();
   * 
   * // ... use the ticket ...
   * 
   * // Clean up when done
   * steam.user.cancelAuthTicket(ticket.authTicket);
   * ```
   */
  cancelAuthTicket(authTicket: HAuthTicket): void {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface || authTicket === k_HAuthTicketInvalid) {
        return;
      }

      this.libraryLoader.SteamAPI_ISteamUser_CancelAuthTicket(userInterface, authTicket);
      this.activeTickets.delete(authTicket);
    } catch (error) {
      console.error('[SteamAuthManager] Error canceling auth ticket:', error);
    }
  }

  // ========================================
  // Auth Session Validation (Server-Side)
  // ========================================

  /**
   * Begin validating an auth session ticket
   * 
   * Call this on a game server or host to validate an auth ticket
   * received from another player. Steam will verify the ticket and
   * the player's ownership of the game.
   * 
   * @param ticketData - The raw ticket data received from the client
   * @param steamId - The Steam ID of the user who sent the ticket
   * @returns Result of the initial validation
   * 
   * @example
   * ```typescript
   * // Server receives ticket from client
   * function onClientConnect(ticketData: Buffer, clientSteamId: string) {
   *   const result = steam.user.beginAuthSession(ticketData, clientSteamId);
   *   
   *   if (result.success) {
   *     console.log(`Auth session started for ${clientSteamId}`);
   *     // Note: You should also listen for ValidateAuthTicketResponse callbacks
   *     // to handle cases where the ticket becomes invalid later
   *   } else {
   *     console.log(`Auth failed: ${result.error}`);
   *     disconnectClient(clientSteamId, result.result);
   *   }
   * }
   * ```
   * 
   * @remarks
   * - Must call endAuthSession() when the player disconnects
   * - Watch for ValidateAuthTicketResponse callbacks for async failures
   * - Only one auth session per Steam ID at a time
   * 
   * @see endAuthSession
   */
  beginAuthSession(ticketData: Buffer, steamId: string): BeginAuthSessionResult {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return {
          success: false,
          result: EBeginAuthSessionResult.InvalidTicket,
          error: 'User interface not available',
        };
      }

      const steamIdBigInt = BigInt(steamId);
      const result = this.libraryLoader.SteamAPI_ISteamUser_BeginAuthSession(
        userInterface,
        ticketData,
        ticketData.length,
        steamIdBigInt
      ) as EBeginAuthSessionResult;

      if (result === EBeginAuthSessionResult.OK) {
        return {
          success: true,
          result,
        };
      }

      // Map result codes to error messages
      const errorMessages: Record<EBeginAuthSessionResult, string> = {
        [EBeginAuthSessionResult.OK]: 'OK',
        [EBeginAuthSessionResult.InvalidTicket]: 'Ticket is not valid',
        [EBeginAuthSessionResult.DuplicateRequest]: 'A ticket has already been submitted for this Steam ID',
        [EBeginAuthSessionResult.InvalidVersion]: 'Ticket is from an incompatible interface version',
        [EBeginAuthSessionResult.GameMismatch]: 'Ticket is not for this game',
        [EBeginAuthSessionResult.ExpiredTicket]: 'Ticket has expired',
      };

      return {
        success: false,
        result,
        error: errorMessages[result] || `Unknown error: ${result}`,
      };
    } catch (error) {
      console.error('[SteamAuthManager] Error beginning auth session:', error);
      return {
        success: false,
        result: EBeginAuthSessionResult.InvalidTicket,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * End an auth session previously started with beginAuthSession()
   * 
   * Must be called when you no longer need to track the authentication
   * for a player, typically when they disconnect.
   * 
   * @param steamId - The Steam ID of the user whose session to end
   * 
   * @example
   * ```typescript
   * function onClientDisconnect(clientSteamId: string) {
   *   steam.user.endAuthSession(clientSteamId);
   *   console.log(`Ended auth session for ${clientSteamId}`);
   * }
   * ```
   */
  endAuthSession(steamId: string): void {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return;
      }

      const steamIdBigInt = BigInt(steamId);
      this.libraryLoader.SteamAPI_ISteamUser_EndAuthSession(userInterface, steamIdBigInt);
    } catch (error) {
      console.error('[SteamAuthManager] Error ending auth session:', error);
    }
  }

  // ========================================
  // License Verification
  // ========================================

  /**
   * Check if a user has a license for a specific app
   * 
   * After starting an auth session with beginAuthSession(), you can use this
   * to verify the user owns specific apps or DLC.
   * 
   * @param steamId - The Steam ID of the user to check
   * @param appId - The App ID to check ownership for
   * @returns The license check result
   * 
   * @example
   * ```typescript
   * // Check if user owns a DLC
   * const dlcResult = steam.user.userHasLicenseForApp(clientSteamId, 12345);
   * 
   * if (dlcResult === EUserHasLicenseForAppResult.HasLicense) {
   *   console.log('User owns the DLC');
   *   grantDLCContent(clientSteamId);
   * } else if (dlcResult === EUserHasLicenseForAppResult.DoesNotHaveLicense) {
   *   console.log('User does not own the DLC');
   * } else {
   *   console.log('User not authenticated');
   * }
   * ```
   * 
   * @remarks
   * - Must have an active auth session for the user (via beginAuthSession)
   * - Returns NoAuth if no auth session exists
   */
  userHasLicenseForApp(steamId: string, appId: number): EUserHasLicenseForAppResult {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return EUserHasLicenseForAppResult.NoAuth;
      }

      const steamIdBigInt = BigInt(steamId);
      return this.libraryLoader.SteamAPI_ISteamUser_UserHasLicenseForApp(
        userInterface,
        steamIdBigInt,
        appId
      ) as EUserHasLicenseForAppResult;
    } catch (error) {
      console.error('[SteamAuthManager] Error checking license:', error);
      return EUserHasLicenseForAppResult.NoAuth;
    }
  }

  // ========================================
  // Encrypted App Tickets
  // ========================================

  /**
   * Request an encrypted app ticket from Steam
   * 
   * Encrypted app tickets contain verified user data that can be
   * decrypted by your backend server using your app's secret key.
   * This is useful for secure backend authentication.
   * 
   * @param dataToInclude - Optional data to include in the ticket (max 128 bytes)
   * @returns Promise resolving to the request result
   * 
   * @example
   * ```typescript
   * // Request an encrypted ticket
   * const result = await steam.user.requestEncryptedAppTicket();
   * if (result.success) {
   *   // Now retrieve the ticket
   *   const ticket = steam.user.getEncryptedAppTicket();
   *   if (ticket.success) {
   *     // Send to your backend for verification
   *     sendToBackend(ticket.ticketData);
   *   }
   * }
   * ```
   * 
   * @remarks
   * - This is an async operation, wait for completion before calling getEncryptedAppTicket
   * - Maximum dataToInclude size is 128 bytes
   * - Ticket can be decrypted using the SteamEncryptedAppTicket library
   * 
   * @see getEncryptedAppTicket
   */
  async requestEncryptedAppTicket(dataToInclude?: Buffer): Promise<RequestEncryptedAppTicketResult> {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return {
          success: false,
          error: 'User interface not available',
        };
      }

      const data = dataToInclude || Buffer.alloc(0);
      const callHandle = this.libraryLoader.SteamAPI_ISteamUser_RequestEncryptedAppTicket(
        userInterface,
        data,
        data.length
      );

      if (!callHandle || callHandle === 0n) {
        return {
          success: false,
          error: 'Failed to request encrypted app ticket',
        };
      }

      // Poll for the callback result
      const result = await this.callbackPoller.poll<EncryptedAppTicketResponseType>(
        callHandle,
        EncryptedAppTicketResponse_t,
        K_I_ENCRYPTED_APP_TICKET_RESPONSE,
        100, // maxRetries
        100  // delayMs
      );

      if (!result || result.m_eResult !== 1) { // k_EResultOK = 1
        return {
          success: false,
          error: `Failed to get encrypted app ticket: result ${result?.m_eResult}`,
        };
      }

      return { success: true };
    } catch (error) {
      console.error('[SteamAuthManager] Error requesting encrypted app ticket:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the encrypted app ticket after requesting it
   * 
   * Call this after requestEncryptedAppTicket() has completed successfully.
   * 
   * @returns Result containing the encrypted ticket data
   * 
   * @example
   * ```typescript
   * const result = steam.user.getEncryptedAppTicket();
   * if (result.success) {
   *   console.log(`Got encrypted ticket (${result.ticketSize} bytes)`);
   *   // Send ticketHex to your backend
   *   authenticateWithBackend(result.ticketHex);
   * }
   * ```
   * 
   * @see requestEncryptedAppTicket
   */
  getEncryptedAppTicket(): GetEncryptedAppTicketResult {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return {
          success: false,
          ticketData: Buffer.alloc(0),
          ticketSize: 0,
          ticketHex: '',
          error: 'User interface not available',
        };
      }

      const maxTicketSize = 1024;
      const ticketBuffer = Buffer.alloc(maxTicketSize);
      const ticketSizeBuffer = Buffer.alloc(4);

      const success = this.libraryLoader.SteamAPI_ISteamUser_GetEncryptedAppTicket(
        userInterface,
        ticketBuffer,
        maxTicketSize,
        ticketSizeBuffer
      );

      if (!success) {
        return {
          success: false,
          ticketData: Buffer.alloc(0),
          ticketSize: 0,
          ticketHex: '',
          error: 'No encrypted app ticket available',
        };
      }

      const actualSize = ticketSizeBuffer.readUInt32LE(0);
      const ticketData = Buffer.from(ticketBuffer.subarray(0, actualSize));
      const ticketHex = ticketData.toString('hex').toUpperCase();

      return {
        success: true,
        ticketData,
        ticketSize: actualSize,
        ticketHex,
      };
    } catch (error) {
      console.error('[SteamAuthManager] Error getting encrypted app ticket:', error);
      return {
        success: false,
        ticketData: Buffer.alloc(0),
        ticketSize: 0,
        ticketHex: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ========================================
  // Security and Account Info
  // ========================================

  /**
   * Get the user's security settings
   * 
   * Returns information about the user's account security status.
   * 
   * @returns Object containing security settings
   * 
   * @example
   * ```typescript
   * const security = steam.user.getUserSecurityInfo();
   * 
   * if (security.twoFactorEnabled) {
   *   console.log('User has 2FA enabled');
   * }
   * 
   * if (security.phoneVerified) {
   *   console.log('Phone number is verified');
   * }
   * ```
   */
  getUserSecurityInfo(): UserSecurityInfo {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return {
          phoneVerified: false,
          twoFactorEnabled: false,
          phoneIdentifying: false,
          phoneRequiringVerification: false,
        };
      }

      return {
        phoneVerified: this.libraryLoader.SteamAPI_ISteamUser_BIsPhoneVerified(userInterface),
        twoFactorEnabled: this.libraryLoader.SteamAPI_ISteamUser_BIsTwoFactorEnabled(userInterface),
        phoneIdentifying: this.libraryLoader.SteamAPI_ISteamUser_BIsPhoneIdentifying(userInterface),
        phoneRequiringVerification: this.libraryLoader.SteamAPI_ISteamUser_BIsPhoneRequiringVerification(userInterface),
      };
    } catch (error) {
      console.error('[SteamAuthManager] Error getting security info:', error);
      return {
        phoneVerified: false,
        twoFactorEnabled: false,
        phoneIdentifying: false,
        phoneRequiringVerification: false,
      };
    }
  }

  /**
   * Check if the user appears to be behind a NAT
   * 
   * @returns true if the user is behind NAT, false otherwise
   * 
   * @remarks
   * - Only valid after SteamServersConnected callback
   * - May not detect all NAT configurations
   */
  isBehindNAT(): boolean {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return false;
      }
      return this.libraryLoader.SteamAPI_ISteamUser_BIsBehindNAT(userInterface);
    } catch (error) {
      console.error('[SteamAuthManager] Error checking NAT status:', error);
      return false;
    }
  }

  // ========================================
  // User Info
  // ========================================

  /**
   * Get the user's Steam level
   * 
   * @returns The user's Steam level, or 0 if not available
   */
  getPlayerSteamLevel(): number {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return 0;
      }
      return this.libraryLoader.SteamAPI_ISteamUser_GetPlayerSteamLevel(userInterface);
    } catch (error) {
      console.error('[SteamAuthManager] Error getting Steam level:', error);
      return 0;
    }
  }

  /**
   * Get the user's game badge level
   * 
   * @param series - The badge series (usually 1 for games with one badge set)
   * @param foil - Whether to get the foil badge (true) or regular badge (false)
   * @returns The badge level, or 0 if none
   * 
   * @example
   * ```typescript
   * // Get regular badge level
   * const regularLevel = steam.user.getGameBadgeLevel(1, false);
   * console.log(`Regular badge level: ${regularLevel}`);
   * 
   * // Get foil badge level
   * const foilLevel = steam.user.getGameBadgeLevel(1, true);
   * console.log(`Foil badge level: ${foilLevel}`);
   * ```
   */
  getGameBadgeLevel(series: number = 1, foil: boolean = false): number {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return 0;
      }
      return this.libraryLoader.SteamAPI_ISteamUser_GetGameBadgeLevel(userInterface, series, foil);
    } catch (error) {
      console.error('[SteamAuthManager] Error getting game badge level:', error);
      return 0;
    }
  }

  /**
   * Get the path to the local user data folder
   * 
   * This folder can be used to store application data that should be
   * specific to the current Steam account.
   * 
   * @returns The path to the user data folder, or null if not available
   * 
   * @example
   * ```typescript
   * const folder = steam.user.getUserDataFolder();
   * if (folder) {
   *   console.log(`User data folder: ${folder}`);
   *   // Typically something like: C:\Program Files\Steam\userdata\<steamid>\<appid>\local
   * }
   * ```
   */
  getUserDataFolder(): string | null {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return null;
      }

      const bufferSize = 512;
      const buffer = Buffer.alloc(bufferSize);
      const success = this.libraryLoader.SteamAPI_ISteamUser_GetUserDataFolder(
        userInterface,
        buffer,
        bufferSize
      );

      if (!success) {
        return null;
      }

      // Find null terminator
      let endIndex = buffer.indexOf(0);
      if (endIndex === -1) endIndex = bufferSize;
      return buffer.toString('utf8', 0, endIndex);
    } catch (error) {
      console.error('[SteamAuthManager] Error getting user data folder:', error);
      return null;
    }
  }

  // ========================================
  // Market Eligibility
  // ========================================

  /**
   * Get the user's Steam Community Market eligibility
   * 
   * @returns Promise resolving to market eligibility result
   * 
   * @example
   * ```typescript
   * const eligibility = await steam.user.getMarketEligibility();
   * if (eligibility.allowed) {
   *   console.log('User can use the Steam Market');
   * } else {
   *   console.log(`Market restricted: reason ${eligibility.notAllowedReason}`);
   * }
   * ```
   */
  async getMarketEligibility(): Promise<MarketEligibilityResult> {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return {
          allowed: false,
          notAllowedReason: -1,
          allowedAtTime: 0,
          steamGuardRequiredDays: 0,
          newDeviceCooldownDays: 0,
        };
      }

      const callHandle = this.libraryLoader.SteamAPI_ISteamUser_GetMarketEligibility(userInterface);

      if (!callHandle || callHandle === 0n) {
        return {
          allowed: false,
          notAllowedReason: -1,
          allowedAtTime: 0,
          steamGuardRequiredDays: 0,
          newDeviceCooldownDays: 0,
        };
      }

      const result = await this.callbackPoller.poll<MarketEligibilityResponseType>(
        callHandle,
        MarketEligibilityResponse_t,
        K_I_MARKET_ELIGIBILITY_RESPONSE,
        100,
        100
      );

      if (!result) {
        return {
          allowed: false,
          notAllowedReason: -1,
          allowedAtTime: 0,
          steamGuardRequiredDays: 0,
          newDeviceCooldownDays: 0,
        };
      }

      return {
        allowed: result.m_bAllowed,
        notAllowedReason: result.m_eNotAllowedReason,
        allowedAtTime: result.m_rtAllowedAtTime,
        steamGuardRequiredDays: result.m_cdaySteamGuardRequiredDays,
        newDeviceCooldownDays: result.m_cdayNewDeviceCooldown,
      };
    } catch (error) {
      console.error('[SteamUserManager] Error getting market eligibility:', error);
      return {
        allowed: false,
        notAllowedReason: -1,
        allowedAtTime: 0,
        steamGuardRequiredDays: 0,
        newDeviceCooldownDays: 0,
      };
    }
  }

  // ========================================
  // Store Auth URL
  // ========================================

  /**
   * Request an authenticated URL for in-game browser store checkout
   * 
   * This generates a URL that authenticates an in-game browser for Steam store
   * checkout pages. The URL has a very short lifetime, so call this immediately
   * before launching the browser.
   * 
   * @param redirectURL - The URL to redirect to after authentication
   * @returns Promise resolving to the authenticated URL
   * 
   * @example
   * ```typescript
   * const result = await steam.user.requestStoreAuthURL('https://store.steampowered.com/');
   * if (result.success && result.url) {
   *   // Open in-game browser immediately
   *   openBrowser(result.url);
   * }
   * ```
   * 
   * @remarks
   * - The URL has a very short lifetime (~seconds) to prevent history-snooping attacks
   * - The resulting auth cookie lasts ~1 day; consider refreshing every 12 hours
   */
  async requestStoreAuthURL(redirectURL: string): Promise<StoreAuthURLResult> {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return {
          success: false,
          url: null,
          error: 'User interface not available',
        };
      }

      const callHandle = this.libraryLoader.SteamAPI_ISteamUser_RequestStoreAuthURL(
        userInterface,
        redirectURL
      );

      if (!callHandle || callHandle === BigInt(0)) {
        return {
          success: false,
          url: null,
          error: 'Failed to initiate store auth URL request',
        };
      }

      // Wait for callback with StoreAuthURLResponse_t
      const result = await this.callbackPoller.poll<StoreAuthURLResponseType>(
        callHandle,
        StoreAuthURLResponse_t,
        K_I_STORE_AUTH_URL_RESPONSE,
        100, // 100 retries
        100  // 100ms delay = 10 second timeout
      );

      if (!result) {
        return {
          success: false,
          url: null,
          error: 'Request timed out',
        };
      }

      // Extract string from char array
      const urlString = typeof result.m_szURL === 'string' 
        ? result.m_szURL 
        : Buffer.from(result.m_szURL).toString('utf8').replace(/\0+$/, '');

      return {
        success: true,
        url: urlString || null,
      };
    } catch (error) {
      console.error('[SteamUserManager] Error requesting store auth URL:', error);
      return {
        success: false,
        url: null,
        error: String(error),
      };
    }
  }

  // ========================================
  // Duration Control (Anti-Indulgence)
  // ========================================

  /**
   * Get duration control status for the current user
   * 
   * This is primarily for compliance with regulations in certain regions
   * (e.g., China) that limit gaming time for minors.
   * 
   * @returns Promise resolving to duration control info
   * 
   * @example
   * ```typescript
   * const duration = await steam.user.getDurationControl();
   * if (duration.applicable) {
   *   console.log(`Time remaining: ${duration.secondsRemaining} seconds`);
   *   if (duration.progress === 1) {
   *     console.log('Player should exit the game');
   *   }
   * }
   * ```
   */
  async getDurationControl(): Promise<DurationControlResult> {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return {
          success: false,
          appId: 0,
          applicable: false,
          secondsLast5Hours: 0,
          progress: 0,
          notification: 0,
          secondsToday: 0,
          secondsRemaining: 0,
        };
      }

      const callHandle = this.libraryLoader.SteamAPI_ISteamUser_GetDurationControl(userInterface);

      if (!callHandle || callHandle === 0n) {
        return {
          success: false,
          appId: 0,
          applicable: false,
          secondsLast5Hours: 0,
          progress: 0,
          notification: 0,
          secondsToday: 0,
          secondsRemaining: 0,
        };
      }

      const result = await this.callbackPoller.poll<DurationControlType>(
        callHandle,
        DurationControl_t,
        K_I_DURATION_CONTROL,
        100,
        100
      );

      if (!result || result.m_eResult !== 1) {
        return {
          success: false,
          appId: 0,
          applicable: false,
          secondsLast5Hours: 0,
          progress: 0,
          notification: 0,
          secondsToday: 0,
          secondsRemaining: 0,
        };
      }

      return {
        success: true,
        appId: result.m_appid,
        applicable: result.m_bApplicable,
        secondsLast5Hours: result.m_csecsLast5h,
        progress: result.m_progress,
        notification: result.m_notification,
        secondsToday: result.m_csecsToday,
        secondsRemaining: result.m_csecsRemaining,
      };
    } catch (error) {
      console.error('[SteamAuthManager] Error getting duration control:', error);
      return {
        success: false,
        appId: 0,
        applicable: false,
        secondsLast5Hours: 0,
        progress: 0,
        notification: 0,
        secondsToday: 0,
        secondsRemaining: 0,
      };
    }
  }

  /**
   * Set the duration control online state
   * 
   * Inform Steam about the game's online state for duration control tracking.
   * Offline gameplay time may be treated differently than online time.
   * 
   * @param state - The online state to set
   * @returns true if successful
   * 
   * @example
   * ```typescript
   * // Player is in an online match
   * steam.user.setDurationControlOnlineState(EDurationControlOnlineState.Online);
   * 
   * // Player is in an important competitive match
   * steam.user.setDurationControlOnlineState(EDurationControlOnlineState.OnlineHighPri);
   * 
   * // Player is playing offline
   * steam.user.setDurationControlOnlineState(EDurationControlOnlineState.Offline);
   * ```
   */
  setDurationControlOnlineState(state: EDurationControlOnlineState): boolean {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return false;
      }
      return this.libraryLoader.SteamAPI_ISteamUser_BSetDurationControlOnlineState(userInterface, state);
    } catch (error) {
      console.error('[SteamAuthManager] Error setting duration control state:', error);
      return false;
    }
  }

  // ========================================
  // Game Advertising
  // ========================================

  /**
   * Advertise the game server to friends for joining
   * 
   * Sets data to be replicated to friends so they can join your game.
   * 
   * @param serverSteamId - The Steam ID of the game server (0 for none)
   * @param serverIP - The IP address of the server (in host byte order)
   * @param serverPort - The port of the server
   * 
   * @example
   * ```typescript
   * // Advertise that the user is on a game server
   * steam.user.advertiseGame('90071234567890', ipToInt('192.168.1.100'), 27015);
   * 
   * // Clear the advertisement
   * steam.user.advertiseGame('0', 0, 0);
   * ```
   */
  advertiseGame(serverSteamId: string, serverIP: number, serverPort: number): void {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return;
      }

      const steamIdBigInt = BigInt(serverSteamId);
      this.libraryLoader.SteamAPI_ISteamUser_AdvertiseGame(
        userInterface,
        steamIdBigInt,
        serverIP,
        serverPort
      );
    } catch (error) {
      console.error('[SteamAuthManager] Error advertising game:', error);
    }
  }

  // ========================================
  // Voice Recording
  // ========================================

  /**
   * Start voice recording
   * 
   * Begins recording voice data from the user's microphone.
   * After calling this, use `getVoice()` to retrieve the recorded data.
   * Voice recording continues until `stopVoiceRecording()` is called.
   * 
   * @example
   * ```typescript
   * // Start recording when push-to-talk key is pressed
   * steam.user.startVoiceRecording();
   * 
   * // In your game loop, retrieve and send voice data
   * const voice = steam.user.getVoice();
   * if (voice.result === EVoiceResult.OK) {
   *   sendToOtherPlayers(voice.voiceData);
   * }
   * ```
   */
  startVoiceRecording(): void {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return;
      }

      this.libraryLoader.SteamAPI_ISteamUser_StartVoiceRecording(userInterface);
    } catch (error) {
      console.error('[SteamUserManager] Error starting voice recording:', error);
    }
  }

  /**
   * Stop voice recording
   * 
   * Stops recording voice data from the microphone.
   * Note: Steam may continue recording briefly after this call to capture
   * the end of speech. Continue calling `getVoice()` until it returns
   * `EVoiceResult.NotRecording`.
   * 
   * @example
   * ```typescript
   * // Stop recording when push-to-talk key is released
   * steam.user.stopVoiceRecording();
   * 
   * // Keep fetching voice data until recording fully stops
   * let voice = steam.user.getVoice();
   * while (voice.result !== EVoiceResult.NotRecording) {
   *   if (voice.result === EVoiceResult.OK) {
   *     sendToOtherPlayers(voice.voiceData);
   *   }
   *   voice = steam.user.getVoice();
   * }
   * ```
   */
  stopVoiceRecording(): void {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return;
      }

      this.libraryLoader.SteamAPI_ISteamUser_StopVoiceRecording(userInterface);
    } catch (error) {
      console.error('[SteamUserManager] Error stopping voice recording:', error);
    }
  }

  /**
   * Get the amount of voice data available
   * 
   * Determines how many bytes of compressed voice data are available
   * to be read with `getVoice()`.
   * 
   * @returns The result code and number of compressed bytes available
   * 
   * @example
   * ```typescript
   * const available = steam.user.getAvailableVoice();
   * if (available.result === EVoiceResult.OK && available.compressedBytes > 0) {
   *   console.log(`${available.compressedBytes} bytes of voice data ready`);
   * }
   * ```
   */
  getAvailableVoice(): GetAvailableVoiceResult {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return {
          result: EVoiceResult.NotInitialized,
          compressedBytes: 0,
        };
      }

      const compressedBytesBuffer = Buffer.alloc(4);
      const result = this.libraryLoader.SteamAPI_ISteamUser_GetAvailableVoice(
        userInterface,
        compressedBytesBuffer,
        null, // Deprecated parameter
        0     // Deprecated parameter
      );

      return {
        result: result as EVoiceResult,
        compressedBytes: compressedBytesBuffer.readUInt32LE(0),
      };
    } catch (error) {
      console.error('[SteamUserManager] Error getting available voice:', error);
      return {
        result: EVoiceResult.NotInitialized,
        compressedBytes: 0,
      };
    }
  }

  /**
   * Get recorded voice data
   * 
   * Reads compressed voice data from the microphone buffer.
   * This should be called frequently (at least once per frame) to keep
   * latency low and prevent buffer overflow.
   * 
   * The returned data is compressed and can be transmitted to other players,
   * then decompressed using `decompressVoice()`.
   * 
   * @param bufferSize - Size of the buffer to allocate for voice data (default: 8192)
   * @returns The result code and voice data buffer
   * 
   * @example
   * ```typescript
   * // In your game loop:
   * const voice = steam.user.getVoice();
   * 
   * switch (voice.result) {
   *   case EVoiceResult.OK:
   *     // Send compressed voice data to other players
   *     network.broadcast(voice.voiceData);
   *     break;
   *   case EVoiceResult.NoData:
   *     // Microphone is silent, nothing to do
   *     break;
   *   case EVoiceResult.NotRecording:
   *     // Recording has stopped
   *     break;
   * }
   * ```
   */
  getVoice(bufferSize: number = 8192): GetVoiceResult {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return {
          result: EVoiceResult.NotInitialized,
          voiceData: null,
          bytesWritten: 0,
        };
      }

      const destBuffer = Buffer.alloc(bufferSize);
      const bytesWrittenBuffer = Buffer.alloc(4);

      const result = this.libraryLoader.SteamAPI_ISteamUser_GetVoice(
        userInterface,
        true,           // bWantCompressed
        destBuffer,
        bufferSize,
        bytesWrittenBuffer,
        false,          // bWantUncompressed_Deprecated
        null,           // pUncompressedDestBuffer_Deprecated
        0,              // cbUncompressedDestBufferSize_Deprecated
        null,           // nUncompressBytesWritten_Deprecated
        0               // nUncompressedVoiceDesiredSampleRate_Deprecated
      );

      const bytesWritten = bytesWrittenBuffer.readUInt32LE(0);

      if (result === EVoiceResult.OK && bytesWritten > 0) {
        return {
          result: result as EVoiceResult,
          voiceData: destBuffer.subarray(0, bytesWritten),
          bytesWritten,
        };
      }

      return {
        result: result as EVoiceResult,
        voiceData: null,
        bytesWritten: 0,
      };
    } catch (error) {
      console.error('[SteamUserManager] Error getting voice:', error);
      return {
        result: EVoiceResult.NotInitialized,
        voiceData: null,
        bytesWritten: 0,
      };
    }
  }

  /**
   * Decompress voice data
   * 
   * Decodes compressed voice data (from `getVoice()`) into raw PCM audio.
   * The output is single-channel 16-bit PCM audio at the specified sample rate.
   * 
   * @param compressedData - The compressed voice data to decompress
   * @param sampleRate - The desired output sample rate (11025-48000). Use
   *                     `getVoiceOptimalSampleRate()` for best performance.
   * @param bufferSize - Size of the output buffer (default: 20480 = ~20KB)
   * @returns The result code and decompressed audio buffer
   * 
   * @example
   * ```typescript
   * // Receive compressed voice data from another player
   * const compressedData = network.receiveVoiceData();
   * 
   * // Decompress at optimal sample rate
   * const sampleRate = steam.user.getVoiceOptimalSampleRate();
   * const audio = steam.user.decompressVoice(compressedData, sampleRate);
   * 
   * if (audio.result === EVoiceResult.OK) {
   *   // Play the PCM audio through your audio system
   *   audioPlayer.playPCM(audio.audioData, sampleRate);
   * }
   * ```
   */
  decompressVoice(compressedData: Buffer, sampleRate: number, bufferSize: number = 20480): DecompressVoiceResult {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return {
          result: EVoiceResult.NotInitialized,
          audioData: null,
          bytesWritten: 0,
        };
      }

      const destBuffer = Buffer.alloc(bufferSize);
      const bytesWrittenBuffer = Buffer.alloc(4);

      const result = this.libraryLoader.SteamAPI_ISteamUser_DecompressVoice(
        userInterface,
        compressedData,
        compressedData.length,
        destBuffer,
        bufferSize,
        bytesWrittenBuffer,
        sampleRate
      );

      const bytesWritten = bytesWrittenBuffer.readUInt32LE(0);

      if (result === EVoiceResult.OK && bytesWritten > 0) {
        return {
          result: result as EVoiceResult,
          audioData: destBuffer.subarray(0, bytesWritten),
          bytesWritten,
        };
      }

      // If buffer too small, return the required size
      if (result === EVoiceResult.BufferTooSmall) {
        return {
          result: result as EVoiceResult,
          audioData: null,
          bytesWritten, // This is the required buffer size
        };
      }

      return {
        result: result as EVoiceResult,
        audioData: null,
        bytesWritten: 0,
      };
    } catch (error) {
      console.error('[SteamUserManager] Error decompressing voice:', error);
      return {
        result: EVoiceResult.NotInitialized,
        audioData: null,
        bytesWritten: 0,
      };
    }
  }

  /**
   * Get the optimal sample rate for voice decompression
   * 
   * Returns the native sample rate of the Steam voice decompressor.
   * Using this rate for `decompressVoice()` will minimize CPU usage.
   * 
   * However, you may get better audio quality using your audio device's
   * native sample rate (typically 44100 or 48000).
   * 
   * @returns The optimal sample rate (typically 11025, 22050, or 44100)
   * 
   * @example
   * ```typescript
   * const optimalRate = steam.user.getVoiceOptimalSampleRate();
   * console.log(`Optimal sample rate: ${optimalRate} Hz`);
   * 
   * // Use for decompression
   * const audio = steam.user.decompressVoice(voiceData, optimalRate);
   * ```
   */
  getVoiceOptimalSampleRate(): number {
    try {
      const userInterface = this.apiCore.getUserInterface();
      if (!userInterface) {
        return 0;
      }

      return this.libraryLoader.SteamAPI_ISteamUser_GetVoiceOptimalSampleRate(userInterface);
    } catch (error) {
      console.error('[SteamUserManager] Error getting optimal sample rate:', error);
      return 0;
    }
  }

  // ========================================
  // Cleanup
  // ========================================

  /**
   * Cancel all active auth tickets
   * 
   * Should be called when shutting down to clean up resources.
   */
  cancelAllTickets(): void {
    for (const [ticket] of this.activeTickets) {
      this.cancelAuthTicket(ticket);
    }
    this.activeTickets.clear();
  }
}
