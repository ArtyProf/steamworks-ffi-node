/**
 * Matchmaking Join Test
 * 
 * This test demonstrates lobby joining and searching functionality.
 * Run test-matchmaking-host.js on another machine first, then run this
 * on a different machine with a different Steam account.
 * 
 * Usage:
 *   npm run test:matchmaking:join:js
 * 
 * Optional: Pass a lobby ID as argument to join directly:
 *   node tests/js/test-matchmaking-join.js <lobbyId>
 * 
 * Methods tested in this file:
 *   - requestLobbyList()
 *   - addRequestLobbyListStringFilter()
 *   - addRequestLobbyListNumericalFilter()
 *   - addRequestLobbyListNearValueFilter()
 *   - addRequestLobbyListFilterSlotsAvailable()
 *   - addRequestLobbyListDistanceFilter()
 *   - addRequestLobbyListResultCountFilter()
 *   - joinLobby()
 *   - getLobbyOwner()
 *   - getLobbyMemberLimit()
 *   - getNumLobbyMembers()
 *   - getLobbyMemberByIndex()
 *   - getAllLobbyData()
 *   - setLobbyMemberData()
 *   - getLobbyMemberData()
 *   - sendLobbyChatMsg()
 *   - leaveLobby()
 *   - startChatPolling()
 *   - pollChatMessages()
 *   - onChatMessage()
 */

const { SteamworksSDK, ELobbyType, ELobbyComparison, ELobbyDistanceFilter } = require('../../dist');

