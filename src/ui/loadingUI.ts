import { BrowserWindow, nativeImage, Rectangle, screen } from "electron";
import { EventService } from "../service/eventsService";
import path from 'path';


/**
 * @summary loading window at application start
 */
export class LoadingUI {
    window: BrowserWindow
    isClosed = false;
    /**
     *
     */
    constructor(private events: EventService) {
        this.window = this.createWindow();
        setTimeout(() => {
            this.closeWindow();
        }, 6000);

    }


    private getScreenWindowPosition() {
        if (!this.window || this.window.isDestroyed()) return null;
        const screenBounds = screen.getPrimaryDisplay().size;

        // Center window horizontally below the tray icon
        const x = Math.round(screenBounds.width / 2 - this.width / 2)

        // Position window 4 pixels vertically below the tray icon
        const y = Math.round(screenBounds.height / 2 - this.height / 2)

        return { x: x, y: y }
    }
    width = 550 * (process.env.NODE_ENV == 'development' ? 2 : 1);
    height = 460 * (process.env.NODE_ENV == 'development' ? 2 : 1);
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
            alwaysOnTop: true,
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
        /*  // Hide the window when it loses focus
         window.on('blur', () => {
             if (!window.webContents.isDevToolsOpened()) {
                 this.isClosed = true;
                 window.close()
             }
         }) */
        return window;
    }



    showWindow() {
        const position = this.getScreenWindowPosition()
        if (position && this.window && !this.window.isDestroyed()) {
            this.window.setPosition(position.x, position.y, false)
            this.window.show()
            this.window.focus()
        }
    }

    closeWindow() {
        if (this.window && !this.window.isDestroyed()) {
            this.window.close();
            this.events.emit('loadingWindowClosed');
        }
    }
}