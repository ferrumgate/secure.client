import { app, BrowserWindow, ipcMain, Tray, screen, Menu, MenuItem } from 'electron';
import path from 'path';
import { EventService } from '../service/eventsService';


/**
 * @summary Traybar functionality 
 */
export class TrayUI {
    public tray: Tray;
    private latestFoundedRelease = null;
    constructor(private events: EventService) {
        this.tray = this.createTray();

    }

    private createTray() {
        const assetsDirectory = path.join(__dirname, '../', 'assets')

        const tray = new Tray(path.join(assetsDirectory, 'img', 'logo-red-16.png'))


        //some menu items
        const connect: MenuItem = {
            id: 'connect',
            label: 'Connect', type: 'normal', icon: path.join(assetsDirectory, 'img', 'connect.png'),
            click: () => { this.events.emit('openTunnel') }

        } as unknown as MenuItem;
        const connecting: MenuItem = {
            id: 'connect',
            label: 'Connecting', type: 'normal', icon: path.join(assetsDirectory, 'img', 'connect.png'),
            click: () => { }

        } as unknown as MenuItem;
        const disconnect: MenuItem = {
            id: 'disconnect',
            label: 'Disconnect', type: 'normal', visible: false,
            icon: path.join(assetsDirectory, 'img', 'disconnect.png'),
            click: () => { this.events.emit('closeTunnel') }
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
            icon: path.join(assetsDirectory, 'img', 'settings-14.png'), click: () => {
                this.events.emit("showOptionsWindow");
            }
        } as unknown as MenuItem;
        const quit = {
            label: 'Quit', type: 'normal',
            icon: path.join(assetsDirectory, 'img', 'close-14.png'), click: () => {
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


        this.events.on('tunnelOpening', () => {

            connect.visible = false;
            connecting.visible = true;
            disconnect.visible = false;
            const contextMenu = Menu.buildFromTemplate([
                connect, connecting, disconnect, options, quit, seperator, update
            ]);
            tray.setContextMenu(contextMenu);
            tray.setImage(path.join(assetsDirectory, 'img', 'logo-yellow-16.png'));

        })

        this.events.on('tunnelOpened', () => {
            connect.visible = false;
            connecting.visible = false;
            disconnect.visible = true;
            const contextMenu = Menu.buildFromTemplate([
                connect, connecting, disconnect, options, quit, seperator, update
            ]);
            tray.setContextMenu(contextMenu);
            tray.setImage(path.join(assetsDirectory, 'img', 'logo-green-16.png'));
        })
        this.events.on('tunnelClosed', () => {
            connect.visible = true;
            connecting.visible = false;
            disconnect.visible = false;
            const contextMenu = Menu.buildFromTemplate([
                connect, connecting, disconnect, options, quit, seperator, update
            ]);
            tray.setContextMenu(contextMenu);
            tray.setImage(path.join(assetsDirectory, 'img', 'logo-red-16.png'));
        })


        this.events.on('release', (release) => {
            update.visible = true;
            const contextMenu = Menu.buildFromTemplate([
                connect, connecting, disconnect, options, quit, seperator, update
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
        tray.setIgnoreDoubleClickEvents(true);


        return tray;

    }

}