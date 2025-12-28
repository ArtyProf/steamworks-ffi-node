/**
 * Matchmaking Join Test
 * 
 * This test demonstrates lobby joining and searching functionality.
 * Run test-matchmaking-host.ts on another machine first, then run this
 * on a different machine with a different Steam account.
 * 
 * Usage:
 *   npm run test:matchmaking:join:ts
 * 
 * Optional: Pass a lobby ID as argument to join directly:
 *   npx ts-node tests/ts/test-matchmaking-join.ts <lobbyId>
 */

import { SteamworksSDK, ELobbyType, ELobbyComparison } from '../../src';

async function testMatchmakingJoin(): Promise<void> {
  console.log('='.repeat(60));
  console.log('MATCHMAKING JOIN TEST');
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
  console.log(`Joiner: ${playerName} (${steamId})`);
  console.log('');

  // Check if a lobby ID was provided as argument
  const providedLobbyId = process.argv[2];
  let targetLobbyId: string | undefined;

  if (providedLobbyId) {
    console.log('-'.repeat(60));
    console.log('DIRECT JOIN MODE');
    console.log('-'.repeat(60));
    console.log(`Attempting to join lobby: ${providedLobbyId}`);
    targetLobbyId = providedLobbyId;
  } else {
    // Search for lobbies
    console.log('-'.repeat(60));
    console.log('SEARCHING FOR LOBBIES');
    console.log('-'.repeat(60));

    // Add filters to find lobbies with our game mode
    console.log('Adding search filters...');
    steam.matchmaking.addRequestLobbyListStringFilter('gameMode', 'cooperative', ELobbyComparison.Equal);
    steam.matchmaking.addRequestLobbyListResultCountFilter(20);
    
    console.log('Requesting lobby list...');
    const lobbyListResult = await steam.matchmaking.requestLobbyList();

    if (!lobbyListResult.success) {
      console.error('Failed to get lobby list!');
      steam.shutdown();
      process.exit(1);
    }

    console.log(`Found ${lobbyListResult.lobbies.length} lobbies:`);
    console.log('');

    if (lobbyListResult.lobbies.length === 0) {
      console.log('No lobbies found!');
      console.log('Make sure test-matchmaking-host.ts is running on another machine.');
      console.log('');
      
      // Try searching without filters
      console.log('Trying search without filters...');
      steam.matchmaking.addRequestLobbyListResultCountFilter(50);
      const allLobbies = await steam.matchmaking.requestLobbyList();
      
      if (allLobbies.success && allLobbies.lobbies.length > 0) {
        console.log(`Found ${allLobbies.lobbies.length} lobbies without filters:`);
        for (const lobbyId of allLobbies.lobbies) {
          const memberCount = steam.matchmaking.getNumLobbyMembers(lobbyId);
          const maxMembers = steam.matchmaking.getLobbyMemberLimit(lobbyId);
          console.log(`  - ${lobbyId}: ${memberCount}/${maxMembers} members`);
          const allData = steam.matchmaking.getAllLobbyData(lobbyId);
          console.log(`    Data: ${JSON.stringify(allData)}`);
        }
        
        // Use first available lobby
        targetLobbyId = allLobbies.lobbies[0];
        console.log('');
        console.log(`Will attempt to join first lobby: ${targetLobbyId}`);
      } else {
        console.log('No lobbies found at all.');
        steam.shutdown();
        process.exit(1);
      }
    } else {
      // Display found lobbies
      for (const lobbyId of lobbyListResult.lobbies) {
        const memberCount = steam.matchmaking.getNumLobbyMembers(lobbyId);
        const maxMembers = steam.matchmaking.getLobbyMemberLimit(lobbyId);
        console.log(`  - ${lobbyId}: ${memberCount}/${maxMembers} members`);
        const allData = steam.matchmaking.getAllLobbyData(lobbyId);
        console.log(`    Data: ${JSON.stringify(allData)}`);
      }
      
      // Use first available lobby
      targetLobbyId = lobbyListResult.lobbies[0];
      console.log('');
      console.log(`Will attempt to join first lobby: ${targetLobbyId}`);
    }
  }

  // Join the lobby
  console.log('');
  console.log('-'.repeat(60));
  console.log('JOINING LOBBY');
  console.log('-'.repeat(60));

  if (!targetLobbyId) {
    console.error('No lobby ID to join!');
    steam.shutdown();
    process.exit(1);
  }

  console.log(`Joining lobby ${targetLobbyId}...`);
  const joinResult = await steam.matchmaking.joinLobby(targetLobbyId);

  if (!joinResult.success) {
    console.error('Failed to join lobby!');
    console.error('Response:', joinResult.response);
    console.error('Error:', joinResult.error);
    steam.shutdown();
    process.exit(1);
  }

  console.log('Successfully joined lobby!');
  console.log(`Lobby ID: ${joinResult.lobbyId}`);
  console.log(`Locked: ${joinResult.locked}`);
  console.log('');

  const lobbyId = joinResult.lobbyId!;

  // Display lobby info
  console.log('-'.repeat(60));
  console.log('LOBBY INFORMATION');
  console.log('-'.repeat(60));

  const lobbyOwner = steam.matchmaking.getLobbyOwner(lobbyId);
  const maxMembers = steam.matchmaking.getLobbyMemberLimit(lobbyId);
  const currentMembers = steam.matchmaking.getNumLobbyMembers(lobbyId);
  const allData = steam.matchmaking.getAllLobbyData(lobbyId);

  console.log(`Owner: ${lobbyOwner}`);
  console.log(`Members: ${currentMembers}/${maxMembers}`);
  console.log(`Lobby Data:`, allData);
  console.log('');

  // List all members
  console.log('Current Members:');
  for (let i = 0; i < currentMembers; i++) {
    const memberId = steam.matchmaking.getLobbyMemberByIndex(lobbyId, i);
    console.log(`  ${i + 1}. ${memberId}`);
  }
  console.log('');

  // Set our member data
  console.log('-'.repeat(60));
  console.log('SETTING MEMBER DATA');
  console.log('-'.repeat(60));

  steam.matchmaking.setLobbyMemberData(lobbyId, 'status', 'ready');
  steam.matchmaking.setLobbyMemberData(lobbyId, 'character', 'warrior');
  console.log('Set member data: status=ready, character=warrior');
  console.log('');

  // Send a chat message
  console.log('-'.repeat(60));
  console.log('SENDING CHAT MESSAGE');
  console.log('-'.repeat(60));

  const chatSent = steam.matchmaking.sendLobbyChatMsg(lobbyId, `Hello from ${playerName}!`);
  console.log(`Chat message sent: ${chatSent}`);
  console.log('');

  // Stay in lobby and monitor
  console.log('-'.repeat(60));
  console.log('MONITORING LOBBY');
  console.log('-'.repeat(60));
  console.log('');
  console.log('Staying in lobby. Press Ctrl+C to leave and exit.');
  console.log('');

  let running = true;
  let previousMemberCount = currentMembers;

  // Set up signal handler for clean exit
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT, cleaning up...');
    running = false;
  });

  // Main loop
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
testMatchmakingJoin().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
