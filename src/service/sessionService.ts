import { BaseHttpService } from './baseService';
import { ConfigService } from './cross/configService';
import { EventService } from './eventsService';
import { ApiService } from './apiService';
import { SudoService } from './sudoService';
import { Util } from './util';
import path from 'path';
import net from 'net';
import { Cmd, NetworkEx } from './worker/models';
import { clearIntervalAsync, setIntervalAsync } from 'set-interval-async';
import { app, safeStorage } from 'electron';


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
    protected accessTokenExpiresAt = new Date(0, 0, 0);

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
        this.events.on('closeSession', async (exit: boolean) => {
            try {
                this.logInfo("disconnecting");
                await this.closeSession();


            } catch (err: any) {

                this.logError(err.toString());
            }
            //close app if clikcked to quit
            if (exit)
                setTimeout(() => {
                    app.exit(0);
                }, 1000);
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
                case 'confRequest':
                    await this.executeConfResponse();
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
                case 'checkingDevice':
                    await this.executeCheckingDevice(cmd.data);
                    break;
                case 'notify':
                    if (cmd.data.type == 'error')
                        await this.notifyError(cmd.data.message);
                    else
                        await this.notifyInfo(cmd.data.message);
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
    async executeConfResponse() {
        const conf = await this.config.getConf();
        await this.writeToWorker({ type: 'confResponse', data: conf });


    }

    async executeTunnelFailed(data: { msg: NetworkEx | string }) {
        if (typeof (data.msg) == 'string') {
            this.notifyError(data.msg)
            this.events.emit('tunnelFailed', data.msg);
        } else {
            this.notifyError(`Connecting to network ${data.msg.name} failed: ${data.msg.tunnel.lastError || ''}`)
            this.events.emit('tunnelFailed', data.msg);
            if (data.msg.tunnel.lastError?.includes("Request failed with status code 401")) {
                await this.closeSession();
            }
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
    async executeCheckingDevice(data: NetworkEx[]) {
        this.notifyInfo(`Checking device wait`);
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
    isAccessTokenValid() {
        if (this.accessTokenExpiresAt.getTime() > new Date().getTime()) {
            this.logInfo(`token is valid`);
            return true;
        }
        this.logInfo(`token is not valid`);
        return false;
    }


    async openSession() {
        try {
            await this.createIPCServer();
            // we need to get again to check if network and our api is ready
            const test = await this.api.test();
            const token = await this.api.getExchangeToken();
            this.exchangeToken = token.token;
            await this.sudo.start();
        } catch (err: any) {
            this.logError(err.message || err.toString());
            if (err.message == 'net::ERR_CERT_AUTHORITY_INVALID')
                this.notifyError(`Could not connect: Certificate verification failed`);
            else if (err.message == 'net::ERR_CONNECTION_REFUSED')
                this.notifyError(`Could not connect: Connection refused`);
            else if (err.message == 'net::ERR_CONNECTION_TIMED_OUT')
                this.notifyError(`Could not connect: Connection timed out`);
            else
                this.notifyError(`Could not connect:${err.message}`);
        }
    }
    decrypt(data?: string) {
        if (safeStorage.isEncryptionAvailable() && data) {
            try {
                var decryptedCert = safeStorage.decryptString(Buffer.from(data, 'base64'));
                return decryptedCert;
            } catch (e) {
                console.log("decrypt", e);
                return null;
            }
        }
        return null;
    }

    encrypt(data: string) {
        if (safeStorage.isEncryptionAvailable() && data) {
            try {
                var encyrptedCert = safeStorage.encryptString(data);
                return Buffer.from(encyrptedCert).toString('base64');
            } catch (err: any) {
                this.logError(err.message || err.toString());
                return null;
            }
        }
        return null;
    }

    async authenticateWithCert() {
        var conf = await this.config.getConf();
        if (!conf?.certLogin) {
            this.logInfo("no cert login");
            return false;
        }
        if (!conf?.cert) {
            this.logError("no certificate");
            return false;
        }
        try {
            var certificate = this.decrypt(conf.cert);;
            if (!certificate) return false;
            const result = await this.api.authenticateWithCert(certificate);
            this.accessToken = result.accessToken;
            this.refreshToken = result.refreshToken;
            //for the first time, we don't want to set it
            this.accessTokenExpiresAt = new Date(new Date().getTime() + 2 * 60 * 1000);
            this.logInfo(`authenticated with certificate`);
            this.logInfo(`access token expires at ${this.accessTokenExpiresAt}`);

        } catch (err: any) {
            this.logError("authenticateWithCert:" + err.message || err.toString());
            if (err.message == 'http response status code: 401') {
                this.events.emit('certChanged', { cert: '' })
            }
            return false;
        }
        return true;

    }
    async openWebPageForLogin() {
        const url = `${(await this.config.getConf())?.host}/login?exchange=${this.exchangeToken}`;
        this.logInfo(`open link ${url}`);
        this.events.emit('openLink', url);
    }
    async downloadCertificate() {
        try {
            this.logInfo("downloading certificate");
            var retData = await this.api.downloadCertificate(this.accessToken);
            if (retData.cert?.publicCrt) {
                var encryptedCert = this.encrypt(retData.cert?.publicCrt);
                this.events.emit('certChanged', { cert: encryptedCert, apiKey: '' });
            }

        } catch (err: any) {
            this.logError("downloadCertificate:" + err.message || err.toString());
        }
    }
    async continueToOpenSession() {
        try {
            this.logInfo("continue to open session");
            if (!this.exchangeToken)
                throw new Error("no exchange token");
            if (!this.isAccessTokenValid()) {
                this.events.emit('sessionOpening');
                var authenticated = await this.authenticateWithCert();
                if (!authenticated) {
                    await this.openWebPageForLogin();
                }

            }
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
            if (new Date().getTime() - this.tokenCheckStart > 110000) {//nearly 2 minutes elapsed, sshd default config is 120 seconds
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
            if (!this.isAccessTokenValid()) {
                const result = await this.api.changeExchangeToken(this.exchangeToken);
                this.accessToken = result.accessToken;
                this.refreshToken = result.refreshToken;
                //for the first time, we don't want to set it
                this.accessTokenExpiresAt = new Date(new Date().getTime() + 2 * 60 * 1000);
                this.logInfo(`authenticated with webpage`);
                this.logInfo(`access token expires at ${this.accessTokenExpiresAt}`);
                await this.downloadCertificate();
            }

            if (this.tokenCheckInterval)
                clearIntervalAsync(this.tokenCheckInterval);
            this.tokenCheckInterval = null;
            this.logInfo(`session created`);
            this.notifyInfo(`Session created`);
            this.events.emit("sessionOpened");
            this.sessionLastCheck = new Date().getTime();
            //more secure, if client wants it,then send it
            //await this.writeToWorker({ type: 'tokenResponse', data: { accessToken: this.accessToken, refreshToken: this.refreshToken } })
            this.sessionInterval = setIntervalAsync(async () => {
                await this.getTokens();
            }, 30 * 1000);

        } catch (err: any) {

            this.logError(err.message || err.toString());
            //this.events.emit('sessionClosed');
        }
        this.isTokenChecking = false;
    }
    RefreshTokenInMs = 6 * 60 * 60 * 1000;

    async getTokens() {
        try {

            if ((this.accessTokenExpiresAt.getTime() - new Date().getTime()) > 3 * 60 * 1000) {
                return;
            }
            if (this.accessTokenExpiresAt.getTime() <= new Date().getTime()) {
                this.logError("access token expired");
                clearIntervalAsync(this.sessionInterval);
                this.sessionInterval = null;
                this.notifyError("Session lost");
                await this.closeSession();
                return;
            }

            this.logInfo("refresh token");
            const result = await this.api.refreshToken(this.accessToken, this.refreshToken, this.RefreshTokenInMs);
            this.refreshToken = result.refreshToken;
            this.accessToken = result.accessToken;
            this.accessTokenExpiresAt = new Date(result.accessTokenExpiresAt);
            this.logInfo(`access token expires at ${this.accessTokenExpiresAt}`);
            //await this.writeToWorker({ type: 'tokenResponse', data: { accessToken: this.accessToken, refreshToken: this.refreshToken } })
            this.sessionLastCheck = new Date().getTime();
        } catch (err: any) {
            this.logError(err.message || err.toString());
        }
    }

    async closeSession() {
        //TODO delete session
        this.api.clear();
        const wasThereASession = this.sessionInterval ? true : false;
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


        if (!this.isAccessTokenValid()) {
            this.exchangeToken = '';
            this.accessToken = '';
            this.refreshToken = '';
            this.accessTokenExpiresAt = new Date(0, 0, 0);
        }
        this.events.emit("sessionClosed");
        if (wasThereASession)
            this.notifyInfo("Session closed");

    }


}