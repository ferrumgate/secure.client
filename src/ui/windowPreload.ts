// All of the Node.js APIs are available in the preload process.

import { contextBridge, ipcRenderer } from "electron";

/**
 * @summary expose an api between main process and the configUI process
 */
export const api = {

    on: (channel: string, fn: (...args: any[]) => void) => {
        ipcRenderer.on(channel, (event, ...args: any[]) => fn(...args))
    },
    emit: (channel: string, ...data: any[]) => ipcRenderer.send(channel, ...data),
    node_env: () => process.env.NODE_ENV

};
contextBridge?.exposeInMainWorld('electronAPI', api);


