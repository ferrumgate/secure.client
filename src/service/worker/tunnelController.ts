import { EventService } from "../eventsService";
import net from 'net';
import { Cmd, DevicePostureParameter, NetworkEx } from "./models";
import { setIntervalAsync, clearIntervalAsync } from 'set-interval-async';
import { UnixTunnelService } from "../unix/unixTunnelService";
import child_process from 'child_process';
import { TunnelApiService } from "./tunnelApiService";
import { PipeClient } from "../cross/pipeClient";
import os from 'os';
import { Win32TunnelService } from "../win32/win32TunnelService";
import fs from 'fs';
import { DarwinTunnelService } from "../darwin/darwinTunnelService";
import { TunnelService } from "./tunnelService";
import { Config } from "../cross/configService";
import { DeviceService } from "./deviceService";

/**
 * @summary tunnel controller, watch every tunnal
 * @remark this is part of nodejs process, works on root worker process
 */
export class TunnelController {


    ipcClient: PipeClient | null = null;
    //private socketReadBuffer: Buffer = Buffer.from([]);
    accessToken: string = '';
    refreshToken: string = '';
    config: Config | null = null;

    networks: NetworkEx[] = [];
    processList: TunnelService[] = [];
    networksLastCheck = 0;
    lastErrorOccured = 0;
    lastMessageToParent = 0;
    checkSystemIsWorking = false;
    devicePostureLastCheck = 0;
    devicePostureParameters: DevicePostureParameter[] = [];


