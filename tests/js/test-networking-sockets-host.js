/**
 * Networking Sockets Host Test (JavaScript)
 * 
 * This test demonstrates P2P networking as a HOST (server/listener).
 * See tests/ts/test-networking-sockets-host.ts for the TypeScript version
 * with full documentation.
 * 
 * Usage:
 *   npm run test:sockets:host
 */

const { 
  SteamworksSDK,
  ESteamNetworkingConnectionState,
  ESteamNetworkingAvailability,
  k_HSteamListenSocket_Invalid,
  k_HSteamNetConnection_Invalid,
  EResult,
  getConnectionStateName,
} = require('../../dist');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testNetworkingSocketsHost() {
  console.log('='.repeat(60));
  console.log('NETWORKING SOCKETS HOST TEST (P2P Server)');
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

  // Initialize relay network
  console.log('Initializing relay network...');
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

  // Create listen socket
  console.log('Creating listen socket...');
  const listenSocket = steam.networkingSockets.createListenSocketP2P(0);

  if (listenSocket === k_HSteamListenSocket_Invalid) {
    console.error('✗ Failed to create listen socket!');
    steam.shutdown();
    process.exit(1);
  }

  console.log(`✓ Listen socket created: ${listenSocket}`);
  console.log('');
  
  console.log('='.repeat(60));
  console.log(`Tell client to connect to: ${status.steamId}`);
  console.log('='.repeat(60));
  console.log('');

  // Wait for connection
  let clientConnection = k_HSteamNetConnection_Invalid;
  let connected = false;
  const connectionTimeout = 120000;
  const waitStart = Date.now();
  
  steam.networkingSockets.onConnectionStateChange((change) => {
    console.log(`State: ${getConnectionStateName(change.oldState)} -> ${getConnectionStateName(change.newState)}`);
    
    if (change.newState === ESteamNetworkingConnectionState.Connecting) {
      console.log(`Incoming connection from: ${change.info.identityRemote}`);
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

  // Show connection info
  const info = steam.networkingSockets.getConnectionInfo(clientConnection);
  if (info) {
    console.log(`Connected to: ${info.identityRemote}`);
  }
  console.log('');

  // Send message
  console.log('Sending welcome message...');
  const msg = Buffer.from(JSON.stringify({
    type: 'welcome',
    message: 'Hello from host!',
    timestamp: Date.now()
  }));
  const sendResult = steam.networkingSockets.sendReliable(clientConnection, msg);
  console.log(`Send result: ${sendResult.success ? 'OK' : 'Failed'}`);
  console.log('');

  // Receive messages
  console.log('Receiving messages (5 seconds)...');
  const receiveEnd = Date.now() + 5000;
  let messageCount = 0;

  while (Date.now() < receiveEnd && connected) {
    steam.runCallbacks();
    steam.networkingSockets.runCallbacks();
    
    const messages = steam.networkingSockets.receiveMessages(clientConnection);
    
    for (const msg of messages) {
      messageCount++;
      console.log(`Message #${messageCount}: ${msg.size} bytes`);
      if (msg.data) {
        try {
          console.log(`  Data: ${msg.data.toString('utf8').substring(0, 100)}`);
        } catch {
          console.log(`  (binary data)`);
        }
      }
    }
    
    await delay(50);
  }
  console.log(`Received ${messageCount} messages`);
  console.log('');

  // Cleanup
  console.log('Closing...');
  steam.networkingSockets.closeConnection(clientConnection, 0, 'Done');
  steam.networkingSockets.closeListenSocket(listenSocket);
  steam.shutdown();
  console.log('Done!');
}

testNetworkingSocketsHost().catch(console.error);
