import { EventEmitter } from 'events';
import { BaseHttpService, BaseService } from './baseService';
import { ConfigService } from './cross/configService';
import { EventService } from './eventsService';
import child_process from 'child_process';

import { TouchSequence } from 'selenium-webdriver';
import { ApiService } from './apiService';
import { SudoService } from './sudoService';
import { Util } from './util';
import { TunnelService } from './worker/tunnelService';
import { UnixTunnelService } from './unix/unixTunnelService';
import { Win32TunnelService } from './win32/win32TunnelService';
import path from 'path';

import net from 'net';
import { Logger } from 'selenium-webdriver/lib/logging';
import { Cmd, NetworkEx } from './worker/models';
import { clearIntervalAsync, setIntervalAsync } from 'set-interval-async';
import { app } from 'electron';


/**
 * @summary creates a session and makes it alive
 */
export class SessionService extends BaseHttpService {

    protected exchangeToken = '';
    protected tokenCheckInterval: any;
    protected tokenCheckStart = 0;
    protected isTokenChecking = false;
    protected accessToken = '';
    protected refreshToken = '';

    /////
    protected sessionInterval: any;
    protected sessionLastCheck = 0;

    pipeName = this.createPipename();
    ipcServer: net.Server | null = null;
    ipcServerCreated = false;
    ipcClient: net.Socket | null = null;
    private socketReadBuffer: Buffer = Buffer.from([]);
    constructor(protected events: EventService, protected config: ConfigService, protected api: ApiService, protected sudo: SudoService) {
        super(events);
        this.events.on('openSession', async () => {
            try {
                await this.openSession();
            } catch (err: any) {
                this.logError(err.toString());
            }
        });
        this.events.on('closeSession', async () => {
            try {
                await this.closeSession();
            } catch (err: any) {

                this.logError(err.toString());
            }
        })
        this.events.on('sudoIsReady', async () => {
            if (!this.ipcClient) {
                const url = (await config.getConf())?.host;
                await sudo.runWorker(url || 'localhost', this.pipeName);
            } else {
                this.continueToOpenSession();
            }

        })
        this.events.on('workerConnected', async () => {
            this.logInfo('worker connected');
            await this.continueToOpenSession();
        })
        this.events.on('workerDisconnected', async () => {
            this.logInfo('worker disconnected');
            this.ipcClient = null;
            await this.closeSession();
        })
        this.events.on('networkStatusRequest', async () => {
            await this.writeToWorker({ type: 'networkStatusRequest', data: {} })
        })



    }
    createPipename() {
        //return `/tmp/ferrumgate.sock`;
        //return '\\\\?\\pipe\\ferrumgate.sock';
        const platform = Util.getPlatform()
        switch (platform) {
            case 'linux':
            case 'netbsd':
            case 'freebsd':
            case 'darwin':
                return `/tmp/ferrumgate.${Math.floor(Math.random() * 100000)}.sock`;
            case 'win32':
                return path.join('\\\\?\\pipe', `ferrumgate.${Math.floor(Math.random() * 100000)}.sock`);

            default:
                throw new Error("not implemented for os:" + platform);
        }

    }
    async createIPCServer() {
        return new Promise((resolve, reject) => {
            if (this.ipcServer) {
                resolve('');
            }
            else {
                this.pipeName = this.createPipename();
                this.ipcServer = net.createServer();
                this.ipcServer.on('listening', () => {
                    this.ipcServerCreated = true;
                    resolve('');
                })
                this.ipcServer.on('close', async () => {
                    this.logInfo("ipc server closed");
                    //this.notifyError("Could not connect socket");
                    await this.closeSession();

                })
                this.ipcServer.on('error', async (err: any) => {
                    this.logError("ipc server error " + err?.message || err?.toString());
                    if (!this.ipcServerCreated) {
                        this.ipcServer?.close();
                        this.ipcServer = null;
                        reject(err);
                    }
                    this.notifyError("Could not connect");
                    await this.closeSession();

                })
                this.ipcServer.on('connection', async (socket: any) => {
                    this.logInfo("ipc server client connected");
                    if (this.ipcClient)
                        this.ipcClient.destroy();
                    this.socketReadBuffer = Buffer.from([]);
                    this.ipcClient = socket;
                    this.events.emit('workerConnected');
                    this.ipcClient?.on('close', () => {
                        this.events.emit('workerDisconnected');
                    })
                    this.ipcClient?.on('data', async (data: Buffer) => {
                        let bufs = [this.socketReadBuffer, data];
                        this.socketReadBuffer = Buffer.concat(bufs);
                        while (true) {

                            if (this.socketReadBuffer.length <= 4)
                                return;
                            let len = this.socketReadBuffer.readInt32BE(0);
                            if (this.socketReadBuffer.length < len + 4)// not enough body
                                return;
                            const msg = this.socketReadBuffer.slice(4, 4 + len).toString('utf-8');
                            this.socketReadBuffer = this.socketReadBuffer.slice(4 + len);
                            //this.logInfo(`data received on parent ${msg}`);
                            await this.executeCommand(msg);
                        }
                    })
                })
                this.ipcServer.listen(this.pipeName);
                this.logInfo("ipc server created " + this.pipeName)

            }
        })
    }
    async writeToWorker(msg: Cmd) {
        let data = Buffer.from(JSON.stringify(msg), 'utf-8');
        let tmp = Buffer.from([0, 0, 0, 0]).slice(0, 4);
        let buffers = [tmp, data];
        let enhancedData = Buffer.concat(buffers)
        let len = data.length;
        enhancedData.writeInt32BE(len);//write how many bytes
        this.ipcClient?.write(enhancedData);
    }
    async executeCommand(msg: string) {
        try {
            //this.logInfo(`executing command at parent`);
            const cmd = JSON.parse(msg) as Cmd;
            switch (cmd.type) {
                case 'logRequest':
                    await this.executeLogRequest(cmd.data);
                    break;
                case 'tokenRequest':
                    await this.executeTokenRequest();
                    break;
                case 'tunnelFailed':
                    await this.executeTunnelFailed(cmd.data);
                    break;
                case 'tunnelOpened':
                    await this.executeTunnelOpened(cmd.data);
                    break;
                case 'tunnelClosed':
                    await this.executeTunnelClosed(cmd.data);
                    break;
                case 'networkStatusReply':
                    await this.executeNetworkStatusReply(cmd.data);
                    break;
                default:
                    break;
            }

        } catch (err: any) {
            this.logError(err.message || err.toString())
        }
    }
    async executeLogRequest(data: { type: string, msg: string }) {
        if (!data || !data.type || !data.msg) return;
        //console.log(`tunnel log: ${data.msg}`);
        if (data.type == 'info')
            this.logInfo(data.msg);
        else
            if (data.type == 'error')
                this.logError(data.msg);
            else
                this.logWarn(data.msg);


    }
    async executeTokenRequest() {
        if (this.accessToken && this.refreshToken)
            await this.writeToWorker({ type: 'tokenResponse', data: { accessToken: this.accessToken, refreshToken: this.refreshToken } });


    }

