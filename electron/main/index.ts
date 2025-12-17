import { app, BrowserWindow, shell, ipcMain, globalShortcut } from 'electron'
import { join } from 'path'
import { release } from 'os'
import { setupBackendManager, killBackend } from './backend'

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Linux transparency fix
if (process.platform === 'linux') {
    app.commandLine.appendSwitch('enable-transparent-visuals')
    app.disableHardwareAcceleration()
}

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
    app.quit()
    process.exit(0)
}

let win: BrowserWindow | null = null
// Dist path
process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
    ? join(process.env.DIST_ELECTRON, '../public')
    : process.env.DIST

const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')
const preload = join(__dirname, '../preload/index.js')

// Initialize Backend Manager
setupBackendManager()

async function createWindow() {
    win = new BrowserWindow({
        title: 'Vibe Speaker',
        icon: join(process.env.PUBLIC, 'favicon.ico'),
        width: 450,
        height: 600,
        useContentSize: true, 
        minWidth: 450,
        minHeight: 600,
        frame: false,
        transparent: true,
        hasShadow: false,
        alwaysOnTop: true,
        webPreferences: {
            preload,
            nodeIntegration: false,
            contextIsolation: true,
        },
        backgroundColor: '#00000000',
    })

    // win.setAlwaysOnTop(true, 'screen-saver')
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    if (url) {
        win.loadURL(url)
    } else {
        win.loadFile(indexHtml)
    }

    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', new Date().toLocaleString())
        // FORCE size after load to override any OS caching/restoration quirks
        win?.setBounds({ width: 450, height: 600 })
    })

    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer]: ${message}`)
    })

    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) shell.openExternal(url)
        return { action: 'deny' }
    })
}

app.whenReady().then(async () => {
    createWindow()

    // --- Global Shortcuts Management ---
    const registeredShortcuts: Record<string, string> = {}

    ipcMain.handle('register-shortcut', async (event, action: string, accelerator: string) => {
        // Unregister existing shortcut for this action if any
        if (registeredShortcuts[action]) {
            globalShortcut.unregister(registeredShortcuts[action])
            delete registeredShortcuts[action]
        }

        try {
            const ret = globalShortcut.register(accelerator, () => {
                console.log(`Global Shortcut triggered: ${action}`)
                if (action === 'toggle-mic') {
                    win?.webContents.send('toggle-mic')
                } else if (action === 'toggle-visibility') {
                     if (win) {
                        if (win.isVisible()) {
                            win.hide()
                        } else {
                            win.show()
                            win.focus()
                        }
                    }
                }
            })

            if (!ret) {
                console.error(`Registration failed for ${accelerator}`)
                return false
            }

            registeredShortcuts[action] = accelerator
            return true
        } catch (error) {
            console.error(error)
            return false
        }
    })

    ipcMain.handle('unregister-shortcut', async (event, action: string) => {
        if (registeredShortcuts[action]) {
            globalShortcut.unregister(registeredShortcuts[action])
            delete registeredShortcuts[action]
        }
    })
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
    killBackend() // Ensure Python process dies
})

app.on('window-all-closed', () => {
    win = null
    if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
    if (win) {
        if (win.isMinimized()) win.restore()
        win.focus()
    }
})

app.on('activate', () => {
    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length) {
        allWindows[0].focus()
    } else {
        createWindow()
    }
})
