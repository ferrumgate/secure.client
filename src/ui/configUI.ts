import { BrowserWindow, ipcMain, nativeImage, Rectangle, screen, Tray } from "electron";
import { EventService } from "../service/eventsService";
import path from 'path';
import { WindowUI } from "./window";

/**
 * @summary configuration ui for settings some options like host
 */
export class ConfigUI extends WindowUI {

    constructor(protected events: EventService, protected tray: Tray) {

        super(events, tray, 'config.html');
        ipcMain.on('closeOptionsWindow', async (event: Electron.IpcMainEvent, ...args: any[]) => {
            events.emit('closeOptionsWindow', ...args);
        })

        events.on("showOptionsWindow", (position?: string) => {

            this.showWindow(position);

        })
        events.on("closeOptionsWindow", () => {
            this.toggleWindow();
        })


    }

}