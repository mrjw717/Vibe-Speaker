import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.removeListener(channel, listener)
    },
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  },
})
