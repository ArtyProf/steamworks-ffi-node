import SteamworksSDK from './steam';
import { SteamAchievement, SteamInitOptions, SteamStatus } from './types';

// Export types
export { SteamAchievement, SteamInitOptions, SteamStatus };

// Export main Steam class
export default SteamworksSDK;

// For convenience, also export as named export
export { SteamworksSDK as Steam };

// Example usage (commented out)
/*
// Initialize Steam
const steam = SteamFFI.getInstance();
const initialized = steam.init({ appId: 480 }); // Steam's test app

if (initialized) {
  // Get achievements
  steam.getAllAchievements().then(achievements => {
    console.log('Achievements:', achievements);
    
    if (achievements.length > 0) {
      // Unlock first achievement
      steam.unlockAchievement(achievements[0].apiName);
    }
  });
}
*/