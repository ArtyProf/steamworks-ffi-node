/**
 * Networking Sockets Host Test (TypeScript)
 * 
 * This test demonstrates P2P networking as a HOST (server/listener).
 * It covers ALL public methods of SteamNetworkingSocketsManager.
 * 
 * Usage:
 *   npm run test:sockets:host:ts
 */

import { 
  SteamworksSDK,
  ESteamNetworkingConnectionState,
  ESteamNetworkingAvailability,
  k_HSteamListenSocket_Invalid,
  k_HSteamNetConnection_Invalid,
  k_HSteamNetPollGroup_Invalid,
  EResult,
  getConnectionStateName,
  HSteamNetConnection,
  HSteamNetPollGroup,
} from '../../src';

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testNetworkingSocketsHost(): Promise<void> {
  console.log('='.repeat(60));
  console.log('NETWORKING SOCKETS HOST TEST (P2P Server)');
  console.log('Covers ALL public methods of SteamNetworkingSocketsManager');
  console.log('='.repeat(60));
  console.log('');

  const steam = SteamworksSDK.getInstance();

  // Initialize Steam API
  console.log('Initializing Steam API...');
  const initialized = steam.init({ appId: 480 });

  if (!initialized) {
    console.error('Failed to initialize Steam API!');
    process.exit(1);
  }

  console.log('Steam API initialized!');
  console.log('');

  // Get user info
  const status = steam.getStatus();
  const playerName = steam.friends.getPersonaName();
  console.log(`Host: ${playerName} (${status.steamId})`);
  console.log('');

  // ============================================
  // Test: getIdentity()
  // ============================================
  console.log('--- Testing getIdentity() ---');
  const identity = steam.networkingSockets.getIdentity();
  console.log(`Our identity: ${identity}`);
  console.log('');

  // ============================================
  // Test: initAuthentication() & getAuthenticationStatus()
  // ============================================
  console.log('--- Testing initAuthentication() & getAuthenticationStatus() ---');
  const authInit = steam.networkingSockets.initAuthentication();
  console.log(`initAuthentication result: ${authInit}`);
  const authStatus = steam.networkingSockets.getAuthenticationStatus();
  console.log(`getAuthenticationStatus result: ${authStatus}`);
  console.log('');

  // Initialize relay network
  console.log('--- Initializing relay network ---');
  steam.networkingUtils.initRelayNetworkAccess();

  const startTime = Date.now();
  const timeout = 30000;

  while (true) {
    steam.runCallbacks();
    steam.networkingSockets.runCallbacks();
    
    const networkStatus = steam.networkingUtils.getRelayNetworkStatus();
    
    if (networkStatus.availability === ESteamNetworkingAvailability.Current) {
      console.log('✓ Relay network ready!');
      break;
    }
    
    if (networkStatus.availability < 0 || Date.now() - startTime > timeout) {
      console.error('✗ Relay network failed or timed out');
      steam.shutdown();
      process.exit(1);
    }
    
    await delay(100);
  }
  console.log('');

  // ============================================
  // Test: createListenSocketP2P()
  // ============================================
  console.log('--- Testing createListenSocketP2P() ---');
  const listenSocket = steam.networkingSockets.createListenSocketP2P(0);

  if (listenSocket === k_HSteamListenSocket_Invalid) {
    console.error('✗ Failed to create listen socket!');
    steam.shutdown();
    process.exit(1);
  }

  console.log(`✓ Listen socket created: ${listenSocket}`);

  // ============================================
  // Test: getActiveListenSockets()
  // ============================================
  console.log('--- Testing getActiveListenSockets() ---');
  const activeSockets = steam.networkingSockets.getActiveListenSockets();
  console.log(`Active listen sockets: [${activeSockets.join(', ')}]`);
  console.log('');
  
  console.log('='.repeat(60));
  console.log(`Tell client to connect to: ${status.steamId}`);
  console.log('='.repeat(60));
  console.log('');

  // ============================================
  // Test: onConnectionStateChange() & onConnectionRequest()
  // ============================================
  console.log('--- Testing onConnectionStateChange() & onConnectionRequest() ---');
  
  let clientConnection: HSteamNetConnection = k_HSteamNetConnection_Invalid;
  let connected = false;
  let connectionRequestReceived = false;
  const connectionTimeout = 120000;
  const waitStart = Date.now();
  
  // Register connection request handler
  const unregisterRequest = steam.networkingSockets.onConnectionRequest((request) => {
    connectionRequestReceived = true;
    console.log(`Connection request from: ${request.identityRemote} on socket ${request.listenSocket}`);
  });

  // Register state change handler
  const unregisterStateChange = steam.networkingSockets.onConnectionStateChange((change) => {
    console.log(`State: ${getConnectionStateName(change.oldState)} -> ${getConnectionStateName(change.newState)}`);
    
    if (change.newState === ESteamNetworkingConnectionState.Connecting) {
      console.log(`Incoming connection from: ${change.info.identityRemote}`);
      
      // ============================================
      // Test: acceptConnection()
      // ============================================
      const acceptResult = steam.networkingSockets.acceptConnection(change.connection);
      if (acceptResult === EResult.OK) {
        console.log('✓ Connection accepted');
        clientConnection = change.connection;
      }
    }
    
    if (change.newState === ESteamNetworkingConnectionState.Connected) {
      console.log('✓ Connected!');
      connected = true;
    }
    
    if (change.newState === ESteamNetworkingConnectionState.ClosedByPeer ||
        change.newState === ESteamNetworkingConnectionState.ProblemDetectedLocally) {
      console.log(`Connection closed: ${change.info.endDebugMessage}`);
      clientConnection = k_HSteamNetConnection_Invalid;
      connected = false;
    }
  });

  console.log('Waiting for client...');

  while (!connected) {
    steam.runCallbacks();
    steam.networkingSockets.runCallbacks();
    
    if (Date.now() - waitStart > connectionTimeout) {
      console.error('✗ Timeout');
      steam.networkingSockets.closeListenSocket(listenSocket);
      steam.shutdown();
      process.exit(1);
    }
    
    await delay(100);
  }
  console.log('');

  // ============================================
  // Test: getPendingStateChanges() & getPendingConnectionRequests()
  // ============================================
  console.log('--- Testing getPendingStateChanges() & getPendingConnectionRequests() ---');
  const pendingChanges = steam.networkingSockets.getPendingStateChanges();
  const pendingRequests = steam.networkingSockets.getPendingConnectionRequests();
  console.log(`Pending state changes: ${pendingChanges.length}`);
  console.log(`Pending connection requests: ${pendingRequests.length}`);
  console.log(`Connection request received via handler: ${connectionRequestReceived}`);
  console.log('');

  // ============================================
  // Test: getActiveConnections() & isConnectionActive()
  // ============================================
  console.log('--- Testing getActiveConnections() & isConnectionActive() ---');
  const activeConnections = steam.networkingSockets.getActiveConnections();
  console.log(`Active connections: [${activeConnections.join(', ')}]`);
  const isActive = steam.networkingSockets.isConnectionActive(clientConnection);
  console.log(`Connection ${clientConnection} is active: ${isActive}`);
  console.log('');

  // ============================================
  // Test: getConnectionInfo()
  // ============================================
  console.log('--- Testing getConnectionInfo() ---');
  const info = steam.networkingSockets.getConnectionInfo(clientConnection);
  if (info) {
    console.log(`Connected to: ${info.identityRemote}`);
    console.log(`State: ${info.stateName}`);
    console.log(`Listen socket: ${info.listenSocket}`);
    console.log(`POP Remote: ${info.popIdRemote}`);
    console.log(`POP Relay: ${info.popIdRelay}`);
  }
  console.log('');

  // ============================================
  // Test: getConnectionRealTimeStatus()
  // ============================================
  console.log('--- Testing getConnectionRealTimeStatus() ---');
  const rtStatus = steam.networkingSockets.getConnectionRealTimeStatus(clientConnection);
  if (rtStatus) {
    console.log(`Ping: ${rtStatus.ping} ms`);
    console.log(`Quality local: ${(rtStatus.connectionQualityLocal * 100).toFixed(1)}%`);
    console.log(`Quality remote: ${(rtStatus.connectionQualityRemote * 100).toFixed(1)}%`);
    console.log(`Out packets/sec: ${rtStatus.outPacketsPerSec.toFixed(1)}`);
    console.log(`In packets/sec: ${rtStatus.inPacketsPerSec.toFixed(1)}`);
    console.log(`Pending reliable: ${rtStatus.pendingReliable} bytes`);
  }
  console.log('');

  // ============================================
  // Test: getDetailedConnectionStatus()
  // ============================================
  console.log('--- Testing getDetailedConnectionStatus() ---');
  const detailedStatus = steam.networkingSockets.getDetailedConnectionStatus(clientConnection);
  if (detailedStatus) {
    // Just show first 200 chars to keep output manageable
    console.log('Detailed status (first 200 chars):');
    console.log(detailedStatus.substring(0, 200) + '...');
  }
  console.log('');

  // ============================================
  // Test: setConnectionName() & getConnectionName()
  // ============================================
  console.log('--- Testing setConnectionName() & getConnectionName() ---');
  steam.networkingSockets.setConnectionName(clientConnection, 'TestClient');
  const connName = steam.networkingSockets.getConnectionName(clientConnection);
  console.log(`Connection name: "${connName}"`);
  console.log('');

  // ============================================
  // Test: setConnectionUserData() & getConnectionUserData()
  // ============================================
  console.log('--- Testing setConnectionUserData() & getConnectionUserData() ---');
  const testUserData = BigInt(12345678901234);
  const setResult = steam.networkingSockets.setConnectionUserData(clientConnection, testUserData);
  console.log(`setConnectionUserData result: ${setResult}`);
  const userData = steam.networkingSockets.getConnectionUserData(clientConnection);
  console.log(`getConnectionUserData result: ${userData}`);
  console.log(`User data matches: ${userData === testUserData}`);
  console.log('');

  // ============================================
  // Test: createPollGroup(), setConnectionPollGroup(), destroyPollGroup()
  // ============================================
  console.log('--- Testing Poll Groups ---');
  const pollGroup: HSteamNetPollGroup = steam.networkingSockets.createPollGroup();
  console.log(`Created poll group: ${pollGroup}`);
  
  if (pollGroup !== k_HSteamNetPollGroup_Invalid) {
    const addResult = steam.networkingSockets.setConnectionPollGroup(clientConnection, pollGroup);
    console.log(`Added connection to poll group: ${addResult}`);
  }
  console.log('');

  // ============================================
  // Test: sendReliable() (sendMessage with reliable flag)
  // ============================================
  console.log('--- Testing sendReliable() ---');
  const reliableMsg = Buffer.from(JSON.stringify({
    type: 'welcome',
    message: 'Hello from host (reliable)!',
    timestamp: Date.now()
  }));
  const reliableResult = steam.networkingSockets.sendReliable(clientConnection, reliableMsg);
  console.log(`Reliable send result: ${reliableResult.success ? 'OK' : 'Failed'}, messageNumber: ${reliableResult.messageNumber}`);
  console.log('');

  // ============================================
  // Test: sendUnreliable()
  // ============================================
  console.log('--- Testing sendUnreliable() ---');
  const unreliableMsg = Buffer.from(JSON.stringify({
    type: 'position',
    x: 100,
    y: 200,
    timestamp: Date.now()
  }));
  const unreliableResult = steam.networkingSockets.sendUnreliable(clientConnection, unreliableMsg);
  console.log(`Unreliable send result: ${unreliableResult.success ? 'OK' : 'Failed'}, messageNumber: ${unreliableResult.messageNumber}`);
  console.log('');

  // ============================================
  // Test: flushMessages()
  // ============================================
  console.log('--- Testing flushMessages() ---');
  const flushResult = steam.networkingSockets.flushMessages(clientConnection);
  console.log(`Flush result: ${flushResult}`);
  console.log('');

  // ============================================
  // Test: receiveMessages() & receiveMessagesOnPollGroup()
  // ============================================
  console.log('--- Testing receiveMessages() & receiveMessagesOnPollGroup() ---');
  console.log('Receiving messages (5 seconds)...');
  const receiveEnd = Date.now() + 5000;
  let messageCount = 0;
  let pollGroupMessageCount = 0;

  while (Date.now() < receiveEnd && connected) {
    steam.runCallbacks();
    steam.networkingSockets.runCallbacks();
    
    // Test regular receive
    const messages = steam.networkingSockets.receiveMessages(clientConnection);
    for (const msg of messages) {
      messageCount++;
      console.log(`[receiveMessages] Message #${messageCount}: ${msg.size} bytes`);
      if (msg.data) {
        try {
          console.log(`  Data: ${msg.data.toString('utf8').substring(0, 100)}`);
        } catch (e) {
          console.log('  (binary data)');
        }
      }
    }
    
    // Test poll group receive (if poll group is valid)
    if (pollGroup !== k_HSteamNetPollGroup_Invalid) {
      const pollMessages = steam.networkingSockets.receiveMessagesOnPollGroup(pollGroup);
      for (const msg of pollMessages) {
        pollGroupMessageCount++;
        console.log(`[receiveMessagesOnPollGroup] Message #${pollGroupMessageCount}: ${msg.size} bytes from connection ${msg.connection}`);
      }
    }
    
    await delay(50);
  }
  console.log(`Received ${messageCount} messages via receiveMessages()`);
  console.log(`Received ${pollGroupMessageCount} messages via receiveMessagesOnPollGroup()`);
  console.log('');

  // ============================================
  // Test: destroyPollGroup()
  // ============================================
  if (pollGroup !== k_HSteamNetPollGroup_Invalid) {
    console.log('--- Testing destroyPollGroup() ---');
    const destroyResult = steam.networkingSockets.destroyPollGroup(pollGroup);
    console.log(`destroyPollGroup result: ${destroyResult}`);
    console.log('');
  }

  // ============================================
  // Test: Unregister handlers
  // ============================================
  console.log('--- Testing handler unregistration ---');
  unregisterStateChange();
  unregisterRequest();
  console.log('Handlers unregistered');
  console.log('');

  // ============================================
  // Test: closeConnection()
  // ============================================
  console.log('--- Testing closeConnection() ---');
  if (clientConnection !== k_HSteamNetConnection_Invalid) {
    const closeResult = steam.networkingSockets.closeConnection(clientConnection, 0, 'Test complete', false);
    console.log(`closeConnection result: ${closeResult}`);
  }
  console.log('');

  // ============================================
  // Test: closeListenSocket()
  // ============================================
  console.log('--- Testing closeListenSocket() ---');
  const closeSocketResult = steam.networkingSockets.closeListenSocket(listenSocket);
  console.log(`closeListenSocket result: ${closeSocketResult}`);
  console.log('');

  // ============================================
  // Test: closeAll() - create new resources first
  // ============================================
  console.log('--- Testing closeAll() ---');
  // Create a new listen socket and poll group to test closeAll
  const testSocket = steam.networkingSockets.createListenSocketP2P(1);
  const testPollGroup = steam.networkingSockets.createPollGroup();
  console.log(`Created test socket: ${testSocket}, poll group: ${testPollGroup}`);
  
  steam.networkingSockets.closeAll();
  
  const afterCloseAll = steam.networkingSockets.getActiveListenSockets();
  const afterCloseAllConnections = steam.networkingSockets.getActiveConnections();
  console.log(`After closeAll - sockets: ${afterCloseAll.length}, connections: ${afterCloseAllConnections.length}`);
  console.log('');

  // ============================================
  // Summary
  // ============================================
  console.log('='.repeat(60));
  console.log('TEST SUMMARY - ALL PUBLIC METHODS COVERED');
  console.log('='.repeat(60));
  console.log('✓ createListenSocketP2P()');
  console.log('✓ closeListenSocket()');
  console.log('✓ connectP2P() - tested by client');
  console.log('✓ acceptConnection()');
  console.log('✓ closeConnection()');
  console.log('✓ sendReliable()');
  console.log('✓ sendUnreliable()');
  console.log('✓ flushMessages()');
  console.log('✓ receiveMessages()');
  console.log('✓ createPollGroup()');
  console.log('✓ destroyPollGroup()');
  console.log('✓ setConnectionPollGroup()');
  console.log('✓ receiveMessagesOnPollGroup()');
  console.log('✓ getConnectionInfo()');
  console.log('✓ getConnectionRealTimeStatus()');
  console.log('✓ getDetailedConnectionStatus()');
  console.log('✓ setConnectionUserData()');
  console.log('✓ getConnectionUserData()');
  console.log('✓ setConnectionName()');
  console.log('✓ getConnectionName()');
  console.log('✓ getIdentity()');
  console.log('✓ initAuthentication()');
  console.log('✓ getAuthenticationStatus()');
  console.log('✓ runCallbacks()');
  console.log('✓ onConnectionStateChange()');
  console.log('✓ onConnectionRequest()');
  console.log('✓ getPendingStateChanges()');
  console.log('✓ getPendingConnectionRequests()');
  console.log('✓ getActiveConnections()');
  console.log('✓ getActiveListenSockets()');
  console.log('✓ isConnectionActive()');
  console.log('✓ closeAll()');
  console.log('');

  // Cleanup
  console.log('Shutting down...');
  steam.shutdown();
  console.log('Done!');
}

testNetworkingSocketsHost().catch(console.error);
