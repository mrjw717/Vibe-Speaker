# Whisper Overlay

A high-performance, GPU-accelerated voice-to-text overlay using OpenAI's Whisper model.

## Installation

### Windows
1.  Extract the ZIP file.
2.  Run `Whisper Overlay.exe`.
3.  (Optional) Create a shortcut to the executable for easy access.

### macOS
1.  Unzip the file.
2.  Drag `Whisper Overlay.app` to your Applications folder.
3.  You may need to allow the app to run in "Security & Privacy" settings if it's not signed.

### Linux
-   **AppImage:** Make executable (`chmod +x Whisper Overlay.AppImage`) and run.
-   **Deb:** Install via `sudo dpkg -i whisper-overlay.deb`.

## Usage

1.  **Launch:** The app starts as a floating overlay.
2.  **Mic:** Click the microphone icon or use `Ctrl+Shift+Alt+M` (default) to toggle listening.
3.  **Hide/Show:** Use `Ctrl+Shift+Alt+H` (default) to toggle visibility.
4.  **Settings:** Click the gear icon to change shortcuts, opacity, and audio devices.

## Troubleshooting

-   **Backend Issues:** If the transcription doesn't start, ensure you have the necessary audio drivers.
-   **Performance:** This app relies on the CPU/GPU for inference. A decent machine is recommended.
