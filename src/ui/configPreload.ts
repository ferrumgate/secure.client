// All of the Node.js APIs are available in the preload process.

import { contextBridge, ipcRenderer } from "electron";


contextBridge.exposeInMainWorld('electronAPI', {

    on: (channel: string, fn: (...args: any[]) => void) => {
        ipcRenderer.on(channel, (event, ...args: any[]) => fn(...args))
    },
    emit: (channel: string, ...data: any[]) => ipcRenderer.send(channel, ...data)

});


