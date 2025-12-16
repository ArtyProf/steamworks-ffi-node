"""
Virtual Gamepad Server for Steamworks Input Testing
Supports both Xbox 360 and DualShock 4 emulation

Usage:
    python vgamepad_server.py [xbox|ps4] [server|test]
    
Examples:
    python vgamepad_server.py xbox server  # Run interactive server
    python vgamepad_server.py ps4 test     # Run test sequence
"""

import vgamepad as vg
import sys
import time
import json
import traceback
import io

# Force UTF-8 encoding for stdout/stderr on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

class VirtualGamepadServer:
    def __init__(self, controller_type='xbox'):
        """
        Initialize virtual gamepad
        controller_type: 'xbox' or 'ps4'
        """
        self.controller_type = controller_type
        
        if controller_type == 'xbox':
            self.gamepad = vg.VX360Gamepad()
            print(f"✓ Virtual Xbox 360 Controller created", flush=True)
        elif controller_type == 'ps4':
            self.gamepad = vg.VDS4Gamepad()
            print(f"✓ Virtual DualShock 4 Controller created", flush=True)
        else:
            raise ValueError(f"Unknown controller type: {controller_type}")
        
        # Xbox button mappings
        self.xbox_buttons = {
            'A': vg.XUSB_BUTTON.XUSB_GAMEPAD_A,
            'B': vg.XUSB_BUTTON.XUSB_GAMEPAD_B,
            'X': vg.XUSB_BUTTON.XUSB_GAMEPAD_X,
            'Y': vg.XUSB_BUTTON.XUSB_GAMEPAD_Y,
            'LB': vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_SHOULDER,
            'RB': vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_SHOULDER,
            'Start': vg.XUSB_BUTTON.XUSB_GAMEPAD_START,
            'Back': vg.XUSB_BUTTON.XUSB_GAMEPAD_BACK,
            'LS': vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_THUMB,
            'RS': vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_THUMB,
            'DpadUp': vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_UP,
            'DpadDown': vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_DOWN,
            'DpadLeft': vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_LEFT,
            'DpadRight': vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_RIGHT,
        }
        
        # PS4 button mappings
        self.ps4_buttons = {
            'Cross': vg.DS4_BUTTONS.DS4_BUTTON_CROSS,
            'Circle': vg.DS4_BUTTONS.DS4_BUTTON_CIRCLE,
            'Square': vg.DS4_BUTTONS.DS4_BUTTON_SQUARE,
            'Triangle': vg.DS4_BUTTONS.DS4_BUTTON_TRIANGLE,
            'L1': vg.DS4_BUTTONS.DS4_BUTTON_SHOULDER_LEFT,
            'R1': vg.DS4_BUTTONS.DS4_BUTTON_SHOULDER_RIGHT,
            'L3': vg.DS4_BUTTONS.DS4_BUTTON_THUMB_LEFT,
            'R3': vg.DS4_BUTTONS.DS4_BUTTON_THUMB_RIGHT,
            'Share': vg.DS4_BUTTONS.DS4_BUTTON_SHARE,
            'Options': vg.DS4_BUTTONS.DS4_BUTTON_OPTIONS,
            'PS': vg.DS4_BUTTONS.DS4_BUTTON_TRIGGER_LEFT,
            'Touchpad': vg.DS4_BUTTONS.DS4_BUTTON_TRIGGER_RIGHT,
        }

    def press_button(self, button_name, duration_ms=100):
        """Press and release a button"""
        try:
            if self.controller_type == 'xbox':
                button = self.xbox_buttons.get(button_name)
                if button:
                    self.gamepad.press_button(button)
                    self.gamepad.update()
                    time.sleep(duration_ms / 1000.0)
                    self.gamepad.release_button(button)
                    self.gamepad.update()
                    print(f"✓ Pressed Xbox button: {button_name}", flush=True)
                else:
                    print(f"✗ Unknown Xbox button: {button_name}", flush=True)
            
            elif self.controller_type == 'ps4':
                button = self.ps4_buttons.get(button_name)
                if button:
                    self.gamepad.press_button(button)
                    self.gamepad.update()
                    time.sleep(duration_ms / 1000.0)
                    self.gamepad.release_button(button)
                    self.gamepad.update()
                    print(f"✓ Pressed PS4 button: {button_name}", flush=True)
                else:
                    print(f"✗ Unknown PS4 button: {button_name}", flush=True)
        except Exception as e:
            print(f"✗ Error pressing button: {e}", flush=True)

    def set_left_stick(self, x, y):
        """Set left analog stick position (x, y: -1.0 to 1.0)"""
        try:
            self.gamepad.left_joystick_float(x_value_float=x, y_value_float=y)
            self.gamepad.update()
            print(f"✓ Left stick: ({x:.2f}, {y:.2f})", flush=True)
        except Exception as e:
            print(f"✗ Error setting left stick: {e}", flush=True)

    def set_right_stick(self, x, y):
        """Set right analog stick position (x, y: -1.0 to 1.0)"""
        try:
            self.gamepad.right_joystick_float(x_value_float=x, y_value_float=y)
            self.gamepad.update()
            print(f"✓ Right stick: ({x:.2f}, {y:.2f})", flush=True)
        except Exception as e:
            print(f"✗ Error setting right stick: {e}", flush=True)

    def set_left_trigger(self, value):
        """Set left trigger value (0.0 to 1.0)"""
        try:
            self.gamepad.left_trigger_float(value_float=value)
            self.gamepad.update()
            print(f"✓ Left trigger: {value:.2f}", flush=True)
        except Exception as e:
            print(f"✗ Error setting left trigger: {e}", flush=True)

    def set_right_trigger(self, value):
        """Set right trigger value (0.0 to 1.0)"""
        try:
            self.gamepad.right_trigger_float(value_float=value)
            self.gamepad.update()
            print(f"✓ Right trigger: {value:.2f}", flush=True)
        except Exception as e:
            print(f"✗ Error setting right trigger: {e}", flush=True)

    def reset(self):
        """Reset all inputs to neutral position"""
        try:
            self.gamepad.reset()
            self.gamepad.update()
            print(f"✓ Controller reset", flush=True)
        except Exception as e:
            print(f"✗ Error resetting: {e}", flush=True)

    def run_test_sequence(self):
        """Run automated test sequence"""
        print("\n=== Running Test Sequence ===", flush=True)
        
        # Test buttons
        if self.controller_type == 'xbox':
            buttons = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'Start', 'Back', 'LS', 'RS']
        else:
            buttons = ['Cross', 'Circle', 'Square', 'Triangle', 'L1', 'R1', 'Options', 'Share', 'L3', 'R3']
        
        print("\nTesting buttons...", flush=True)
        for button in buttons:
            self.press_button(button, 150)
            time.sleep(0.2)
        
        # Test D-pad
        print("\nTesting D-pad...", flush=True)
        if self.controller_type == 'xbox':
            dpad_buttons = ['DpadUp', 'DpadRight', 'DpadDown', 'DpadLeft']
            for button in dpad_buttons:
                self.press_button(button, 150)
                time.sleep(0.2)
        
        # Test left stick
        print("\nTesting left stick...", flush=True)
        directions = [
            ('Right', 1.0, 0.0),
            ('Up', 0.0, 1.0),
            ('Left', -1.0, 0.0),
            ('Down', 0.0, -1.0),
            ('Center', 0.0, 0.0)
        ]
        for name, x, y in directions:
            print(f"  {name}...", flush=True)
            self.set_left_stick(x, y)
            time.sleep(0.4)
        
        # Test right stick
        print("\nTesting right stick...", flush=True)
        for name, x, y in directions:
            print(f"  {name}...", flush=True)
            self.set_right_stick(x, y)
            time.sleep(0.4)
        
        # Test triggers
        print("\nTesting triggers...", flush=True)
        for value in [0.0, 0.25, 0.5, 0.75, 1.0, 0.0]:
            print(f"  Triggers at {int(value * 100)}%...", flush=True)
            self.set_left_trigger(value)
            self.set_right_trigger(value)
            time.sleep(0.3)
        
        self.reset()
        print("\n✓ Test sequence complete", flush=True)

    def run_server(self):
        """Run interactive command server"""
        print("READY", flush=True)
        print("\n=== Virtual Gamepad Server Ready ===", flush=True)
        print("Commands:", flush=True)
        print("  PRESS:<button>:<duration_ms>", flush=True)
        print("  LSTICK:<x>:<y>", flush=True)
        print("  RSTICK:<x>:<y>", flush=True)
        print("  LTRIGGER:<value>", flush=True)
        print("  RTRIGGER:<value>", flush=True)
        print("  RESET", flush=True)
        print("  TEST", flush=True)
        print("  PING", flush=True)
        print("  EXIT", flush=True)
        
        while True:
            try:
                line = sys.stdin.readline()
                if not line:
                    break
                
                line = line.strip()
                if not line:
                    continue
                
                parts = line.split(':')
                command = parts[0].upper()
                
                if command == 'PRESS':
                    button = parts[1]
                    duration = int(parts[2]) if len(parts) > 2 else 100
                    self.press_button(button, duration)
                
                elif command == 'LSTICK':
                    x = float(parts[1])
                    y = float(parts[2])
                    self.set_left_stick(x, y)
                
                elif command == 'RSTICK':
                    x = float(parts[1])
                    y = float(parts[2])
                    self.set_right_stick(x, y)
                
                elif command == 'LTRIGGER':
                    value = float(parts[1])
                    self.set_left_trigger(value)
                
                elif command == 'RTRIGGER':
                    value = float(parts[1])
                    self.set_right_trigger(value)
                
                elif command == 'RESET':
                    self.reset()
                
                elif command == 'TEST':
                    self.run_test_sequence()
                
                elif command == 'PING':
                    print("PONG", flush=True)
                
                elif command == 'EXIT':
                    print("Shutting down...", flush=True)
                    break
                
                else:
                    print(f"✗ Unknown command: {command}", flush=True)
            
            except KeyboardInterrupt:
                print("\nInterrupted, shutting down...", flush=True)
                break
            except Exception as e:
                print(f"✗ Error processing command: {e}", flush=True)
                traceback.print_exc()

def main():
    if len(sys.argv) < 2:
        print("Usage: python vgamepad_server.py [xbox|ps4] [server|test]")
        sys.exit(1)
    
    controller_type = sys.argv[1].lower()
    mode = sys.argv[2].lower() if len(sys.argv) > 2 else 'server'
    
    if controller_type not in ['xbox', 'ps4']:
        print(f"Invalid controller type: {controller_type}")
        print("Must be 'xbox' or 'ps4'")
        sys.exit(1)
    
    try:
        server = VirtualGamepadServer(controller_type)
        
        if mode == 'test':
            server.run_test_sequence()
        else:
            server.run_server()
    
    except ImportError as e:
        print(f"✗ Error: vgamepad library not installed", flush=True)
        print(f"  Install with: pip install vgamepad", flush=True)
        sys.exit(1)
    except Exception as e:
        print(f"✗ Fatal error: {e}", flush=True)
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
