import { app, BrowserWindow, ipcMain, Tray, screen, Menu } from 'electron';
import path from 'path';
import { EventService } from '../service/eventsService';
import { TunnelService } from '../service/tunnelService';

/**
 * @summary Traybar functionality 
 */
export class TrayUI {
    protected tray: Tray;
    constructor(private events: EventService) {
        this.tray = this.createTray();
    }
    private createTray() {
        const assetsDirectory = path.join(app.getAppPath(), 'assets')
        console.log(assetsDirectory);
        const tray = new Tray(path.join(assetsDirectory, 'img', 'logo-red.png'))
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Connect', type: 'normal', icon: path.join(assetsDirectory, 'img', 'connect.png')
            },
            {
                label: 'Disconnect', type: 'normal', visible: false,
                icon: path.join(assetsDirectory, 'img', 'disconnect.png')
            },
            {
                label: 'Options', type: 'normal',
                icon: path.join(assetsDirectory, 'img', 'settings.png'), click: () => {
                    this.events.emit("showOptions");
                }
            },
            {
                label: 'Quit', type: 'normal',
                icon: path.join(assetsDirectory, 'img', 'close.png'), click: () => {
                    this.events.emit("appExit");
                }
            },

        ]);
        this.events.on('tunnelOpened', () => {
            contextMenu.items[0].visible = false;
            contextMenu.items[1].visible = true;
        })
        this.events.on('tunnelClosed', () => {
            contextMenu.items[0].visible = true;
            contextMenu.items[1].visible = false;
        })
        tray.setToolTip('Zero trust access')
        tray.setTitle('Ferrum Gate')
        tray.setContextMenu(contextMenu);

        return tray;

    }

}