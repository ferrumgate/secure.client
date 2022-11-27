import { BrowserWindow, ipcMain, nativeImage, Rectangle, screen, Tray } from "electron";
import { EventService } from "../service/eventsService";
import path from 'path';
import { WindowUI } from "./window";
import { setIntervalAsync } from "set-interval-async";

/**
 * @summary status ui for connected networks
*/

export class StatusUI extends WindowUI {
    interval: any;
    constructor(protected events: EventService, protected tray: Tray) {

        super(events, tray, 'status.html', 500);
        ipcMain.on('closeStatusWindow', async (event: Electron.IpcMainEvent, ...args: any[]) => {
            events.emit('closeStatusWindow', ...args);
        })
        events.on("showStatusWindow", (position?: string) => {

            this.showWindow(position);

        })
        events.on("closeStatusWindow", () => {
            this.hideWindow();
        });

        events.on('networkStatusReply', (data: any) => {
            this.window.webContents.send('networkStatusReply', data);
        })
        ipcMain.on('networkStatusRequest', () => {
            this.events.emit('networkStatusRequest');
        })



    }

    override showWindow(pos?: string | undefined): void {
        super.showWindow();
        if (this.interval)
            clearInterval(this.interval)
        this.interval = setInterval(() => {
            this.events.emit('networkStatusRequest');
        }, 3000);

    }
    override hideWindow(): void {
        super.hideWindow();
        if (this.interval)
            clearInterval(this.interval);
        this.interval = null;
    }



}