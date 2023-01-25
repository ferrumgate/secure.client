import { EventService } from "../eventsService";
import net from 'net';
import { Cmd, Network } from "./models";
import { setIntervalAsync, clearIntervalAsync } from 'set-interval-async';
import { UnixTunnelService } from "../unix/unixTunnelService";
import child_process from 'child_process';
import { TunnelApiService } from "./tunnelApiService";
import { PipeClient } from "../cross/pipeClient";
import os from 'os';
import { Win32TunnelService } from "../win32/win32TunnelService";
import fs from 'fs';
import { DarwinTunnelService } from "../darwin/darwinTunnelService";

/**
 * @summary tunnel controller, watch every tunnal
 * @remark this is part of nodejs process, works on root worker process
 */
export class TunnelController {


    ipcClient: PipeClient | null = null;
    //private socketReadBuffer: Buffer = Buffer.from([]);
    accessToken: string = '';
    refreshToken: string = '';

    networks: Network[] = [];
    networksLastCheck = 0;
    lastErrorOccured = 0;
    lastMessageToParent = 0;
    checkSystemIsWorking = false;


    constructor(protected pipename: string, protected event: EventService, protected api: TunnelApiService) {
        event.on('log', async (type: string, msg: string) => {

            try {
                await this.writeToParent({ type: 'logRequest', data: { type: type, msg: msg } })
            } catch (ignore) { }
        })
        event.on('tunnelFailed', async (data: string) => {
            try {
                await this.writeToParent({ type: 'tunnelFailed', data: { msg: data } })
            } catch (ignore) { }
        })

        event.on('tunnelOpened', async (data: string) => {
            try {
                await this.writeToParent({ type: 'tunnelOpened', data: { msg: data } })
            } catch (ignore) { }
        })
        event.on('tunnelClosed', async (data: string) => {
            try {
                await this.writeToParent({ type: 'tunnelClosed', data: { msg: data } })
            } catch (ignore) { }
        })
    }
    async start() {
        if (!this.ipcClient) {
            this.ipcClient = new PipeClient(this.pipename);
            this.ipcClient.onConnect = async () => {
                await this.closeAllTunnels();

                setIntervalAsync(async () => {
                    await this.checkSystem();
                }, 2000);
            };
            this.ipcClient.onClose = async () => {
                this.logInfo("ipc client closed");
                this.ipcClient = null;
                await this.stop();

            }
            this.ipcClient.onError = async (err: any) => {
                this.logError("ipc server error " + err?.message || err?.toString())
                await this.stop();
            }
            this.ipcClient.onData = async (data: Buffer) => {

                await this.executeCommand(data.toString('utf-8'));


            }
            this.ipcClient.connect();
        }
    }
    async execOnShell(cmd: string, isStdErr = true) {
        return new Promise((resolve, reject) => {
            child_process.exec(cmd, (error, stdout, stderr) => {
                if (error)
                    reject(error);
                else
                    if (stderr && isStdErr)
                        reject(stderr);
                    else
                        if (stdout)
                            resolve(stdout);
                        else
                            resolve('');

            })
        })
    }
    async closeAllTunnels() {
        try {
            const platform = os.platform();
            switch (platform) {
                case 'linux':
                case 'freebsd':
                case 'netbsd':
                case 'darwin':
                    await this.execOnShell('pkill ssh_ferrum'); break;

                case 'win32':
                    await this.execOnShell('taskkill.exe /IM "ssh_ferrum.exe" /F'); break;
                default:
                    throw new Error('not implemented for os:' + platform);
            }
        } catch (err: any) {
            this.logError(err.message || err.toString())
        }
    }
    async checkSystem() {

        try {

            if (this.lastErrorOccured && (new Date().getTime() - this.lastErrorOccured) < 15000)
                return;
            if (!this.accessToken) {
                await this.writeToParent({ type: 'tokenRequest', data: {} })
                return;
            }
            if (!this.networksLastCheck) {
                this.logInfo('getting networks');
                const data = await this.api.getNetworks(this.accessToken);
                this.logInfo(`network: ${JSON.stringify(data)}`);
                this.networks = data.items;
                this.networks.sort((a, b) => {
                    return a.name.localeCompare(b.name);
                })
                this.networksLastCheck = new Date().getTime();
                this.logInfo(`getting networks result: ${JSON.stringify(data)}`);

            }
            //check networks
            for (const network of this.networks) {
                if (network.action == 'allow') {
                    if (!network.tunnel) {
                        network.tunnel = { tryCount: 0, lastTryTime: 0, isWorking: false }
                    }
                    if ((new Date().getTime() - network.tunnel.lastTryTime) < 15000) {
                        network.tunnel.isWorking = network.tunnel.process?.isWorking || false;
                        network.tunnel.lastError = network.tunnel.process?.lastError || '';
                        continue;
                    }
                    await this.checkTunnel(network);
                }
            }
            this.lastErrorOccured = 0;



        } catch (err: any) {
            console.log(err);
            this.lastErrorOccured = new Date().getTime();
            this.logError(err.message || err.toString())
        }

    }
    async checkTunnel(network: Network): Promise<{} | undefined> {

        try {

            if (!network.tunnel.process) {
                const platform = os.platform();
                switch (platform) {
                    case 'linux':
                    case 'freebsd':
                    case 'netbsd':
                        network.tunnel.process = new UnixTunnelService(network, this.accessToken, this.event, this.api); break;
                    case 'win32':
                        network.tunnel.process = new Win32TunnelService(network, this.accessToken, this.event, this.api); break;
                    case 'darwin':
                        this.logError('darwin tunnel service');
                        network.tunnel.process = new DarwinTunnelService(network, this.accessToken, this.event, this.api); break;
                    default:
                        throw new Error('not implemented for os:' + platform);
                }

            }
            if (!network.tunnel.process.isWorking) {
                this.logError(`no tunnel created for ${network.name} starting new one`);
                await network.tunnel.process.openTunnel();

            }
            network.tunnel.isWorking = network.tunnel.process.isWorking;
            network.tunnel.lastError = network.tunnel.process.lastError;
            return undefined;
        } catch (err: any) {

            network.tunnel.tryCount++;
            network.tunnel.lastError = err.message || err.toString();


        } finally {
            network.tunnel.lastTryTime = new Date().getTime();

        }
    }