async function testMatchmakingJoin() {
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
  let targetLobbyId;

  if (providedLobbyId) {
    console.log('-'.repeat(60));
    console.log('DIRECT JOIN MODE');
    console.log('-'.repeat(60));
    console.log(`Attempting to join lobby: ${providedLobbyId}`);
    targetLobbyId = providedLobbyId;
  } else {
    // Search for lobbies with various filters
    console.log('-'.repeat(60));
    console.log('TESTING LOBBY SEARCH FILTERS');
    console.log('-'.repeat(60));

    // Test 1: String filter
    console.log('\n[Test 1] addRequestLobbyListStringFilter()');
    console.log('  Filter: gameMode = "cooperative"');
    steam.matchmaking.addRequestLobbyListStringFilter('gameMode', 'cooperative', ELobbyComparison.Equal);
    
    // Test 2: Numerical filter (host sets skillLevel=50 and minLevel=10)
    console.log('\n[Test 2] addRequestLobbyListNumericalFilter()');
    console.log('  Filter: minLevel <= 15');
    steam.matchmaking.addRequestLobbyListNumericalFilter('minLevel', 15, ELobbyComparison.EqualToOrLessThan);
    
    // Test 3: Near value filter (find lobbies with skill close to 50)
    console.log('\n[Test 3] addRequestLobbyListNearValueFilter()');
    console.log('  Filter: skillLevel near 50 (sorts by closest)');
    steam.matchmaking.addRequestLobbyListNearValueFilter('skillLevel', 50);
    
    // Test 4: Slots available filter
    console.log('\n[Test 4] addRequestLobbyListFilterSlotsAvailable()');
    console.log('  Filter: at least 1 slot available');
    steam.matchmaking.addRequestLobbyListFilterSlotsAvailable(1);
    
    // Test 5: Distance filter
    console.log('\n[Test 5] addRequestLobbyListDistanceFilter()');
    console.log('  Filter: Worldwide (no distance restriction)');
    steam.matchmaking.addRequestLobbyListDistanceFilter(ELobbyDistanceFilter.Worldwide);
    
    // Test 6: Result count filter
    console.log('\n[Test 6] addRequestLobbyListResultCountFilter()');
    console.log('  Filter: max 20 results');
    steam.matchmaking.addRequestLobbyListResultCountFilter(20);
    
    console.log('\nRequesting lobby list with all filters...');
    const lobbyListResult = await steam.matchmaking.requestLobbyList();

    if (!lobbyListResult.success) {
      console.error('Failed to get lobby list!');
      steam.shutdown();
      process.exit(1);
    }

    console.log(`Found ${lobbyListResult.lobbies.length} lobbies matching filters:`);
    console.log('');

    if (lobbyListResult.lobbies.length === 0) {
      console.log('No lobbies found with filters!');
      console.log('Make sure test-matchmaking-host.js is running on another machine.');
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

  const lobbyId = joinResult.lobbyId;

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

  // List all members and their data
  console.log('Current Members:');
  for (let i = 0; i < currentMembers; i++) {
    const memberId = steam.matchmaking.getLobbyMemberByIndex(lobbyId, i);
    const memberName = steam.friends.getFriendPersonaName(memberId);
    console.log(`  ${i + 1}. ${memberName} (${memberId})`);
  }
  console.log('');

  // Set our member data
  console.log('-'.repeat(60));
  console.log('TESTING MEMBER DATA');
  console.log('-'.repeat(60));

  console.log('\n[Test] setLobbyMemberData()');
  steam.matchmaking.setLobbyMemberData(lobbyId, 'status', 'ready');
  steam.matchmaking.setLobbyMemberData(lobbyId, 'character', 'warrior');
  steam.matchmaking.setLobbyMemberData(lobbyId, 'level', '42');
  console.log('Set: status=ready, character=warrior, level=42');
  
  console.log('\n[Test] getLobbyMemberData() - reading own data');
  const myStatus = steam.matchmaking.getLobbyMemberData(lobbyId, steamId, 'status');
  const myChar = steam.matchmaking.getLobbyMemberData(lobbyId, steamId, 'character');
  const myLevel = steam.matchmaking.getLobbyMemberData(lobbyId, steamId, 'level');
  console.log(`Read back: status="${myStatus}", character="${myChar}", level="${myLevel}"`);
  
  // Read other members' data if available
  console.log('\n[Test] getLobbyMemberData() - reading other members');
  for (let i = 0; i < currentMembers; i++) {
    const memberId = steam.matchmaking.getLobbyMemberByIndex(lobbyId, i);
    if (memberId !== steamId) {
      const memberName = steam.friends.getFriendPersonaName(memberId);
      const memberStatus = steam.matchmaking.getLobbyMemberData(lobbyId, memberId, 'status');
      const memberChar = steam.matchmaking.getLobbyMemberData(lobbyId, memberId, 'character');
      console.log(`${memberName}: status="${memberStatus}", character="${memberChar}"`);
    }
  }
  console.log('');

  // Send a chat message
  console.log('-'.repeat(60));
  console.log('SENDING CHAT MESSAGE');
  console.log('-'.repeat(60));

  const chatSent = steam.matchmaking.sendLobbyChatMsg(lobbyId, `Hello from ${playerName}!`);
  console.log(`Chat message sent: ${chatSent}`);
  console.log('');

  // Set up chat message polling
  console.log('-'.repeat(60));
  console.log('SETTING UP CHAT POLLING');
  console.log('-'.repeat(60));
  
  // Start polling for chat messages in this lobby
  steam.matchmaking.startChatPolling(lobbyId);
  console.log('Chat polling started for lobby');
  
  // Subscribe to chat messages
  steam.matchmaking.onChatMessage((event) => {
    const senderName = steam.friends.getFriendPersonaName(event.senderId);
    console.log('');
    console.log('*** CHAT MESSAGE RECEIVED ***');
    console.log(`  From: ${senderName} (${event.senderId})`);
    console.log(`  Message: "${event.message}"`);
    console.log('');
  });
  
  console.log('Chat message handler registered.');
  console.log('');

  // Stay in lobby and monitor
  console.log('-'.repeat(60));
  console.log('MONITORING LOBBY');
  console.log('-'.repeat(60));
  console.log('');
  console.log('Staying in lobby. Press Ctrl+C to leave and exit.');
  console.log('');

  let running = true;
  
  // Track members for detecting joins/leaves
  let previousMembers = new Set();
  for (let i = 0; i < currentMembers; i++) {
    const memberId = steam.matchmaking.getLobbyMemberByIndex(lobbyId, i);
    if (memberId) previousMembers.add(memberId);
  }

  // Set up signal handler for clean exit
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT, cleaning up...');
    running = false;
  });

  // Main loop
  while (running) {
    // Run Steam callbacks (for all Steam systems)
    steam.runCallbacks();
    
    // Poll for new chat messages
    steam.matchmaking.pollChatMessages();

    // Get current members
    const currentMemberIds = new Set();
    const newMemberCount = steam.matchmaking.getNumLobbyMembers(lobbyId);
    for (let i = 0; i < newMemberCount; i++) {
      const memberId = steam.matchmaking.getLobbyMemberByIndex(lobbyId, i);
      if (memberId) currentMemberIds.add(memberId);
    }
    
    // Detect joins
    for (const memberId of currentMemberIds) {
      if (!previousMembers.has(memberId)) {
        const memberName = steam.friends.getFriendPersonaName(memberId);
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log(`║  🟢 JOINED: ${memberName.padEnd(45)} ║`);
        console.log(`║     Steam ID: ${memberId.padEnd(43)} ║`);
        console.log('╚════════════════════════════════════════════════════════════╝');
      }
    }
    
    // Detect leaves
    for (const memberId of previousMembers) {
      if (!currentMemberIds.has(memberId)) {
        const memberName = steam.friends.getFriendPersonaName(memberId);
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log(`║  🔴 LEFT: ${memberName.padEnd(47)} ║`);
        console.log(`║     Steam ID: ${memberId.padEnd(43)} ║`);
        console.log('╚════════════════════════════════════════════════════════════╝');
      }
    }
    
    // If member count changed, show current roster
    if (currentMemberIds.size !== previousMembers.size) {
      const maxMembers = steam.matchmaking.getLobbyMemberLimit(lobbyId);
      console.log('');
      console.log(`📋 Current Members (${currentMemberIds.size}/${maxMembers}):`);
      let idx = 1;
      for (const memberId of currentMemberIds) {
        const memberName = steam.friends.getFriendPersonaName(memberId);
        const isOwner = memberId === steam.matchmaking.getLobbyOwner(lobbyId);
        const memberStatus = steam.matchmaking.getLobbyMemberData(lobbyId, memberId, 'status');
        const ownerTag = isOwner ? ' 👑' : '';
        const statusTag = memberStatus ? ` [${memberStatus}]` : '';
        console.log(`   ${idx}. ${memberName}${ownerTag}${statusTag}`);
        idx++;
      }
      console.log('');
    }
    
    // Update previous members for next iteration
    previousMembers = currentMemberIds;

    // Wait a bit before next check
    await sleep(100);
  }

  // Clean up
  console.log('');
  console.log('-'.repeat(60));
  console.log('CLEANUP');
  console.log('-'.repeat(60));

  console.log('Stopping chat polling...');
  steam.matchmaking.stopChatPolling(lobbyId);
  
  console.log('Leaving lobby...');
  steam.matchmaking.leaveLobby(lobbyId);
  console.log('Left lobby.');

  console.log('Shutting down Steam API...');
  steam.shutdown();
  console.log('Done!');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
testMatchmakingJoin().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
