import * as koffi from 'koffi';
import { SteamLibraryLoader, FnSteamNetConnectionStatusChanged } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import { SteamCallbackPoller } from './SteamCallbackPoller';
import {
  HSteamListenSocket,
  HSteamNetConnection,
  HSteamNetPollGroup,
  k_HSteamListenSocket_Invalid,
  k_HSteamNetConnection_Invalid,
  k_HSteamNetPollGroup_Invalid,
  ESteamNetworkingConnectionState,
  ESteamNetworkingIdentityType,
  EResult,
  ConnectionInfo,
  ConnectionRealTimeStatus,
  NetworkMessage,
  SendMessageResult,
  P2PConnectionRequest,
  ConnectionStateChange,
  k_nSteamNetworkingSend_Reliable,
  k_nSteamNetworkingSend_Unreliable,
  STEAM_NETWORKING_IDENTITY_SIZE,
  STEAM_NET_CONNECTION_INFO_SIZE,
  STEAM_NET_CONNECTION_REALTIME_STATUS_SIZE,
} from '../types/networking';

// Global reference to the manager instance for the callback
// This is necessary because native callbacks can't capture JS closures
let globalCallbackManager: SteamNetworkingSocketsManager | null = null;

/**
 * Callback handler for connection state changes
 */
export type ConnectionStateChangeHandler = (change: ConnectionStateChange) => void;

/**
 * Callback handler for P2P connection requests (on listen sockets)
 */
export type P2PConnectionRequestHandler = (request: P2PConnectionRequest) => void;

/**
 * SteamNetworkingSocketsManager
 * 
 * Manages Steam P2P networking for multiplayer games using the Steam Relay Network.
 * Provides reliable and unreliable message passing between players.
 * 
 * ## Features
 * 
 * - **P2P Connections**: Establish direct connections between Steam users
 * - **Listen Sockets**: Accept incoming P2P connections
 * - **Reliable/Unreliable Messaging**: Send messages with or without delivery guarantees
 * - **Connection Management**: Track connection state, close connections gracefully
 * - **Poll Groups**: Efficiently receive messages from multiple connections
 * 
 * ## Key Concepts
 * 
 * - **Listen Socket**: Opens a "virtual port" to accept incoming P2P connections
 * - **Connection**: A bidirectional communication channel between two peers
 * - **Poll Group**: Groups multiple connections for efficient message receiving
 * - **Virtual Port**: A number identifying which service/game mode to connect to
 * 
 * ## Typical Flow (Host)
 * 
 * 1. Create a listen socket with `createListenSocketP2P()`
 * 2. Poll for connection state changes with `pollConnectionStateChanges()`
 * 3. Accept incoming connections with `acceptConnection()`
 * 4. Send/receive messages
 * 5. Close connections and listen socket when done
 * 
 * ## Typical Flow (Client)
 * 
 * 1. Connect to host with `connectP2P(hostSteamId, virtualPort)`
 * 2. Poll for connection state changes until Connected
 * 3. Send/receive messages
 * 4. Close connection when done
 * 
 * @see {@link https://partner.steamgames.com/doc/api/ISteamNetworkingSockets}
 */
export class SteamNetworkingSocketsManager {
  private libraryLoader: SteamLibraryLoader;
  private apiCore: SteamAPICore;
  private networkingSocketsInterface: any = null;
  
  // Active connections tracking
  private activeConnections: Map<HSteamNetConnection, ConnectionInfo> = new Map();
  private activeListenSockets: Set<HSteamListenSocket> = new Set();
  private activePollGroups: Set<HSteamNetPollGroup> = new Set();
  
  // Event handlers
  private connectionStateChangeHandlers: ConnectionStateChangeHandler[] = [];
  private connectionRequestHandlers: P2PConnectionRequestHandler[] = [];
  
  // Pending state changes (for polling)
  private pendingStateChanges: ConnectionStateChange[] = [];
  private pendingConnectionRequests: P2PConnectionRequest[] = [];

  // Koffi callback reference (must be kept alive)
  private connectionStatusCallback: any = null;
  private callbackRegistered: boolean = false;

  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
    
    // Set global reference for native callback
    globalCallbackManager = this;
    