    async executeTunnelFailed(data: { msg: NetworkEx | string }) {
        if (typeof (data.msg) == 'string') {
            this.notifyError(data.msg)
            this.events.emit('tunnelFailed', data.msg);
        } else {
            this.notifyError(`Connecting to network ${data.msg.name} failed: ${data.msg.tunnel.lastError || ''}`)
            this.events.emit('tunnelFailed', data.msg);
        }
    }
    async executeTunnelOpened(data: { msg: NetworkEx }) {
        this.notifyInfo(`Connected to network ${data.msg.name}`);
        this.events.emit('tunnelOpened', data.msg);
    }
    async executeTunnelClosed(data: { msg: NetworkEx }) {
        this.notifyInfo(`Disconnected from network ${data.msg.name}`);
        this.events.emit('tunnelClosed', data.msg);
    }

    async executeNetworkStatusReply(data: NetworkEx[]) {
        this.events.emit('networkStatusReply', data);
    }

    async startSession() {
        this.events.emit('sudoIsReady');
    }
    async sendToWorker(data: any) {
        if (this.ipcClient) {
            try {
                this.ipcClient.write(JSON.stringify(data));
            } catch (err: any) {
                this.logError(err.message || err.toString())
            }
        }
    }



    async openSession() {
        try {
            await this.createIPCServer();
            const token = await this.api.getExchangeToken();
            this.exchangeToken = token.token;
            await this.sudo.start();
        } catch (err: any) {
            this.logError(err.message || err.toString());
            this.notifyError(`Could not connect:${err.message}`);
        }
    }
    async continueToOpenSession() {
        try {

            if (!this.exchangeToken)
                throw new Error("no exchange token");
            this.events.emit('sessionOpening');
            const url = `${(await this.config.getConf())?.host}/login?exchange=${this.exchangeToken}`;
            this.logInfo(`open link ${url}`);
            this.events.emit('openLink', url);
            if (this.tokenCheckInterval)
                clearIntervalAsync(this.tokenCheckInterval);
            this.tokenCheckInterval = null;
            this.tokenCheckStart = new Date().getTime();
            this.tokenCheckInterval = setIntervalAsync(async () => {
                //check every 2 seconds, if session is ready
                await this.checkIfSessionIsReady();
            }, 2000);
        } catch (err: any) {
            this.logError(err.message || err.toString());
            this.notifyError(`Could not connect:${err.message}`);
        }
    }

