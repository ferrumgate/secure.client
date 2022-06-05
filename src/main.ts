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
import { LogService } from './service/logService';
import { Util } from './service/util';
import { LoadingUI } from './ui/loadingUI';



let events: EventService;
let tunnel: TunnelService;
let tray: TrayUI;
let configUI: ConfigUI;
let config: ConfigService;
let log: LogService;
let loadingUI: LoadingUI;

const assetsDirectory = path.join(__dirname, 'assets')





// Don't show the app in the doc
app.dock?.hide()

export function init() {
    events = new EventService();
    config = new ConfigService();
    log = new LogService();


    // catch all unhandled exceptions
    unhandled.default({
        logger: (error) => {
            console.log(`unhandled error: ${error}`);
            log.write('error', error.stack || error.message || 'unknown');

        },
        showDialog: true
    })



    events.on("log", (type: string, msg: string) => {
        log.write(type, msg);
    })

    events.on("appExit", () => {
        events.emit("log", 'info', 'closing app');
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

        const version = await Util.getAppVersion();
        event.reply('replyAppVersion', version || 'unknown');

    })

    ipcMain.on('config', async (event: Electron.IpcMainEvent, ...args: any[]) => {
        event.reply('replyConfig', await config.getConfig() || {});
    })

    events.on('saveConfig', async (data: any) => {
        await config.saveConfig(data);
        new Notification({ title: 'FerrumGate', body: 'Config saved' }).show();
        events.emit('closeOptionsWindow');
        events.emit("log", 'info', 'saving config');
    })
    events.on('throwError', (msg: string) => {
        throw new Error(msg);
    })

    app.setName('Ferrum Gate');
    events.emit("log", 'info', 'starting app');



    tray = new TrayUI(events);
    tunnel = new TunnelService(events);
    configUI = new ConfigUI(events);
    loadingUI = new LoadingUI(events);
    loadingUI.showWindow();//show loading window for user interaction
    //when loading window closed, open config window if app not configured
    events.on('loadingWindowClosed', async () => {
        try {
            const conf = await config.getConfig();
            if (!conf?.host) {
                events.emit('showOptionsWindow', 'centerScreen');
            }
        } catch (err: any) {
            events.emit("log", 'err', err.toString());
        }
    })
    return { log, events };

}
//when app ready, init
app.on('ready', () => {
    init();


})

// Quit the app when the window is closed
app.on('window-all-closed', () => {
    app.quit()
})



