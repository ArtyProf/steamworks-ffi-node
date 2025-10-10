// Basic Steam API types for achievements
export interface SteamAchievement {
  apiName: string;
  displayName: string;
  description: string;
  unlocked: boolean;
  unlockTime: number;
}

export interface SteamInitOptions {
  appId: number;
}

export interface SteamStatus {
  initialized: boolean;
  appId: number;
  steamId: string;
}