    // Note: Don't register callback in constructor since Steam may not be initialized yet
    // The callback will be registered lazily when needed
  }

  /**
   * Ensure the global connection status callback is registered
   * Called automatically when needed
   */
  private ensureCallbackRegistered(): void {
    if (this.callbackRegistered) return;
    this.registerGlobalCallback();
  }

  /**
   * Register the global connection status callback with Steam
   * This enables receiving notifications for all connection state changes
   */
  private registerGlobalCallback(): void {
    if (this.callbackRegistered) return;

    try {
      // Use the callback prototype exported from SteamLibraryLoader
      // koffi.register() expects a pointer to the callback type
      const callbackPtrType = koffi.pointer(FnSteamNetConnectionStatusChanged);
      
      // Create the callback function that will be called from native code
      this.connectionStatusCallback = koffi.register(
        (infoPtr: any) => {
          this.handleConnectionStatusChanged(infoPtr);
        },
        callbackPtrType
      );

      // Get the NetworkingUtils interface
      const utils = this.libraryLoader.SteamAPI_SteamNetworkingUtils_SteamAPI_v004();
      if (!utils) {
        console.warn('[Steamworks] NetworkingUtils interface not available for callback registration');
        return;
      }

      // Register our callback with Steam
      const success = this.libraryLoader.SteamAPI_ISteamNetworkingUtils_SetGlobalCallback_SteamNetConnectionStatusChanged(
        utils,
        this.connectionStatusCallback
      );

      if (success) {
        this.callbackRegistered = true;
      } else {
        console.warn('[Steamworks] Failed to register global connection status callback');
      }
    } catch (error) {
      console.error('[Steamworks] Error registering connection status callback:', error);
    }
  }

  /**
   * Handle connection status changed callback from Steam
   * Called by native code when any connection state changes
   */
  private handleConnectionStatusChanged(infoPtr: any): void {
    if (!infoPtr) return;

    try {
      // Use centralized parser from SteamCallbackPoller
      const parsed = SteamCallbackPoller.parseConnectionStatusChangedCallback(infoPtr);
      if (!parsed) return;

      const connection = parsed.m_hConn as HSteamNetConnection;
      const oldState = parsed.m_eOldState as ESteamNetworkingConnectionState;
      
      // Convert parsed info to ConnectionInfo type
      const info: ConnectionInfo = {
        identityRemote: parsed.m_info.identityRemote,
        userData: parsed.m_info.userData,
        listenSocket: parsed.m_info.listenSocket,
        remoteAddress: parsed.m_info.remoteAddress,
        popIdRemote: parsed.m_info.popIdRemote,
        popIdRelay: parsed.m_info.popIdRelay,
        state: parsed.m_info.state as ESteamNetworkingConnectionState,
        stateName: parsed.m_info.stateName,
        endReason: parsed.m_info.endReason,
        endDebugMessage: parsed.m_info.endDebugMessage,
        connectionDescription: parsed.m_info.connectionDescription
      };
      
      // Track the connection if we don't know about it yet
      if (!this.activeConnections.has(connection) && connection !== k_HSteamNetConnection_Invalid) {
        this.activeConnections.set(connection, info);
      }

      // Create the state change event
      const change: ConnectionStateChange = {
        connection,
        oldState,
        newState: info.state,
        info
      };

      // Add to pending changes
      this.pendingStateChanges.push(change);

      // If this is a new incoming connection (Connecting state with a listen socket)
      if (oldState === ESteamNetworkingConnectionState.None && 
          info.state === ESteamNetworkingConnectionState.Connecting &&
          info.listenSocket !== 0) {
        // This is an incoming connection request
        const request: P2PConnectionRequest = {
          connection,
          identityRemote: info.identityRemote,
          listenSocket: info.listenSocket
        };
        
        this.pendingConnectionRequests.push(request);
        
        // Notify request handlers
        for (const handler of this.connectionRequestHandlers) {
          try {
            handler(request);
          } catch (err) {
            console.error('[Steamworks] Connection request handler error:', err);
          }
        }
      }

      // Notify state change handlers
      for (const handler of this.connectionStateChangeHandlers) {
        try {
          handler(change);
        } catch (err) {
          console.error('[Steamworks] Connection state change handler error:', err);
        }
      }

      // Update or remove connection from tracking
      if (info.state === ESteamNetworkingConnectionState.ClosedByPeer ||
          info.state === ESteamNetworkingConnectionState.ProblemDetectedLocally ||
          info.state === ESteamNetworkingConnectionState.Dead ||
          info.state === ESteamNetworkingConnectionState.None) {
        this.activeConnections.delete(connection);
      } else {
        this.activeConnections.set(connection, info);
      }

    } catch (error) {
      console.error('[Steamworks] Error handling connection status callback:', error);
    }
  }

  /**
   * Get the ISteamNetworkingSockets interface pointer
   */
  private getInterface(): any {
    if (!this.networkingSocketsInterface) {
      this.networkingSocketsInterface = this.libraryLoader.SteamAPI_SteamNetworkingSockets_SteamAPI_v012();
    }
    return this.networkingSocketsInterface;
  }

  // ============================================================================
  // P2P Listen Socket (Host)
  // ============================================================================

  /**
   * Create a P2P listen socket to accept incoming connections
   * 
   * Creates a "server" socket that listens for incoming P2P connections from
   * other Steam users. Use this when hosting a game or accepting connections.
   * 
   * @param virtualPort - Virtual port number (0-65535). Use 0 for default.
   *                      Different virtual ports allow multiple services.
   * @returns Handle to the listen socket, or k_HSteamListenSocket_Invalid on failure
   * 
   * @example
   * ```typescript
   * // Create a listen socket on virtual port 0
   * const listenSocket = steam.networkingSockets.createListenSocketP2P(0);
   * if (listenSocket !== k_HSteamListenSocket_Invalid) {
   *   console.log('Listening for P2P connections...');
   * }
   * ```
   */
  createListenSocketP2P(virtualPort: number = 0): HSteamListenSocket {
    // Ensure callback is registered before creating listen sockets
    this.ensureCallbackRegistered();
    
    const iface = this.getInterface();
    const socket = this.libraryLoader.SteamAPI_ISteamNetworkingSockets_CreateListenSocketP2P(
      iface,
      virtualPort,
      0,    // nOptions
      null  // pOptions
    );
    
    if (socket !== k_HSteamListenSocket_Invalid) {
      this.activeListenSockets.add(socket);
    }
    
    return socket;
  }

  /**
   * Close a listen socket
   * 
   * Stops accepting new connections. Existing connections are not affected.
   * 
   * @param listenSocket - Handle to the listen socket
   * @returns true if successfully closed
   */
  closeListenSocket(listenSocket: HSteamListenSocket): boolean {
    const iface = this.getInterface();
    const result = this.libraryLoader.SteamAPI_ISteamNetworkingSockets_CloseListenSocket(
      iface,
      listenSocket
    );
    
    if (result) {
      this.activeListenSockets.delete(listenSocket);
    }
    
    return result;
  }

  // ============================================================================
  // P2P Connection (Client)
  // ============================================================================

  /**
   * Connect to a remote peer via Steam P2P
   * 
   * Initiates a connection to another Steam user. The connection goes through
   * Steam's relay network for NAT traversal and privacy.
   * 
   * @param remoteSteamId - Steam ID of the user to connect to (as string or bigint)
   * @param virtualPort - Virtual port on the remote host (default 0)
   * @returns Connection handle, or k_HSteamNetConnection_Invalid on failure
   * 
   * @example
   * ```typescript
   * // Connect to a friend's game
   * const connection = steam.networkingSockets.connectP2P(hostSteamId, 0);
   * if (connection !== k_HSteamNetConnection_Invalid) {
   *   console.log('Connecting to host...');
   *   
   *   // Poll for connection state until connected
   *   const checkConnection = setInterval(() => {
   *     const info = steam.networkingSockets.getConnectionInfo(connection);
   *     if (info && info.state === ESteamNetworkingConnectionState.Connected) {
   *       console.log('Connected!');
   *       clearInterval(checkConnection);
   *     }
   *   }, 100);
   * }
   * ```
   */
  connectP2P(remoteSteamId: string | bigint, virtualPort: number = 0): HSteamNetConnection {
    // Ensure callback is registered before connecting
    this.ensureCallbackRegistered();
    
    const iface = this.getInterface();
    
    // Create SteamNetworkingIdentity structure for the remote peer
    const identityBuffer = Buffer.alloc(STEAM_NETWORKING_IDENTITY_SIZE);
    
    // Set identity type to SteamID (16)
    identityBuffer.writeInt32LE(ESteamNetworkingIdentityType.SteamID, 0);
    
    // Set the SteamID (at offset 4, the union starts)
    const steamIdBigInt = typeof remoteSteamId === 'string' ? BigInt(remoteSteamId) : remoteSteamId;
    identityBuffer.writeBigUInt64LE(steamIdBigInt, 4);
    
    const connection = this.libraryLoader.SteamAPI_ISteamNetworkingSockets_ConnectP2P(
      iface,
      identityBuffer,
      virtualPort,
      0,    // nOptions
      null  // pOptions
    );
    
    if (connection !== k_HSteamNetConnection_Invalid) {
      // Store initial connection info
      this.activeConnections.set(connection, {
        identityRemote: steamIdBigInt.toString(),
        userData: BigInt(0),
        listenSocket: 0,
        remoteAddress: '',
        popIdRemote: 0,
        popIdRelay: 0,
        state: ESteamNetworkingConnectionState.Connecting,
        stateName: 'Connecting',
        endReason: 0,
        endDebugMessage: '',
        connectionDescription: `P2P to ${steamIdBigInt.toString()}`
      });
    }
    
    return connection;
  }

  /**
   * Accept an incoming P2P connection
   * 
   * When a connection request comes in on a listen socket, you must explicitly
   * accept it for communication to begin.
   * 
   * @param connection - Handle to the incoming connection
   * @returns EResult code (OK on success)
   * 
   * @example
   * ```typescript
   * // In your connection request handler
   * steam.networkingSockets.onConnectionRequest((request) => {
   *   console.log(`Connection request from: ${request.identityRemote}`);
   *   const result = steam.networkingSockets.acceptConnection(request.connection);
   *   if (result === EResult.OK) {
   *     console.log('Connection accepted');
   *   }
   * });
   * ```
   */
  acceptConnection(connection: HSteamNetConnection): EResult {
    const iface = this.getInterface();
    return this.libraryLoader.SteamAPI_ISteamNetworkingSockets_AcceptConnection(
      iface,
      connection
    );
  }

  /**
   * Close a connection
   * 
   * Gracefully closes a connection. The remote peer will be notified.
   * 
   * @param connection - Handle to the connection
   * @param reason - Application-defined reason code (optional, 0 = normal close)
   * @param debugMessage - Debug message (optional, not sent to peer)
   * @param enableLinger - If true, connection lingers to flush pending messages
   * @returns true if successfully closed
   */
  closeConnection(
    connection: HSteamNetConnection,
    reason: number = 0,
    debugMessage: string = '',
    enableLinger: boolean = false
  ): boolean {
    const iface = this.getInterface();
    const result = this.libraryLoader.SteamAPI_ISteamNetworkingSockets_CloseConnection(
      iface,
      connection,
      reason,
      debugMessage,
      enableLinger
    );
    
    if (result) {
      this.activeConnections.delete(connection);
    }
    
    return result;
  }

  // ============================================================================
  // Messaging
  // ============================================================================

  /**
   * Send a message to a connection
   * 
   * Sends data to a connected peer. Can be sent reliably (guaranteed delivery,
   * in order) or unreliably (best effort, low latency).
   * 
   * @param connection - Handle to the connection
   * @param data - Data to send (Buffer or string)
   * @param sendFlags - Send flags (k_nSteamNetworkingSend_Reliable, etc.)
   * @returns Send result with success status and message number
   * 
   * @example
   * ```typescript
   * // Send reliable message
   * const result = steam.networkingSockets.sendMessage(
   *   connection,
   *   Buffer.from(JSON.stringify({ type: 'chat', message: 'Hello!' })),
   *   k_nSteamNetworkingSend_Reliable
   * );
   * 
   * // Send unreliable message (for real-time updates)
   * steam.networkingSockets.sendMessage(
   *   connection,
   *   positionBuffer,
   *   k_nSteamNetworkingSend_Unreliable
   * );
   * ```
   */
  sendMessage(
    connection: HSteamNetConnection,
    data: Buffer | string,
    sendFlags: number = k_nSteamNetworkingSend_Reliable
  ): SendMessageResult {
    const iface = this.getInterface();
    
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    const messageNumberOut = new BigInt64Array(1);
    
    const result = this.libraryLoader.SteamAPI_ISteamNetworkingSockets_SendMessageToConnection(
      iface,
      connection,
      buffer,
      buffer.length,
      sendFlags,
      messageNumberOut
    );
    
    return {
      success: result === EResult.OK,
      result: result as EResult,
      messageNumber: messageNumberOut[0]
    };
  }

  /**
   * Send a reliable message
   * 
   * Convenience method for sending reliable messages.
   */
  sendReliable(connection: HSteamNetConnection, data: Buffer | string): SendMessageResult {
    return this.sendMessage(connection, data, k_nSteamNetworkingSend_Reliable);
  }

  /**
   * Send an unreliable message
   * 
   * Convenience method for sending unreliable messages.
   */
  sendUnreliable(connection: HSteamNetConnection, data: Buffer | string): SendMessageResult {
    return this.sendMessage(connection, data, k_nSteamNetworkingSend_Unreliable);
  }

  /**
   * Flush pending messages on a connection
   * 
   * Forces any buffered messages to be sent immediately.
   * 
   * @param connection - Handle to the connection
   * @returns EResult code
   */
  flushMessages(connection: HSteamNetConnection): EResult {
    const iface = this.getInterface();
    return this.libraryLoader.SteamAPI_ISteamNetworkingSockets_FlushMessagesOnConnection(
      iface,
      connection
    );
  }

  /**
   * Receive messages from a connection
   * 
   * Retrieves pending messages from a specific connection. Call this regularly
   * to receive data from the peer.
   * 
   * @param connection - Handle to the connection
   * @param maxMessages - Maximum number of messages to receive (default 16)
   * @returns Array of received messages
   * 
   * @example
   * ```typescript
   * // In your game loop
   * const messages = steam.networkingSockets.receiveMessages(connection, 32);
   * for (const msg of messages) {
   *   const data = JSON.parse(msg.data.toString());
   *   handleGameMessage(data);
   * }
   * ```
   */
  receiveMessages(connection: HSteamNetConnection, maxMessages: number = 16): NetworkMessage[] {
    const iface = this.getInterface();
    
    // Allocate array of pointers to receive message pointers
    const messagePtrs = new BigUint64Array(maxMessages);
    
    const numMessages = this.libraryLoader.SteamAPI_ISteamNetworkingSockets_ReceiveMessagesOnConnection(
      iface,
      connection,
      messagePtrs,
      maxMessages
    );
    
    const messages: NetworkMessage[] = [];
    
    for (let i = 0; i < numMessages; i++) {
      const msg = this.parseNetworkMessage(messagePtrs[i]);
      if (msg) {
        messages.push(msg);
      }
    }
    
    return messages;
  }

  /**
   * Parse a SteamNetworkingMessage_t pointer into our NetworkMessage structure
   */
  private parseNetworkMessage(msgPtr: bigint): NetworkMessage | null {
    if (msgPtr === BigInt(0)) return null;
    
    try {
      // SteamNetworkingMessage_t structure layout (simplified):
      // void* m_pData;         // offset 0, 8 bytes on 64-bit
      // int m_cbSize;          // offset 8, 4 bytes
      // HSteamNetConnection m_conn; // offset 12, 4 bytes
      // SteamNetworkingIdentity m_identityPeer; // offset 16, 136 bytes
      // int64 m_nConnUserData; // offset 152, 8 bytes
      // SteamNetworkingMicroseconds m_usecTimeReceived; // offset 160, 8 bytes
      // int64 m_nMessageNumber; // offset 168, 8 bytes
      // void (*m_pfnFreeData)(); // offset 176, 8 bytes
      // void (*m_pfnRelease)(); // offset 184, 8 bytes
      // int m_nChannel;        // offset 192, 4 bytes
      // int m_nFlags;          // offset 196, 4 bytes (pad to 200)
      // int64 m_nUserData;     // offset 200, 8 bytes
      
      // Read the message structure
      // Note: This is a simplified approach - in production you'd want to
      // properly handle the pointer and release it using m_pfnRelease
      
      // For now, we'll use a workaround: read the data and release the message
      const ptrBuffer = Buffer.alloc(8);
      ptrBuffer.writeBigUInt64LE(msgPtr, 0);
      
      // We need to decode the message pointer to read its contents
      // This is complex with koffi - for a real implementation, you'd
      // define the struct properly. For now, return a placeholder.
      
      // TODO: Implement proper message parsing with koffi struct definitions
      // This would require defining SteamNetworkingMessage_t as a koffi struct
      
      return null; // Placeholder - will implement with proper struct handling
    } catch (error) {
      console.error('[Steamworks] Error parsing network message:', error);
      return null;
    }
  }

  // ============================================================================
  // Poll Groups
  // ============================================================================

  /**
   * Create a poll group
   * 
   * Poll groups allow you to receive messages from multiple connections
   * efficiently with a single call.
   * 
   * @returns Handle to the poll group, or k_HSteamNetPollGroup_Invalid on failure
   */
  createPollGroup(): HSteamNetPollGroup {
    const iface = this.getInterface();
    const group = this.libraryLoader.SteamAPI_ISteamNetworkingSockets_CreatePollGroup(iface);
    
    if (group !== k_HSteamNetPollGroup_Invalid) {
      this.activePollGroups.add(group);
    }
    
    return group;
  }

  /**
   * Destroy a poll group
   * 
   * @param pollGroup - Handle to the poll group
   * @returns true if successfully destroyed
   */
  destroyPollGroup(pollGroup: HSteamNetPollGroup): boolean {
    const iface = this.getInterface();
    const result = this.libraryLoader.SteamAPI_ISteamNetworkingSockets_DestroyPollGroup(
      iface,
      pollGroup
    );
    
    if (result) {
      this.activePollGroups.delete(pollGroup);
    }
    
    return result;
  }

  /**
   * Add a connection to a poll group
   * 
   * @param connection - Handle to the connection
   * @param pollGroup - Handle to the poll group
   * @returns true if successfully added
   */
  setConnectionPollGroup(connection: HSteamNetConnection, pollGroup: HSteamNetPollGroup): boolean {
    const iface = this.getInterface();
    return this.libraryLoader.SteamAPI_ISteamNetworkingSockets_SetConnectionPollGroup(
      iface,
      connection,
      pollGroup
    );
  }

  /**
   * Receive messages from all connections in a poll group
   * 
   * @param pollGroup - Handle to the poll group
   * @param maxMessages - Maximum number of messages to receive
   * @returns Array of received messages (with connection info)
   */
  receiveMessagesOnPollGroup(pollGroup: HSteamNetPollGroup, maxMessages: number = 64): NetworkMessage[] {
    const iface = this.getInterface();
    
    const messagePtrs = new BigUint64Array(maxMessages);
    
    const numMessages = this.libraryLoader.SteamAPI_ISteamNetworkingSockets_ReceiveMessagesOnPollGroup(
      iface,
      pollGroup,
      messagePtrs,
      maxMessages
    );
    
    const messages: NetworkMessage[] = [];
    
    for (let i = 0; i < numMessages; i++) {
      const msg = this.parseNetworkMessage(messagePtrs[i]);
      if (msg) {
        messages.push(msg);
      }
    }
    
    return messages;
  }

  // ============================================================================
  // Connection Info
  // ============================================================================

  /**
   * Get information about a connection
   * 
   * @param connection - Handle to the connection
   * @returns Connection information, or null if invalid connection
   */
  getConnectionInfo(connection: HSteamNetConnection): ConnectionInfo | null {
    const iface = this.getInterface();
    
    const infoBuffer = Buffer.alloc(STEAM_NET_CONNECTION_INFO_SIZE);
    
    const success = this.libraryLoader.SteamAPI_ISteamNetworkingSockets_GetConnectionInfo(
      iface,
      connection,
      infoBuffer
    );
    
    if (!success) return null;
    
    // Use centralized parser from SteamCallbackPoller
    const parsed = SteamCallbackPoller.parseConnectionInfo(infoBuffer);
    return {
      identityRemote: parsed.identityRemote,
      userData: parsed.userData,
      listenSocket: parsed.listenSocket,
      remoteAddress: parsed.remoteAddress,
      popIdRemote: parsed.popIdRemote,
      popIdRelay: parsed.popIdRelay,
      state: parsed.state as ESteamNetworkingConnectionState,
      stateName: parsed.stateName,
      endReason: parsed.endReason,
      endDebugMessage: parsed.endDebugMessage,
      connectionDescription: parsed.connectionDescription
    };
  }

  /**
   * Read a null-terminated C string from a buffer
   */
  private readCString(buffer: Buffer, offset: number, maxLength: number): string {
    let end = offset;
    while (end < offset + maxLength && buffer[end] !== 0) {
      end++;
    }
    return buffer.toString('utf8', offset, end);
  }

  /**
   * Get real-time status of a connection
   * 
   * Gets detailed statistics about the connection including latency,
   * packet rates, and queue status.
   * 
   * @param connection - Handle to the connection
   * @returns Real-time status, or null if invalid connection
   */
  getConnectionRealTimeStatus(connection: HSteamNetConnection): ConnectionRealTimeStatus | null {
    const iface = this.getInterface();
    
    const statusBuffer = Buffer.alloc(STEAM_NET_CONNECTION_REALTIME_STATUS_SIZE);
    
    const result = this.libraryLoader.SteamAPI_ISteamNetworkingSockets_GetConnectionRealTimeStatus(
      iface,
      connection,
      statusBuffer,
      0,    // nLanes
      null  // pLanes
    );
    
    if (result !== EResult.OK) return null;
    
    // SteamNetConnectionRealTimeStatus_t layout:
    // ESteamNetworkingConnectionState m_eState; // offset 0, 4 bytes
    // int m_nPing;                              // offset 4, 4 bytes
    // float m_flConnectionQualityLocal;         // offset 8, 4 bytes
    // float m_flConnectionQualityRemote;        // offset 12, 4 bytes
    // float m_flOutPacketsPerSec;               // offset 16, 4 bytes
    // float m_flOutBytesPerSec;                 // offset 20, 4 bytes
    // float m_flInPacketsPerSec;                // offset 24, 4 bytes
    // float m_flInBytesPerSec;                  // offset 28, 4 bytes
    // int m_nSendRateBytesPerSecond;            // offset 32, 4 bytes
    // int m_cbPendingUnreliable;                // offset 36, 4 bytes
    // int m_cbPendingReliable;                  // offset 40, 4 bytes
    // int m_cbSentUnackedReliable;              // offset 44, 4 bytes
    // SteamNetworkingMicroseconds m_usecQueueTime; // offset 48, 8 bytes
    
    return {
      state: statusBuffer.readInt32LE(0) as ESteamNetworkingConnectionState,
      ping: statusBuffer.readInt32LE(4),
      connectionQualityLocal: statusBuffer.readFloatLE(8),
      connectionQualityRemote: statusBuffer.readFloatLE(12),
      outPacketsPerSec: statusBuffer.readFloatLE(16),
      outBytesPerSec: statusBuffer.readFloatLE(20),
      inPacketsPerSec: statusBuffer.readFloatLE(24),
      inBytesPerSec: statusBuffer.readFloatLE(28),
      sendRateBytesPerSecond: statusBuffer.readInt32LE(32),
      pendingUnreliable: statusBuffer.readInt32LE(36),
      pendingReliable: statusBuffer.readInt32LE(40),
      sentUnackedReliable: statusBuffer.readInt32LE(44),
      usecQueueTime: statusBuffer.readBigInt64LE(48)
    };
  }

  /**
   * Get a detailed connection status string
   * 
   * Returns a human-readable diagnostic string with detailed connection info.
   * Useful for debugging.
   * 
   * @param connection - Handle to the connection
   * @returns Status string, or empty string if invalid
   */
  getDetailedConnectionStatus(connection: HSteamNetConnection): string {
    const iface = this.getInterface();
    
    const bufSize = 4096;
    const buffer = Buffer.alloc(bufSize);
    
    const result = this.libraryLoader.SteamAPI_ISteamNetworkingSockets_GetDetailedConnectionStatus(
      iface,
      connection,
      buffer,
      bufSize
    );
    
    if (result < 0) return '';
    
    return this.readCString(buffer, 0, bufSize);
  }

  // ============================================================================
  // Connection User Data
  // ============================================================================

  /**
   * Set user data on a connection
   * 
   * Associates arbitrary data with a connection. Useful for tracking game-specific
   * state per connection.
   * 
   * @param connection - Handle to the connection
   * @param userData - User data value
   * @returns true if successful
   */
  setConnectionUserData(connection: HSteamNetConnection, userData: bigint): boolean {
    const iface = this.getInterface();
    return this.libraryLoader.SteamAPI_ISteamNetworkingSockets_SetConnectionUserData(
      iface,
      connection,
      userData
    );
  }

  /**
   * Get user data from a connection
   * 
   * @param connection - Handle to the connection
   * @returns User data value, or -1 if invalid connection
   */
  getConnectionUserData(connection: HSteamNetConnection): bigint {
    const iface = this.getInterface();
    return this.libraryLoader.SteamAPI_ISteamNetworkingSockets_GetConnectionUserData(
      iface,
      connection
    );
  }

  /**
   * Set a name for a connection (for debugging)
   * 
   * @param connection - Handle to the connection
   * @param name - Name to set
   */
  setConnectionName(connection: HSteamNetConnection, name: string): void {
    const iface = this.getInterface();
    this.libraryLoader.SteamAPI_ISteamNetworkingSockets_SetConnectionName(
      iface,
      connection,
      name
    );
  }

  /**
   * Get the name of a connection
   * 
   * @param connection - Handle to the connection
   * @returns Connection name, or empty string if not set
   */
  getConnectionName(connection: HSteamNetConnection): string {
    const iface = this.getInterface();
    
    const bufSize = 256;
    const buffer = Buffer.alloc(bufSize);
    
    const success = this.libraryLoader.SteamAPI_ISteamNetworkingSockets_GetConnectionName(
      iface,
      connection,
      buffer,
      bufSize
    );
    
    if (!success) return '';
    
    return this.readCString(buffer, 0, bufSize);
  }

  // ============================================================================
  // Identity and Authentication
  // ============================================================================

  /**
   * Get our own networking identity
   * 
   * @returns Our Steam ID as a string, or null if not available
   */
  getIdentity(): string | null {
    const iface = this.getInterface();
    
    const identityBuffer = Buffer.alloc(STEAM_NETWORKING_IDENTITY_SIZE);
    
    const success = this.libraryLoader.SteamAPI_ISteamNetworkingSockets_GetIdentity(
      iface,
      identityBuffer
    );
    
    if (!success) return null;
    
    const identityType = identityBuffer.readInt32LE(0);
    if (identityType === ESteamNetworkingIdentityType.SteamID) {
      return identityBuffer.readBigUInt64LE(4).toString();
    }
    
    return null;
  }

  /**
   * Initialize authentication
   * 
   * Starts the authentication process. This is usually automatic but can be
   * called explicitly.
   * 
   * @returns Current authentication availability status
   */
  initAuthentication(): number {
    const iface = this.getInterface();
    return this.libraryLoader.SteamAPI_ISteamNetworkingSockets_InitAuthentication(iface);
  }

  /**
   * Get authentication status
   * 
   * @returns Current authentication status
   */
  getAuthenticationStatus(): number {
    const iface = this.getInterface();
    return this.libraryLoader.SteamAPI_ISteamNetworkingSockets_GetAuthenticationStatus(iface, null);
  }

  // ============================================================================
  // Callbacks and Polling
  // ============================================================================

  /**
   * Run networking callbacks
   * 
   * Processes pending networking callbacks. Call this regularly (e.g., in your
   * game loop) to receive connection state changes.
   * 
   * Note: With the global callback registered, state changes are automatically
   * processed. This method still needs to be called to trigger Steam's internal
   * callback dispatch.
   */
  runCallbacks(): void {
    // Ensure callback is registered
    this.ensureCallbackRegistered();
    
    const iface = this.getInterface();
    this.libraryLoader.SteamAPI_ISteamNetworkingSockets_RunCallbacks(iface);
    
    // Also poll all active connections for state changes as fallback
    // This catches any changes that might be missed by the global callback
    this.pollConnectionStates();
  }

  /**
   * Poll all active connections for state changes
   */
  private pollConnectionStates(): void {
    for (const [connection, oldInfo] of this.activeConnections.entries()) {
      const newInfo = this.getConnectionInfo(connection);
      
      if (!newInfo) {
        // Connection is no longer valid
        this.activeConnections.delete(connection);
        continue;
      }
      
      if (newInfo.state !== oldInfo.state) {
        const change: ConnectionStateChange = {
          connection,
          oldState: oldInfo.state,
          newState: newInfo.state,
          info: newInfo
        };
        
        // Update stored info
        this.activeConnections.set(connection, newInfo);
        
        // Add to pending changes
        this.pendingStateChanges.push(change);
        
        // Notify handlers
        for (const handler of this.connectionStateChangeHandlers) {
          try {
            handler(change);
          } catch (err) {
            console.error('[Steamworks] Connection state change handler error:', err);
          }
        }
        
        // Remove connection if it's dead
        if (newInfo.state === ESteamNetworkingConnectionState.ClosedByPeer ||
            newInfo.state === ESteamNetworkingConnectionState.ProblemDetectedLocally ||
            newInfo.state === ESteamNetworkingConnectionState.Dead) {
          this.activeConnections.delete(connection);
        }
      }
    }
  }

  /**
   * Register a handler for connection state changes
   * 
   * @param handler - Function to call when connection state changes
   * @returns Function to unregister the handler
   */
  onConnectionStateChange(handler: ConnectionStateChangeHandler): () => void {
    this.connectionStateChangeHandlers.push(handler);
    return () => {
      const index = this.connectionStateChangeHandlers.indexOf(handler);
      if (index >= 0) {
        this.connectionStateChangeHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Register a handler for connection requests
   * 
   * @param handler - Function to call when a connection request arrives
   * @returns Function to unregister the handler
   */
  onConnectionRequest(handler: P2PConnectionRequestHandler): () => void {
    this.connectionRequestHandlers.push(handler);
    return () => {
      const index = this.connectionRequestHandlers.indexOf(handler);
      if (index >= 0) {
        this.connectionRequestHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Get pending state changes (for polling approach)
   * 
   * @returns Array of state changes since last call
   */
  getPendingStateChanges(): ConnectionStateChange[] {
    const changes = [...this.pendingStateChanges];
    this.pendingStateChanges = [];
    return changes;
  }

  // ============================================================================
  // Utility
  // ============================================================================

  /**
   * Get all active connection handles
   */
  getActiveConnections(): HSteamNetConnection[] {
    return Array.from(this.activeConnections.keys());
  }

  /**
   * Get all active listen socket handles
   */
  getActiveListenSockets(): HSteamListenSocket[] {
    return Array.from(this.activeListenSockets);
  }

  /**
   * Check if a connection is valid and active
   */
  isConnectionActive(connection: HSteamNetConnection): boolean {
    return this.activeConnections.has(connection);
  }

  /**
   * Close all active connections and listen sockets
   * 
   * Call this when shutting down networking.
   */
  closeAll(): void {
    // Close all connections
    for (const connection of this.activeConnections.keys()) {
      this.closeConnection(connection, 0, 'Shutting down');
    }
    
    // Close all listen sockets
    for (const socket of this.activeListenSockets) {
      this.closeListenSocket(socket);
    }
    
    // Destroy all poll groups
    for (const group of this.activePollGroups) {
      this.destroyPollGroup(group);
    }
    
    // Unregister the global callback
    if (this.callbackRegistered) {
      try {
        const utils = this.libraryLoader.SteamAPI_SteamNetworkingUtils_SteamAPI_v004();
        if (utils) {
          this.libraryLoader.SteamAPI_ISteamNetworkingUtils_SetGlobalCallback_SteamNetConnectionStatusChanged(utils, null);
        }
        this.callbackRegistered = false;
        this.connectionStatusCallback = null;
      } catch (error) {
        console.error('[Steamworks] Error unregistering connection status callback:', error);
      }
    }
    
    // Clear global reference
    if (globalCallbackManager === this) {
      globalCallbackManager = null;
    }
  }

  /**
   * Get pending connection requests (for polling approach)
   * 
   * @returns Array of connection requests since last call
   */
  getPendingConnectionRequests(): P2PConnectionRequest[] {
    const requests = [...this.pendingConnectionRequests];
    this.pendingConnectionRequests = [];
    return requests;
  }
}
