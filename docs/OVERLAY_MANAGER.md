# Overlay Manager API Documentation

Complete reference for Steam Overlay functionality in Steamworks FFI.

## Overview

The `SteamOverlayManager` provides control over the Steam overlay, allowing games to programmatically open various overlay dialogs, web pages, store pages, and invite dialogs. This enables deep integration between your game and Steam's social and store features.

The overlay appears on top of your game window and provides access to friends list, chat, community features, web browser, store pages, and more.

## Quick Reference

| Function | Description |
|----------|-------------|
| [`isOverlayEnabled()`](#isoverlayenabled) | Check if Steam overlay is enabled |
| [`activateGameOverlay()`](#activategameoverlaydialog) | Open overlay to a specific dialog |
| [`activateGameOverlayToUser()`](#activategameoverlaytouserdialog-steamid) | Open overlay to user's profile/stats/etc |
| [`activateGameOverlayToWebPage()`](#activategameoverlaytowebpageurl-mode) | Open overlay web browser to URL |
| [`activateGameOverlayToStore()`](#activategameoverlaytostoreappid-flag) | Open overlay to app store page |
| [`activateGameOverlayInviteDialog()`](#activategameoverlayinvitedialogsteamidlobby) | Open lobby invite dialog |
| [`activateGameOverlayRemotePlayTogetherInviteDialog()`](#activategameoverlayremoteplaytogetherinvitedialogsteamidlobby) | Open Remote Play Together invite |
| [`activateGameOverlayInviteDialogConnectString()`](#activategameoverlayinvitedialogconnectstringconnectstring) | Open invite dialog with connect string |

---

## Requirements

The Steam overlay works when:
- ✅ Steam client is running
- ✅ User has overlay enabled in Steam settings
- ✅ Game is running in graphics mode that supports overlay
- ✅ Steam API is initialized

Users can disable the overlay in Steam settings. Provide alternative UI for critical features if overlay is unavailable.

---

## Checking Overlay Availability

### `isOverlayEnabled()`

Checks if the Steam overlay is enabled for the current user.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamUtils_IsOverlayEnabled()` - Check overlay status

**Returns:**
- `boolean` - `true` if overlay is enabled, `false` otherwise

**Description:**

Returns whether the Steam overlay is enabled and available. The overlay can be disabled by:
- User preference in Steam settings
- Running without Steam client
- Certain graphics configurations
- Running in headless mode

This is useful to check before using overlay features, allowing you to provide alternative UI when the overlay is unavailable.

**Example:**
```typescript
import SteamworksSDK from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Check if overlay is available
const overlayEnabled = steam.utils.isOverlayEnabled();

if (overlayEnabled) {
  console.log('✅ Steam overlay is enabled');
  
  // Safe to use overlay features
  steam.overlay.activateGameOverlay('Friends');
} else {
  console.log('❌ Steam overlay is not available');
  
  // Provide alternative UI
  showInGameFriendsList();
}
```

**Use Cases:**
- Check before opening overlay dialogs
- Show/hide overlay-related UI buttons
- Provide alternative functionality when overlay is disabled
- Display warnings about missing overlay features
- Adapt UI based on overlay availability

**Best Practice:**
```typescript
// ✅ Good - Check before using overlay
function openFriendsList() {
  if (steam.utils.isOverlayEnabled()) {
    steam.overlay.activateGameOverlay('Friends');
  } else {
    // Show custom friends list UI
    showCustomFriendsList();
    
    // Optional: Show message
    showNotification('Steam overlay is disabled. Enable it in Steam settings for full features.');
  }
}

// ❌ Bad - No check, will fail silently if overlay disabled
function openFriendsList() {
  steam.overlay.activateGameOverlay('Friends'); // May not work
}
```

---

## Opening Overlay Dialogs

### `activateGameOverlay(dialog)`

Activates the Steam overlay with a specific dialog.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_ActivateGameOverlay()` - Open overlay dialog

**Parameters:**
- `dialog: EOverlayDialog | string` - The dialog to open

**Available Dialogs:**
| Dialog | Description |
|--------|-------------|
| `Friends` | Friends list |
| `Community` | Community hub |
| `Players` | Recent players |
| `Settings` | Steam settings |
| `OfficialGameGroup` | Game's Steam group |
| `Stats` | Stats page |
| `Achievements` | Achievements page |

**Example:**
```typescript
import SteamworksSDK, { EOverlayDialog } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Open friends list
steam.overlay.activateGameOverlay(EOverlayDialog.FRIENDS);

// Open achievements
steam.overlay.activateGameOverlay(EOverlayDialog.ACHIEVEMENTS);

// Open community hub
steam.overlay.activateGameOverlay(EOverlayDialog.COMMUNITY);

// Open settings
steam.overlay.activateGameOverlay(EOverlayDialog.SETTINGS);
```

**Use Cases:**
- Provide in-game button to open friends list
- Quick access to achievements from pause menu
- Link to community hub from main menu
- Settings shortcut alternative to Shift+Tab

---

## Opening User Profiles

### `activateGameOverlayToUser(dialog, steamId)`

Activates the Steam overlay to a specific user's page.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_ActivateGameOverlayToUser()` - Open user page

**Parameters:**
- `dialog: EOverlayToUserDialog | string` - Type of user page
- `steamId: string` - Target user's Steam ID

**Available User Dialogs:**
| Dialog | Description |
|--------|-------------|
| `steamid` | User's Steam profile |
| `chat` | Chat window with user |
| `jointrade` | Steam Trading session |
| `stats` | User's stats page |
| `achievements` | User's achievements |
| `friendadd` | Add user as friend prompt |
| `friendremove` | Remove friend prompt |
| `friendrequestaccept` | Accept friend request |
| `friendrequestignore` | Ignore friend request |

**Example:**
```typescript
import SteamworksSDK, { EOverlayToUserDialog } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

const friends = steam.friends.getAllFriends();
const friend = friends[0];

// View friend's profile
steam.overlay.activateGameOverlayToUser(
  EOverlayToUserDialog.STEAM_ID,
  friend.steamId
);

// Open chat with friend
steam.overlay.activateGameOverlayToUser(
  EOverlayToUserDialog.CHAT,
  friend.steamId
);

// View friend's achievements
steam.overlay.activateGameOverlayToUser(
  EOverlayToUserDialog.ACHIEVEMENTS,
  friend.steamId
);

// View friend's stats
steam.overlay.activateGameOverlayToUser(
  EOverlayToUserDialog.STATS,
  friend.steamId
);
```

**Use Cases:**
- Click player name to view profile
- Quick chat from in-game friends list
- Compare achievements with friends
- Add players met in multiplayer

---

## Opening Web Pages

### `activateGameOverlayToWebPage(url, mode)`

Activates the Steam overlay web browser to a specified URL.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_ActivateGameOverlayToWebPage()` - Open web browser

**Parameters:**
- `url: string` - URL to open (must include http:// or https://)
- `mode: EActivateGameOverlayToWebPageMode` - Browser display mode (optional)

**Browser Modes:**
| Mode | Description |
|------|-------------|
| `Default` | Browser opens alongside other overlay windows, stays open when overlay closed |
| `Modal` | Browser opens alone, hides other windows. Browser and overlay close together |

**Example:**
```typescript
import SteamworksSDK, { EActivateGameOverlayToWebPageMode } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Open game wiki
steam.overlay.activateGameOverlayToWebPage(
  'https://wiki.example.com/game',
  EActivateGameOverlayToWebPageMode.Default
);

// Open important announcement (modal)
steam.overlay.activateGameOverlayToWebPage(
  'https://example.com/news/update',
  EActivateGameOverlayToWebPageMode.Modal
);

// Open support page (default mode)
steam.overlay.activateGameOverlayToWebPage('https://support.example.com');
```

**Use Cases:**
- In-game wiki/guide links
- News and announcements
- Support and help pages
- Patch notes
- Tournament brackets
- Leaderboards on your website

---

## Opening Store Pages

### `activateGameOverlayToStore(appId, flag)`

Activates the Steam overlay to a specific app's store page.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_ActivateGameOverlayToStore()` - Open store page

**Parameters:**
- `appId: number` - Steam App ID
- `flag: EOverlayToStoreFlag` - Store behavior flag (optional)

**Store Flags:**
| Flag | Description |
|------|-------------|
| `None` | Just open the store page |
| `AddToCart` | Open and add to cart |
| `AddToCartAndShow` | Add to cart and show cart |

**Example:**
```typescript
import SteamworksSDK, { EOverlayToStoreFlag } from 'steamworks-ffi-node';

const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Open your game's store page
steam.overlay.activateGameOverlayToStore(480, EOverlayToStoreFlag.None);

// Show DLC and add to cart
steam.overlay.activateGameOverlayToStore(12345, EOverlayToStoreFlag.AddToCart);

// Add DLC to cart and show cart
steam.overlay.activateGameOverlayToStore(
  67890,
  EOverlayToStoreFlag.AddToCartAndShow
);
```

**Use Cases:**
- DLC promotion in-game
- Upsell from free version
- Cross-promote other games
- Season pass sales
- "Buy Full Game" from demo

---

## Opening Invite Dialogs

### `activateGameOverlayInviteDialog(steamIdLobby)`

Activates the Steam overlay invite dialog for a lobby.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_ActivateGameOverlayInviteDialog()` - Open invite dialog

**Parameters:**
- `steamIdLobby: string` - Steam ID of the lobby

**Example:**
```typescript
const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// After creating a lobby via matchmaking API
const lobbyId = '109775241021923456';

// Show invite dialog
steam.overlay.activateGameOverlayInviteDialog(lobbyId);
```

**Use Cases:**
- Multiplayer lobby invites
- Co-op game sessions
- Party/squad invites
- Custom game modes

---

### `activateGameOverlayRemotePlayTogetherInviteDialog(steamIdLobby)`

Activates the Steam overlay Remote Play Together invite dialog.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_ActivateGameOverlayRemotePlayTogetherInviteDialog()` - Open Remote Play invite

**Parameters:**
- `steamIdLobby: string` - Steam ID of lobby (can be '0' for no specific lobby)

**Example:**
```typescript
const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Open Remote Play Together invite
steam.overlay.activateGameOverlayRemotePlayTogetherInviteDialog('0');

// With a specific lobby
const lobbyId = getCurrentLobbyId();
steam.overlay.activateGameOverlayRemotePlayTogetherInviteDialog(lobbyId);
```

**Use Cases:**
- Local multiplayer games playable online
- Couch co-op shared remotely
- Split-screen games

---

### `activateGameOverlayInviteDialogConnectString(connectString)`

Activates the Steam overlay invite dialog with a custom connect string.

**Steamworks SDK Functions:**
- `SteamAPI_ISteamFriends_ActivateGameOverlayInviteDialogConnectString()` - Open invite with connect string

**Parameters:**
- `connectString: string` - The connect string sent to invited friends

**Example:**
```typescript
const steam = SteamworksSDK.getInstance();
steam.init({ appId: 480 });

// Invite with server details
const serverIP = '192.168.1.100';
const serverPort = 27015;
const connectString = `+connect ${serverIP}:${serverPort}`;

steam.overlay.activateGameOverlayInviteDialogConnectString(connectString);

// Invite with session ID
const sessionId = 'abc123-def456';
steam.overlay.activateGameOverlayInviteDialogConnectString(`+join_session ${sessionId}`);

// Invite with encrypted token
const matchToken = generateMatchToken();
steam.overlay.activateGameOverlayInviteDialogConnectString(`+join_match ${matchToken}`);
```

**Use Cases:**
- Direct server connections
- Session-based matchmaking
- Private matches
- Custom join logic

---

## Complete Usage Example

```typescript
import SteamworksSDK, { 
  EOverlayDialog,
  EOverlayToUserDialog,
  EOverlayToStoreFlag,
  EActivateGameOverlayToWebPageMode
} from 'steamworks-ffi-node';

function setupOverlayUI() {
  const steam = SteamworksSDK.getInstance();
  steam.init({ appId: 480 });
  
  // Friends button
  document.getElementById('btn-friends')?.addEventListener('click', () => {
    steam.overlay.activateGameOverlay(EOverlayDialog.FRIENDS);
  });
  
  // Achievements button
  document.getElementById('btn-achievements')?.addEventListener('click', () => {
    steam.overlay.activateGameOverlay(EOverlayDialog.ACHIEVEMENTS);
  });
  
  // View player profile (from match)
  document.querySelectorAll('.player-profile-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const steamId = e.target.dataset.steamId;
      steam.overlay.activateGameOverlayToUser(
        EOverlayToUserDialog.STEAM_ID,
        steamId
      );
    });
  });
  
  // Chat with player
  document.querySelectorAll('.player-chat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const steamId = e.target.dataset.steamId;
      steam.overlay.activateGameOverlayToUser(
        EOverlayToUserDialog.CHAT,
        steamId
      );
    });
  });
  
  // Wiki link
  document.getElementById('btn-wiki')?.addEventListener('click', () => {
    steam.overlay.activateGameOverlayToWebPage(
      'https://wiki.example.com',
      EActivateGameOverlayToWebPageMode.Default
    );
  });
  
  // Buy DLC button
  document.getElementById('btn-buy-dlc')?.addEventListener('click', () => {
    const dlcAppId = 12345;
    steam.overlay.activateGameOverlayToStore(
      dlcAppId,
      EOverlayToStoreFlag.AddToCart
    );
  });
  
  // Invite friends to lobby
  document.getElementById('btn-invite')?.addEventListener('click', () => {
    const lobbyId = getCurrentLobbyId();
    steam.overlay.activateGameOverlayInviteDialog(lobbyId);
  });
}

setupOverlayUI();
```

---

## Best Practices

### 1. Provide Alternative UI
```typescript
// ✅ Good - Fallback if overlay disabled
function openFriendsList() {
  if (isOverlayEnabled()) {
    steam.overlay.activateGameOverlay('Friends');
  } else {
    showInGameFriendsList(); // Your custom UI
  }
}

// ❌ Bad - No fallback
// Users with disabled overlay can't access feature
```

### 2. Don't Spam Overlay Calls
```typescript
// ✅ Good - User-initiated action
button.addEventListener('click', () => {
  steam.overlay.activateGameOverlay('Friends');
});

// ❌ Bad - Auto-opening repeatedly
setInterval(() => {
  steam.overlay.activateGameOverlay('Friends'); // Annoying!
}, 5000);
```

### 3. Use Appropriate Dialogs
```typescript
// ✅ Good - Right dialog for action
function viewPlayerAchievements(steamId: string) {
  steam.overlay.activateGameOverlayToUser('achievements', steamId);
}

// ❌ Bad - Wrong dialog
function viewPlayerAchievements(steamId: string) {
  steam.overlay.activateGameOverlayToUser('steamid', steamId);
  // Opens profile instead of achievements
}
```

### 4. Include Protocol in URLs
```typescript
// ✅ Good - Full URL with protocol
steam.overlay.activateGameOverlayToWebPage('https://example.com');

// ❌ Bad - Missing protocol
steam.overlay.activateGameOverlayToWebPage('example.com');
// Won't work!
```

---

## Common Patterns

### In-Game Player Context Menu
```typescript
function showPlayerContextMenu(steamId: string, playerName: string) {
  const menu = [
    {
      label: 'View Profile',
      action: () => steam.overlay.activateGameOverlayToUser('steamid', steamId)
    },
    {
      label: 'Send Message',
      action: () => steam.overlay.activateGameOverlayToUser('chat', steamId)
    },
    {
      label: 'View Achievements',
      action: () => steam.overlay.activateGameOverlayToUser('achievements', steamId)
    },
    {
      label: 'Add Friend',
      action: () => steam.overlay.activateGameOverlayToUser('friendadd', steamId)
    }
  ];
  
  displayContextMenu(menu);
}
```

### DLC Upsell Flow
```typescript
function showDLCPrompt(dlcAppId: number, dlcName: string) {
  showDialog({
    title: `Get ${dlcName}`,
    message: 'Unlock exclusive content with this DLC!',
    buttons: [
      {
        label: 'View Store Page',
        action: () => steam.overlay.activateGameOverlayToStore(
          dlcAppId,
          EOverlayToStoreFlag.None
        )
      },
      {
        label: 'Add to Cart',
        action: () => steam.overlay.activateGameOverlayToStore(
          dlcAppId,
          EOverlayToStoreFlag.AddToCart
        )
      },
      {
        label: 'Not Now',
        action: () => closeDialog()
      }
    ]
  });
}
```

### Help System
```typescript
function showHelp(topic: string) {
  const helpPages = {
    'getting-started': 'https://help.example.com/start',
    'controls': 'https://help.example.com/controls',
    'crafting': 'https://help.example.com/crafting',
    'trading': 'https://help.example.com/trading'
  };
  
  const url = helpPages[topic] || 'https://help.example.com';
  
  steam.overlay.activateGameOverlayToWebPage(
    url,
    EActivateGameOverlayToWebPageMode.Modal
  );
}
```

---

## Troubleshooting

### Overlay Not Opening
- Verify Steam client is running
- Check user has overlay enabled in Steam settings
- Ensure Steam API is initialized
- Try Shift+Tab to test overlay manually

### Wrong Dialog Opens
- Double-check dialog string matches exactly
- Use `EOverlayDialog` / `EOverlayToUserDialog` constants
- Verify Steam ID is valid for user dialogs

### Web Page Not Loading
- Ensure URL includes `http://` or `https://`
- Check URL is valid and accessible
- Try opening URL in regular browser first

---
