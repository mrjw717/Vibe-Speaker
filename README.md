# Whisper Overlay

A modern, transparent, floating voice-to-text overlay powered by OpenAI's Whisper models. Built with Electron, React, and Python.

## Features

-   **Real-time Transcription:** Powered by faster-whisper (Python backend).
-   **Floating Overlay:** Always-on-top, transparent window that sits over your other apps.
-   **Customizable:** Dark/Light mode, opacity control, and custom keybindings.
-   **Cross-Platform:** Runs on Windows, Linux, and macOS.
-   **Local Processing:** Privacy-focused. No audio is sent to the cloud.

## Getting Started

### Prerequisites

-   Node.js (v18+)
-   Python 3.10+
-   `ffmpeg` installed on your system.

### Installation

1.  Clone the repository.
2.  Install NPM dependencies:
    ```bash
    npm install
    ```
3.  Install Python dependencies:
    ```bash
    pip install -r python/requirements.txt
    ```

### Development

Run the development server (Frontend + Electron + Python Backend):
```bash
npm run dev
```

### Building

To build for your current OS:
```bash
npm run build
```

To build for all platforms (requires configuration):
```bash
npm run build:all
```

## Shortcuts

-   **Toggle Microphone:** `Ctrl+Shift+Alt+M` (Customizable in Settings)
-   **Toggle Visibility:** `Ctrl+Shift+Alt+H` (Customizable in Settings)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.