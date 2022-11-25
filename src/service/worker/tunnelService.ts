import { EventEmitter } from 'events';
import { BaseService } from '../baseService';
import { ConfigService } from '../configService';
import { EventService } from '../eventsService';
import child_process from 'child_process';
import { net } from "electron";
import { TouchSequence } from 'selenium-webdriver';
import { ApiService } from '../apiService';

export class TunnelService {

    public isWorking = false;
    // tunnel key for api call
    protected tunnelKey = '';


    // we are using for test 
    public processLastOutput = '';
    public lastError = '';
    /**
     *
     */
    constructor(protected events: EventService,
        protected api: ApiService) {

    }

    logInfo(msg: string) {

        this.events.emit('log', 'info', msg);
    }
    logError(msg: string) {

        this.events.emit('log', 'error', msg);
    }
    logWarn(msg: string) {

        this.events.emit('log', 'warn', msg);
    }





    public async openTunnel() {

    }

    public async closeTunnel() {

    }



}