import { app, BrowserWindow, ipcMain, Tray, screen, Menu, MenuItem, nativeImage } from 'electron';
import path from 'path';
import { Util } from '../service/util';
import { EventService } from '../service/eventsService';
import { ConfigUI } from './configUI';
import { StatusUI } from './statusUI';
import os from 'os';

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

        let logored = 'logo-red-32-2.png';
        let logogreen = 'logo-green-32-2.png';
        let logoyellow = 'logo-yellow-32-2.png';
        const platform = Util.getPlatform()
        switch (platform) {
            case 'darwin':
                logored = 'logo-red-16-2.png';
                logogreen = 'logo-green-16-2.png';
                logoyellow = 'logo-yellow-16-2.png'; break;
            default:
                break;
        }
        const assetsDirectory = path.join(__dirname, '../', 'assets')

        const tray = new Tray(path.join(assetsDirectory, 'img', logored))

        //some menu items
        const connect: MenuItem = {
            id: 'connect',
            label: 'Connect', type: 'normal', icon: path.join(assetsDirectory, 'img', 'connect.png'),
            click: () => { this.events.emit('openSession') }

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
            click: () => { this.events.emit('closeSession') }
        } as unknown as MenuItem;
        const update: MenuItem = {
            id: 'update',
            label: 'Update is ready', type: 'normal', visible: false,
            icon: path.join(assetsDirectory, 'img', 'update.png'), click: () => {
                this.events.emit("openLink", `https://github.com/ferrumgate/secure.client/releases/tag/${this.latestFoundedRelease}`);
            }
        } as unknown as MenuItem;

        const status: MenuItem = {
            id: 'status',
            label: 'Status', type: 'normal', icon: path.join(assetsDirectory, 'img', 'status.png'),
            click: () => {
                this.events.emit("showStatusWindow");
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
        tray.on('click', () => {
            const platform = os.platform();
            if (platform == 'win32')
                tray.popUpContextMenu();
        })



        this.events.on('sessionOpening', () => {

            connect.visible = false;
            connecting.visible = true;
            disconnect.visible = false;
            status.visible = false;
            const contextMenu = Menu.buildFromTemplate([
                connect, connecting, disconnect, status, options, quit, seperator, update
            ]);
            tray.setContextMenu(contextMenu);
            tray.setImage(path.join(assetsDirectory, 'img', logoyellow));

        })

        this.events.on('sessionOpened', () => {
            connect.visible = false;
            connecting.visible = false;
            disconnect.visible = true;
            status.visible = true;
            const contextMenu = Menu.buildFromTemplate([
                connect, connecting, disconnect, status, options, quit, seperator, update
            ]);
            tray.setContextMenu(contextMenu);
            tray.setImage(path.join(assetsDirectory, 'img', logogreen));
        })
        this.events.on('sessionClosed', () => {
            connect.visible = true;
            connecting.visible = false;
            disconnect.visible = false;
            status.visible = false;
            const contextMenu = Menu.buildFromTemplate([
                connect, connecting, disconnect, status, options, quit, seperator, update
            ]);
            tray.setContextMenu(contextMenu);
            tray.setImage(path.join(assetsDirectory, 'img', logored));
        })


        this.events.on('release', (release) => {
            update.visible = true;
            const contextMenu = Menu.buildFromTemplate([
                connect, connecting, disconnect, status, options, quit, seperator, update
            ]);
            tray.setContextMenu(contextMenu);

            if (this.latestFoundedRelease != release) {
                this.events.emit("notify", { type: 'info', msg: "New version is ready" })
            }
            this.latestFoundedRelease = release;
        })

        tray.setToolTip('Zero trust access')
        tray.setTitle('FerrumGate')
        tray.setContextMenu(contextMenu);
        tray.setIgnoreDoubleClickEvents(true);


        return tray;

    }

}
