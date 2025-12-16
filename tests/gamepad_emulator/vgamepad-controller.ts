import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

/**
 * Controller type for virtual gamepad
 */
export type ControllerType = 'xbox' | 'ps4';

/**
 * Button names for Xbox 360 controller
 */
export type XboxButton = 
  | 'A' | 'B' | 'X' | 'Y'
  | 'LB' | 'RB'
  | 'Start' | 'Back'
  | 'LS' | 'RS'
  | 'DpadUp' | 'DpadDown' | 'DpadLeft' | 'DpadRight';

/**
 * Button names for PS4 controller
 */
export type PS4Button =
  | 'Cross' | 'Circle' | 'Square' | 'Triangle'
  | 'L1' | 'R1'
  | 'L3' | 'R3'
  | 'Options' | 'Share'
  | 'PS' | 'Touchpad';

/**
 * Virtual gamepad controller for testing Steamworks Input API
 * Wraps Python vgamepad server with convenient Node.js interface
 */
export class VirtualGamepad {
  private process: ChildProcess | null = null;
  private ready: boolean = false;
  private controllerType: ControllerType;
  private errorBuffer: string = '';

  constructor(controllerType: ControllerType = 'xbox') {
    this.controllerType = controllerType;
  }

  /**
   * Start the virtual gamepad server
   * @param timeoutMs Wait time after startup for Steam to detect the controller
   */
  async start(timeoutMs: number = 3000): Promise<void> {
    if (this.process) {
      throw new Error('Virtual gamepad is already running');
    }

    const scriptPath = path.join(__dirname, '..', 'gamepad_emulator', 'vgamepad_server.py');

    return new Promise((resolve, reject) => {
      this.process = spawn('python', [scriptPath, this.controllerType, 'server'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Capture stderr for error messages
      this.process.stderr?.on('data', (data) => {
        this.errorBuffer += data.toString();
      });

      // Listen for ready signal from Python process
      this.process.stdout?.once('data', (data) => {
        const output = data.toString();
        if (output.includes('READY')) {
          this.ready = true;
          // Wait for Steam to detect the controller
          setTimeout(() => resolve(), timeoutMs);
        } else {
          this.stop();
          reject(new Error(`Virtual gamepad failed to start: ${output}`));
        }
      });

      this.process.on('error', (err) => {
        this.stop();
        reject(new Error(`Failed to spawn Python process: ${err.message}\nMake sure Python and vgamepad are installed.`));
      });

      this.process.on('exit', (code) => {
        if (code !== 0 && code !== null && !this.ready) {
          reject(new Error(`Python process exited with code ${code}\n${this.errorBuffer}`));
        }
      });
    });
  }

  /**
   * Stop the virtual gamepad server
   */
  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      // Try graceful shutdown first
      if (this.ready) {
        this.sendCommand('EXIT');
      }

      // Force kill after timeout
      const killTimeout = setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
      }, 1000);

      this.process.once('exit', () => {
        clearTimeout(killTimeout);
        this.process = null;
        this.ready = false;
        this.errorBuffer = '';
        resolve();
      });

      // Fallback kill if no exit event
      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
          this.process = null;
          this.ready = false;
          this.errorBuffer = '';
        }
        resolve();
      }, 2000);
    });
  }

  /**
   * Press a button for specified duration
   * @param button Button name
   * @param durationMs Duration in milliseconds
   */
  async pressButton(button: XboxButton | PS4Button, durationMs: number = 100): Promise<void> {
    this.ensureReady();
    this.sendCommand(`PRESS:${button}:${durationMs}`);
    // Wait for button press to complete
    await this.sleep(durationMs + 50);
  }

  /**
   * Set left analog stick position
   * @param x Horizontal axis (-1.0 to 1.0, left to right)
   * @param y Vertical axis (-1.0 to 1.0, down to up)
   */
  setLeftStick(x: number, y: number): void {
    this.ensureReady();
    this.sendCommand(`LSTICK:${x.toFixed(3)}:${y.toFixed(3)}`);
  }

  /**
   * Set right analog stick position
   * @param x Horizontal axis (-1.0 to 1.0, left to right)
   * @param y Vertical axis (-1.0 to 1.0, down to up)
   */
  setRightStick(x: number, y: number): void {
    this.ensureReady();
    this.sendCommand(`RSTICK:${x.toFixed(3)}:${y.toFixed(3)}`);
  }

  /**
   * Set left trigger value
   * @param value Trigger value (0.0 to 1.0)
   */
  setLeftTrigger(value: number): void {
    this.ensureReady();
    this.sendCommand(`LTRIGGER:${value.toFixed(3)}`);
  }

  /**
   * Set right trigger value
   * @param value Trigger value (0.0 to 1.0)
   */
  setRightTrigger(value: number): void {
    this.ensureReady();
    this.sendCommand(`RTRIGGER:${value.toFixed(3)}`);
  }

  /**
   * Reset all inputs to neutral state
   */
  reset(): void {
    this.ensureReady();
    this.sendCommand('RESET');
  }

  /**
   * Run automated test sequence
   */
  async runTestSequence(): Promise<void> {
    this.ensureReady();
    this.sendCommand('TEST');
    // Wait for test sequence to complete
    await this.sleep(5000);
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.ready && this.process !== null;
  }

  /**
   * Get controller type
   */
  getType(): ControllerType {
    return this.controllerType;
  }

  /**
   * Send a raw command to the Python server
   */
  private sendCommand(command: string): void {
    if (!this.process || !this.process.stdin) {
      throw new Error('Virtual gamepad process is not running');
    }
    this.process.stdin.write(command + '\n');
  }

  /**
   * Ensure server is ready
   */
  private ensureReady(): void {
    if (!this.ready) {
      throw new Error('Virtual gamepad is not ready. Call start() first.');
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create and start a virtual gamepad
 * @param type Controller type (xbox or ps4)
 * @param startupWaitMs Time to wait for Steam to detect the controller
 */
export async function createVirtualGamepad(
  type: ControllerType = 'xbox',
  startupWaitMs: number = 3000
): Promise<VirtualGamepad> {
  const gamepad = new VirtualGamepad(type);
  await gamepad.start(startupWaitMs);
  return gamepad;
}
