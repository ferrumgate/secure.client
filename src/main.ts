import { app, BrowserWindow, ipcMain, Tray, screen, Menu, shell, Notification } from 'electron';
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
    events = new EventService();
    tray = new TrayUI(events);
    tunnel = new TunnelService(events);
    configUI = new ConfigUI(events);
    events.on("appExit", () => {
        events.emit("closeTunnel");
        events.emit("closeWindow");

    });

    events.on("openLink", (link: string) => {

        shell.openExternal(link);
    })
    events.on("notify", (data: { type: string, msg: string }) => {

        new Notification({ title: 'FerrumGate', body: data.msg }).show();
    })
})

// Quit the app when the window is closed
app.on('window-all-closed', () => {
    app.quit()
})


/* ipcMain.on('show-window', () => {
    showWindow()
})
 */
