import { BrowserWindow, ipcMain, nativeImage, Rectangle, screen, Tray } from "electron";
import { EventService } from "../service/eventsService";
import path from 'path';
import { WindowUI } from "./window";

/**
 * @summary status ui for connected networks
*/

export class StatusUI extends WindowUI {

    constructor(protected events: EventService, protected tray: Tray) {

        super(events, tray, 'status.html', 500);
        ipcMain.on('closeStatusWindow', async (event: Electron.IpcMainEvent, ...args: any[]) => {
            events.emit('closeStatusWindow', ...args);
        })
        events.on("showStatusWindow", (position?: string) => {

            this.showWindow(position);

        })
        events.on("closeStatusWindow", () => {
            this.toggleWindow();
        });

        events.on('networkStatus', (data: any) => {
            this.window.webContents.send('networkStatus', data);
        })
        ipcMain.on('networkStatusRequest', () => {
            this.events.emit('networkStatusRequest');
        })



    }

    override showWindow(pos?: string | undefined): void {
        super.showWindow();
        this.events.emit('networkStatusRequest');
    }
    override toggleWindow(): void {
        super.toggleWindow();
    }



}