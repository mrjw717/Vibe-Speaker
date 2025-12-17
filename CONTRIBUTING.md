# Contributing to Whisper Overlay

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, and to accept pull requests.

1.  Fork the repo and create your branch from `main`.
2.  If you've added code that should be tested, add tests.
3.  If you've changed APIs, update the documentation.
4.  Ensure the test suite passes.
5.  Make sure your code lints.
6.  Issue that pull request!

## Project Structure

-   `electron/`: Electron main process code (Node.js).
-   `src/`: React frontend code (Vite).
-   `python/`: Python backend for Whisper and Audio handling.

## Build Instructions

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Dev Mode:**
    ```bash
    npm run dev
    ```
    This starts the Vite dev server, the Electron main process, and attempts to use your local system Python. Ensure you have the python requirements installed:
    ```bash
    pip install -r python/requirements.txt
    ```

3.  **Build:**
    ```bash
    npm run build
    ```

## Python Backend

The backend uses `uvicorn` and `FastAPI`. It is packaged as a standalone executable (using PyInstaller) for production builds but runs as a standard python script in dev mode.
