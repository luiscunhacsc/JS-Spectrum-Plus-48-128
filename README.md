# JS Spectrum

A browser-based ZX Spectrum 48K and 128K emulator.

## Start the emulator

Double-click the launcher for your operating system:

- **Windows:** `Launch-Windows.bat`
- **macOS:** make it executable once with `chmod +x Launch-macOS.command`, then double-click it (if blocked, right-click and choose **Open**).
- **Linux:** make it executable once with `chmod +x Launch-Linux.sh`, then double-click it or run `./Launch-Linux.sh`.

Alternatively, open **`index.html`** directly in a modern browser.

After the emulator opens:

1. Select **Start 48K** or **Start 128K**.
2. Optionally select **Start Audio**. Browsers require a click before playing sound.
3. To play a tape, select **Load Tape**, choose a `.tap` file, then type `LOAD ""` and press Enter.

The app is a single, self-contained HTML file. The emulator code, both models'
ROMs, keyboard image, and sample tapes are embedded in it; no installation,
server, or additional files are needed to run it.

## Keyboard

- Click the emulator display to focus keyboard input.
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
