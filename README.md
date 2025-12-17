# Vibe Speaker

A modern, transparent, floating voice-to-text overlay powered by Vibe Speaker. Built with Electron, React, and Python.

## Features

-   **Real-time Transcription:** Powered by faster-whisper (Python backend).
-   **Floating Overlay:** Always-on-top, transparent window that sits over your other apps.
-   **Customizable:** Dark/Light mode, opacity control, and custom keybindings.
-   **Cross-Platform:** Runs on Windows, Linux, and macOS.
-   **Local Processing:** Privacy-focused. No audio is sent to the cloud.

## OS Compatibility

While Vibe Speaker is designed to be cross-platform, it has primarily been developed and tested on **Linux**. We welcome users to try it on other operating systems (Windows, macOS) and report any bugs or issues they encounter! Please forgive the limited Windows testing; my only Windows PC is currently dedicated to mastering Oregon Trail.

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