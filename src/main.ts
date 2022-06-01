import { app, BrowserWindow, ipcMain, Tray, screen, Menu } from 'electron';
import path from 'path';
import { TunnelService } from './service/tunnelService';
import { EventService } from './service/eventsService';
import { TrayUI } from './ui/trayUI';
import { ConfigUI } from './ui/configUI';


const assetsDirectory = path.join(__dirname, 'assets')


let events: EventService;
let tunnel: TunnelService;
let tray: TrayUI;
let configUI: ConfigUI;


// Don't show the app in the doc
app.dock?.hide()

app.on('ready', () => {
    tray = new TrayUI(events);
    configUI = new ConfigUI(events);

})

// Quit the app when the window is closed
app.on('window-all-closed', () => {
    app.quit()
})


/* ipcMain.on('show-window', () => {
    showWindow()
})
 */
