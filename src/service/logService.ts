import * as log from 'electron-log';
import path from 'path';
import fs from 'fs';

/**
 * @summary logger service
 */
export class LogService {
    protected _filename: string = '';
    public get logfile() {
        return this._filename;
    }
    /**
     *
     */
    constructor() {
        //init log options
        log.transports.file.sync = true;
        log.transports.file.resolvePath = (variables) => {
            const logfilename = path.join(variables.appData, 'ferrumgate', 'logs', 'ferrumgate.log');
            this._filename = logfilename;
            return logfilename;
        }
    }
    write(type: string, msg: string) {
        //console.log(`${type} ${msg}`);
        if (!msg) return;
        switch (type) {
            case 'info':
                log.info(msg); break;
            case 'error':
                log.error(msg); break;
            case 'warn':
                log.warn(msg); break;
            case 'fatal':
                log.error(msg); break;
            default:
                log.info(msg); break;

        }
    }
    clear() {
        if (this._filename && fs.existsSync(this._filename))
            fs.truncateSync(this._filename);
    }

}