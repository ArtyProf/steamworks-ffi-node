/**
 * Matchmaking Host Test
 * 
 * This test demonstrates lobby hosting functionality.
 * Run this on one machine, then run test-matchmaking-join.ts on another machine
 * with a different Steam account to test the full flow.
 * 
 * Usage:
 *   npm run test:matchmaking:host:ts
 */

import { SteamworksSDK, ELobbyType, type LobbyId } from '../../src';

async function testMatchmakingHost(): Promise<void> {
  console.log('='.repeat(60));
  console.log('MATCHMAKING HOST TEST');
  console.log('='.repeat(60));
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

  // Get current user info for reference
  const status = steam.getStatus();
  const steamId = status.steamId;
  const playerName = steam.friends.getPersonaName();
  console.log(`Host: ${playerName} (${steamId})`);
  console.log('');

  // Create a public lobby
  console.log('-'.repeat(60));
  console.log('CREATING LOBBY');
  console.log('-'.repeat(60));

  console.log('Creating a public lobby for 4 players...');
  
  const createResult = await steam.matchmaking.createLobby(ELobbyType.Public, 4);
  
  if (!createResult.success) {
    console.error('Failed to create lobby!');
    console.error('Error:', createResult.error);
    steam.shutdown();
    process.exit(1);
  }

  const lobbyId = createResult.lobbyId!;
  console.log(`Lobby created successfully!`);
  console.log(`Lobby ID: ${lobbyId}`);
  console.log('');

  // Set lobby data for discovery
  console.log('-'.repeat(60));
  console.log('SETTING LOBBY DATA');
  console.log('-'.repeat(60));

  const setResult1 = steam.matchmaking.setLobbyData(lobbyId, 'gameMode', 'cooperative');
  const setResult2 = steam.matchmaking.setLobbyData(lobbyId, 'map', 'testMap1');
  const setResult3 = steam.matchmaking.setLobbyData(lobbyId, 'hostName', playerName);
  const setResult4 = steam.matchmaking.setLobbyData(lobbyId, 'version', '1.0.0');

  console.log(`Set gameMode=cooperative: ${setResult1}`);
  console.log(`Set map=testMap1: ${setResult2}`);
  console.log(`Set hostName=${playerName}: ${setResult3}`);
  console.log(`Set version=1.0.0: ${setResult4}`);
  console.log('');

  // Display lobby info
  console.log('-'.repeat(60));
  console.log('LOBBY INFORMATION');
  console.log('-'.repeat(60));

  const lobbyOwner = steam.matchmaking.getLobbyOwner(lobbyId);
  const maxMembers = steam.matchmaking.getLobbyMemberLimit(lobbyId);
  const currentMembers = steam.matchmaking.getNumLobbyMembers(lobbyId);
  const lobbyData = steam.matchmaking.getAllLobbyData(lobbyId);

  console.log(`Owner: ${lobbyOwner}`);
  console.log(`Members: ${currentMembers}/${maxMembers}`);
  
  // Get all lobby data
  const allData = steam.matchmaking.getAllLobbyData(lobbyId);
  console.log(`Lobby Data:`, allData);
  console.log('');

  // Set up a callback poller for member updates
  console.log('-'.repeat(60));
  console.log('WAITING FOR PLAYERS');
  console.log('-'.repeat(60));
  console.log('');
  console.log('The lobby is now public and searchable.');
  console.log('Run test-matchmaking-join.ts on another machine to join.');
  console.log('');
  console.log('Press Ctrl+C to leave lobby and exit.');
  console.log('');

  // Track members we've seen
  let previousMemberCount = currentMembers;
  let running = true;

  // Set up signal handler for clean exit
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT, cleaning up...');
    running = false;
  });

  // Main loop - check for new members and messages
  while (running) {
    // Run callbacks
    steam.runCallbacks();

    // Check member count
    const newMemberCount = steam.matchmaking.getNumLobbyMembers(lobbyId);
    
    if (newMemberCount !== previousMemberCount) {
      console.log('');
      console.log('*** MEMBER UPDATE ***');
      console.log(`Members: ${previousMemberCount} -> ${newMemberCount}`);
      
      // List all current members
      for (let i = 0; i < newMemberCount; i++) {
        const memberId = steam.matchmaking.getLobbyMemberByIndex(lobbyId, i);
        console.log(`  Member ${i + 1}: ${memberId}`);
      }
      console.log('');
      
      previousMemberCount = newMemberCount;
    }

    // Check for chat messages
    const chatEntry = steam.matchmaking.getLobbyChatEntry(lobbyId, 0);
    if (chatEntry) {
      console.log(`[CHAT] ${chatEntry.senderId}: ${chatEntry.message}`);
    }

    // Wait a bit before next check
    await sleep(100);
  }

  // Clean up
  console.log('');
  console.log('-'.repeat(60));
  console.log('CLEANUP');
  console.log('-'.repeat(60));

  console.log('Leaving lobby...');
  steam.matchmaking.leaveLobby(lobbyId);
  console.log('Left lobby.');

  console.log('Shutting down Steam API...');
  steam.shutdown();
  console.log('Done!');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
testMatchmakingHost().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
