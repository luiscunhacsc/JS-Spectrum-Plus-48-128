# JS Spectrum

A browser-based ZX Spectrum 48K and 128K emulator.

## Start the emulator

Double-click the launcher for your operating system:

- **Windows:** `Launch-Windows.bat`
- **macOS:** make it executable once with `chmod +x Launch-macOS.command`, then double-click it (if blocked, right-click and choose **Open**).
- **Linux:** make it executable once with `chmod +x Launch-Linux.sh`, then double-click it or run `./Launch-Linux.sh`.

Alternatively, open **`index.html`** directly in a modern browser.

After the emulator opens:

1. Select the **48K** or **128K** model card to start. The selected card shows
   **Running**; selecting it again restarts that model.
2. Audio is on by default and starts when you launch a model. Select **Audio
   on** to mute or unmute it. Browsers require a click before playing sound.
3. To play a tape, select **Load tape**, choose a `.tap` file (or drop one onto
   the tape deck), then type `LOAD ""` and press Enter. **Sample games** opens
   the bundled tape library. On 48K, press **J** for LOAD, then **Shift + P**
   twice for the quotes.
   On 128K, choose **48 BASIC** from the Spectrum menu before loading a tape.

The app is a single, self-contained HTML file. The emulator code, both models'
ROMs, model images, keyboard map, and sample tapes are embedded in it; no installation,
server, or additional files are needed to run it.

## Keyboard

- Click the emulator display to focus keyboard input.
- The footer shows **Keyboard connected** when the display has focus. Tab
  moves to the controls, where Enter and Space work normally.
- **F1** toggles the keyboard map.
- **F2** toggles fullscreen.
- **F3** toggles large view.
- PC **arrow keys** act as Spectrum cursor keys (Caps Shift + 5/6/7/8).
- PC **Ctrl** maps to Caps Shift; PC **Shift** maps to Symbol Shift.

## Project files

- `index.html` — ready-to-run emulator.
- `Launch-Windows.bat`, `Launch-macOS.command`, `Launch-Linux.sh` — open the emulator in the default browser. macOS/Linux may require making the launcher executable once.
- `LICENSE` — license and attribution.
- `developer/` — editable source, build script, and source assets for regenerating `index.html`.
- `Screenshots and Video/` — optional demonstrations.

To rebuild the app on Windows, run `developer\build_single_html.ps1` in
PowerShell. It writes the updated standalone `index.html`.

The 128K AY sound chip and the native 128K tape loader are not emulated.
