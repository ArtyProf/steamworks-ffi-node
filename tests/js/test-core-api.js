/**
 * Test: Core API - getCurrentGameLanguage
 * 
 * This test verifies the Core API language detection functionality.
 * 
 * What it does:
 * 1. Initializes Steam API
 * 2. Gets the current Steam language
 * 3. Displays language information
 * 4. Shows example localization usage
 * 
 * Requirements:
 * - Steam must be running
 * - User must be logged in
 */

const { SteamworksSDK } = require('../../dist/index.js');

async function testCoreAPI() {
  console.log('\n==============================================');
  console.log('CORE API - Language Detection Test');
  console.log('==============================================\n');

  const steam = SteamworksSDK.getInstance();

  // Initialize Steam API
  console.log('� Initializing Steam API (AppID 480 - Spacewar)...');
  const initialized = steam.init({ appId: 480 }); // Using Spacewar for testing

  if (!initialized) {
    console.error('❌ Failed to initialize Steam API');
    console.error('   Make sure Steam is running and you are logged in');
    process.exit(1);
  }

  console.log('✅ Steam API initialized successfully!\n');

  // Check if Steam is running (after initialization)
  console.log('� Checking Steam status...');
  const steamRunning = steam.isSteamRunning();
  console.log(`   Steam client: ${steamRunning ? '✅ Running' : '⚠️ Not detected'}\n`);

  // Get status
  const status = steam.getStatus();
  console.log('📊 Steam Status:');
  console.log(`   Initialized: ${status.initialized}`);
  console.log(`   App ID: ${status.appId}`);
  console.log(`   Steam ID: ${status.steamId}\n`);

  // Get current game language
  console.log('🌐 Getting current Steam language...');
  const language = steam.getCurrentGameLanguage();
  
  console.log('\n==============================================');
  console.log('LANGUAGE INFORMATION');
  console.log('==============================================');
  console.log(`Language Code: ${language}`);
  console.log(`Full Name: ${getLanguageName(language)}`);
  console.log('==============================================\n');

  // Example: Language-specific messages
  console.log('📝 Example Localized Messages:');
  console.log('----------------------------------------');
  displayLocalizedMessage(language);
  console.log('----------------------------------------\n');

  // Cleanup
  console.log('🧹 Shutting down Steam API...');
  steam.shutdown();
  console.log('✅ Test completed successfully!\n');
}

/**
 * Get full language name from language code
 */
function getLanguageName(code) {
  const languageNames = {
    'english': 'English',
    'french': 'French',
    'german': 'German',
    'spanish': 'Spanish (Spain)',
    'latam': 'Spanish (Latin America)',
    'italian': 'Italian',
    'japanese': 'Japanese',
    'korean': 'Korean',
    'portuguese': 'Portuguese',
    'brazilian': 'Portuguese (Brazil)',
    'russian': 'Russian',
    'schinese': 'Simplified Chinese',
    'tchinese': 'Traditional Chinese',
    'thai': 'Thai',
    'polish': 'Polish',
    'danish': 'Danish',
    'dutch': 'Dutch',
    'finnish': 'Finnish',
    'norwegian': 'Norwegian',
    'swedish': 'Swedish',
    'hungarian': 'Hungarian',
    'czech': 'Czech',
    'romanian': 'Romanian',
    'turkish': 'Turkish',
    'arabic': 'Arabic',
    'bulgarian': 'Bulgarian',
    'greek': 'Greek',
    'ukrainian': 'Ukrainian',
    'vietnamese': 'Vietnamese'
  };

  return languageNames[code] || 'Unknown';
}

/**
 * Display localized message based on language
 */
function displayLocalizedMessage(language) {
  const messages = {
    'english': {
      welcome: 'Welcome to the game!',
      play: 'Play',
      quit: 'Quit'
    },
    'french': {
      welcome: 'Bienvenue dans le jeu!',
      play: 'Jouer',
      quit: 'Quitter'
    },
    'german': {
      welcome: 'Willkommen im Spiel!',
      play: 'Spielen',
      quit: 'Beenden'
    },
    'spanish': {
      welcome: '¡Bienvenido al juego!',
      play: 'Jugar',
      quit: 'Salir'
    },
    'italian': {
      welcome: 'Benvenuto nel gioco!',
      play: 'Gioca',
      quit: 'Esci'
    },
    'japanese': {
      welcome: 'ゲームへようこそ！',
      play: 'プレイ',
      quit: '終了'
    },
    'korean': {
      welcome: '게임에 오신 것을 환영합니다!',
      play: '플레이',
      quit: '종료'
    },
    'russian': {
      welcome: 'Добро пожаловать в игру!',
      play: 'Играть',
      quit: 'Выход'
    },
    'schinese': {
      welcome: '欢迎来到游戏！',
      play: '开始',
      quit: '退出'
    },
    'tchinese': {
      welcome: '歡迎來到遊戲！',
      play: '開始',
      quit: '退出'
    },
    'portuguese': {
      welcome: 'Bem-vindo ao jogo!',
      play: 'Jogar',
      quit: 'Sair'
    },
    'polish': {
      welcome: 'Witamy w grze!',
      play: 'Graj',
      quit: 'Wyjście'
    }
  };

  const message = messages[language] || messages['english'];
  
  console.log(`   Welcome: ${message.welcome}`);
  console.log(`   Play Button: ${message.play}`);
  console.log(`   Quit Button: ${message.quit}`);
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\n🛑 Interrupted - cleaning up...');
  const steam = SteamworksSDK.getInstance();
  steam.shutdown();
  process.exit(0);
});

// Run the test
testCoreAPI().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
