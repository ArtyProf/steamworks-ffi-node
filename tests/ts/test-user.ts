/**
 * Test script for Steam User API (ISteamUser)
 * Tests all user functionality including authentication, tickets, voice, and user info
 */

import SteamworksSDK, {
  EBeginAuthSessionResult,
  EAuthSessionResponse,
  EUserHasLicenseForAppResult,
  EDurationControlOnlineState,
  EVoiceResult,
} from '../../src/index';

// Configuration
const TEST_APP_ID = 480; // Spacewar for testing
const VOICE_TEST_DURATION_MS = 3000; // Duration to test voice recording

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testUserAPI() {
  console.log('🧪 Starting Steam User API Complete Test\n');
  
  const steam = SteamworksSDK.getInstance();
  
  // Initialize Steam
  console.log('🔧 Initializing Steam API...');
  const initialized = steam.init({ appId: TEST_APP_ID });
  
  if (!initialized) {
    console.error('❌ Failed to initialize Steam API');
    console.log('💡 Make sure Steam is running and steam_appid.txt exists');
    return;
  }
  
  console.log('✅ Steam API initialized successfully!\n');
  
  // Get Steam status
  const status = steam.getStatus();
  console.log('📊 Steam Status:');
  console.log(`   - Initialized: ${status.initialized}`);
  console.log(`   - App ID: ${status.appId}`);
  console.log(`   - Steam ID: ${status.steamId}\n`);

  // ===== LOGIN STATE TESTS =====
  console.log('═'.repeat(60));
  console.log('LOGIN STATE');
  console.log('═'.repeat(60) + '\n');

  console.log('🔐 Checking login state...');
  const loggedOn = steam.user.isLoggedOn();
  console.log(`✅ User is logged on: ${loggedOn}\n`);

  // ===== USER INFO TESTS =====
  console.log('═'.repeat(60));
  console.log('USER INFORMATION');
  console.log('═'.repeat(60) + '\n');

  console.log('📊 Getting player Steam level...');
  const steamLevel = steam.user.getPlayerSteamLevel();
  console.log(`✅ Steam Level: ${steamLevel}\n`);

  console.log('🏆 Getting game badge level...');
  const regularBadge = steam.user.getGameBadgeLevel(1, false);
  const foilBadge = steam.user.getGameBadgeLevel(1, true);
  console.log(`✅ Regular Badge Level: ${regularBadge}`);
  console.log(`✅ Foil Badge Level: ${foilBadge}\n`);

  console.log('📁 Getting user data folder...');
  const userDataFolder = steam.user.getUserDataFolder();
  console.log(`✅ User Data Folder: ${userDataFolder || 'Not available'}\n`);

  console.log('🌐 Checking if behind NAT...');
  const behindNAT = steam.user.isBehindNAT();
  console.log(`✅ Behind NAT: ${behindNAT}\n`);

  // ===== SECURITY INFO TESTS =====
  console.log('═'.repeat(60));
  console.log('SECURITY INFORMATION');
  console.log('═'.repeat(60) + '\n');

  console.log('🔒 Getting user security info...');
  const securityInfo = steam.user.getUserSecurityInfo();
  console.log(`✅ Security Info:`);
  console.log(`   - Phone Verified: ${securityInfo.phoneVerified}`);
  console.log(`   - Two-Factor Enabled: ${securityInfo.twoFactorEnabled}`);
  console.log(`   - Phone Identifying: ${securityInfo.phoneIdentifying}`);
  console.log(`   - Phone Requiring Verification: ${securityInfo.phoneRequiringVerification}\n`);

  // ===== SESSION TICKET TESTS =====
  console.log('═'.repeat(60));
  console.log('SESSION TICKETS');
  console.log('═'.repeat(60) + '\n');

  console.log('🎫 Getting auth session ticket...');
  const sessionTicket = steam.user.getAuthSessionTicket();
  
  if (sessionTicket.success) {
    console.log(`✅ Session Ticket obtained:`);
    console.log(`   - Auth Ticket Handle: ${sessionTicket.authTicket}`);
    console.log(`   - Ticket Size: ${sessionTicket.ticketSize} bytes`);
    console.log(`   - Ticket Data (first 32 bytes): ${sessionTicket.ticketData?.subarray(0, 32).toString('hex')}`);
    
    // Cancel the ticket after getting it
    console.log('\n🗑️ Canceling auth ticket...');
    steam.user.cancelAuthTicket(sessionTicket.authTicket);
    console.log('✅ Auth ticket canceled\n');
  } else {
    console.log(`❌ Failed to get session ticket: ${sessionTicket.error}\n`);
  }

  // ===== WEB API TICKET TESTS =====
  console.log('═'.repeat(60));
  console.log('WEB API TICKETS');
  console.log('═'.repeat(60) + '\n');

  console.log('🌐 Getting auth ticket for Web API...');
  try {
    const webTicket = await steam.user.getAuthTicketForWebApi('test-service');
    
    if (webTicket.success) {
      console.log(`✅ Web API Ticket obtained:`);
      console.log(`   - Auth Ticket Handle: ${webTicket.authTicket}`);
      console.log(`   - Ticket Size: ${webTicket.ticketSize} bytes`);
      console.log(`   - Ticket Hex (first 64 chars): ${webTicket.ticketHex?.substring(0, 64)}...`);
      
      // Cancel the ticket after getting it
      console.log('\n🗑️ Canceling web API ticket...');
      steam.user.cancelAuthTicket(webTicket.authTicket);
      console.log('✅ Web API ticket canceled\n');
    } else {
      console.log(`❌ Failed to get web API ticket: ${webTicket.error}\n`);
    }
  } catch (error) {
    console.log(`❌ Error getting web API ticket: ${error}\n`);
  }

  // ===== AUTH SESSION TESTS =====
  console.log('═'.repeat(60));
  console.log('AUTH SESSION VALIDATION');
  console.log('═'.repeat(60) + '\n');

  console.log('🔐 Testing auth session flow...');
  
  // Get a new ticket for auth session test
  const authTicket = steam.user.getAuthSessionTicket();
  
  if (authTicket.success && authTicket.ticketData) {
    console.log(`✅ Got auth ticket for session test`);
    
    // Try to begin auth session with our own ticket (for testing purposes)
    console.log('\n🔍 Beginning auth session with own Steam ID...');
    const beginResult = steam.user.beginAuthSession(authTicket.ticketData, status.steamId);
    
    console.log(`   - Result: ${EBeginAuthSessionResult[beginResult.result] || beginResult.result}`);
    console.log(`   - Success: ${beginResult.success}`);
    
    if (beginResult.success) {
      // Check license for current app
      console.log('\n📜 Checking license for current app...');
      const licenseResult = steam.user.userHasLicenseForApp(status.steamId, TEST_APP_ID);
      console.log(`   - License Result: ${EUserHasLicenseForAppResult[licenseResult] || licenseResult}`);
      
      // End auth session
      console.log('\n🔚 Ending auth session...');
      steam.user.endAuthSession(status.steamId);
      console.log('✅ Auth session ended');
    }
    
    // Cancel the ticket
    steam.user.cancelAuthTicket(authTicket.authTicket);
    console.log('✅ Auth ticket canceled\n');
  } else {
    console.log(`❌ Could not get auth ticket for session test\n`);
  }

  // ===== ENCRYPTED APP TICKET TESTS =====
  console.log('═'.repeat(60));
  console.log('ENCRYPTED APP TICKETS');
  console.log('═'.repeat(60) + '\n');

  console.log('🔒 Requesting encrypted app ticket...');
  try {
    const encryptedResult = await steam.user.requestEncryptedAppTicket();
    
    if (encryptedResult.success) {
      console.log(`✅ Encrypted app ticket requested successfully`);
      
      // Try to get the encrypted ticket
      console.log('\n📦 Getting encrypted app ticket...');
      const ticket = steam.user.getEncryptedAppTicket();
      
      if (ticket.success && ticket.ticketData) {
        console.log(`✅ Encrypted ticket obtained:`);
        console.log(`   - Ticket Size: ${ticket.ticketSize} bytes`);
        console.log(`   - Ticket Data (first 32 bytes): ${ticket.ticketData.subarray(0, 32).toString('hex')}`);
      } else {
        console.log(`❌ Failed to get encrypted ticket: ${ticket.error}`);
      }
    } else {
      console.log(`❌ Failed to request encrypted ticket: ${encryptedResult.error}`);
    }
  } catch (error) {
    console.log(`❌ Error with encrypted ticket: ${error}`);
  }
  console.log('');

  // ===== DURATION CONTROL TESTS =====
  console.log('═'.repeat(60));
  console.log('DURATION CONTROL');
  console.log('═'.repeat(60) + '\n');

  console.log('⏱️ Getting duration control info...');
  try {
    const durationControl = await steam.user.getDurationControl();
    
    if (durationControl.success) {
      console.log(`✅ Duration Control Info:`);
      console.log(`   - App ID: ${durationControl.appId}`);
      console.log(`   - Applicable: ${durationControl.applicable}`);
      console.log(`   - Seconds Last 5 Hours: ${durationControl.secondsLast5Hours}`);
      console.log(`   - Progress: ${durationControl.progress}`);
      console.log(`   - Notification: ${durationControl.notification}`);
      console.log(`   - Seconds Today: ${durationControl.secondsToday}`);
      console.log(`   - Seconds Remaining: ${durationControl.secondsRemaining}`);
    } else {
      console.log(`ℹ️ Duration control not applicable or unavailable`);
    }
  } catch (error) {
    console.log(`ℹ️ Duration control test skipped: ${error}`);
  }
  console.log('');

  console.log('🎮 Setting duration control online state...');
  const stateSet = steam.user.setDurationControlOnlineState(EDurationControlOnlineState.Online);
  console.log(`✅ Online state set: ${stateSet}\n`);

  // ===== MARKET ELIGIBILITY TESTS =====
  console.log('═'.repeat(60));
  console.log('MARKET ELIGIBILITY');
  console.log('═'.repeat(60) + '\n');

  console.log('💰 Getting market eligibility...');
  try {
    const marketEligibility = await steam.user.getMarketEligibility();
    
    console.log(`✅ Market Eligibility Info:`);
    console.log(`   - Allowed: ${marketEligibility.allowed}`);
    console.log(`   - Not Allowed Reason: ${marketEligibility.notAllowedReason}`);
    console.log(`   - Allowed At Time: ${marketEligibility.allowedAtTime}`);
    console.log(`   - Steam Guard Required Days: ${marketEligibility.steamGuardRequiredDays}`);
    console.log(`   - New Device Cooldown Days: ${marketEligibility.newDeviceCooldownDays}`);
  } catch (error) {
    console.log(`ℹ️ Market eligibility test skipped: ${error}`);
  }
  console.log('');

  // ===== STORE AUTH URL TESTS =====
  console.log('═'.repeat(60));
  console.log('STORE AUTH URL');
  console.log('═'.repeat(60) + '\n');

  console.log('🛒 Requesting store auth URL...');
  try {
    const storeAuthResult = await steam.user.requestStoreAuthURL('https://store.steampowered.com');
    console.log(`✅ Store Auth URL Result:`);
    console.log(`   - URL: ${storeAuthResult.url}`);
  } catch (error) {
    console.log(`ℹ️ Store auth URL test skipped: ${error}`);
  }
  console.log('');

  // ===== VOICE RECORDING TESTS =====
  console.log('═'.repeat(60));
  console.log('VOICE RECORDING');
  console.log('═'.repeat(60) + '\n');

  console.log('🎤 Testing voice recording functionality...');

  // Get optimal sample rate
  console.log('📊 Getting optimal voice sample rate...');
  const optimalSampleRate = steam.user.getVoiceOptimalSampleRate();
  console.log(`✅ Optimal Sample Rate: ${optimalSampleRate} Hz\n`);

  // Check available voice before recording
  console.log('📊 Checking available voice (before recording)...');
  let available = steam.user.getAvailableVoice();
  console.log(`   - Result: ${EVoiceResult[available.result] || available.result}`);
  console.log(`   - Compressed Bytes: ${available.compressedBytes}\n`);

  // Start voice recording
  console.log('🎙️ Starting voice recording...');
  steam.user.startVoiceRecording();
  console.log('✅ Voice recording started\n');

  // Record for a few seconds
  console.log(`⏳ Recording for ${VOICE_TEST_DURATION_MS / 1000} seconds...`);
  console.log('💡 Speak into your microphone if connected!\n');
  
  let totalBytesRecorded = 0;
  let recordingSamples = 0;
  
  const startTime = Date.now();
  while (Date.now() - startTime < VOICE_TEST_DURATION_MS) {
    // Check available voice
    available = steam.user.getAvailableVoice();
    
    if (available.result === EVoiceResult.OK && available.compressedBytes > 0) {
      // Get voice data
      const voiceData = steam.user.getVoice();
      
      if (voiceData.result === EVoiceResult.OK && voiceData.voiceData) {
        totalBytesRecorded += voiceData.bytesWritten;
        recordingSamples++;
        
        // Test decompression
        if (optimalSampleRate > 0) {
          const decompressed = steam.user.decompressVoice(voiceData.voiceData, optimalSampleRate);
          if (decompressed.result === EVoiceResult.OK) {
            console.log(`   📦 Captured ${voiceData.bytesWritten} bytes -> Decompressed to ${decompressed.bytesWritten} bytes`);
          }
        }
      }
    }
    
    await sleep(50); // Poll every 50ms
  }

  // Stop voice recording
  console.log('\n🛑 Stopping voice recording...');
  steam.user.stopVoiceRecording();
  console.log('✅ Voice recording stopped\n');

  // Drain remaining voice data
  console.log('🔄 Draining remaining voice data...');
  let drainCount = 0;
  while (drainCount < 10) {
    const voiceData = steam.user.getVoice();
    if (voiceData.result === EVoiceResult.NotRecording || voiceData.result === EVoiceResult.NoData) {
      break;
    }
    if (voiceData.result === EVoiceResult.OK && voiceData.bytesWritten > 0) {
      totalBytesRecorded += voiceData.bytesWritten;
      recordingSamples++;
    }
    drainCount++;
    await sleep(50);
  }

  console.log(`\n📊 Voice Recording Summary:`);
  console.log(`   - Total Bytes Recorded: ${totalBytesRecorded}`);
  console.log(`   - Recording Samples: ${recordingSamples}`);
  console.log(`   - Optimal Sample Rate: ${optimalSampleRate} Hz\n`);

  // ===== ADVERTISE GAME TEST =====
  console.log('═'.repeat(60));
  console.log('ADVERTISE GAME');
  console.log('═'.repeat(60) + '\n');

  console.log('📢 Testing advertise game...');
  // Advertise that we're on a server (using dummy values)
  steam.user.advertiseGame('0', 0, 0);
  console.log('✅ Advertise game called (cleared advertisement)\n');

  // ===== CLEANUP =====
  console.log('═'.repeat(60));
  console.log('CLEANUP');
  console.log('═'.repeat(60) + '\n');

  console.log('🧹 Canceling all active tickets...');
  steam.user.cancelAllTickets();
  console.log('✅ All tickets canceled\n');

  // ===== SUMMARY =====
  console.log('═'.repeat(60));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(60) + '\n');

  console.log('✅ All Steam User API tests completed!');
  console.log('\nFunctions tested:');
  console.log('   - isLoggedOn()');
  console.log('   - getPlayerSteamLevel()');
  console.log('   - getGameBadgeLevel()');
  console.log('   - getUserDataFolder()');
  console.log('   - isBehindNAT()');
  console.log('   - getUserSecurityInfo()');
  console.log('   - getAuthSessionTicket()');
  console.log('   - getAuthTicketForWebApi()');
  console.log('   - beginAuthSession()');
  console.log('   - endAuthSession()');
  console.log('   - cancelAuthTicket()');
  console.log('   - userHasLicenseForApp()');
  console.log('   - requestEncryptedAppTicket()');
  console.log('   - getEncryptedAppTicket()');
  console.log('   - getDurationControl()');
  console.log('   - setDurationControlOnlineState()');
  console.log('   - getMarketEligibility()');
  console.log('   - requestStoreAuthURL()');
  console.log('   - startVoiceRecording()');
  console.log('   - stopVoiceRecording()');
  console.log('   - getAvailableVoice()');
  console.log('   - getVoice()');
  console.log('   - decompressVoice()');
  console.log('   - getVoiceOptimalSampleRate()');
  console.log('   - advertiseGame()');
  console.log('   - cancelAllTickets()');

  // Shutdown
  console.log('\n🔧 Shutting down Steam API...');
  steam.shutdown();
  console.log('✅ Steam API shut down\n');
  
  console.log('🎉 Test completed successfully!');
}

// Run the test
testUserAPI().catch(console.error);
