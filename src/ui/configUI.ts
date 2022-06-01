import { BrowserWindow, screen } from "electron";
import { EventService } from "../service/eventsService";
import path from 'path';

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
        events.on("showOptionsWindow", () => {
            this.showWindow();
        })
        events.on("closeOptionsWindow", () => {
            this.toggleWindow();
        })


    }
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

    createWindow() {
        const window = new BrowserWindow({
            width: 300,
            height: 450,
            show: false,
            frame: true,
            fullscreenable: false,
            resizable: true,
            transparent: true,

            webPreferences: {
                // Prevents renderer process code from not running when window is
                // hidden
                backgroundThrottling: false,
                preload: path.join(__dirname, 'configPreload.js')
            }
        })
        window.loadURL(`file://${path.join(__dirname, 'config.html')}`)
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

    showWindow() {
        const position = this.getWindowPosition()
        this.window.setPosition(position.x, position.y, false)
        this.window.show()
        this.window.focus()
    }

    closeWindow() {
        this.window.close();
    }
}