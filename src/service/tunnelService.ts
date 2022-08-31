import { EventEmitter } from 'events';
import { BaseService } from './baseService';
import { ConfigService } from './configService';
import { EventService } from './eventsService';
import child_process from 'child_process';
import { net } from "electron";
import { TouchSequence } from 'selenium-webdriver';

export class TunnelService extends BaseService {


    // tunnel key for api call
    protected tunnelKey = '';
    // authetication protocol and host
    protected host = '';
    protected protocol = '';
    protected port = '443';
    protected sudoOptions = {
        name: 'Ferrum Gate',
        onstdout: (data: any) => { },
        onstderr: (data: any) => { },
        child: null
    } as { name: string, onstdout: any, onstderr: any, child: any };

    // we are using for test 
    public processLastOutput = '';
    /**
     *
     */
    constructor(protected events: EventService, protected config: ConfigService) {
        super(events);

        this.events.on('openTunnel', async () => {
            try {
                await this.openTunnel();
            } catch (err: any) {
                this.logError(err.toString());
            }
        });
        this.events.on('closeTunnel', async () => {
            try {
                await this.closeTunnel();
            } catch (err: any) {

                this.logError(err.toString());
            }
        })
    }
    protected prepareRequest(request: Electron.ClientRequest, resolve: any, reject: any) {

        const buflist: Buffer[] = [];
        request.on('response', (response) => {
            if (response.statusCode == 200) {
                response.on('data', (chunk) => {
                    buflist.push(Buffer.from(chunk));
                });
                response.on('aborted', () => {
                    reject(new Error('response aborted'))
                })
                response.on('error', () => {
                    reject(new Error('response error'));
                })
                response.on('end', () => {
                    resolve(Buffer.concat(buflist));
                })
            } else
                reject(new Error(`http response status code: ${response.statusCode}`))


        });

        request.on('abort', () => {
            reject(new Error('aborted'));
        });
        request.on('error', (error) => {
            reject(error);
        });

    }

    public async getTunnelAndServiceIpList() {
        const response: Buffer = await new Promise((resolve, reject) => {

            const request = net.request({
                method: 'GET',
                protocol: this.protocol,
                hostname: this.host,
                port: this.port == '4200' ? 8080 : Number(this.port),
                path: '/api/client/tunnel/ip',
                redirect: 'follow',

            });
            request.setHeader("TunnelKey", this.tunnelKey);
            this.prepareRequest(request, resolve, reject);
            request.setHeader('Accept', "application/json");
            request.end();
        });
        return JSON.parse(response.toString()) as { assignedIp: string, serviceNetwork: string }
    }

    public async confirmTunnel() {
        const response: Buffer = await new Promise((resolve, reject) => {

            const request = net.request({
                method: 'POST',
                protocol: this.protocol,
                hostname: this.host,
                port: this.port == '4200' ? 8080 : Number(this.port),
                path: '/api/client/tunnel/confirm',
                redirect: 'follow',

            });
            request.setHeader("TunnelKey", this.tunnelKey);
            this.prepareRequest(request, resolve, reject);
            request.setHeader('Accept', "application/json");
            request.end();
        });
        return JSON.parse(response.toString()) as {};
    }
    public async iAmAlive() {
        const response: Buffer = await new Promise((resolve, reject) => {

            const request = net.request({
                method: 'GET',
                protocol: this.protocol,
                hostname: this.host,
                port: this.port == '4200' ? 8080 : Number(this.port),
                path: '/api/client/tunnel/alive',
                redirect: 'follow',

            });
            request.setHeader("TunnelKey", this.tunnelKey);
            this.prepareRequest(request, resolve, reject);
            request.setHeader('Accept', "Accept: application/json");
            request.end();
        });
        return JSON.parse(response.toString()) as {}
    }



    public async openTunnel() {

    }

    public async closeTunnel() {

    }



}