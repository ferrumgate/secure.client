import { app, BrowserWindow, ipcMain, Tray, screen, Menu, shell, Notification, ipcRenderer } from 'electron';

import path from 'path';
import { EventService } from './service/eventsService';
import { TrayUI } from './ui/trayUI';
import { ConfigUI } from './ui/configUI';
import fs from 'fs';
import fspromise from 'fs/promises';
import { Config, ConfigService } from './service/configService';
import * as unhandled from 'electron-unhandled';
import { LogService } from './service/logService';
import { Util } from './service/util';
import { LoadingUI } from './ui/loadingUI';
import { ApiService } from './service/apiService';
import { SessionService } from './service/sessionService';
import { SudoService } from './service/sudoService';
import { WindowUI } from './ui/window';
import { StatusUI } from './ui/statusUI';




let events: EventService;
let tray: TrayUI;


let config: ConfigService;
let log: LogService;
let api: ApiService;
let session: SessionService;
let sudo: SudoService;
let loadingUI: LoadingUI;
let configUI: ConfigUI;
let statusUI: StatusUI;

const assetsDirectory = path.join(__dirname, 'assets')

// Don't show the app in the doc
app.dock?.hide()

export async function init() {
    events = new EventService();
    config = new ConfigService();
    log = new LogService();

    const conf = await config.getConf();
    api = new ApiService(conf?.host || 'http://localhost', events);
    sudo = new SudoService(events);
    /*  const platform = Util.getPlatform()
     switch (platform) {
         case 'linux':
         case 'netbsd':
         case 'freebsd':
             session = new SessionService(events, config, api, sudo); break;
         case 'win32':
             throw new Error('not implemented')
             break;
         default:
             throw new Error('not implemented');
             break;
 
     } */
    session = new SessionService(events, config, api, sudo);

    // catch all unhandled exceptions
    unhandled.default({
        logger: (error) => {
            console.log(`unhandled error: ${error}`);
            log.write('error', error.stack || error.message || 'unknown');

        },
        showDialog: true
    })


    //write all logs 
    events.on("log", (type: string, msg: string) => {
        log.write(type, msg);
    })
    events.on("logFile", () => {

    })

    events.on("appExit", () => {
        events.emit("log", 'info', 'closing app');
        events.emit("closeSession");
        events.emit("closeWindow");
        app.exit(0);

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
        event.reply('configReply', await config.getConfig() || {});
    })
    ipcMain.on('logFile', async (event: Electron.IpcMainEvent, ...args: any[]) => {
        event.reply('logFileReply', await log.logfile || '');
    })
    ipcMain.on('saveConfig', async (event: Electron.IpcMainEvent, ...args: any[]) => {
        events.emit('saveConfig', ...args);
    })


    events.on('saveConfig', async (data: Config) => {
        await config.saveConfig(data);
        new Notification({ title: 'FerrumGate', body: 'Config saved' }).show();
        events.emit('closeOptionsWindow');
        events.emit("log", 'info', 'saving config');
        api.setUrl(data.host || 'http://localhost')
        events.emit('configChanged', data);
    })
    events.on('throwError', (msg: string) => {
        throw new Error(msg);
    })

    app.setName('FerrumGate');
    events.emit("log", 'info', 'starting app');



    tray = new TrayUI(events);
    configUI = new ConfigUI(events, tray.tray);
    statusUI = new StatusUI(events, tray.tray);

    const testConfig = app.commandLine.hasSwitch("config");
    const testStatus = app.commandLine.hasSwitch('status');
    if (testConfig || testStatus) {
        //test 
        if (testConfig)
            configUI.showWindow();
        if (testStatus)
            statusUI.showWindow();
    } else {
        //production
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
    }
    return { log, events };

}


//when app ready, init
app.on('ready', async () => {
    // const gotTheLock = app.requestSingleInstanceLock()

    // if (!gotTheLock) {
    //     app.quit()
    // } else
    await init();


})

// Quit the app when the window is closed
app.on('window-all-closed', () => {
    if (Util.getPlatform() !== 'darwin') {
        app.quit();
    }

})



