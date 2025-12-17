/// <reference types="vite/client" />
/// <reference types="vite-plugin-electron/electron-env" />

interface Window {
    electron: {
        ipcRenderer: {
            send: (channel: string, ...args: any[]) => void
            on: (channel: string, listener: (event: any, ...args: any[]) => void) => () => void
            invoke: (channel: string, ...args: any[]) => Promise<any>
        }
    }
}
