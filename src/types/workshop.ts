/**
 * Steam Workshop / UGC Type Definitions
 * 
 * Types for Steam Workshop user-generated content system
 */

/**
 * Published file ID type (uint64)
 */
export type PublishedFileId = bigint;

/**
 * UGC query handle type (uint64)
 */
export type UGCQueryHandle = bigint;

/**
 * UGC update handle type (uint64)
 */
export type UGCUpdateHandle = bigint;

/**
 * UGC file handle type (uint64)
 */
export type UGCHandle = bigint;

/**
 * Invalid handle constants
 */
export const K_UGC_QUERY_HANDLE_INVALID = BigInt('0xffffffffffffffff');
export const K_UGC_UPDATE_HANDLE_INVALID = BigInt('0xffffffffffffffff');

/**
 * Matching UGC types for queries
 */
export enum EUGCMatchingUGCType {
  Items = 0,                    // both mtx items and ready-to-use items
  Items_Mtx = 1,               // microtransaction items
  Items_ReadyToUse = 2,        // ready-to-use items
  Collections = 3,              // collections of workshop items
  Artwork = 4,                  // artwork
  Videos = 5,                   // videos
  Screenshots = 6,              // screenshots
  AllGuides = 7,               // both web guides and integrated guides
  WebGuides = 8,               // web guides
  IntegratedGuides = 9,        // integrated guides
  UsableInGame = 10,           // ready-to-use items and integrated guides
  ControllerBindings = 11,     // controller bindings
  GameManagedItems = 12,       // game managed items (not managed by users)
  All = -1                     // all types (only valid for CreateQueryUserUGCRequest)
}

/**
 * Different lists of published UGC for a user
 */
export enum EUserUGCList {
  Published = 0,
  VotedOn = 1,
  VotedUp = 2,
  VotedDown = 3,
  WillVoteLater = 4,
  Favorited = 5,
  Subscribed = 6,
  UsedOrPlayed = 7,
  Followed = 8
}

/**
 * Sort order for user published UGC lists
 */
export enum EUserUGCListSortOrder {
  CreationOrderDesc = 0,
  CreationOrderAsc = 1,
  TitleAsc = 2,
  LastUpdatedDesc = 3,
  SubscriptionDateDesc = 4,
  VoteScoreDesc = 5,
  ForModeration = 6
}

/**
 * Sorting and filtering for queries across all UGC
 */
export enum EUGCQuery {
  RankedByVote = 0,
  RankedByPublicationDate = 1,
  AcceptedForGameRankedByAcceptanceDate = 2,
  RankedByTrend = 3,
  FavoritedByFriendsRankedByPublicationDate = 4,
  CreatedByFriendsRankedByPublicationDate = 5,
  RankedByNumTimesReported = 6,
  CreatedByFollowedUsersRankedByPublicationDate = 7,
  NotYetRated = 8,
  RankedByTotalVotesAsc = 9,
  RankedByVotesUp = 10,
  RankedByTextSearch = 11,
  RankedByTotalUniqueSubscriptions = 12,
  RankedByPlaytimeTrend = 13,
  RankedByTotalPlaytime = 14,
  RankedByAveragePlaytimeTrend = 15,
  RankedByLifetimeAveragePlaytime = 16,
  RankedByPlaytimeSessionsTrend = 17,
  RankedByLifetimePlaytimeSessions = 18,
  RankedByLastUpdatedDate = 19
}

/**
 * Item update status
 */
export enum EItemUpdateStatus {
  Invalid = 0,                 // The item update handle was invalid
  PreparingConfig = 1,         // Processing configuration data
  PreparingContent = 2,        // Reading and processing content files
  UploadingContent = 3,        // Uploading content changes to Steam
  UploadingPreviewFile = 4,    // Uploading new preview file image
  CommittingChanges = 5        // Committing all changes
}

/**
 * Item state flags
 */
export enum EItemState {
  None = 0,                    // item not tracked on client
  Subscribed = 1,              // current user is subscribed to this item
  LegacyItem = 2,             // item was created with ISteamRemoteStorage
  Installed = 4,               // item is installed and usable (but maybe out of date)
  NeedsUpdate = 8,            // item needs an update
  Downloading = 16,            // item update is currently downloading
  DownloadPending = 32,        // DownloadItem() was called, content isn't available yet
  DisabledLocally = 64        // Item is disabled locally
}

/**
 * Item statistics
 */
export enum EItemStatistic {
  NumSubscriptions = 0,
  NumFavorites = 1,
  NumFollowers = 2,
  NumUniqueSubscriptions = 3,
  NumUniqueFavorites = 4,
  NumUniqueFollowers = 5,
  NumUniqueWebsiteViews = 6,
  ReportScore = 7,
  NumSecondsPlayed = 8,
  NumPlaytimeSessions = 9,
  NumComments = 10,
  NumSecondsPlayedDuringTimePeriod = 11,
  NumPlaytimeSessionsDuringTimePeriod = 12
}

/**
 * Item preview types
 */
export enum EItemPreviewType {
  Image = 0,                           // standard image file
  YouTubeVideo = 1,                    // video id is stored
  Sketchfab = 2,                       // model id is stored
  EnvironmentMap_HorizontalCross = 3,  // cube map in horizontal cross layout
  EnvironmentMap_LatLong = 4,         // standard lat/long layout
  Clip = 5,                            // clip id is stored
  ReservedMax = 255                    // custom types above this value
}

