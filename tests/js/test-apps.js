/**
 * Steam Apps/DLC Manager Test (JavaScript)
 * 
 * Tests DLC ownership, app metadata, beta branches, and launch parameters
 * Run with: node tests/js/test-apps.js
 */

const SteamworksSDK = require('../../dist').default;

// Test configuration
const APP_ID = 480; // Spacewar (Valve's test app)

console.log('='.repeat(60));
console.log('Steam Apps/DLC Manager Test (JavaScript)');
console.log('='.repeat(60));
console.log();

// Initialize Steam
const steam = SteamworksSDK.getInstance();
const initialized = steam.init({ appId: APP_ID });

if (!initialized) {
  console.error('Failed to initialize Steam API');
  console.error('Make sure Steam is running and you have the correct app ID');
  process.exit(1);
}

console.log('✓ Steam API initialized successfully');
console.log();

// Helper function to format dates
function formatDate(unixTime) {
  if (unixTime === 0) return 'N/A';
  return new Date(unixTime * 1000).toLocaleString();
}

// ========================================
// Test Ownership Checks
// ========================================
console.log('-'.repeat(60));
console.log('OWNERSHIP CHECKS');
console.log('-'.repeat(60));

console.log('\n--- Basic Ownership ---');
console.log(`Is Subscribed: ${steam.apps.isSubscribed()}`);
console.log(`Is Low Violence: ${steam.apps.isLowViolence()}`);
console.log(`Is Cybercafe: ${steam.apps.isCybercafe()}`);
console.log(`Is VAC Banned: ${steam.apps.isVACBanned()}`);
console.log(`Free Weekend: ${steam.apps.isSubscribedFromFreeWeekend()}`);
console.log(`Family Sharing: ${steam.apps.isSubscribedFromFamilySharing()}`);

console.log('\n--- App Ownership Check ---');
console.log(`Is Subscribed to App 480: ${steam.apps.isSubscribedApp(480)}`);
console.log(`Is App 480 Installed: ${steam.apps.isAppInstalled(480)}`);

console.log('\n--- Comprehensive Ownership Info ---');
const ownership = steam.apps.getOwnershipInfo();
console.log(`  Subscribed: ${ownership.isSubscribed}`);
console.log(`  Free Weekend: ${ownership.isSubscribedFromFreeWeekend}`);
console.log(`  Family Sharing: ${ownership.isSubscribedFromFamilySharing}`);
console.log(`  Installed: ${ownership.isInstalled}`);
console.log(`  Purchase Time: ${formatDate(ownership.earliestPurchaseTime)}`);
console.log(`  Owner ID: ${ownership.ownerId}`);

// ========================================
// Test DLC Functions
// ========================================
console.log('\n' + '-'.repeat(60));
console.log('DLC FUNCTIONS');
console.log('-'.repeat(60));

console.log('\n--- DLC Count ---');
const dlcCount = steam.apps.getDLCCount();
console.log(`Number of DLC: ${dlcCount}`);

if (dlcCount > 0) {
  console.log('\n--- All DLC ---');
  const allDlc = steam.apps.getAllDLC();
  allDlc.forEach((dlc, index) => {
    console.log(`  [${index}] ${dlc.name}`);
    console.log(`      App ID: ${dlc.appId}`);
    console.log(`      Available: ${dlc.available}`);
    console.log(`      Installed: ${steam.apps.isDlcInstalled(dlc.appId)}`);
  });
} else {
  console.log('No DLC available for this app');
}

// Test DLC download progress
console.log('\n--- DLC Download Progress ---');
const progress = steam.apps.getDlcDownloadProgress(480);
if (progress) {
  console.log(`  Downloaded: ${progress.bytesDownloaded}`);
  console.log(`  Total: ${progress.bytesTotal}`);
  console.log(`  Progress: ${progress.percentComplete}%`);
} else {
  console.log('  No DLC currently downloading');
}

// ========================================
// Test Timed Trial
// ========================================
console.log('\n' + '-'.repeat(60));
console.log('TIMED TRIAL');
console.log('-'.repeat(60));

