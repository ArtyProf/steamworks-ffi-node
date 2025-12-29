/**
 * Networking Sockets Join Test (Client)
 * 
 * This test demonstrates P2P networking as a CLIENT (joiner).
 * Run test-networking-sockets-host.ts first on another machine or Steam
 * account, then run this test to connect to the host.
 * 
 * The client:
 * 1. Connects to the host's Steam ID via P2P
 * 2. Waits for connection to be established
 * 3. Exchanges messages with the host
 * 4. Closes the connection
 * 
 * Usage:
 *   npm run test:sockets:join:ts -- <host_steam_id>
 * 
 * Example:
 *   npm run test:sockets:join:ts -- 76561198012345678
 * 
 * Methods tested in this file:
 *   - connectP2P()
 *   - closeConnection()
 *   - sendReliable()
 *   - sendUnreliable()
 *   - receiveMessages()
 *   - getConnectionInfo()
 *   - getConnectionRealTimeStatus()
 *   - flushMessages()
 *   - getIdentity()
 *   - onConnectionStateChange()
 *   - runCallbacks()
 */

import { 
  SteamworksSDK,
  ESteamNetworkingConnectionState,
  ESteamNetworkingAvailability,
  k_HSteamNetConnection_Invalid,
  k_nSteamNetworkingSend_Reliable,
  k_nSteamNetworkingSend_Unreliable,
  getConnectionStateName,
} from '../../src';

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testNetworkingSocketsJoin(): Promise<void> {
  console.log('='.repeat(60));
  console.log('NETWORKING SOCKETS JOIN TEST (P2P Client)');
  console.log('='.repeat(60));
  console.log('');

  // Get host Steam ID from command line
  const args = process.argv.slice(2);
  let hostSteamId = args[0];

  if (!hostSteamId) {
    console.log('Usage: npm run test:sockets:join:ts -- <host_steam_id>');
    console.log('');
    console.log('Please enter the host Steam ID:');
    
    // Read from stdin
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    hostSteamId = await new Promise<string>((resolve) => {
      rl.question('Host Steam ID: ', (answer: string) => {
        rl.close();
        resolve(answer.trim());
      });
    });
    
    if (!hostSteamId) {
      console.error('No Steam ID provided. Exiting.');
      process.exit(1);
    }
  }

  console.log(`Will connect to host: ${hostSteamId}`);
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
  console.log(`Client: ${playerName} (${status.steamId})`);
  console.log('');

  // Check we're not connecting to ourselves
  if (status.steamId === hostSteamId) {
    console.error('Cannot connect to yourself! Use a different Steam account.');
    steam.shutdown();
    process.exit(1);
  }

  // ========================================
  // INITIALIZE RELAY NETWORK
  // ========================================
  console.log('-'.repeat(60));
  console.log('INITIALIZING RELAY NETWORK');
  console.log('-'.repeat(60));

  console.log('Calling initRelayNetworkAccess()...');
  steam.networkingUtils.initRelayNetworkAccess();

  // Wait for relay network
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
  // CONNECT TO HOST
  // ========================================
  console.log('-'.repeat(60));
  console.log('CONNECTING TO HOST');
  console.log('-'.repeat(60));

  const virtualPort = 0; // Default virtual port
  console.log(`Connecting to ${hostSteamId} on virtual port ${virtualPort}...`);

  let connected = false;
  let disconnected = false;

  // Register connection state change handler
  steam.networkingSockets.onConnectionStateChange((change) => {
    console.log(`State: ${getConnectionStateName(change.oldState)} -> ${getConnectionStateName(change.newState)}`);
    
    if (change.newState === ESteamNetworkingConnectionState.Connected) {
      connected = true;
    }
    
    if (change.newState === ESteamNetworkingConnectionState.ClosedByPeer) {
      console.log(`Closed by peer: ${change.info.endDebugMessage}`);
      disconnected = true;
    }
    
    if (change.newState === ESteamNetworkingConnectionState.ProblemDetectedLocally) {
      console.log(`Connection problem: ${change.info.endDebugMessage}`);
      disconnected = true;
    }
  });

  // Initiate connection
  const connection = steam.networkingSockets.connectP2P(hostSteamId, virtualPort);
  
  if (connection === k_HSteamNetConnection_Invalid) {
    console.error('✗ Failed to initiate connection!');
    steam.shutdown();
    process.exit(1);
  }

  console.log(`Connection handle: ${connection}`);
  console.log('Waiting for connection to establish...');
  console.log('');

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

  console.log('');
  console.log('✓ Connected to host!');
  console.log('');

  // ========================================
  // CONNECTION INFO
  // ========================================
  console.log('-'.repeat(60));
  console.log('CONNECTION INFO');
  console.log('-'.repeat(60));

  const connectionInfo = steam.networkingSockets.getConnectionInfo(connection);
  if (connectionInfo) {
    console.log(`  Remote: ${connectionInfo.identityRemote}`);
    console.log(`  State: ${connectionInfo.stateName}`);
    console.log(`  Description: ${connectionInfo.connectionDescription}`);
  }
  console.log('');

  // Wait a moment for ping to stabilize
  await delay(1000);

  // Get real-time status
  console.log('Real-time status:');
  const rtStatus = steam.networkingSockets.getConnectionRealTimeStatus(connection);
  if (rtStatus) {
    console.log(`  Ping: ${rtStatus.ping}ms`);
    console.log(`  Quality local: ${(rtStatus.connectionQualityLocal * 100).toFixed(1)}%`);
    console.log(`  Quality remote: ${(rtStatus.connectionQualityRemote * 100).toFixed(1)}%`);
  }
  console.log('');

  // ========================================
  // EXCHANGE MESSAGES
  // ========================================
  console.log('-'.repeat(60));
  console.log('EXCHANGING MESSAGES');
  console.log('-'.repeat(60));

  // Send greeting to host
  const greeting = Buffer.from(JSON.stringify({
    type: 'greeting',
    message: 'Hello from client!',
    clientName: playerName,
    timestamp: Date.now()
  }));

  console.log('Sending greeting to host...');
  let sendResult = steam.networkingSockets.sendReliable(connection, greeting);
  console.log(`  Reliable send: ${sendResult.success ? 'OK' : 'Failed'}`);

  // Send some unreliable messages (simulating game state updates)
  console.log('Sending position updates (unreliable)...');
  for (let i = 0; i < 5; i++) {
    const positionUpdate = Buffer.from(JSON.stringify({
      type: 'position',
      x: Math.random() * 100,
      y: Math.random() * 100,
      z: Math.random() * 100,
      tick: i
    }));
    
    sendResult = steam.networkingSockets.sendUnreliable(connection, positionUpdate);
    await delay(50);
  }
  console.log('  Sent 5 position updates');
  console.log('');

  // Flush messages
  console.log('Flushing messages...');
  steam.networkingSockets.flushMessages(connection);
  console.log('');

  // Receive messages from host
  console.log('Receiving messages from host (3 seconds)...');
  const receiveEnd = Date.now() + 3000;
  let messageCount = 0;

  while (Date.now() < receiveEnd && !disconnected) {
    steam.runCallbacks();
    steam.networkingSockets.runCallbacks();
    
    const messages = steam.networkingSockets.receiveMessages(connection);
    
    for (const msg of messages) {
      messageCount++;
      console.log(`Message #${messageCount}:`);
      console.log(`  Size: ${msg.size} bytes`);
      if (msg.data) {
        try {
          const text = msg.data.toString('utf8');
          const parsed = JSON.parse(text);
          console.log(`  Type: ${parsed.type}`);
          console.log(`  Content: ${parsed.message || JSON.stringify(parsed)}`);
        } catch {
          console.log(`  Data: (binary, ${msg.size} bytes)`);
        }
      }
    }
    
    await delay(50);
  }

  console.log(`Received ${messageCount} messages from host`);
  console.log('');

  // ========================================
  // FINAL STATUS
  // ========================================
  console.log('-'.repeat(60));
  console.log('FINAL STATUS');
  console.log('-'.repeat(60));

  const finalStatus = steam.networkingSockets.getConnectionRealTimeStatus(connection);
  if (finalStatus) {
    console.log(`  Final ping: ${finalStatus.ping}ms`);
    console.log(`  Bytes sent: ~${finalStatus.pendingReliable + finalStatus.pendingUnreliable}`);
  }
  console.log('');

  // ========================================
  // CLOSE CONNECTION
  // ========================================
  console.log('-'.repeat(60));
  console.log('CLOSING CONNECTION');
  console.log('-'.repeat(60));

  console.log('Closing connection...');
  const closed = steam.networkingSockets.closeConnection(connection, 0, 'Client test complete');
  console.log(`Connection closed: ${closed}`);
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
  console.log('NETWORKING SOCKETS JOIN TEST COMPLETE');
  console.log('='.repeat(60));
}

// Run the test
testNetworkingSocketsJoin().catch(console.error);
