<div align="center">
  <img src="icon-logo.png" alt="Vibe Speaker Logo" width="128" height="128" />
  <h1>Vibe Speaker</h1>
  <p>
    <strong>A modern, transparent, floating voice-to-text overlay.</strong>
  </p>
  <p>
    Powered by local AI. Privacy-focused. Cross-platform.
  </p>
</div>

<br />

<div align="center">
  <img src="screenshot.png" alt="Vibe Speaker Screenshot" width="800" />
</div>

<br />

## 🌟 Features

*   **🎙️ Real-time Transcription:** Powered by `faster-whisper` for lightning-fast accuracy.
*   **🪟 Floating Overlay:** An always-on-top, transparent window that seamlessly blends with your workflow.
*   **🎨 Highly Customizable:** Adjust opacity, switch between Dark/Light modes, and configure custom keybindings.
*   **🔒 Privacy First:** 100% local processing. Your voice data never leaves your machine.
*   **💻 Cross-Platform:** Designed for **Linux**, **Windows**, and **macOS**.

---

## 🖥️ OS Compatibility

**Vibe Speaker** is designed to be truly cross-platform.

*   **🐧 Linux:** Primary development platform. Fully tested and battle-proven.
*   **🪟 Windows & 🍎 macOS:** Supported and working! 
    > *Note: Please forgive any rough edges on Windows; my only Windows PC is currently dedicated to mastering Oregon Trail. We welcome your feedback!*

---

## 🚀 Getting Started

### Prerequisites

*   **Node.js** (v18+)
*   **Python** (3.10+)
*   **ffmpeg** (Installed and added to your system PATH)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/mrjw717/Vibe-Speaker.git
    cd Vibe-Speaker
    ```

2.  **Install Frontend Dependencies:**
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies:**
    ```bash
    pip install -r python/requirements.txt
    ```

### 🛠️ Development

Run the full stack (Frontend + Electron + Python Backend) in development mode:

```bash
npm run dev
```

### 📦 Building

To build the application for your current operating system:

```bash
npm run build
```

To build for all supported platforms (requires configuration):

```bash
npm run build:all
```

---

## ⌨️ Shortcuts

| Action | Default Shortcut | Description |
| :--- | :--- | :--- |
| **Toggle Microphone** | `Ctrl+Shift+Alt+M` | Start/Stop listening. Customizable in Settings. |
| **Toggle Visibility** | `Ctrl+Shift+Alt+H` | Hide/Show the overlay. Customizable in Settings. |

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started.


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