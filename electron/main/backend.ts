import { app, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn, ChildProcess, exec } from 'child_process'
import net from 'net'

const isDev = process.env.NODE_ENV === 'development'

// Path to the bundled python source (in prod) or local source (in dev)
// In prod, files are in resources/python
const PY_SRC_DIR = isDev 
    ? path.join(__dirname, '../../python') 
    : path.join(process.resourcesPath, 'python')

// User Data Path (Where we will create the venv to keep it persistent and writable)
const VENV_DIR = path.join(app.getPath('userData'), 'vibe-speaker-env')
const PORT = 62000

let pyProc: ChildProcess | null = null

function checkPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net.createServer()
        server.once('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true) // Port is in use
            } else {
                resolve(false)
            }
        })
        server.once('listening', () => {
            server.close()
            resolve(false) // Port is free
        })
        server.listen(port)
    })
}

function findPythonCommand(): Promise<string> {
    return new Promise((resolve, reject) => {
        const commands = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python']
        
        let found = false
        // Try each command
        const checkNext = (index: number) => {
            if (index >= commands.length) {
                reject('No compatible Python found (requires Python 3.10+)')
                return
            }
            const cmd = commands[index]
            exec(`${cmd} --version`, (error, stdout) => {
                if (!error && stdout.includes('Python 3')) {
                    resolve(cmd)
                } else {
                    checkNext(index + 1)
                }
            })
        }
        checkNext(0)
    })
}

export function setupBackendManager() {
    ipcMain.handle('backend-status', async () => {
        return { 
            running: !!pyProc,
            venvExists: fs.existsSync(VENV_DIR)
        }
    })

    ipcMain.handle('install-backend', async (event) => {
        try {
            const pythonCmd = await findPythonCommand()
            
            return new Promise((resolve, reject) => {
                // 1. Create Venv
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
        } catch (err: any) {
            throw new Error(err.message || 'Failed to setup backend')
        }
    })

    ipcMain.handle('start-backend', async () => {
        if (pyProc) return true
        
        // Check if port is already in use
        const isPortInUse = await checkPort(PORT)
        if (isPortInUse) {
            console.log(`Port ${PORT} is already in use. Assuming backend is running externally or from a previous session.`)
            return true
        }

        const pythonPath = process.platform === 'win32' 
            ? path.join(VENV_DIR, 'Scripts', 'python') 
            : path.join(VENV_DIR, 'bin', 'python')

        if (!fs.existsSync(pythonPath)) {
            throw new Error('Python environment not found. Please install first.')
        }

        const scriptPath = path.join(PY_SRC_DIR, 'api.py')
        
        console.log(`Starting Backend: ${pythonPath} ${scriptPath}`)
        
        pyProc = spawn(pythonPath, ['-m', 'uvicorn', 'api:app', '--host', '127.0.0.1', '--port', String(PORT)], {
            cwd: PY_SRC_DIR // Important for relative paths in python
        })

        pyProc.stdout?.on('data', (data) => console.log(`[Py]: ${data}`))
        pyProc.stderr?.on('data', (data) => console.error(`[Py Err]: ${data}`))
        
        pyProc.on('error', (err) => {
             console.error('Failed to start python backend:', err)
             pyProc = null
        })
        
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
