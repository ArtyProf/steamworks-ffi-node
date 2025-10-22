import * as koffi from 'koffi';
import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import {
  K_I_CREATE_ITEM_RESULT,
  K_I_SUBMIT_ITEM_UPDATE_RESULT,
  CreateItemResultType,
  SubmitItemUpdateResultType
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
          console.error(`[Steamworks] API call failed. Reason: ${failureReason}`);
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
}
