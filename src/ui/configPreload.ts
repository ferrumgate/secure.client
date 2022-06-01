// All of the Node.js APIs are available in the preload process.

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld('electronAPI', {
    closeWindow: () => ipcRenderer.send('closeOptionsWindow'),
    openLink: (link: string) => ipcRenderer.send('openLink', link),
    notify: (data: { type: string, msg: string }) => ipcRenderer.send('notify', data)
})


