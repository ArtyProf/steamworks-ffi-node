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
 * 
 * Note: Chat messages require LobbyChatMsg_t callback handling which needs
 * proper callback registration. The getLobbyChatEntry() requires the chatId
 * from that callback - polling with 0 won't work for receiving messages.
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

  // Track members we've seen
  let previousMemberCount = currentMembers;
  let running = true;
  let ownershipTransferred = false;

  // Set up signal handler for clean exit
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT, cleaning up...');
    running = false;
  });

  // Main loop - check for new members
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
        const memberName = steam.friends.getFriendPersonaName(memberId);
        console.log(`  Member ${i + 1}: ${memberName} (${memberId})`);
        
        // Read member data if available
        const memberStatus = steam.matchmaking.getLobbyMemberData(lobbyId, memberId, 'status');
        const memberChar = steam.matchmaking.getLobbyMemberData(lobbyId, memberId, 'character');
        if (memberStatus || memberChar) {
          console.log(`    Data: status="${memberStatus}", character="${memberChar}"`);
        }
      }
      
      // Test setLobbyOwner when second player joins
      if (newMemberCount >= 2 && !ownershipTransferred) {
        console.log('');
        console.log('--- Testing setLobbyOwner() ---');
        
        // Find the other member
        for (let i = 0; i < newMemberCount; i++) {
          const memberId = steam.matchmaking.getLobbyMemberByIndex(lobbyId, i);
          if (memberId !== steamId) {
            console.log(`Attempting to transfer ownership to: ${memberId}`);
            const transferResult = steam.matchmaking.setLobbyOwner(lobbyId, memberId);
            console.log(`setLobbyOwner() result: ${transferResult}`);
            
            const newOwner = steam.matchmaking.getLobbyOwner(lobbyId);
            console.log(`New owner: ${newOwner}`);
            
            // Transfer back
            if (transferResult) {
              console.log('Transferring ownership back...');
              // Note: This won't work because we're no longer the owner!
              // The new owner would need to transfer it back
              console.log('(Cannot transfer back - we are no longer the owner)');
            }
            
            ownershipTransferred = true;
            break;
          }
        }
      }
      
      // Send a welcome message when someone joins
      if (newMemberCount > previousMemberCount) {
        const welcomeMsg = `Welcome! ${newMemberCount} players in lobby.`;
        const sent = steam.matchmaking.sendLobbyChatMsg(lobbyId, welcomeMsg);
        console.log(`Sent welcome message: ${sent}`);
      }
      
      console.log('');
      previousMemberCount = newMemberCount;
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
