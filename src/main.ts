import { app, BrowserWindow, ipcMain, Tray, screen, Menu, shell, Notification } from 'electron';
import path from 'path';
import { TunnelService } from './service/tunnelService';
import { EventService } from './service/eventsService';
import { TrayUI } from './ui/trayUI';
import { ConfigUI } from './ui/configUI';
import fs from 'fs';
import fspromise from 'fs/promises';
import { ConfigService } from './service/configService';
import * as unhandled from 'electron-unhandled';


const assetsDirectory = path.join(__dirname, 'assets')

unhandled.default({
    logger: () => {
        console.error();
    },
    showDialog: true
})



let events: EventService;
let tunnel: TunnelService;
let tray: TrayUI;
let configUI: ConfigUI;
let config: ConfigService;

// Don't show the app in the doc
app.dock?.hide()

app.on('ready', () => {

    events = new EventService();
    config = new ConfigService();

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

    ipcMain.on('appVersion', async (event: Electron.IpcMainEvent, ...args: any[]) => {

        const packageFile = JSON.parse((await fspromise.readFile('package.json')).toString()) as any;
        event.reply('replyAppVersion', packageFile.version || 'unknown');

    })

    ipcMain.on('config', async (event: Electron.IpcMainEvent, ...args: any[]) => {
        event.reply('replyConfig', await config.getConfig() || {});
    })

    events.on('saveConfig', async (data: any) => {
        await config.saveConfig(data);
        new Notification({ title: 'FerrumGate', body: 'Config saved' }).show();
        events.emit('closeOptionsWindow');
    })

    tray = new TrayUI(events);
    tunnel = new TunnelService(events);
    configUI = new ConfigUI(events);
})

// Quit the app when the window is closed
app.on('window-all-closed', () => {
    app.quit()
})



