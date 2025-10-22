import * as koffi from 'koffi';
import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import {
  K_I_CREATE_ITEM_RESULT,
  K_I_SUBMIT_ITEM_UPDATE_RESULT,
  K_I_REMOTE_STORAGE_SUBSCRIBE_PUBLISHED_FILE_RESULT,
  K_I_REMOTE_STORAGE_UNSUBSCRIBE_PUBLISHED_FILE_RESULT,
  K_I_SET_USER_ITEM_VOTE_RESULT,
  K_I_GET_USER_ITEM_VOTE_RESULT,
  CreateItemResultType,
  SubmitItemUpdateResultType,
  RemoteStorageSubscribePublishedFileResultType,
  RemoteStorageUnsubscribePublishedFileResultType,
  SetUserItemVoteResultType,
  GetUserItemVoteResultType
} from './callbackTypes';

/**
 * SteamCallbackPoller
 * 
 * Utility class for polling Steam API call results using ISteamUtils.
 * 
 * Provides a clean way to retrieve callback results synchronously after
 * async Steam operations complete, without requiring C++ addons or callback
 * registration.
 * 
 * How it works:
 * 1. Steam async operation returns a SteamAPICall_t handle
 * 2. Poll ISteamUtils::IsAPICallCompleted() to check completion
 * 3. Call ISteamUtils::GetAPICallResult() to retrieve result struct
 * 4. Decode Koffi struct and return typed result
 * 
 * @example
 * ```typescript
 * const poller = new SteamCallbackPoller(libraryLoader, apiCore);
 * 
 * const callHandle = steamAPI.someAsyncOperation();
 * const result = await poller.poll<ResultType>(
 *   callHandle,
 *   ResultStruct,
 *   callbackId
 * );
 * ```
 */
export class SteamCallbackPoller {
  private libraryLoader: SteamLibraryLoader;
  private apiCore: SteamAPICore;

  constructor(libraryLoader: SteamLibraryLoader, apiCore: SteamAPICore) {
    this.libraryLoader = libraryLoader;
    this.apiCore = apiCore;
  }

  /**
   * Poll for API call completion and retrieve result
   * 
   * Polls Steam API to check if an async call has completed, then retrieves
   * the result struct using ISteamUtils functions.
   * 
   * @param callHandle - The SteamAPICall_t handle from the async operation
   * @param resultStruct - Koffi struct type for the result
   * @param callbackId - The callback ID for this result type
   * @param maxRetries - Maximum number of polling attempts (default: 50)
   * @param delayMs - Delay between polling attempts in ms (default: 100)
   * @returns The decoded result struct, or null if failed/timeout
   * 
   * @example
   * ```typescript
   * const result = await poller.poll<LeaderboardFindResultType>(
   *   callHandle,
   *   LeaderboardFindResult_t,
   *   1104 // k_iCallback for LeaderboardFindResult_t
   * );
   * 
   * if (result && result.m_bLeaderboardFound) {
   *   console.log(`Found leaderboard: ${result.m_hSteamLeaderboard}`);
   * }
   * ```
   * 
   * @remarks
   * - Default timeout: 5 seconds (50 retries * 100ms)
   * - Automatically calls runCallbacks() during polling
   * - Returns null on timeout or failure
   * - Logs failure reason using GetAPICallFailureReason()
   */
  async poll<T>(
    callHandle: bigint,
    resultStruct: any,
    callbackId: number,
    maxRetries: number = 50,
    delayMs: number = 100
  ): Promise<T | null> {
    const utilsInterface = this.apiCore.getUtilsInterface();
    if (!utilsInterface) {
      console.error('[Steamworks] Utils interface not available');
      return null;
    }

    // Poll for completion
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      this.apiCore.runCallbacks();

      const failed = koffi.alloc('bool', 1);
      const isCompleted = this.libraryLoader.SteamAPI_ISteamUtils_IsAPICallCompleted(
        utilsInterface,
        callHandle,
        failed
      );

      if (isCompleted) {
        // Get the result
        const result = koffi.alloc(resultStruct, 1);
        const failedResult = koffi.alloc('bool', 1);
        
        const success = this.libraryLoader.SteamAPI_ISteamUtils_GetAPICallResult(
          utilsInterface,
          callHandle,
          result,
          koffi.sizeof(resultStruct),
          callbackId,
          failedResult
        );

        if (success && !koffi.decode(failedResult, 'bool')) {
          // Use custom parsing for packed structs, otherwise use standard Koffi decoding
          const decoded = this.decodeCallbackResult<T>(callbackId, result, resultStruct);
          return decoded;
        } else {
          const failureReason = this.libraryLoader.SteamAPI_ISteamUtils_GetAPICallFailureReason(
            utilsInterface,
            callHandle
          );
          console.error(`[Steamworks] API call failed. Callback ID: ${callbackId}, Struct size: ${koffi.sizeof(resultStruct)}, Reason: ${failureReason}`);
          return null;
        }
      }
    }

