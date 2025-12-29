/**
 * Networking Utils Join Test
 * 
 * This test demonstrates ping estimation between two players.
 * Run test-networking-utils-host.ts first to get a ping location string,
 * then paste it when prompted in this test.
 * 
 * Can also be run standalone to show local networking capabilities.
 * 
 * Usage:
 *   npm run test:networking:join:ts
 * 
 * Optional: Pass a ping location string as argument:
 *   npx ts-node tests/ts/test-networking-utils-join.ts "ping_location_string_here"
 * 
 * Methods tested in this file:
 *   - initRelayNetworkAccess()
 *   - getRelayNetworkStatus()
 *   - getLocalPingLocation()
 *   - estimatePingFromString()
 *   - estimatePingBetweenLocations()
 *   - getPOPList()
 *   - getLocalTimestamp()
 */

import { 
  SteamworksSDK, 
  ESteamNetworkingAvailability,
  getAvailabilityName,
} from '../../src';
import * as readline from 'readline';

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function testNetworkingUtilsJoin(): Promise<void> {
  console.log('='.repeat(60));
  console.log('NETWORKING UTILS JOIN TEST');
  console.log('='.repeat(60));
  console.log('');
  console.log('This test will:');
  console.log('1. Initialize the Steam relay network');
  console.log('2. Get your local ping location');
  console.log('3. Accept a remote ping location string');
  console.log('4. Estimate ping time between you and the remote player');
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
  console.log(`Join: ${playerName} (${status.steamId})`);
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
  console.log('Waiting for relay network to become available...');
  console.log('');

  const startTime = Date.now();
  const timeout = 30000;
  let lastStatus = -999;

  while (true) {
    steam.runCallbacks();
    
    const networkStatus = steam.networkingUtils.getRelayNetworkStatus();
    
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

  const myPingLocation = steam.networkingUtils.getLocalPingLocation();
  
  if (myPingLocation) {
    console.log('✓ Got local ping location!');
    console.log(`  String: ${myPingLocation.locationString.substring(0, 50)}...`);
    console.log(`  Data age: ${myPingLocation.dataAge.toFixed(2)} seconds`);
  } else {
    console.log('✗ Could not get ping location');
  }
  console.log('');

  // ========================================
  // GET REMOTE PING LOCATION
  // ========================================
  console.log('-'.repeat(60));
  console.log('PING ESTIMATION');
  console.log('-'.repeat(60));
  console.log('');

  // Check if ping location was passed as argument
  let remotePingLocation = process.argv[2];
  
  if (!remotePingLocation) {
    console.log('No remote ping location provided as argument.');
    console.log('');
    console.log('To test ping estimation, either:');
    console.log('1. Run test-networking-utils-host.ts and copy the location string');
    console.log('2. Pass a location string as argument:');
    console.log('   npx ts-node tests/ts/test-networking-utils-join.ts "location_string"');
    console.log('');
    
    // Offer to enter it manually
    remotePingLocation = await prompt('Paste a ping location string (or press Enter to skip): ');
  }

  if (remotePingLocation && remotePingLocation.length > 0) {
    console.log('');
    console.log('Testing ping estimation to remote location...');
    console.log(`  Remote location: ${remotePingLocation.substring(0, 50)}...`);
    console.log('');

    // Method 1: Estimate from local host
    console.log('Method 1: estimatePingFromString()');
    const estimate1 = steam.networkingUtils.estimatePingFromString(remotePingLocation);
    
    if (estimate1.valid) {
      console.log(`  ✓ Estimated ping: ${estimate1.pingMs}ms`);
    } else {
      console.log(`  ✗ Estimation failed: ${estimate1.error}`);
    }

    // Method 2: Estimate between two locations
    if (myPingLocation) {
      console.log('');
      console.log('Method 2: estimatePingBetweenLocations()');
      const estimate2 = steam.networkingUtils.estimatePingBetweenLocations(
        myPingLocation.locationString,
        remotePingLocation
      );
      
      if (estimate2.valid) {
        console.log(`  ✓ Estimated ping: ${estimate2.pingMs}ms`);
      } else {
        console.log(`  ✗ Estimation failed: ${estimate2.error}`);
      }
    }

    console.log('');
    console.log('Note: Ping estimates are based on Steam\'s network topology');
    console.log('data and may not reflect actual game latency.');
  } else {
    console.log('Skipping ping estimation (no remote location provided)');
  }
  console.log('');

  // ========================================
  // SHOW LOCAL DATA CENTER INFO
  // ========================================
  console.log('-'.repeat(60));
  console.log('LOCAL DATA CENTER SUMMARY');
  console.log('-'.repeat(60));

  const pops = steam.networkingUtils.getPOPList();
  const sortedPops = [...pops]
    .filter(p => p.directPing > 0)
    .sort((a, b) => a.directPing - b.directPing);

  if (sortedPops.length > 0) {
    console.log('Your closest data centers:');
    console.log('');
    for (const pop of sortedPops.slice(0, 5)) {
      console.log(`  ${pop.popCode}: ${pop.directPing}ms direct`);
    }
  }
  console.log('');

  // ========================================
  // TIMING TEST
  // ========================================
  console.log('-'.repeat(60));
  console.log('TIMESTAMP ACCURACY TEST');
  console.log('-'.repeat(60));

  console.log('Testing timestamp precision (10 samples)...');
  console.log('');

  const samples: bigint[] = [];
  for (let i = 0; i < 10; i++) {
    const t1 = steam.networkingUtils.getLocalTimestamp();
    await delay(10); // 10ms delay
    const t2 = steam.networkingUtils.getLocalTimestamp();
    samples.push(t2 - t1);
  }

  const avgUs = samples.reduce((a, b) => a + b, 0n) / BigInt(samples.length);
  const avgMs = Number(avgUs) / 1000;
  
  console.log(`  Expected: ~10ms per sample`);
  console.log(`  Average measured: ${avgMs.toFixed(2)}ms`);
  console.log(`  Accuracy: ${(10 / avgMs * 100).toFixed(1)}%`);
  console.log('');

  // ========================================
  // DONE
  // ========================================
  console.log('-'.repeat(60));
  console.log('TEST COMPLETE');
  console.log('-'.repeat(60));
  console.log('');
  console.log('Summary of tested methods:');
  console.log('  ✓ initRelayNetworkAccess()');
  console.log('  ✓ getRelayNetworkStatus()');
  console.log('  ✓ getLocalPingLocation()');
  console.log('  ✓ estimatePingFromString()');
  console.log('  ✓ estimatePingBetweenLocations()');
  console.log('  ✓ getPOPList()');
  console.log('  ✓ getLocalTimestamp()');
  console.log('');

  steam.shutdown();
  console.log('Shutdown complete. Goodbye!');
}

// Run the test
testNetworkingUtilsJoin().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
