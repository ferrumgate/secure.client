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
    lastErrorCount = 0;
    lastMessageToParent = 0;
    checkSystemIsWorking = false;
    devicePostureLastCheck = 0;
    devicePostureParameters: DevicePostureParameter[] = [];
    checkSystemInterval: any = null;
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
                this.checkSystemInterval = setIntervalAsync(async () => {
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
                    await this.execOnShell('pkill ssh_ferrum').catch(err => this.logError(err.message || err.toString()));
                    await this.execOnShell('pkill quic_ferrum').catch(err => this.logError(err.message || err.toString()));
                    break;

                case 'win32':
                    await this.execOnShell('taskkill.exe /IM "ssh_ferrum.exe" /F').catch(err => this.logError(err.message || err.toString()));
                    await this.execOnShell('taskkill.exe /IM "quic_ferrum.exe" /F').catch(err => this.logError(err.message || err.toString())); break;
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
                });
                if (this.networks.length == 0) {
                    await this.writeToParent({ type: 'notify', data: { type: 'error', message: 'No network found, please contact with your administrator' } });
                }
                this.networksLastCheck = new Date().getTime();


            }
            //check networks
            for (const network of this.networks) {
                const process = this.getNetworkProcess(network);
                if (network.action == 'allow') {
                    if (!network.tunnel) {
                        network.tunnel = { tryCount: 0, lastTryTime: 0, isWorking: false, pingErrorCount: 0, pingTimes: [], dnsTimes: [], dnsErrorCount: 0, protocol: this.config.protocol }
                    }
                    if ((new Date().getTime() - network.tunnel.lastTryTime) < 15000) {
                        network.tunnel.isWorking = process?.isWorking || false;
                        network.tunnel.lastError = process?.lastError || '';
                        continue;
                    }

                    await this.checkTunnel(network);
                }
            }
            // check healthy over ping
            await this.checkHealthyPing();
            await this.checkHealthyDns();

            this.lastErrorOccured = 0;
            this.lastErrorCount = 0;


        } catch (err: any) {
            this.lastErrorCount++;
            console.log(err);
            this.lastErrorOccured = new Date().getTime();
            this.logError(err.message || err.toString());
            if (this.lastErrorCount % 30 == 0 || err.message.includes('Request failed with status code')) {
                await this.writeToParent({ type: 'notify', data: { type: 'error', message: err.message || err.toString() } });
            }

        } finally {


        }

    }
    async checkHealthyPing() {
        try {

            for (const network of this.networks) {

                const process = this.getNetworkProcess(network);
                if (network.tunnel?.isWorking) {
                    if (network.tunnel.pingErrorCount >= 15) {//ping failed could not resolved 15 times, 15*3->45 seconds
                        this.logError(`network cannot reach ${network.name}`);
                        await process?.closeTunnel();
                        network.tunnel.isWorking = false;
                        network.tunnel.lastError = 'Cannot reach';
                        this.event.emit('tunnelClosed', network);
                    }
                }

            }


        } catch (err: any) {
            console.log(err);
            this.lastErrorOccured = new Date().getTime();
            this.logError(err.message || err.toString())

        }
    }

    async checkHealthyDns() {
        try {
            //this.logInfo(`dns healty check`);
            const workingTunnels = this.networks.filter(x => x.action == 'allow' && x.tunnel?.isWorking);
            if (workingTunnels.length) {
                const items = workingTunnels.map(x => {
                    let median = workingTunnels.length > 1 ? 0 : 1;//dont wait on first tunnel
                    if (x.tunnel.dnsTimes.length > 5) {
                        median = x.tunnel.dnsTimes.reduce((a, b) => a + b) / x.tunnel.dnsTimes.length;
                    }
                    //this.logInfo(`${x.name} resolution median is ${median}`);
                    return {
                        net: x, median: median, makePrimary: false
                    }
                })

                let needsToChangePrimaryDns = false;
                const sortedList = items.sort((a, b) => a.median - b.median);
                //this.logInfo(`${sortedList.map(x => x.net.name + ' ' + x.median + ' ').join(',')}`)
                if (sortedList.length == 1) {
                    if (!sortedList[0].net.tunnel.isMasterResolv) {
                        sortedList[0].makePrimary = true;
                        needsToChangePrimaryDns = true
                        this.logInfo(`dns routing will change to ${sortedList[0].net.name}`);
                    }
                }
                else {
                    const master = sortedList.find(x => x.net.tunnel.isMasterResolv);
                    if (!master) {
                        sortedList[0].makePrimary = true;
                        needsToChangePrimaryDns = true;
                        this.logInfo(`dns routing will change to ${sortedList[0].net.name}`);
                    } else {
                        let diff = master.median - sortedList[0].median;
                        if (diff > sortedList[0].median * 0.3 && !sortedList[0].net.tunnel.isMasterResolv) {
                            sortedList[0].makePrimary = true;
                            this.logInfo(`dns routing will change to ${sortedList[0].net.name}, diff is ${diff}`);
                            needsToChangePrimaryDns = true;
                        }
                    }
                }
                if (needsToChangePrimaryDns) {

                    for (const item of sortedList) {
                        const process = this.getNetworkProcess(item.net);
                        await process?.makeDns(false);
                    }
                    for (const item of sortedList) {
                        if (item.makePrimary) {
                            const process = this.getNetworkProcess(item.net);
                            await process?.makeDns(true);
                            this.logInfo(`making ${item.net.name} for ${item.net.tunnel.tun} primary dns ${item.median}`);
                        }
                    }
                }

                //we need to write more log, for debug
                if (needsToChangePrimaryDns) {
                    workingTunnels.forEach(y => {
                        this.logInfo(`network ${y.name} resolution times ${y.tunnel.dnsTimes.join(', ')}`);
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
            if (this.checkSystemInterval)
                clearIntervalAsync(this.checkSystemInterval);
            this.checkSystemInterval = null;
        } catch (ignore) {

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
        this.config = data;
        this.logInfo(`conf response is ${JSON.stringify(this.config)}`)
        this.event.emit('confResponse', data);

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