    console.warn(`[Steamworks] API call timed out after ${maxRetries * delayMs}ms`);
    return null;
  }

  /**
   * Decodes a callback result, using custom parsing for packed structs
   * 
   * Steam SDK uses #pragma pack which causes tight struct packing without natural alignment.
   * Koffi doesn't support custom pack alignment, so we manually parse bytes for affected callbacks.
   * 
   * @param callbackId - The callback ID to identify the struct type
   * @param result - Koffi-allocated result buffer
   * @param resultStruct - Koffi struct type definition
   * @returns Decoded result object
   */
  private decodeCallbackResult<T>(callbackId: number, result: any, resultStruct: any): T {
    // Special handling for packed structs - manual byte parsing
    switch (callbackId) {
      case K_I_CREATE_ITEM_RESULT:
        return this.parseCreateItemResult(result) as unknown as T;
      
      case K_I_SUBMIT_ITEM_UPDATE_RESULT:
        return this.parseSubmitItemUpdateResult(result) as unknown as T;
      
      case K_I_REMOTE_STORAGE_SUBSCRIBE_PUBLISHED_FILE_RESULT:
        return this.parseSubscribeResult(result) as unknown as T;
      
      case K_I_REMOTE_STORAGE_UNSUBSCRIBE_PUBLISHED_FILE_RESULT:
        return this.parseUnsubscribeResult(result) as unknown as T;
      
      case K_I_SET_USER_ITEM_VOTE_RESULT:
        return this.parseSetUserItemVoteResult(result) as unknown as T;
      
      case K_I_GET_USER_ITEM_VOTE_RESULT:
        return this.parseGetUserItemVoteResult(result) as unknown as T;
      
      default:
        // Standard Koffi decoding for non-packed structs
        return koffi.decode(result, resultStruct) as T;
    }
  }

  /**
   * Manually parses CreateItemResult_t from raw bytes
   * 
   * Layout: [int32:0-3][uint64:4-11][uint8:12] = 13 bytes, padded to 16
   * Steam's packed struct has no padding between int32 and uint64
   * 
   * @param result - Koffi-allocated result buffer
   * @returns Parsed CreateItemResult_t object
   */
  private parseCreateItemResult(result: any): CreateItemResultType {
    const rawBytes = koffi.decode(result, koffi.array('uint8', 16));
    const buffer = Buffer.from(rawBytes);
    
    return {
      m_eResult: buffer.readInt32LE(0),
      m_nPublishedFileId: buffer.readBigUInt64LE(4),
      m_bUserNeedsToAcceptWorkshopLegalAgreement: buffer.readUInt8(12) !== 0
    };
  }

  /**
   * Manually parses SubmitItemUpdateResult_t from raw bytes
   * 
   * Layout: [int32:0-3][bool:4][padding:5-7][uint64:8-15] = 16 bytes
   * Steam's packed struct has 3 bytes padding after bool to align uint64
   * 
   * @param result - Koffi-allocated result buffer
   * @returns Parsed SubmitItemUpdateResult_t object
   */
  private parseSubmitItemUpdateResult(result: any): SubmitItemUpdateResultType {
    const rawBytes = koffi.decode(result, koffi.array('uint8', 16));
    const buffer = Buffer.from(rawBytes);
    
    return {
      m_eResult: buffer.readInt32LE(0),
      m_bUserNeedsToAcceptWorkshopLegalAgreement: buffer.readUInt8(4) !== 0,
      m_nPublishedFileId: buffer.readBigUInt64LE(8)
    };
  }

  /**
   * Manually parses RemoteStorageSubscribePublishedFileResult_t from raw bytes
   * 
   * Layout: [int32:0-3][uint64:4-11] = 12 bytes (NO padding!)
   * Steam's packed struct has no padding between int32 and uint64
   * 
   * @param result - Koffi-allocated result buffer
   * @returns Parsed RemoteStorageSubscribePublishedFileResult_t object
   */
  private parseSubscribeResult(result: any): RemoteStorageSubscribePublishedFileResultType {
    const rawBytes = koffi.decode(result, koffi.array('uint8', 12));
    const buffer = Buffer.from(rawBytes);
    
    return {
      m_eResult: buffer.readInt32LE(0),
      m_nPublishedFileId: buffer.readBigUInt64LE(4)
    };
  }

  /**
   * Manually parses RemoteStorageUnsubscribePublishedFileResult_t from raw bytes
   * 
   * Layout: [int32:0-3][uint64:4-11] = 12 bytes (NO padding!)
   * Steam's packed struct has no padding between int32 and uint64
   * 
   * @param result - Koffi-allocated result buffer
   * @returns Parsed RemoteStorageUnsubscribePublishedFileResult_t object
   */
  private parseUnsubscribeResult(result: any): RemoteStorageUnsubscribePublishedFileResultType {
    const rawBytes = koffi.decode(result, koffi.array('uint8', 12));
    const buffer = Buffer.from(rawBytes);
    
    return {
      m_eResult: buffer.readInt32LE(0),
      m_nPublishedFileId: buffer.readBigUInt64LE(4)
    };
  }

  /**
   * Manually parses SetUserItemVoteResult_t from raw bytes
   * 
   * Layout: [uint64:0-7][int32:8-11][bool:12] = 13 bytes
   * Steam's packed struct has no padding after bool
   * 
   * @param result - Koffi-allocated result buffer
   * @returns Parsed SetUserItemVoteResult_t object
   */
  private parseSetUserItemVoteResult(result: any): SetUserItemVoteResultType {
    const rawBytes = koffi.decode(result, koffi.array('uint8', 13));
    const buffer = Buffer.from(rawBytes);
    
    return {
      m_nPublishedFileId: buffer.readBigUInt64LE(0),
      m_eResult: buffer.readInt32LE(8),
      m_bVoteUp: buffer.readUInt8(12) !== 0
    };
  }

  /**
   * Manually parses GetUserItemVoteResult_t from raw bytes
   * 
   * Layout: [uint64:0-7][int32:8-11][bool×3:12-14] = 15 bytes
   * Steam's packed struct has no padding after bools
   * 
   * @param result - Koffi-allocated result buffer
   * @returns Parsed GetUserItemVoteResult_t object
   */
  private parseGetUserItemVoteResult(result: any): GetUserItemVoteResultType {
    const rawBytes = koffi.decode(result, koffi.array('uint8', 15));
    const buffer = Buffer.from(rawBytes);
    
    return {
      m_nPublishedFileId: buffer.readBigUInt64LE(0),
      m_eResult: buffer.readInt32LE(8),
      m_bVotedUp: buffer.readUInt8(12) !== 0,
      m_bVotedDown: buffer.readUInt8(13) !== 0,
      m_bVoteSkipped: buffer.readUInt8(14) !== 0
    };
  }
}
