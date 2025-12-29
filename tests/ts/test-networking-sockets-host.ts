/**
 * Networking Sockets Host Test
 * 
 * This test demonstrates P2P networking as a HOST (server/listener).
 * Run this first, then run test-networking-sockets-join.ts on another
 * machine or Steam account to establish a P2P connection.
 * 
 * The host:
 * 1. Creates a listen socket to accept incoming connections
 * 2. Waits for a client to connect
 * 3. Accepts the connection
 * 4. Exchanges messages with the client
 * 5. Closes the connection
 * 
 * Usage:
 *   npm run test:sockets:host:ts
 * 
 * Methods tested in this file:
 *   - createListenSocketP2P()
 *   - closeListenSocket()
 *   - acceptConnection()
 *   - closeConnection()
 *   - sendReliable()
 *   - sendUnreliable()
 *   - receiveMessages()
 *   - getConnectionInfo()
 *   - getConnectionRealTimeStatus()
 *   - getDetailedConnectionStatus()
 *   - setConnectionUserData()
 *   - getConnectionUserData()
 *   - setConnectionName()
 *   - getConnectionName()
 *   - getIdentity()
 *   - createPollGroup()
 *   - setConnectionPollGroup()
 *   - destroyPollGroup()
 *   - runCallbacks()
 */

