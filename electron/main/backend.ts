import { app, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn, ChildProcess } from 'child_process'

const isDev = process.env.NODE_ENV === 'development'

// Path to the bundled python source (in prod) or local source (in dev)
// In prod, files are in resources/python
const PY_SRC_DIR = isDev 
    ? path.join(__dirname, '../../python') 
    : path.join(process.resourcesPath, 'python')

// User Data Path (Where we will create the venv to keep it persistent and writable)
const VENV_DIR = path.join(app.getPath('userData'), 'vibe-speaker-env')

let pyProc: ChildProcess | null = null

export function setupBackendManager() {
    ipcMain.handle('backend-status', async () => {
        return { 
            running: !!pyProc,
            venvExists: fs.existsSync(VENV_DIR)
        }
    })

    ipcMain.handle('install-backend', async (event) => {
        return new Promise((resolve, reject) => {
            // 1. Create Venv
            const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
            
            // Note: In a real prod app, you might want to bundle a standalone python
            // But here we rely on the user having a base python installed as requested.
            
            const createVenv = spawn(pythonCmd, ['-m', 'venv', VENV_DIR])
            
            createVenv.on('close', (code) => {
                if (code !== 0) return reject('Failed to create venv')
                
                // 2. Install Requirements
                const pipPath = process.platform === 'win32' 
                    ? path.join(VENV_DIR, 'Scripts', 'pip') 
                    : path.join(VENV_DIR, 'bin', 'pip')
                
                const install = spawn(pipPath, ['install', '-r', path.join(PY_SRC_DIR, 'requirements.txt')])
                
                install.stdout.on('data', (data) => event.sender.send('install-log', data.toString()))
                install.stderr.on('data', (data) => event.sender.send('install-log', data.toString()))
                
                install.on('close', (code) => {
                    if (code !== 0) return reject('Failed to install dependencies')
                    resolve('Installation Complete')
                })
            })
        })
    })

    ipcMain.handle('start-backend', async () => {
        if (pyProc) return true
        
        const pythonPath = process.platform === 'win32' 
            ? path.join(VENV_DIR, 'Scripts', 'python') 
            : path.join(VENV_DIR, 'bin', 'python')

        if (!fs.existsSync(pythonPath)) {
            throw new Error('Python environment not found. Please install first.')
        }

        const scriptPath = path.join(PY_SRC_DIR, 'api.py')
        
        console.log(`Starting Backend: ${pythonPath} ${scriptPath}`)
        
        pyProc = spawn(pythonPath, ['-m', 'uvicorn', 'api:app', '--host', '127.0.0.1', '--port', '62000'], {
            cwd: PY_SRC_DIR // Important for relative paths in python
        })

        pyProc.stdout?.on('data', (data) => console.log(`[Py]: ${data}`))
        pyProc.stderr?.on('data', (data) => console.error(`[Py Err]: ${data}`))
        
        return true
    })
}

export function killBackend() {
    if (pyProc) {
        console.log('Killing Backend...')
        pyProc.kill()
        pyProc = null
    }
}
