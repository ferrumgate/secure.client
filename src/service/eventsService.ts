import { EventEmitter } from 'events';
import { ipcMain } from 'electron';
/**
 * @summary inherits @EventEmitter nodejs class for supporting determined event names;
 */
export class EventService extends EventEmitter {
    /**
     * @summary supported known events
     * @example ['tunnelOpened', 'tunnelClosed']
     */

    protected knownEvents = ['tunnelOpened', 'tunnelClosed', 'appExit', 'closeWindow', 'closeTunnel', 'showOptionsWindow', 'closeOptionsWindow'];
    /**
     *
     */
    constructor() {
        super();
        // resend all render events to listeners
        this.knownEvents.forEach(x => {
            ipcMain.on(x, (...args: any[]) => {
                this.emit(x, ...args);
            })
        })
    }
    /**
     * 
     * @param eventName only known events
     * @param listener 
     * @returns 
     */
    override on(eventName: string, listener: (...args: any[]) => void): this {
        if (!this.knownEvents.includes(eventName))
            throw new Error('not known event');
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
            throw new Error('not known event');
        return super.emit(eventName, ...args);
    }

}