/**
 * Workshop file type (from ISteamRemoteStorage)
 */
export enum EWorkshopFileType {
  First = 0,
  Community = 0,              // normal Workshop item that can be subscribed to
  Microtransaction = 1,       // Workshop item that is meant to be voted on for the purpose of selling in-game
  Collection = 2,             // a collection of Workshop items
  Art = 3,                    // artwork
  Video = 4,                  // external video
  Screenshot = 5,             // screenshot
  Game = 6,                   // Greenlight game entry
  Software = 7,               // Greenlight software entry
  Concept = 8,                // Greenlight concept
  WebGuide = 9,               // Steam web guide
  IntegratedGuide = 10,       // application integrated guide
  Merch = 11,                 // Workshop merchandise meant to be voted on for the purpose of being sold
  ControllerBinding = 12,     // Steam Controller bindings
  SteamworksAccessInvite = 13,// internal
  SteamVideo = 14,            // Steam video
  GameManagedItem = 15,       // managed completely by the game, not the user
  Clip = 16,                  // Steam clip
  Max = 17
}

/**
 * Remote storage published file visibility
 */
export enum ERemoteStoragePublishedFileVisibility {
  Public = 0,
  FriendsOnly = 1,
  Private = 2,
  Unlisted = 3
}

/**
 * Maximum values
 */
export const K_NUM_UGC_RESULTS_PER_PAGE = 50;
export const K_CCH_DEVELOPER_METADATA_MAX = 5000;
export const K_CCH_PUBLISHED_DOCUMENT_TITLE_MAX = 128 + 1;
export const K_CCH_PUBLISHED_DOCUMENT_DESCRIPTION_MAX = 8000;
export const K_CCH_TAG_LIST_MAX = 1024 + 1;
export const K_CCH_FILENAME_MAX = 260;
export const K_CCH_PUBLISHED_FILE_URL_MAX = 256;

/**
 * Details for a single published file/UGC
 */
export interface WorkshopItem {
  publishedFileId: PublishedFileId;
  result: number;                      // EResult
  fileType: EWorkshopFileType;
  creatorAppID: number;
  consumerAppID: number;
  title: string;
  description: string;
  steamIDOwner: bigint;
  timeCreated: number;
  timeUpdated: number;
  timeAddedToUserList: number;
  visibility: ERemoteStoragePublishedFileVisibility;
  banned: boolean;
  acceptedForUse: boolean;
  tagsTruncated: boolean;
  tags: string[];                      // parsed from comma-separated list
  file: UGCHandle;
  previewFile: UGCHandle;
  fileName: string;
  fileSize: number;
  previewFileSize: number;
  url: string;
  votesUp: number;
  votesDown: number;
  score: number;
  numChildren: number;
  totalFilesSize: bigint;
}

/**
 * Result of a UGC query
 */
export interface UGCQueryResult {
  handle: UGCQueryHandle;
  result: number;                      // EResult
  numResultsReturned: number;
  totalMatchingResults: number;
  cachedData: boolean;
  nextCursor?: string;
  items: WorkshopItem[];
}

/**
 * Item installation info
 */
export interface ItemInstallInfo {
  sizeOnDisk: bigint;
  folder: string;
  timestamp: number;
}

/**
 * Item download progress
 */
export interface ItemDownloadInfo {
  bytesDownloaded: bigint;
  bytesTotal: bigint;
  percentComplete: number;
}

/**
 * Item update progress
 */
export interface ItemUpdateProgress {
  status: EItemUpdateStatus;
  bytesProcessed: bigint;
  bytesTotal: bigint;
  percentComplete: number;
}

/**
 * Create item result
 */
export interface CreateItemResult {
  success: boolean;
  result: number;                      // EResult
  publishedFileId: PublishedFileId;
  userNeedsToAcceptWorkshopLegalAgreement: boolean;
}

/**
 * Submit item update result
 */
export interface SubmitItemUpdateResult {
  success: boolean;
  result: number;                      // EResult
  userNeedsToAcceptWorkshopLegalAgreement: boolean;
  publishedFileId: PublishedFileId;
}

/**
 * User vote result
 */
export interface UserItemVoteResult {
  publishedFileId: PublishedFileId;
  voteUp: boolean;
  voteDown: boolean;
  voteSkipped: boolean;
}

/**
 * Workshop constants
 */
export const WorkshopConstants = {
  MAX_RESULTS_PER_PAGE: K_NUM_UGC_RESULTS_PER_PAGE,
  MAX_DEVELOPER_METADATA: K_CCH_DEVELOPER_METADATA_MAX,
  MAX_TITLE_LENGTH: K_CCH_PUBLISHED_DOCUMENT_TITLE_MAX,
  MAX_DESCRIPTION_LENGTH: K_CCH_PUBLISHED_DOCUMENT_DESCRIPTION_MAX,
  MAX_TAG_LIST_LENGTH: K_CCH_TAG_LIST_MAX,
  MAX_FILENAME_LENGTH: K_CCH_FILENAME_MAX,
  MAX_URL_LENGTH: K_CCH_PUBLISHED_FILE_URL_MAX
} as const;