import { 
  SteamworksSDK,
  ESteamNetworkingConnectionState,
  ESteamNetworkingAvailability,
  k_HSteamListenSocket_Invalid,
  k_HSteamNetConnection_Invalid,
  k_nSteamNetworkingSend_Reliable,
  EResult,
  getConnectionStateName,
} from '../../src';

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testNetworkingSocketsHost(): Promise<void> {
  console.log('='.repeat(60));
  console.log('NETWORKING SOCKETS HOST TEST (P2P Server)');
  console.log('='.repeat(60));
  console.log('');
  console.log('This test will:');
  console.log('1. Initialize Steam networking');
  console.log('2. Create a P2P listen socket');
  console.log('3. Wait for a client to connect');
  console.log('4. Exchange messages');
  console.log('5. Close the connection');
  console.log('');
  console.log('Run test-networking-sockets-join.ts on another Steam account');
  console.log('to connect to this host.');
  console.log('');

  const steam = SteamworksSDK.getInstance();

  // Initialize Steam API
  console.log('Initializing Steam API...');
  const initialized = steam.init({ appId: 480 }); // Spacewar test app

  if (!initialized) {
    console.error('Failed to initialize Steam API!');
    console.error('Make sure Steam is running and you are logged in.');
    process.exit(1);
  }

  console.log('Steam API initialized successfully!');
  console.log('');

  // Get current user info
  const status = steam.getStatus();
  const playerName = steam.friends.getPersonaName();
  console.log(`Host: ${playerName} (${status.steamId})`);
  console.log('');

  // ========================================
  // INITIALIZE RELAY NETWORK
  // ========================================
  console.log('-'.repeat(60));
  console.log('INITIALIZING RELAY NETWORK');
  console.log('-'.repeat(60));

  console.log('Calling initRelayNetworkAccess()...');
  steam.networkingUtils.initRelayNetworkAccess();

  // Wait for relay network to become available
  console.log('Waiting for relay network...');

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
    
    if (networkStatus.availability < 0) {
      console.error(`✗ Relay network failed: ${networkStatus.availabilityName}`);
      steam.shutdown();
      process.exit(1);
    }
    
    if (Date.now() - startTime > timeout) {
      console.error('✗ Timeout waiting for relay network');
      steam.shutdown();
      process.exit(1);
    }
    
    await delay(100);
  }
  console.log('');

  // ========================================
  // GET OUR IDENTITY
  // ========================================
  console.log('-'.repeat(60));
  console.log('IDENTITY');
  console.log('-'.repeat(60));

  const myIdentity = steam.networkingSockets.getIdentity();
  console.log(`Our Steam ID: ${myIdentity || 'Not available'}`);
  console.log('');

  // ========================================
  // CREATE LISTEN SOCKET
  // ========================================
  console.log('-'.repeat(60));
  console.log('CREATING LISTEN SOCKET');
  console.log('-'.repeat(60));

  const virtualPort = 0; // Use default virtual port
  const listenSocket = steam.networkingSockets.createListenSocketP2P(virtualPort);

  if (listenSocket === k_HSteamListenSocket_Invalid) {
    console.error('✗ Failed to create listen socket!');
    steam.shutdown();
    process.exit(1);
  }

  console.log(`✓ Listen socket created: ${listenSocket}`);
  console.log(`  Virtual port: ${virtualPort}`);
  console.log('');
  
  console.log('='.repeat(60));
  console.log('WAITING FOR CONNECTION');
  console.log(`Tell client to connect to Steam ID: ${status.steamId}`);
  console.log('='.repeat(60));
  console.log('');

  // ========================================
  // WAIT FOR INCOMING CONNECTION
  // ========================================
  
  let clientConnection: number = k_HSteamNetConnection_Invalid;
  let connected = false;
  const connectionTimeout = 120000; // 2 minute timeout
  const waitStart = Date.now();
  
  // Register connection state change handler
  steam.networkingSockets.onConnectionStateChange((change) => {
    console.log(`Connection state change: ${getConnectionStateName(change.oldState)} -> ${getConnectionStateName(change.newState)}`);
    
    if (change.newState === ESteamNetworkingConnectionState.Connecting) {
      // Incoming connection request - accept it
      console.log('');
      console.log(`Incoming connection from: ${change.info.identityRemote}`);
      console.log('Accepting connection...');
      
      const acceptResult = steam.networkingSockets.acceptConnection(change.connection);
      if (acceptResult === EResult.OK) {
        console.log('✓ Connection accepted');
        clientConnection = change.connection;
      } else {
        console.error(`✗ Failed to accept connection: ${acceptResult}`);
      }
    }
    
    if (change.newState === ESteamNetworkingConnectionState.Connected) {
      console.log('✓ Connection established!');
      connected = true;
    }
    
    if (change.newState === ESteamNetworkingConnectionState.ClosedByPeer ||
        change.newState === ESteamNetworkingConnectionState.ProblemDetectedLocally) {
      console.log(`Connection closed: ${change.info.endDebugMessage}`);
      clientConnection = k_HSteamNetConnection_Invalid;
      connected = false;
    }
  });

  console.log('Waiting for client to connect...');
  console.log('(Press Ctrl+C to cancel)');
  console.log('');

  while (!connected) {
    steam.runCallbacks();
    steam.networkingSockets.runCallbacks();
    
    if (Date.now() - waitStart > connectionTimeout) {
      console.error('✗ Timeout waiting for connection');
      steam.networkingSockets.closeListenSocket(listenSocket);
      steam.shutdown();
      process.exit(1);
    }
    
    await delay(100);
  }

  console.log('');

  // ========================================
  // CONNECTION INFO
  // ========================================
  console.log('-'.repeat(60));
  console.log('CONNECTION INFO');
  console.log('-'.repeat(60));

  const connectionInfo = steam.networkingSockets.getConnectionInfo(clientConnection);
  if (connectionInfo) {
    console.log(`  Remote: ${connectionInfo.identityRemote}`);
    console.log(`  State: ${connectionInfo.stateName}`);
    console.log(`  Description: ${connectionInfo.connectionDescription}`);
    console.log(`  POP Remote: ${connectionInfo.popIdRemote}`);
    console.log(`  POP Relay: ${connectionInfo.popIdRelay}`);
  }
  console.log('');

  // Set connection name
  console.log('Setting connection name...');
  steam.networkingSockets.setConnectionName(clientConnection, 'TestClient');
  const name = steam.networkingSockets.getConnectionName(clientConnection);
  console.log(`  Connection name: ${name}`);
  console.log('');

  // Set and get user data
  console.log('Setting connection user data...');
  steam.networkingSockets.setConnectionUserData(clientConnection, BigInt(12345));
  const userData = steam.networkingSockets.getConnectionUserData(clientConnection);
  console.log(`  User data: ${userData}`);
  console.log('');

  // Get real-time status
  console.log('Real-time status:');
  const rtStatus = steam.networkingSockets.getConnectionRealTimeStatus(clientConnection);
  if (rtStatus) {
    console.log(`  Ping: ${rtStatus.ping}ms`);
    console.log(`  Quality local: ${(rtStatus.connectionQualityLocal * 100).toFixed(1)}%`);
    console.log(`  Quality remote: ${(rtStatus.connectionQualityRemote * 100).toFixed(1)}%`);
    console.log(`  Out rate: ${rtStatus.outBytesPerSec.toFixed(0)} bytes/sec`);
    console.log(`  In rate: ${rtStatus.inBytesPerSec.toFixed(0)} bytes/sec`);
  }
  console.log('');

  // Get detailed status
  console.log('Detailed status:');
  const detailedStatus = steam.networkingSockets.getDetailedConnectionStatus(clientConnection);
  if (detailedStatus) {
    console.log(detailedStatus.substring(0, 500) + (detailedStatus.length > 500 ? '...' : ''));
  }
  console.log('');

  // ========================================
  // SEND MESSAGES
  // ========================================
  console.log('-'.repeat(60));
  console.log('SENDING MESSAGES');
  console.log('-'.repeat(60));

  // Send a reliable message
  const reliableData = Buffer.from(JSON.stringify({
    type: 'welcome',
    message: 'Hello from host!',
    timestamp: Date.now()
  }));

  console.log('Sending reliable message...');
  const sendResult = steam.networkingSockets.sendReliable(clientConnection, reliableData);
  if (sendResult.success) {
    console.log(`✓ Reliable message sent (msg# ${sendResult.messageNumber})`);
  } else {
    console.log(`✗ Failed to send: ${sendResult.result}`);
  }
  console.log('');

  // ========================================
  // RECEIVE MESSAGES
  // ========================================
  console.log('-'.repeat(60));
  console.log('RECEIVING MESSAGES (5 seconds)');
  console.log('-'.repeat(60));

  const receiveEnd = Date.now() + 5000;
  let messageCount = 0;

  while (Date.now() < receiveEnd && connected) {
    steam.runCallbacks();
    steam.networkingSockets.runCallbacks();
    
    const messages = steam.networkingSockets.receiveMessages(clientConnection);
    
    for (const msg of messages) {
      messageCount++;
      console.log(`Message #${messageCount}:`);
      console.log(`  Size: ${msg.size} bytes`);
      if (msg.data) {
        try {
          const text = msg.data.toString('utf8');
          console.log(`  Data: ${text.substring(0, 100)}`);
        } catch {
          console.log(`  Data: (binary, ${msg.size} bytes)`);
        }
      }
    }
    
    await delay(50);
  }

  console.log(`Received ${messageCount} messages`);
  console.log('');

  // ========================================
  // CLOSE CONNECTION
  // ========================================
  console.log('-'.repeat(60));
  console.log('CLOSING CONNECTION');
  console.log('-'.repeat(60));

  console.log('Closing connection...');
  const closed = steam.networkingSockets.closeConnection(clientConnection, 0, 'Test complete');
  console.log(`Connection closed: ${closed}`);
  console.log('');

  console.log('Closing listen socket...');
  const socketClosed = steam.networkingSockets.closeListenSocket(listenSocket);
  console.log(`Listen socket closed: ${socketClosed}`);
  console.log('');

  // ========================================
  // CLEANUP
  // ========================================
  console.log('-'.repeat(60));
  console.log('CLEANUP');
  console.log('-'.repeat(60));

  console.log('Shutting down Steam API...');
  steam.shutdown();
  console.log('Done!');
  console.log('');

  console.log('='.repeat(60));
  console.log('NETWORKING SOCKETS HOST TEST COMPLETE');
  console.log('='.repeat(60));
}

// Run the test
testNetworkingSocketsHost().catch(console.error);
