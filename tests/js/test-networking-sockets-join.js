/**
 * Networking Sockets Join Test (JavaScript)
 * 
 * This test demonstrates P2P networking as a CLIENT (joiner).
 * See tests/ts/test-networking-sockets-join.ts for the TypeScript version
 * with full documentation.
 * 
 * Usage:
 *   npm run test:sockets:join -- <host_steam_id>
 */

const { 
  SteamworksSDK,
  ESteamNetworkingConnectionState,
  ESteamNetworkingAvailability,
  k_HSteamNetConnection_Invalid,
  getConnectionStateName,
} = require('../../dist');

const readline = require('readline');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testNetworkingSocketsJoin() {
  console.log('='.repeat(60));
  console.log('NETWORKING SOCKETS JOIN TEST (P2P Client)');
  console.log('='.repeat(60));
  console.log('');

  // Get host Steam ID
  let hostSteamId = process.argv[2];

  if (!hostSteamId) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    hostSteamId = await new Promise((resolve) => {
      rl.question('Enter host Steam ID: ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
    
    if (!hostSteamId) {
      console.error('No Steam ID provided.');
      process.exit(1);
    }
  }

  console.log(`Connecting to: ${hostSteamId}`);
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
  console.log(`Client: ${playerName} (${status.steamId})`);
  console.log('');

  if (status.steamId === hostSteamId) {
    console.error('Cannot connect to yourself!');
    steam.shutdown();
    process.exit(1);
  }

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

  // Connect to host
  console.log('Connecting to host...');
  
  let connected = false;
  let disconnected = false;

  steam.networkingSockets.onConnectionStateChange((change) => {
    console.log(`State: ${getConnectionStateName(change.oldState)} -> ${getConnectionStateName(change.newState)}`);
    
    if (change.newState === ESteamNetworkingConnectionState.Connected) {
      connected = true;
    }
    
    if (change.newState === ESteamNetworkingConnectionState.ClosedByPeer ||
        change.newState === ESteamNetworkingConnectionState.ProblemDetectedLocally) {
      console.log(`Connection closed: ${change.info.endDebugMessage}`);
      disconnected = true;
    }
  });

  const connection = steam.networkingSockets.connectP2P(hostSteamId, 0);
  
  if (connection === k_HSteamNetConnection_Invalid) {
    console.error('✗ Failed to initiate connection!');
    steam.shutdown();
    process.exit(1);
  }

  console.log(`Connection handle: ${connection}`);

  // Wait for connection
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

  // Show connection info
  const info = steam.networkingSockets.getConnectionInfo(connection);
  if (info) {
    console.log(`Connected to: ${info.identityRemote}`);
  }
  console.log('');

  // Send message
  console.log('Sending greeting...');
  const msg = Buffer.from(JSON.stringify({
    type: 'greeting',
    message: 'Hello from client!',
    clientName: playerName,
    timestamp: Date.now()
  }));
  const sendResult = steam.networkingSockets.sendReliable(connection, msg);
  console.log(`Send result: ${sendResult.success ? 'OK' : 'Failed'}`);
  console.log('');

  // Receive messages
  console.log('Receiving messages (3 seconds)...');
  const receiveEnd = Date.now() + 3000;
  let messageCount = 0;

  while (Date.now() < receiveEnd && !disconnected) {
    steam.runCallbacks();
    steam.networkingSockets.runCallbacks();
    
    const messages = steam.networkingSockets.receiveMessages(connection);
    
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
  steam.networkingSockets.closeConnection(connection, 0, 'Done');
  steam.shutdown();
  console.log('Done!');
}

testNetworkingSocketsJoin().catch(console.error);
