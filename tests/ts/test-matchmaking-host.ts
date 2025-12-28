/**
 * Matchmaking Host Test
 * 
 * This test demonstrates lobby hosting functionality.
 * Run this on one machine, then run test-matchmaking-join.ts on another machine
 * with a different Steam account to test the full flow.
 * 
 * Usage:
 *   npm run test:matchmaking:host:ts
 * 
 * Methods tested in this file:
 *   - createLobby()
 *   - setLobbyData()
 *   - getLobbyData()
 *   - getAllLobbyData()
 *   - getLobbyOwner()
 *   - getLobbyMemberLimit()
 *   - setLobbyMemberLimit()
 *   - getNumLobbyMembers()
 *   - getLobbyMemberByIndex()
 *   - setLobbyType()
 *   - setLobbyJoinable()
 *   - setLobbyOwner() (when second player joins)
 *   - deleteLobbyData()
 *   - sendLobbyChatMsg()
 *   - leaveLobby()
 *   - startChatPolling()
 *   - pollChatMessages()
 *   - onChatMessage()
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
  // Set numerical data for filter testing
  const setResult5 = steam.matchmaking.setLobbyData(lobbyId, 'skillLevel', '50');
  const setResult6 = steam.matchmaking.setLobbyData(lobbyId, 'minLevel', '10');

  console.log(`Set gameMode=cooperative: ${setResult1}`);
  console.log(`Set map=testMap1: ${setResult2}`);
  console.log(`Set hostName=${playerName}: ${setResult3}`);
  console.log(`Set version=1.0.0: ${setResult4}`);
  console.log(`Set skillLevel=50: ${setResult5}`);
  console.log(`Set minLevel=10: ${setResult6}`);
  console.log('');

  // Test getLobbyData for individual keys
  console.log('-'.repeat(60));
  console.log('TESTING getLobbyData()');
  console.log('-'.repeat(60));
  
  const gameMode = steam.matchmaking.getLobbyData(lobbyId, 'gameMode');
  const map = steam.matchmaking.getLobbyData(lobbyId, 'map');
  const nonExistent = steam.matchmaking.getLobbyData(lobbyId, 'doesNotExist');
  
  console.log(`getLobbyData('gameMode'): "${gameMode}"`);
  console.log(`getLobbyData('map'): "${map}"`);
  console.log(`getLobbyData('doesNotExist'): "${nonExistent}" (should be empty)`);
  console.log('');

  // Display lobby info
  console.log('-'.repeat(60));
  console.log('LOBBY INFORMATION');
  console.log('-'.repeat(60));

  const lobbyOwner = steam.matchmaking.getLobbyOwner(lobbyId);
  const maxMembers = steam.matchmaking.getLobbyMemberLimit(lobbyId);
  const currentMembers = steam.matchmaking.getNumLobbyMembers(lobbyId);

  console.log(`Owner: ${lobbyOwner}`);
  console.log(`Members: ${currentMembers}/${maxMembers}`);
  
  // Get all lobby data
  const allData = steam.matchmaking.getAllLobbyData(lobbyId);
  console.log(`Lobby Data:`, allData);
  console.log('');

  // Test setLobbyMemberLimit
  console.log('-'.repeat(60));
  console.log('TESTING setLobbyMemberLimit()');
  console.log('-'.repeat(60));
  
  const originalLimit = steam.matchmaking.getLobbyMemberLimit(lobbyId);
  console.log(`Original member limit: ${originalLimit}`);
  
  const limitChanged = steam.matchmaking.setLobbyMemberLimit(lobbyId, 8);
  console.log(`setLobbyMemberLimit(8): ${limitChanged}`);
  
  const newLimit = steam.matchmaking.getLobbyMemberLimit(lobbyId);
  console.log(`New member limit: ${newLimit}`);
  
  // Restore original
  steam.matchmaking.setLobbyMemberLimit(lobbyId, originalLimit);
  console.log(`Restored to: ${steam.matchmaking.getLobbyMemberLimit(lobbyId)}`);
  console.log('');

  // Test setLobbyType
  console.log('-'.repeat(60));
  console.log('TESTING setLobbyType()');
  console.log('-'.repeat(60));
  
  console.log('Current type: Public (0)');
  
  const typeChanged1 = steam.matchmaking.setLobbyType(lobbyId, ELobbyType.FriendsOnly);
  console.log(`setLobbyType(FriendsOnly): ${typeChanged1}`);
  
  const typeChanged2 = steam.matchmaking.setLobbyType(lobbyId, ELobbyType.Public);
  console.log(`setLobbyType(Public) - restored: ${typeChanged2}`);
  console.log('');

  // Test setLobbyJoinable
  console.log('-'.repeat(60));
  console.log('TESTING setLobbyJoinable()');
  console.log('-'.repeat(60));
  
  const lockResult = steam.matchmaking.setLobbyJoinable(lobbyId, false);
  console.log(`setLobbyJoinable(false) - locked: ${lockResult}`);
  
  const unlockResult = steam.matchmaking.setLobbyJoinable(lobbyId, true);
  console.log(`setLobbyJoinable(true) - unlocked: ${unlockResult}`);
  console.log('');

  // Test deleteLobbyData
  console.log('-'.repeat(60));
  console.log('TESTING deleteLobbyData()');
  console.log('-'.repeat(60));
  
  // Add a temp key then delete it
  steam.matchmaking.setLobbyData(lobbyId, 'tempKey', 'tempValue');
  const tempBefore = steam.matchmaking.getLobbyData(lobbyId, 'tempKey');
  console.log(`Before delete - tempKey: "${tempBefore}"`);
  
  const deleteResult = steam.matchmaking.deleteLobbyData(lobbyId, 'tempKey');
  console.log(`deleteLobbyData('tempKey'): ${deleteResult}`);
  
  const tempAfter = steam.matchmaking.getLobbyData(lobbyId, 'tempKey');
  console.log(`After delete - tempKey: "${tempAfter}" (should be empty)`);
  console.log('');

  // Set up waiting for players
  console.log('-'.repeat(60));
  console.log('WAITING FOR PLAYERS');
  console.log('-'.repeat(60));
  console.log('');
  console.log('The lobby is now public and searchable.');
  console.log('Run test-matchmaking-join.ts on another machine to join.');
  console.log('');
  console.log('Or join directly with:');
  console.log(`  npx ts-node tests/ts/test-matchmaking-join.ts ${lobbyId}`);
  console.log('');
  console.log('Press Ctrl+C to leave lobby and exit.');
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

  // Track members we've seen (for detecting joins/leaves)
  let previousMembers: Set<string> = new Set();
  // Initialize with current members
  for (let i = 0; i < currentMembers; i++) {
    const memberId = steam.matchmaking.getLobbyMemberByIndex(lobbyId, i);
    if (memberId) previousMembers.add(memberId);
  }
  
  let running = true;
  let ownershipTransferred = false;

  // Set up signal handler for clean exit
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT, cleaning up...');
    running = false;
  });

  // Main loop - check for new members
  while (running) {
    // Run Steam callbacks (for all Steam systems)
    steam.runCallbacks();
    
    // Poll for new chat messages
    steam.matchmaking.pollChatMessages();

    // Get current members
    const currentMemberIds: Set<string> = new Set();
    const newMemberCount = steam.matchmaking.getNumLobbyMembers(lobbyId);
    for (let i = 0; i < newMemberCount; i++) {
      const memberId = steam.matchmaking.getLobbyMemberByIndex(lobbyId, i);
      if (memberId) currentMemberIds.add(memberId);
    }
    
    // Detect joins - members in current but not in previous
    for (const memberId of currentMemberIds) {
      if (!previousMembers.has(memberId)) {
        const memberName = steam.friends.getFriendPersonaName(memberId);
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log(`║  🟢 JOINED: ${memberName.padEnd(45)} ║`);
        console.log(`║     Steam ID: ${memberId.padEnd(43)} ║`);
        console.log('╚════════════════════════════════════════════════════════════╝');
        
        // Send welcome message
        const welcomeMsg = `Welcome ${memberName}! ${currentMemberIds.size} players in lobby.`;
        steam.matchmaking.sendLobbyChatMsg(lobbyId, welcomeMsg);
      }
    }
    
    // Detect leaves - members in previous but not in current
    for (const memberId of previousMembers) {
      if (!currentMemberIds.has(memberId)) {
        const memberName = steam.friends.getFriendPersonaName(memberId);
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log(`║  🔴 LEFT: ${memberName.padEnd(47)} ║`);
        console.log(`║     Steam ID: ${memberId.padEnd(43)} ║`);
        console.log('╚════════════════════════════════════════════════════════════╝');
        
        // Notify remaining members
        if (currentMemberIds.size > 0) {
          const leaveMsg = `${memberName} has left the lobby. ${currentMemberIds.size} players remaining.`;
          steam.matchmaking.sendLobbyChatMsg(lobbyId, leaveMsg);
        }
      }
    }
    
    // If member count changed, show current roster
    if (currentMemberIds.size !== previousMembers.size) {
      console.log('');
      console.log(`📋 Current Members (${currentMemberIds.size}/${maxMembers}):`);
      let idx = 1;
      for (const memberId of currentMemberIds) {
        const memberName = steam.friends.getFriendPersonaName(memberId);
        const isOwner = memberId === steam.matchmaking.getLobbyOwner(lobbyId);
        const memberStatus = steam.matchmaking.getLobbyMemberData(lobbyId, memberId, 'status');
        const memberChar = steam.matchmaking.getLobbyMemberData(lobbyId, memberId, 'character');
        const ownerTag = isOwner ? ' 👑' : '';
        const statusTag = memberStatus ? ` [${memberStatus}]` : '';
        const charTag = memberChar ? ` (${memberChar})` : '';
        console.log(`   ${idx}. ${memberName}${ownerTag}${statusTag}${charTag}`);
        idx++;
      }
      
      // Test setLobbyOwner when second player joins
      if (currentMemberIds.size >= 2 && !ownershipTransferred) {
        console.log('');
        console.log('--- Testing setLobbyOwner() ---');
        
        // Find the other member
        for (const memberId of currentMemberIds) {
          if (memberId !== steamId) {
            const memberName = steam.friends.getFriendPersonaName(memberId);
            console.log(`Attempting to transfer ownership to: ${memberName}`);
            const transferResult = steam.matchmaking.setLobbyOwner(lobbyId, memberId);
            console.log(`setLobbyOwner() result: ${transferResult}`);
            
            const newOwner = steam.matchmaking.getLobbyOwner(lobbyId);
            const newOwnerName = steam.friends.getFriendPersonaName(newOwner);
            console.log(`New owner: ${newOwnerName}`);
            
            if (transferResult) {
              console.log('(Cannot transfer back - we are no longer the owner)');
            }
            
            ownershipTransferred = true;
            break;
          }
        }
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
testMatchmakingHost().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
