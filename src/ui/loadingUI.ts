import { BrowserWindow, nativeImage, Rectangle, screen } from "electron";
import { EventService } from "../service/eventsService";
import path from 'path';

export class LoadingUI {
    window: BrowserWindow
    /**
     *
     */
    constructor(private events: EventService) {
        this.window = this.createWindow();
        setTimeout(() => {
            this.closeWindow();
        }, 6000);

    }

    private getWindowPosition() {
        const windowBounds = this.window.getBounds()

        // Center window horizontally below the tray icon
        const x = Math.round(windowBounds.x + windowBounds.width / 2 - this.width / 2)

        // Position window 4 pixels vertically below the tray icon
        const y = Math.round(windowBounds.y + windowBounds.height / 2 - this.height / 2)

        return { x: x, y: y }
    }
    width = 550 * (process.env.NODE_ENV == 'development' ? 4 : 1);
    height = 360 * (process.env.NODE_ENV == 'development' ? 4 : 1);
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
            transparent: false,
            webPreferences: {
                // Prevents renderer process code from not running when window is
                // hidden
                backgroundThrottling: false,
            }
        })
        //const overlay = nativeImage.createFromPath(path.join(__dirname, '../assets/img/logo-transparent.png'));
        //window.setOverlayIcon(overlay, 'Description for overlay')
        window.loadURL(`file://${path.join(__dirname, 'loading.html')}`)
        if (process.env.NODE_ENV == 'development')
            window.webContents.openDevTools();
        // Hide the window when it loses focus
        window.on('blur', () => {
            if (!window.webContents.isDevToolsOpened()) {
                window.close()
            }
        })
        return window;
    }



    showWindow() {
        const position = this.getWindowPosition()
        this.window.setPosition(position.x, position.y, false)
        this.window.show()
        this.window.focus()
    }

    closeWindow() {
        this.window.close();
        this.events.emit('loadingWindowClosed');
    }
}