    async syncNetworkStatus() {
        try {
            //if ((new Date().getTime() - this.lastMessageToParent) < 30000) return;
            this.logInfo("sync network status " + new Date().toISOString());
            this.lastMessageToParent = new Date().getTime();
            function replacer(this: any, key: string, value: any) {
                if (key == "process") return undefined;
                else return value;
            }
            const cloned = JSON.parse(JSON.stringify(this.networks, replacer));
            await this.writeToParent({ type: 'networkStatusReply', data: cloned })

        } catch (err: any) {
            this.logError(err.message || err.toString())
        }
    }

    async stop() {
        try {
            this.logInfo("stopping tunnel controller");
            if (this.ipcClient)
                this.ipcClient.close();
            this.ipcClient = null;

        } catch (err: any) {
            this.logError(err.message || err.toString());
        }
        try {
            process.exit(0);
        } catch (ignore) {

        }
    }


    async executeCommand(msg: string) {
        try {
            this.logInfo(`executing command at worker`);
            const cmd = JSON.parse(msg) as Cmd;
            switch (cmd.type) {
                case 'tokenResponse':
                    await this.executeTokenResponse(cmd.data);
                    break;

                case 'networkStatusRequest':
                    await this.executeNetworkInfo(cmd.data);
                    break;

                default:
                    break;
            }

        } catch (err: any) {
            this.logError(err.message || err.toString())
        }
    }
    async executeTokenResponse(data: { accessToken: string, refreshToken: string }) {

        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;
    }
    async executeNetworkInfo(data: {}) {

        await this.syncNetworkStatus()
    }

    async debug(msg: any) {
        fs.appendFileSync('/tmp/test.log', JSON.stringify(msg) + '\n');
    }

    async writeToParent(msg: Cmd) {

        this.ipcClient?.write(Buffer.from(JSON.stringify(msg), 'utf-8'));
    }


    async logError(msg: string) {
        //console.log(msg);

        await this.writeToParent({ type: 'logRequest', data: { type: 'error', msg: msg } })

    }
    async logInfo(msg: string) {
        //console.log(msg);

        await this.writeToParent({ type: 'logRequest', data: { type: 'info', msg: msg } })
    }

}