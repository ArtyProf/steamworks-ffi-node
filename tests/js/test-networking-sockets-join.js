/**
 * Networking Sockets Join Test (JavaScript)
 * 
 * This test demonstrates P2P networking as a CLIENT (joining a host).
 * It covers the client-side public methods of SteamNetworkingSocketsManager.
 * 
 * Usage:
 *   npm run test:sockets:join:js -- <host_steam_id>
 */

const { 
  SteamworksSDK,
  ESteamNetworkingConnectionState,
  ESteamNetworkingAvailability,
  k_HSteamNetConnection_Invalid,
  EResult,
  getConnectionStateName,
} = require('../../dist');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testNetworkingSocketsJoin() {
  // Get host Steam ID from command line
  const hostSteamId = process.argv[2];
  
  if (!hostSteamId) {
    console.error('Usage: npm run test:sockets:join:js -- <host_steam_id>');
    console.error('Example: npm run test:sockets:join:js -- 76561198000000000');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('NETWORKING SOCKETS JOIN TEST (P2P Client)');
  console.log('Covers client-side methods of SteamNetworkingSocketsManager');
  console.log('='.repeat(60));
  console.log('');
  console.log('Connecting to host: ' + hostSteamId);
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
  console.log('Client: ' + playerName + ' (' + status.steamId + ')');
  console.log('');

  // ============================================
  // Test: getIdentity()
  // ============================================
  console.log('--- Testing getIdentity() ---');
  const identity = steam.networkingSockets.getIdentity();
  console.log('Our identity: ' + identity);
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
  // Test: onConnectionStateChange()
  // ============================================
  console.log('--- Testing onConnectionStateChange() ---');
  let connected = false;
  let disconnected = false;
  
  const unregisterStateChange = steam.networkingSockets.onConnectionStateChange((change) => {
    console.log('State: ' + getConnectionStateName(change.oldState) + ' -> ' + getConnectionStateName(change.newState));
    
    if (change.newState === ESteamNetworkingConnectionState.Connected) {
      connected = true;
    }
    
    if (change.newState === ESteamNetworkingConnectionState.ClosedByPeer ||
        change.newState === ESteamNetworkingConnectionState.ProblemDetectedLocally) {
      console.log('Disconnected: ' + change.info.endDebugMessage);
      disconnected = true;
    }
  });
  console.log('');

  // ============================================
  // Test: connectP2P()
  // ============================================
  console.log('--- Testing connectP2P() ---');
  console.log('Connecting to: ' + hostSteamId);

  const connection = steam.networkingSockets.connectP2P(hostSteamId, 0);
  
  if (connection === k_HSteamNetConnection_Invalid) {
    console.error('✗ Failed to initiate connection!');
    steam.shutdown();
    process.exit(1);
  }

  console.log('✓ Connection handle: ' + connection);
  console.log('');

  // ============================================
  // Test: getActiveConnections() & isConnectionActive()
  // ============================================
  console.log('--- Testing getActiveConnections() & isConnectionActive() ---');
  const activeConnections = steam.networkingSockets.getActiveConnections();
  console.log('Active connections: [' + activeConnections.join(', ') + ']');
  const isActive = steam.networkingSockets.isConnectionActive(connection);
  console.log('Connection ' + connection + ' is active: ' + isActive);
  console.log('');

  // Wait for connection
  console.log('Waiting for connection...');
  const connectionTimeout = 30000;
  const connectStart = Date.now();

  while (!connected && !disconnected) {
    steam.runCallbacks();
    steam.networkingSockets.runCallbacks();
    
    if (Date.now() - connectStart > connectionTimeout) {
      console.error('✗ Connection timeout');
      steam.networkingSockets.closeConnection(connection, 0, 'Timeout');
      steam.shutdown();
      process.exit(1);
    }
    
    await delay(100);
  }

  if (disconnected) {
    console.error('✗ Connection failed');
    steam.shutdown();
    process.exit(1);
  }

  console.log('✓ Connected!');
  console.log('');

  // ============================================
  // Test: getConnectionInfo()
  // ============================================
  console.log('--- Testing getConnectionInfo() ---');
  const info = steam.networkingSockets.getConnectionInfo(connection);
  if (info) {
    console.log('Connected to: ' + info.identityRemote);
    console.log('State: ' + info.stateName);
    console.log('POP Remote: ' + info.popIdRemote);
    console.log('POP Relay: ' + info.popIdRelay);
  }
  console.log('');

  // ============================================
  // Test: getConnectionRealTimeStatus()
  // ============================================
  console.log('--- Testing getConnectionRealTimeStatus() ---');
  const rtStatus = steam.networkingSockets.getConnectionRealTimeStatus(connection);
  if (rtStatus) {
    console.log('Ping: ' + rtStatus.ping + ' ms');
    console.log('Quality local: ' + (rtStatus.connectionQualityLocal * 100).toFixed(1) + '%');
    console.log('Quality remote: ' + (rtStatus.connectionQualityRemote * 100).toFixed(1) + '%');
  }
  console.log('');

  // ============================================
  // Test: setConnectionName() & getConnectionName()
  // ============================================
  console.log('--- Testing setConnectionName() & getConnectionName() ---');
  steam.networkingSockets.setConnectionName(connection, 'HostConnection');
  const connName = steam.networkingSockets.getConnectionName(connection);
  console.log('Connection name: "' + connName + '"');
  console.log('');

  // ============================================
  // Test: sendReliable()
  // ============================================
  console.log('--- Testing sendReliable() ---');
  const reliableMsg = Buffer.from(JSON.stringify({
    type: 'greeting',
    message: 'Hello from client!',
    clientName: playerName,
    timestamp: Date.now()
  }));
  const reliableResult = steam.networkingSockets.sendReliable(connection, reliableMsg);
  console.log('Reliable send result: ' + (reliableResult.success ? 'OK' : 'Failed') + ', messageNumber: ' + reliableResult.messageNumber);
  console.log('');

  // ============================================
  // Test: sendUnreliable()
  // ============================================
  console.log('--- Testing sendUnreliable() ---');
  const unreliableMsg = Buffer.from(JSON.stringify({
    type: 'position',
    x: 50,
    y: 75,
    timestamp: Date.now()
  }));
  const unreliableResult = steam.networkingSockets.sendUnreliable(connection, unreliableMsg);
  console.log('Unreliable send result: ' + (unreliableResult.success ? 'OK' : 'Failed') + ', messageNumber: ' + unreliableResult.messageNumber);
  console.log('');

  // ============================================
  // Test: flushMessages()
  // ============================================
  console.log('--- Testing flushMessages() ---');
  const flushResult = steam.networkingSockets.flushMessages(connection);
  console.log('Flush result: ' + flushResult);
  console.log('');

  // ============================================
  // Test: receiveMessages()
  // ============================================
  console.log('--- Testing receiveMessages() ---');
  console.log('Receiving messages (3 seconds)...');
  const receiveEnd = Date.now() + 3000;
  let messageCount = 0;

  while (Date.now() < receiveEnd && !disconnected) {
    steam.runCallbacks();
    steam.networkingSockets.runCallbacks();
    
    const messages = steam.networkingSockets.receiveMessages(connection);
    
    for (const msg of messages) {
      messageCount++;
      console.log('Message #' + messageCount + ': ' + msg.size + ' bytes');
      if (msg.data) {
        try {
          console.log('  Data: ' + msg.data.toString('utf8').substring(0, 100));
        } catch (e) {
          console.log('  (binary data)');
        }
      }
    }
    
    await delay(50);
  }
  console.log('Received ' + messageCount + ' messages');
  console.log('');

  // ============================================
  // Test: getDetailedConnectionStatus()
  // ============================================
  console.log('--- Testing getDetailedConnectionStatus() ---');
  const detailedStatus = steam.networkingSockets.getDetailedConnectionStatus(connection);
  if (detailedStatus) {
    console.log('Detailed status (first 200 chars):');
    console.log(detailedStatus.substring(0, 200) + '...');
  }
  console.log('');

  // Unregister handler
  unregisterStateChange();
  console.log('Handler unregistered');
  console.log('');

  // ============================================
  // Test: closeConnection()
  // ============================================
  console.log('--- Testing closeConnection() ---');
  const closeResult = steam.networkingSockets.closeConnection(connection, 0, 'Done', false);
  console.log('closeConnection result: ' + closeResult);
  console.log('');

  // ============================================
  // Summary
  // ============================================
  console.log('='.repeat(60));
  console.log('TEST SUMMARY - CLIENT METHODS COVERED');
  console.log('='.repeat(60));
  console.log('✓ connectP2P()');
  console.log('✓ closeConnection()');
  console.log('✓ sendReliable()');
  console.log('✓ sendUnreliable()');
  console.log('✓ flushMessages()');
  console.log('✓ receiveMessages()');
  console.log('✓ getConnectionInfo()');
  console.log('✓ getConnectionRealTimeStatus()');
  console.log('✓ getDetailedConnectionStatus()');
  console.log('✓ setConnectionName()');
  console.log('✓ getConnectionName()');
  console.log('✓ getIdentity()');
  console.log('✓ runCallbacks()');
  console.log('✓ onConnectionStateChange()');
  console.log('✓ getActiveConnections()');
  console.log('✓ isConnectionActive()');
  console.log('');

  // Cleanup
  console.log('Shutting down...');
  steam.shutdown();
  console.log('Done!');
}

testNetworkingSocketsJoin().catch(console.error);
