import { BrowserWindow, ipcMain, ipcRenderer, nativeImage, Rectangle, screen, Tray } from "electron";
import { EventService } from "../service/eventsService";
import path from 'path';

/**
 * @summary configuration ui for settings some options like host
 */
export class WindowUI {
    window: BrowserWindow
    /**
     *
     */
    width = 300;
    height = 450;
    constructor(protected events: EventService, protected tray: Tray, protected html: string, _width?: number, _height?: number) {

        this.width = (_width || 300) * (process.env.NODE_ENV == 'development' ? 2 : 1);
        this.height = (_height || 450) * (process.env.NODE_ENV == 'development' ? 2 : 1);

        this.window = this.createWindow(html);
        events.on("closeWindow", () => {
            this.closeWindow();
        });




    }

    private getWindowPosition() {
        const windowBounds = this.window.getBounds()
        const trayBounds = { width: 10, height: 10 };// tray.getBounds()
        const clickPoint = screen.getCursorScreenPoint();
        const mainDisplay = screen.getPrimaryDisplay().bounds;
        console.log(`click point ${clickPoint}`);
        console.log(mainDisplay);
        // Center window horizontally below the tray icon
        const x = Math.round(clickPoint.x + (trayBounds.width / 2) - (windowBounds.width / 2))

        // Position window 4 pixels vertically below the tray icon
        const y = Math.round(clickPoint.y + trayBounds.height)

        return { x: x, y: y }
    }
    private getScreenWindowPosition() {
        const screenBounds = screen.getPrimaryDisplay().size;

        // Center window horizontally below the tray icon
        const x = Math.round(screenBounds.width / 2 - this.width / 2)

        // Position window 4 pixels vertically below the tray icon
        const y = Math.round(screenBounds.height / 2 - this.height / 2)

        return { x: x, y: y }
    }
    DEFAULT_MARGIN = { x: 50, y: 50 };
    private calculateWindowPosition(width: number, height: number) {
        const screenBounds = screen.getPrimaryDisplay().size;
        const trayBounds = this.tray.getBounds();

        //where is the icon on the screen?
        let trayPos = 4; // 1:top-left 2:top-right 3:bottom-left 4.bottom-right
        trayPos = trayBounds.y > screenBounds.height / 2 ? trayPos : trayPos / 2;
        trayPos = trayBounds.x > screenBounds.width / 2 ? trayPos : trayPos - 1;


        let x, y;
        //calculate the new window position
        switch (trayPos) {
            case 1: // for TOP - LEFT
                x = Math.floor(trayBounds.x + this.DEFAULT_MARGIN.x + trayBounds.width / 2);
                y = Math.floor(trayBounds.y + this.DEFAULT_MARGIN.y + trayBounds.height / 2);
                break;

            case 2: // for TOP - RIGHT
                x = Math.floor(
                    trayBounds.x - width - this.DEFAULT_MARGIN.x + trayBounds.width / 2
                );
                y = Math.floor(trayBounds.y + this.DEFAULT_MARGIN.y + trayBounds.height / 2);
                break;

            case 3: // for BOTTOM - LEFT
                x = Math.floor(trayBounds.x + this.DEFAULT_MARGIN.x + trayBounds.width / 2);
                y = Math.floor(
                    trayBounds.y - height - this.DEFAULT_MARGIN.y + trayBounds.height / 2
                );
                break;

            case 4: // for BOTTOM - RIGHT
                x = Math.floor(
                    trayBounds.x - width - this.DEFAULT_MARGIN.x + trayBounds.width / 2
                );
                y = Math.floor(
                    trayBounds.y - height - this.DEFAULT_MARGIN.y + trayBounds.height / 2
                );
                break;
        }

        return { x: x, y: y };
    }


    createWindow(html: string) {
        const window = new BrowserWindow({
            title: 'FerrumGate',
            width: this.width,
            height: this.height,
            icon: path.join(__dirname, '../assets/img/logo-transparent2.png'),
            show: process.env.NODE_ENV == 'development',
            frame: false,//process.env.NODE_ENV == 'development',
            fullscreenable: false,
            resizable: process.env.NODE_ENV == 'development',
            transparent: true,

            webPreferences: {
                // Prevents renderer process code from not running when window is
                // hidden
                backgroundThrottling: false,
                preload: path.join(__dirname, 'windowPreload.js'),
            }
        })
        //const overlay = nativeImage.createFromPath(path.join(__dirname, '../assets/img/logo-transparent.png'));
        //window.setOverlayIcon(overlay, 'Description for overlay')
        window.loadURL(`file://${path.join(__dirname, html)}`)
        if (process.env.NODE_ENV == 'development')
            window.webContents.openDevTools();
        // Hide the window when it loses focus
        window.on('blur', () => {
            if (!window.webContents.isDevToolsOpened()) {
                window.hide()
            }

        })
        return window;
    }

    toggleWindow() {
        if (this.window.isVisible()) {
            this.window.hide()
        } else {
            this.showWindow()
        }
    }

    showWindow(pos?: string) {
        //const position = pos ? this.getScreenWindowPosition() : this.getScreenWindowPosition();
        //this.window.setPosition(position.x, position.y, false)
        const position = this.calculateWindowPosition(this.width, this.height);
        if (position.x && position.y && position.x != this.DEFAULT_MARGIN.x && position.y != this.DEFAULT_MARGIN.y)
            this.window.setPosition(position.x, position.y, false);
        else {
            const position = pos ? this.getScreenWindowPosition() : this.getScreenWindowPosition();
            this.window.setPosition(position.x, position.y, false);
        }
        this.window.show()
        this.window.focus()
    }


    closeWindow() {
        this.window.close();
        this.events.off('closeWindow', this.closeWindow);
    }
}