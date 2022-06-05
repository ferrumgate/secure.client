import { app, BrowserWindow, ipcMain, Tray, screen, Menu, MenuItem } from 'electron';
import path from 'path';
import { EventService } from '../service/eventsService';


/**
 * @summary Traybar functionality 
 */
export class TrayUI {
    protected tray: Tray;
    private latestFoundedRelease = null;
    constructor(private events: EventService) {
        this.tray = this.createTray();

    }

    private createTray() {
        const assetsDirectory = path.join(__dirname, '../', 'assets')

        const tray = new Tray(path.join(assetsDirectory, 'img', 'logo-red.png'))

        //some menu items
        const connect: MenuItem = {
            id: 'connect',
            label: 'Connect', type: 'normal', icon: path.join(assetsDirectory, 'img', 'connect.png')
        } as unknown as MenuItem;
        const disconnect: MenuItem = {
            id: 'disconnect',
            label: 'Disconnect', type: 'normal', visible: false,
            icon: path.join(assetsDirectory, 'img', 'disconnect.png'),
            click: () => { }
        } as unknown as MenuItem;
        const update: MenuItem = {
            id: 'update',
            label: 'Update is ready', type: 'normal', visible: false,
            icon: path.join(assetsDirectory, 'img', 'update.png'), click: () => {
                this.events.emit("openLink", `https://github.com/ferrumgate/secure.client/releases/tag/${this.latestFoundedRelease}`);
            }
        } as unknown as MenuItem;

        const options = {
            label: 'Options', type: 'normal',
            icon: path.join(assetsDirectory, 'img', 'settings.png'), click: () => {
                this.events.emit("showOptionsWindow");
            }
        } as unknown as MenuItem;
        const quit = {
            label: 'Quit', type: 'normal',
            icon: path.join(assetsDirectory, 'img', 'close.png'), click: () => {
                this.events.emit("appExit");
            }
        } as unknown as MenuItem;

        const seperator = {
            label: '', type: 'separator',

        } as unknown as MenuItem;

        //first declare some of them, because we will change their properties in time,
        // reaching with array index is a little bit dangerous 
        const contextMenu = Menu.buildFromTemplate([
            connect, options, quit, seperator, update
        ]);




        this.events.on('tunnelOpened', () => {
            connect.visible = false;
            disconnect.visible = true;
        })
        this.events.on('tunnelClosed', () => {
            connect.visible = true;
            disconnect.visible = false;
        })


        this.events.on('release', (release) => {
            update.visible = true;
            const contextMenu = Menu.buildFromTemplate([
                connect, options, quit, seperator, update
            ]);
            tray.setContextMenu(contextMenu);
            if (this.latestFoundedRelease != release) {
                this.events.emit("notify", { type: 'info', msg: "New version is ready" })
            }
            this.latestFoundedRelease = release;
        })

        tray.setToolTip('Zero trust access')
        tray.setTitle('Ferrum Gate')
        tray.setContextMenu(contextMenu);


        return tray;

    }

}