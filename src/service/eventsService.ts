import { EventEmitter } from 'events';
import { ipcMain, ipcRenderer } from 'electron';





/**
 * @summary inherits @EventEmitter nodejs class for supporting determined event names,
 * also emits events that comes from ipcrenderer
 */
export class EventService extends EventEmitter {
    /**
     * @summary supported known events
     * @example ['tunnelOpened', 'tunnelClosed']
     */

    protected knownEvents = ['openSession', 'closeSession', 'sessionOpening', 'sessionOpened', 'sessionClosed', 'tunnelFailed', 'tunnelOpened', 'tunnelClosed', 'appExit', 'closeWindow',
        'closeTunnel', 'showOptionsWindow', 'closeOptionsWindow', 'showStatusWindow', 'closeStatusWindow',
        "openLink", "notify", "appVersion", "config", "configChanged", "saveConfig", "log", "throwError", 'release',
        'confRequest', 'confResponse', 'checkingDevice',
        'loadingWindowClosed', 'openTunnel', 'sudoIsReady', 'sudoFailed', 'workerConnected', 'workerDisconnected', 'networkStatusReply', 'networkStatusRequest', 'logFile'];
    /**
     *
     */
    constructor(headless = false) {
        super();
        // resend all render events to listeners, they willnot reply
        /*  if (!headless)
             this.knownEvents.forEach(x => {
                 ipcMain.on(x, (event: any, ...args: any[]) => {
                     super.emit(x, ...args);
                 })
 
             }) */
    }
    /**
     * 
     * @param eventName only known events
     * @param listener 
     * @returns 
     */
    override on(eventName: string, listener: (...args: any[]) => void): this {
        if (!this.knownEvents.includes(eventName))
            throw new Error(`not known event: ${eventName}`);
        return super.on(eventName, listener);
    }

    /**
     * 
     * @param eventName only know events otherwise throws error
     * @param args 
     * @returns 
     */
    override emit(eventName: string, ...args: any[]): boolean {
        if (!this.knownEvents.includes(eventName))
            throw new Error(`not known event: ${eventName}`);
        return super.emit(eventName, ...args);
    }



}