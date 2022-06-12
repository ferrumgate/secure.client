import { BrowserWindow, nativeImage, Rectangle, screen } from "electron";
import { EventService } from "../service/eventsService";
import path from 'path';

/**
 * @summary configuration ui for settings some options like host
 */
export class ConfigUI {
    window: BrowserWindow
    /**
     *
     */
    constructor(private events: EventService) {
        this.window = this.createWindow();
        events.on("closeWindow", () => {
            this.closeWindow();
        })
        events.on("showOptionsWindow", (position?: string) => {

            this.showWindow(position);

        })
        events.on("closeOptionsWindow", () => {
            this.toggleWindow();
        })


    }
    /*     private getWindowPosition() {
            const windowBounds = this.window.getBounds()
            const trayBounds = { width: 10, height: 10 };// tray.getBounds()
            const clickPoint = screen.getCursorScreenPoint();
            // Center window horizontally below the tray icon
            const x = Math.round(clickPoint.x + (trayBounds.width / 2) - (windowBounds.width / 2))
    
            // Position window 4 pixels vertically below the tray icon
            const y = Math.round(clickPoint.y + trayBounds.height)
    
            return { x: x, y: y }
        } */
    private getWindowPosition() {
        const windowBounds = this.window.getBounds()
        const trayBounds = { width: 10, height: 10 };// tray.getBounds()
        const clickPoint = screen.getCursorScreenPoint();

        // Center window horizontally below the tray icon
        const x = Math.round(clickPoint.x + (trayBounds.width / 2) - (windowBounds.width / 2))

        // Position window 4 pixels vertically below the tray icon
        const y = Math.round(clickPoint.y + trayBounds.height)

        return { x: x, y: y }
    }
    private getScreenWindowPosition() {
        const windowBounds = this.window.getBounds()

        // Center window horizontally below the tray icon
        const x = Math.round(windowBounds.x + windowBounds.width / 2 - this.width / 2)

        // Position window 4 pixels vertically below the tray icon
        const y = Math.round(windowBounds.y + windowBounds.height / 2 - this.height / 2)

        return { x: x, y: y }
    }
    width = 300 * (process.env.NODE_ENV == 'development' ? 4 : 1);
    height = 450 * (process.env.NODE_ENV == 'development' ? 4 : 1);
    createWindow() {
        const window = new BrowserWindow({
            title: 'Ferrum Gate',
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
                preload: path.join(__dirname, 'configPreload.js'),
            }
        })
        //const overlay = nativeImage.createFromPath(path.join(__dirname, '../assets/img/logo-transparent.png'));
        //window.setOverlayIcon(overlay, 'Description for overlay')
        window.loadURL(`file://${path.join(__dirname, 'config.html')}`)
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
        const position = pos ? this.getScreenWindowPosition() : this.getWindowPosition()
        this.window.setPosition(position.x, position.y, false)
        this.window.show()
        this.window.focus()
    }

    closeWindow() {
        this.window.close();
    }
}