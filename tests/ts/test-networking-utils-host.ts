/**
 * Networking Utils Host Test
 * 
 * This test demonstrates network utilities and ping location features.
 * Run this on one machine to get your ping location string, then share
 * it with another player running test-networking-utils-join.ts.
 * 
 * Both tests can run independently to show local functionality, but
 * running them together demonstrates ping estimation between players.
 * 
 * Usage:
 *   npm run test:networking:host:ts
 * 
 * Methods tested in this file:
 *   - initRelayNetworkAccess()
 *   - getRelayNetworkStatus()
 *   - getLocalPingLocation()
 *   - getPOPCount()
 *   - getPOPList()
 *   - getPingToDataCenter()
 *   - getDirectPingToPOP()
 *   - getLocalTimestamp()
 *   - checkPingDataUpToDate()
 *   - setDebugOutputLevel()
 */

import { 
  SteamworksSDK, 
  ESteamNetworkingAvailability,
  ESteamNetworkingSocketsDebugOutputType,
  getAvailabilityName,
  popIdToString,
  stringToPopId,
} from '../../src';

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testNetworkingUtilsHost(): Promise<void> {
  console.log('='.repeat(60));
  console.log('NETWORKING UTILS HOST TEST');
  console.log('='.repeat(60));
  console.log('');
  console.log('This test will:');
  console.log('1. Initialize the Steam relay network');
  console.log('2. Wait for network to become available');
  console.log('3. Get your local ping location (share with join test)');
  console.log('4. Display data center (POP) information');
  console.log('5. Show ping times to various data centers');
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

  // Set debug output level (testing setDebugOutputLevel)
  console.log('Setting debug output level to Warning...');
  steam.networkingUtils.setDebugOutputLevel(ESteamNetworkingSocketsDebugOutputType.Warning);
  console.log('✓ setDebugOutputLevel() called');
  console.log('');

  console.log('Calling initRelayNetworkAccess()...');
  steam.networkingUtils.initRelayNetworkAccess();

  // Wait for relay network to become available
  console.log('Waiting for relay network to become available...');
  console.log('');

  const startTime = Date.now();
  const timeout = 30000; // 30 second timeout
  let lastStatus = -999;

  while (true) {
    steam.runCallbacks();
    
    const networkStatus = steam.networkingUtils.getRelayNetworkStatus();
    
    // Only log when status changes
    if (networkStatus.availability !== lastStatus) {
      console.log(`  Status: ${networkStatus.availabilityName} (${networkStatus.availability})`);
      lastStatus = networkStatus.availability;
    }
    
    if (networkStatus.availability === ESteamNetworkingAvailability.Current) {
      console.log('');
      console.log('✓ Relay network is ready!');
      break;
    }
    
    if (networkStatus.availability < 0) {
      console.error('');
      console.error(`✗ Relay network failed: ${networkStatus.availabilityName}`);
      steam.shutdown();
      process.exit(1);
    }
    
    if (Date.now() - startTime > timeout) {
      console.error('');
      console.error('✗ Timeout waiting for relay network');
      steam.shutdown();
      process.exit(1);
    }
    
    await delay(100);
  }

  console.log(`Time to ready: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log('');

  // ========================================
  // GET LOCAL PING LOCATION
  // ========================================
  console.log('-'.repeat(60));
  console.log('LOCAL PING LOCATION');
  console.log('-'.repeat(60));

  const pingLocation = steam.networkingUtils.getLocalPingLocation();
  
  if (pingLocation) {
    console.log('✓ Got local ping location!');
    console.log('');
    console.log('='.repeat(60));
    console.log('SHARE THIS STRING WITH THE JOIN TEST:');
    console.log('='.repeat(60));
    console.log('');
    console.log(pingLocation.locationString);
    console.log('');
    console.log('='.repeat(60));
    console.log('');
    console.log(`Data age: ${pingLocation.dataAge.toFixed(2)} seconds`);
  } else {
    console.log('✗ Could not get ping location - network may not be ready');
  }
  console.log('');

  // Check if ping data is up to date
  const isUpToDate = steam.networkingUtils.checkPingDataUpToDate(60);
  console.log(`Ping data up to date (60s): ${isUpToDate}`);
  console.log('');

  // ========================================
  // GET TIMESTAMP
  // ========================================
  console.log('-'.repeat(60));
  console.log('LOCAL TIMESTAMP');
  console.log('-'.repeat(60));

  const timestamp1 = steam.networkingUtils.getLocalTimestamp();
  await delay(100);
  const timestamp2 = steam.networkingUtils.getLocalTimestamp();
  const elapsed = timestamp2 - timestamp1;

  console.log(`Timestamp 1: ${timestamp1}µs`);
  console.log(`Timestamp 2: ${timestamp2}µs`);
  console.log(`Elapsed: ${elapsed}µs (${Number(elapsed) / 1000}ms)`);
  console.log('');

  // ========================================
  // DATA CENTER (POP) INFORMATION
  // ========================================
  console.log('-'.repeat(60));
  console.log('DATA CENTERS (POINTS OF PRESENCE)');
  console.log('-'.repeat(60));

  const popCount = steam.networkingUtils.getPOPCount();
  console.log(`Total POPs available: ${popCount}`);
  console.log('');

  if (popCount > 0) {
    const pops = steam.networkingUtils.getPOPList();
    
    // Sort by direct ping (filter out -1 values)
    const sortedPops = [...pops]
      .filter(p => p.directPing > 0)
      .sort((a, b) => a.directPing - b.directPing);
    
    console.log('Top 10 closest data centers (by direct ping):');
    console.log('');
    console.log('  Code   | Direct Ping | Via Relay | Relay POP');
    console.log('  -------+-----------+----------+----------');
    
    for (const pop of sortedPops.slice(0, 10)) {
      const code = pop.popCode.padEnd(6);
      const direct = pop.directPing >= 0 ? `${pop.directPing}ms`.padStart(7) : '   N/A ';
      const relay = pop.pingViaRelay >= 0 ? `${pop.pingViaRelay}ms`.padStart(7) : '   N/A ';
      const viaPop = pop.viaRelayPOPCode || '-';
      console.log(`  ${code} | ${direct}   | ${relay}  | ${viaPop}`);
    }
    
    console.log('');

    // Show all POPs with their codes
    console.log('All available POP codes:');
    const allCodes = pops.map(p => p.popCode).filter(c => c).join(', ');
    console.log(`  ${allCodes}`);
    console.log('');

    // Test specific data center ping
    if (sortedPops.length > 0) {
      const testPop = sortedPops[0];
      console.log(`Testing getPingToDataCenter() for ${testPop.popCode}:`);
      
      const pingInfo = steam.networkingUtils.getPingToDataCenter(testPop.popId);
      if (pingInfo) {
        console.log(`  Ping: ${pingInfo.pingMs}ms via ${popIdToString(pingInfo.viaRelayPOP)}`);
      }
      
      const directPing = steam.networkingUtils.getDirectPingToPOP(testPop.popId);
      console.log(`  Direct ping: ${directPing}ms`);
    }
  }
  console.log('');

  // ========================================
  // WAIT FOR USER INPUT TO EXIT
  // ========================================
  console.log('-'.repeat(60));
  console.log('WAITING FOR JOIN TEST');
  console.log('-'.repeat(60));
  console.log('');
  console.log('Keep this running while you start the join test.');
  console.log('The join test can use the ping location string above to');
  console.log('estimate the ping time between your two machines.');
  console.log('');
  console.log('Press Ctrl+C to exit when done.');
  console.log('');

  // Keep running callbacks
  const keepAlive = async () => {
    while (true) {
      steam.runCallbacks();
      await delay(100);
    }
  };

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('');
    console.log('Shutting down...');
    steam.shutdown();
    console.log('Goodbye!');
    process.exit(0);
  });

  await keepAlive();
}

// Run the test
testNetworkingUtilsHost().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
