import * as koffi from 'koffi';
import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';

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
          return koffi.decode(result, resultStruct) as T;
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
}