    async checkIfSessionIsReady() {
        try {

            if (this.isTokenChecking) return;
            if (new Date().getTime() - this.tokenCheckStart > 60000) {//1 minute elapsed
                if (this.tokenCheckInterval)
                    clearIntervalAsync(this.tokenCheckInterval);
                this.tokenCheckInterval = null;
                this.logError(`Session create timeout`);
                this.notifyError(`Session create timeout`);
                this.isTokenChecking = false;
                this.events.emit('sessionClosed');
                return;
            }
            this.isTokenChecking = true;

            const result = await this.api.changeExchangeToken(this.exchangeToken);
            this.accessToken = result.accessToken;
            this.refreshToken = result.refreshToken;
            if (this.tokenCheckInterval)
                clearIntervalAsync(this.tokenCheckInterval);
            this.tokenCheckInterval = null;
            this.logInfo(`Session created`);
            this.notifyInfo(`Session created`);
            this.events.emit("sessionOpened");
            this.sessionLastCheck = new Date().getTime();
            //more secure, if client wants it,then send it
            //await this.writeToWorker({ type: 'tokenResponse', data: { accessToken: this.accessToken, refreshToken: this.refreshToken } })
            this.sessionInterval = setIntervalAsync(async () => {
                await this.getTokens();
            }, 1 * 60 * 1000);

        } catch (err: any) {

            this.logError(err.message || err.toString());
            //this.events.emit('sessionClosed');
        }
        this.isTokenChecking = false;
    }

    async getTokens() {
        try {
            this.logInfo("get tokens");
            if (new Date().getTime() - this.sessionLastCheck < 3 * 60 * 1000) {
                return;
            }
            if (new Date().getTime() - this.sessionLastCheck > 5 * 60 * 1000) {
                clearIntervalAsync(this.sessionInterval);
                this.sessionInterval = null;
                this.notifyError("Session lost");
                await this.closeSession();
                return;
            }

            this.logInfo("refresh token");
            const result = await this.api.refreshToken(this.accessToken, this.refreshToken);
            this.refreshToken = result.refreshToken;
            this.accessToken = result.accessToken;
            //await this.writeToWorker({ type: 'tokenResponse', data: { accessToken: this.accessToken, refreshToken: this.refreshToken } })
            this.sessionLastCheck = new Date().getTime();
        } catch (err: any) {
            this.logError(err.message || err.toString());
        }
    }
    async closeSession() {
        //TODO hamza delete session
        if (this.sessionInterval)
            clearIntervalAsync(this.sessionInterval);
        this.sessionInterval = null;
        if (this.tokenCheckInterval)
            clearIntervalAsync(this.tokenCheckInterval);
        this.tokenCheckInterval = null;

        if (this.ipcClient) {
            this.ipcClient.destroy();

        }
        if (this.ipcServer) {
            this.ipcServer.close();
        }
        this.ipcClient = null;
        this.ipcServer = null
        this.ipcServerCreated = false;
        this.accessToken = '';
        this.refreshToken = '';
        this.exchangeToken = '';
        this.events.emit("sessionClosed");

    }


}