const trial = steam.apps.getTimedTrialStatus();
if (trial) {
  console.log(`Is Timed Trial: ${trial.isTimedTrial}`);
  if (trial.isTimedTrial) {
    console.log(`  Seconds Allowed: ${trial.secondsAllowed}`);
    console.log(`  Seconds Played: ${trial.secondsPlayed}`);
    console.log(`  Seconds Remaining: ${trial.secondsRemaining}`);
  }
} else {
  console.log('Could not get timed trial status');
}

// ========================================
// Test App Information
// ========================================
console.log('\n' + '-'.repeat(60));
console.log('APP INFORMATION');
console.log('-'.repeat(60));

console.log('\n--- Language ---');
console.log(`Current Language: ${steam.apps.getCurrentGameLanguage()}`);
console.log(`Available Languages: ${steam.apps.getAvailableGameLanguages()}`);

console.log('\n--- Purchase Info ---');
const purchaseTime = steam.apps.getEarliestPurchaseUnixTime(0);
console.log(`Earliest Purchase: ${formatDate(purchaseTime)}`);

console.log('\n--- App Owner ---');
const ownerId = steam.apps.getAppOwner();
console.log(`App Owner Steam ID: ${ownerId}`);

console.log('\n--- Build Info ---');
const buildInfo = steam.apps.getBuildInfo();
console.log(`  Build ID: ${buildInfo.buildId}`);
console.log(`  Beta Name: ${buildInfo.betaName}`);
console.log(`  Install Dir: ${buildInfo.installDir || 'N/A'}`);

console.log('\n--- Install Directory ---');
const installDir = steam.apps.getAppInstallDir(480);
console.log(`App 480 Install Dir: ${installDir || 'Not installed'}`);

console.log('\n--- Installed Depots ---');
const depots = steam.apps.getInstalledDepots(480);
if (depots.length > 0) {
  console.log(`Installed Depots: ${depots.join(', ')}`);
} else {
  console.log('No depots found');
}

// ========================================
// Test Beta Branches
// ========================================
console.log('\n' + '-'.repeat(60));
console.log('BETA BRANCHES');
console.log('-'.repeat(60));

console.log('\n--- Current Beta ---');
const currentBeta = steam.apps.getCurrentBetaName();
console.log(`Current Beta: ${currentBeta}`);

console.log('\n--- Beta Count ---');
const betaCounts = steam.apps.getNumBetas();
console.log(`  Total: ${betaCounts.total}`);
console.log(`  Available: ${betaCounts.available}`);
console.log(`  Private: ${betaCounts.private}`);

if (betaCounts.total > 0) {
  console.log('\n--- All Betas ---');
  const allBetas = steam.apps.getAllBetas();
  allBetas.forEach((beta, index) => {
    console.log(`  [${index}] ${beta.name}`);
    console.log(`      Description: ${beta.description || 'N/A'}`);
    console.log(`      Build ID: ${beta.buildId}`);
    console.log(`      Flags: ${beta.flags}`);
  });
}

// ========================================
// Test Launch Parameters
// ========================================
console.log('\n' + '-'.repeat(60));
console.log('LAUNCH PARAMETERS');
console.log('-'.repeat(60));

console.log('\n--- Launch Query Params ---');
const testParams = ['server', 'port', 'connect', 'password'];
testParams.forEach(param => {
  const value = steam.apps.getLaunchQueryParam(param);
  console.log(`  ${param}: ${value || '(not set)'}`);
});

console.log('\n--- Launch Command Line ---');
const cmdLine = steam.apps.getLaunchCommandLine();
console.log(`Command Line: ${cmdLine || '(empty)'}`);

// ========================================
// Summary
// ========================================
console.log('\n' + '='.repeat(60));
console.log('TEST SUMMARY');
console.log('='.repeat(60));

const functionsTestedCount = 25;
console.log(`\n✓ Tested ${functionsTestedCount} Apps Manager functions`);

// Cleanup
console.log('\n');
steam.shutdown();
console.log('Steam API shut down');