    constructor(protected pipename: string, protected event: EventService, protected api: TunnelApiService) {
        function replacer(this: any, key: string, value: any) {
            if (key == "process") return undefined;
            else return value;
        }
        event.on('log', async (type: string, msg: string) => {

            try {
                await this.writeToParent({ type: 'logRequest', data: { type: type, msg: msg } })
            } catch (ignore) { }
        })
        event.on('tunnelFailed', async (data: NetworkEx) => {
            try {


                await this.writeToParent({ type: 'tunnelFailed', data: { msg: data } })
            } catch (ignore) { }
        })

        event.on('tunnelOpened', async (data: NetworkEx) => {
            try {

                await this.writeToParent({ type: 'tunnelOpened', data: { msg: data } })
            } catch (ignore: any) {
                await this.writeToParent({ type: 'logRequest', data: { type: 'info', msg: ignore.stack } })
            }
        })
        event.on('tunnelClosed', async (data: NetworkEx) => {
            try {
                //                const cloned = JSON.parse(JSON.stringify(data, replacer));
                await this.writeToParent({ type: 'tunnelClosed', data: { msg: data } })
            } catch (ignore) { }
        })
        event.on('checkingDevice', async (data: NetworkEx) => {
            try {
                //                const cloned = JSON.parse(JSON.stringify(data, replacer));
                await this.writeToParent({ type: 'checkingDevice', data: { msg: data } })
            } catch (ignore) { }
        })
    }
    async start() {
        if (!this.ipcClient) {
            this.ipcClient = new PipeClient(this.pipename);
            this.ipcClient.onConnect = async () => {
                await this.closeAllTunnels();
                await this.getConf();
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
            for (const prc of this.processList) {
                await prc.closeTunnel();
            }
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
    getNetworkProcess(net: NetworkEx) {
        return this.processList.find(x => x.networkId == net.id);
    }
    async getConf() {
        try {
            await this.writeToParent({ type: 'confRequest', data: {} })
        } catch (err: any) {
            console.log(err);

            this.logError(err.message || err.toString())
        }
    }
    async checkSystem() {

        try {

            if (this.lastErrorOccured && (new Date().getTime() - this.lastErrorOccured) < 15000)
                return;
            if (!this.accessToken || !this.config) {
                if (!this.accessToken)
                    await this.writeToParent({ type: 'tokenRequest', data: {} })
                if (!this.config)
                    await this.writeToParent({ type: 'confRequest', data: {} })
                return;
            }
            if (!this.config) {
                await this.writeToParent({ type: 'confRequest', data: {} })
                return;
            }
            if (!this.devicePostureLastCheck) {
                this.logInfo('getting device posture');
                await this.writeToParent({ type: 'checkingDevice', data: {} })
                const data = await this.api.getDevicePostureParameters(this.accessToken);
                this.logInfo(`device posture:${JSON.stringify(data)}`);
                this.devicePostureParameters = data.items;
                await this.processDevicePosture();
                this.devicePostureLastCheck = new Date().getTime();
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


            }
            //check networks
            for (const network of this.networks) {
                const process = this.getNetworkProcess(network);
                if (network.action == 'allow') {
                    if (!network.tunnel) {
                        network.tunnel = { tryCount: 0, lastTryTime: 0, isWorking: false, resolvErrorCount: 0, resolvTimes: [] }
                    }
                    if ((new Date().getTime() - network.tunnel.lastTryTime) < 15000) {
                        network.tunnel.isWorking = process?.isWorking || false;
                        network.tunnel.lastError = process?.lastError || '';
                        continue;
                    }
                    await this.checkTunnel(network);
                }
            }
            // check healthy and dns routing
            await this.checkHealthyDns();
            this.lastErrorOccured = 0;



        } catch (err: any) {
            console.log(err);
            this.lastErrorOccured = new Date().getTime();
            this.logError(err.message || err.toString())

        }

    }
    async checkHealthyDns() {
        try {

            for (const network of this.networks) {

                const process = this.getNetworkProcess(network);
                if (network.tunnel?.isWorking) {
                    if (network.tunnel.resolvErrorCount > 3) {//ping failed could not resolved 3 times
                        this.logError(`network cannot reach ${network.name}`);
                        await process?.closeTunnel();
                        network.tunnel.isWorking = false;
                        network.tunnel.lastError = 'Cannot reach';
                        this.event.emit('tunnelClosed', network);
                    }
                }

            }
            const workingTunnels = this.networks.filter(x => x.action == 'allow' && x.tunnel?.isWorking);
            if (workingTunnels.length) {
                const items = workingTunnels.map(x => {
                    let median = workingTunnels.length > 1 ? 0 : 1;//dont wait on first tunnel
                    if (x.tunnel.resolvTimes.length > 5) {
                        median = x.tunnel.resolvTimes.reduce((a, b) => a + b) / x.tunnel.resolvTimes.length;
                    }
                    //this.logInfo(`${x.name} resolution median is ${median}`);
                    return {
                        net: x, median: median
                    }
                })
                const sortedList = items.sort((a, b) => a.median - b.median);
                let isMadedPrimaryDns = false;
                let isChangedSomething = false;
                for (const item of sortedList) {
                    const process = this.getNetworkProcess(item.net);
                    if (!item.median || isMadedPrimaryDns) {
                        if (item.net.tunnel.isMasterResolv) {
                            this.logInfo(`making ${item.net.name} for ${item.net.tunnel.tun} secondary dns`);
                            isChangedSomething = true;
                        }
                        await process?.makeDns(false);
                    } else {
                        if (!item.net.tunnel.isMasterResolv) {
                            this.logInfo(`making ${item.net.name} for ${item.net.tunnel.tun} primary dns ${item.median}`);
                            isChangedSomething = true;
                        }
                        await process?.makeDns(true);
                        isMadedPrimaryDns = true;
                    }

                }

                //we need to write more log, for debug
                if (isChangedSomething) {
                    workingTunnels.forEach(y => {
                        this.logInfo(`network ${y.name} resolution times ${y.tunnel.resolvTimes.join(', ')}`);
                    })
                    sortedList.forEach(x => {
                        this.logInfo(`network ${x.net.name} resolution median is ${x.median}`);
                    })
                }
            }




        } catch (err: any) {
            console.log(err);
            this.lastErrorOccured = new Date().getTime();
            this.logError(err.message || err.toString())

        }
    }
    async checkTunnel(network: NetworkEx): Promise<{} | undefined> {

        try {
            let process = this.getNetworkProcess(network);
            if (!process) {
                const platform = os.platform();
                switch (platform) {
                    case 'linux':
                    case 'freebsd':
                    case 'netbsd':
                        process = new UnixTunnelService(network, this.accessToken, this.event, this.api);
                        this.processList.push(process);
                        break;
                    case 'win32':
                        process = new Win32TunnelService(network, this.accessToken, this.event, this.api);
                        this.processList.push(process);
                        break;
                    case 'darwin':
                        process = new DarwinTunnelService(network, this.accessToken, this.event, this.api);
                        this.processList.push(process);
                        break;
                    default:
                        throw new Error('not implemented for os:' + platform);
                }

            }
            if (!process?.isWorking) {
                this.logError(`no tunnel created for ${network.name} starting new one`);
                await process.openTunnel();

            }

            network.tunnel.isWorking = process.isWorking;
            network.tunnel.lastError = process.lastError;
            return undefined;
        } catch (err: any) {

            network.tunnel.tryCount++;
            network.tunnel.lastError = err.message || err.toString();


        } finally {
            network.tunnel.lastTryTime = new Date().getTime();

        }
    }

    async processDevicePosture() {
        //dont use try catch
        this.logInfo(`getting device posture with ${JSON.stringify(this.devicePostureParameters)}`)
        this.logInfo(`config is ${JSON.stringify(this.config)}`)
        const dservice = new DeviceService(this.event);
        const item = await dservice.getDevice(this.config?.id || '', this.devicePostureParameters);
        this.logInfo(`device posture is ${JSON.stringify(item)}`);
        await this.api.saveDevicePosture(this.accessToken, item);

    }

    async syncNetworkStatus() {
        try {
            //if ((new Date().getTime() - this.lastMessageToParent) < 30000) return;
            this.logInfo("sync network status " + new Date().toISOString());
            this.lastMessageToParent = new Date().getTime();


            this.logInfo(`sync network status ${JSON.stringify(this.networks)}`);
            await this.writeToParent({ type: 'networkStatusReply', data: this.networks })

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
        await this.closeAllTunnels();
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
                case 'confResponse':
                    await this.executeConfResponse(cmd.data);
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
    async executeConfResponse(data: Config) {
        this.logInfo(`conf response is ${JSON.stringify(this.config)}`)
        this.config = data;

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