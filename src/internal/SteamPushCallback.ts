import * as koffi from 'koffi';
import { SteamLibraryLoader } from './SteamLibraryLoader';
import { SteamAPICore } from './SteamAPICore';
import { SteamLogger } from './SteamLogger';

/**
 * One Steam push callback, registered through SteamAPI_RegisterCallback
 *
 * A push callback is one Steam raises unprompted, such as
 * GameOverlayActivated_t, rather than the result of an API call this process
 * made, so SteamCallbackPoller can't poll for it.
 *
 * Steam expects a C++ CCallbackBase object: a vtable pointer followed by
 * `{ uint8 m_nCallbackFlags; int m_iCallback; }`. This builds one by hand in
 * koffi-allocated memory and points its three virtual slots at koffi
 * trampolines.
 *
 * Every koffi type used here is created at register() time from base type
 * names, never held at module scope. SteamworksSDK.shutdown() ends with
 * koffi.reset(), which frees every type defined before it, so a module-scope
 * type would be a use-after-free the next time this registers after a
 * re-init. For the same reason the callback's struct is handed over as raw
 * bytes for the owner to parse, rather than decoded with a koffi.struct.
 *
 * register() before init() succeeds is deferred, not dropped: it registers
 * as soon as init() succeeds. unregister() is idempotent and never throws, so
 * it is safe to call from shutdown more than once.
 */
export class SteamPushCallback {
  private trampolines: bigint[] = [];
  private vtable: unknown = null;
  /** The CCallbackBase object, non-null only while Steam holds it */
  private object: unknown = null;
  /** register() was called before Steam was initialized */
  private pending = false;

  /**
   * @param name - Struct name, for log messages
   * @param callbackId - The struct's k_iCallback
   * @param sizeBytes - sizeof() the struct under the running platform's packing
   * @param onData - Receives a copy of the struct's bytes for each callback
   */
  constructor(
    private readonly libraryLoader: SteamLibraryLoader,
    private readonly apiCore: SteamAPICore,
    private readonly name: string,
    private readonly callbackId: number,
    private readonly sizeBytes: number,
    private readonly onData: (data: Buffer) => void,
  ) {
    apiCore.onInitialized(() => {
      if (this.pending) this.register();
    });
  }

  /** Whether Steam currently holds this callback */
  get isRegistered(): boolean {
    return this.object !== null;
  }

  /**
   * Register with Steam, or defer until init() succeeds
   *
   * Before init the library may not be loaded and Steam's callback manager
   * isn't set up, so this only remembers that registration was asked for.
   */
  register(): void {
    if (this.object !== null) return;
    if (!this.apiCore.isInitialized()) {
      this.pending = true;
      return;
    }
    this.pending = false;

    let object: unknown = null;
    try {
      const dispatch = (_self: unknown, pvParam: unknown): void => {
        try {
          this.onData(Buffer.from(koffi.decode(pvParam, 'uint8', this.sizeBytes)));
        } catch (error) {
          SteamLogger.error(`[Steamworks] Error in ${this.name} callback:`, error);
        }
      };

      // Slots in GCC/Clang declaration order: Run(void*), Run(void*, bool,
      // SteamAPICall_t), GetCallbackSizeBytes(). MSVC reverses the two Run
      // overloads, so Steam reaches dispatch through slot 0 on macOS/Linux and
      // slot 1 on Windows. Both only read pvParam, so either way works.
      const run = koffi.pointer(koffi.proto('void', ['void *', 'void *']));
      const runResult = koffi.pointer(koffi.proto('void', ['void *', 'void *', 'bool', 'uint64']));
      const getSize = koffi.pointer(koffi.proto('int', ['void *']));
      this.trampolines.push(koffi.register(dispatch, run));
      this.trampolines.push(koffi.register(dispatch, runResult));
      this.trampolines.push(koffi.register(() => this.sizeBytes, getSize));

      this.vtable = koffi.alloc('void *', 3);
      koffi.encode(this.vtable, 'void *', this.trampolines, 3);

      // [vfptr][uint8 m_nCallbackFlags][pad:3][int32 m_iCallback]. alloc()
      // zero-fills, so the flags and padding start at 0 as Steam expects.
      const pointerSize = koffi.sizeof('void *');
      object = koffi.alloc('uint8', pointerSize + 8);
      koffi.encode(object, 0, 'void *', this.vtable);
      koffi.encode(object, pointerSize + 4, 'int32', this.callbackId);

      this.libraryLoader.SteamAPI_RegisterCallback(object, this.callbackId);
      this.object = object;
    } catch (error) {
      if (object !== null) koffi.free(object);
      this.release();
      SteamLogger.error(`[Steamworks] Failed to register ${this.name} callback:`, error);
    }
  }

  /**
   * Unregister from Steam and free everything register() allocated
   *
   * Must run before SteamAPI_Shutdown() and koffi.reset(), so Steam never
   * calls into a freed trampoline.
   */
  unregister(): void {
    this.pending = false;
    if (this.object !== null) {
      try {
        this.libraryLoader.SteamAPI_UnregisterCallback(this.object);
      } catch (error) {
        SteamLogger.error(`[Steamworks] Failed to unregister ${this.name} callback:`, error);
      }
    }
    this.release();
  }

  private release(): void {
    for (const trampoline of this.trampolines) {
      try {
        koffi.unregister(trampoline);
      } catch (error) {
        SteamLogger.error(`[Steamworks] Failed to release ${this.name} callback trampoline:`, error);
      }
    }
    this.trampolines = [];

    if (this.object !== null) {
      koffi.free(this.object);
      this.object = null;
    }
    if (this.vtable !== null) {
      koffi.free(this.vtable);
      this.vtable = null;
    }
  }
}

/**
 * Call each handler with an event, isolating failures
 *
 * This runs inside Steam's callback dispatcher, so nothing may propagate out
 * of it: a handler that throws is logged and the rest still run, and a
 * handler that returns a rejected promise is logged instead of becoming an
 * unhandled rejection, which would end the process. Iterates a snapshot, so
 * a handler unsubscribing itself doesn't make the next one get skipped.
 */
export function notifyHandlers<T>(name: string, handlers: readonly ((event: T) => unknown)[], event: T): void {
  for (const handler of [...handlers]) {
    try {
      const result = handler(event);
      if (result !== null && typeof result === 'object' && typeof (result as PromiseLike<unknown>).then === 'function') {
        Promise.resolve(result).catch((error) => {
          SteamLogger.error(`[Steamworks] Error in ${name} handler:`, error);
        });
      }
    } catch (error) {
      SteamLogger.error(`[Steamworks] Error in ${name} handler:`, error);
    }
  }
}
