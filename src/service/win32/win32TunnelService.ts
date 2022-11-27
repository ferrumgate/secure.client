import { TunnelService } from "../worker/tunnelService";
import path from 'path';
import child_process from 'child_process';
import { EventService } from "../eventsService";
import { Logger } from "selenium-webdriver/lib/logging"
import { PipeClient } from "./pipeClient";
import { ApiService } from "../apiService";
import { Network } from "../worker/models";
import { clearIntervalAsync, setIntervalAsync } from "set-interval-async";
import { TunnelApiService } from "../worker/tunnelApiService";

/**
 * @summary windows tunnel controller
 */
export class Win32TunnelService extends TunnelService {

    isServiceWorking = false;
    sshCommand = '';
    isInitted = false;
    sshPID = '';
    isTunnelCreated = false;
    iamAliveInterval: any;
    isSSHTunnelStarting: any;
    isDisconnected = false;

    pipeMain: PipeClient | null = null;
    pipeChild: PipeClient | null = null;

    port = '2223';
    host = 'localhost';
    net: Network | null = null;

    onstderr = async (data: string) => { };
    onstdout = async (data: string) => { };
    constructor(net: Network, event: EventService, api: TunnelApiService) {
        super(event, api);
        this.net = net;
        if (net.sshHost) {
            let parts = net.sshHost.split(':');
            if (parts.length)
                this.host = parts[0];
            if (parts.length > 1)
                this.port = parts[1];
        }
    }
    /**
     * @brief connects to named pipe server that allready opened by windows service
     */
    public async connectToService() {
        if (!this.pipeMain)
            this.pipeMain = new PipeClient();
        this.isDisconnected = false;
        await this.pipeMain?.connect('ferrumgate');

    }



    public async init() {


        const sshConfigFile = 'ssh_config';
        const parameters = ['-N', '-F', `${sshConfigFile}`, "-w", "any", "-o", '"StrictHostKeyChecking no"']

        this.sshCommand = `${parameters.join(' ')} ferrum@${this.host} -p${this.port}`;
        if (this.pipeMain)
            await this.pipeMain.close();
        this.pipeMain = null;
        if (this.iamAliveInterval) {
            clearIntervalAsync(this.iamAliveInterval);
            this.iamAliveInterval = null;
        }
        /////
        this.pipeMain = new PipeClient();

        this.pipeMain.onStdout = async (data: string) => {
            try {
                this.processLastOutput = data;

                this.logInfo(`${data}`);
                if (data.startsWith("connected:")) {
                    await this.pipeMain?.write(`connect ${this.sshCommand}`);
                }
                if (data.startsWith("connect to:")) {
                    const childpipename = data.split(':')[1];
                    if (this.pipeChild)
                        await this.pipeChild.close();
                    //connect to child process pipe and redirect all output 
                    this.pipeChild = new PipeClient();
                    this.pipeChild.onStdout = async (data: string) => {
                        if (!data.startsWith('connected:') && !data.startsWith('disconnected'))
                            await this.pipeMain?.onStdout(data);
                        if (data.startsWith('disconnected:'))
                            await this.pipeMain?.close();
                    }

                    await this.pipeChild?.connect(`ferrumgate_${childpipename}`);



                }
                if (data.includes('ferrum_pid:')) {
                    const items = data.split('\n');
                    const pidItem = items.find(x => x.startsWith('ferrum_pid:'))
                    if (pidItem) {
                        this.sshPID = pidItem.replace('ferrum_pid:', '').replace('\n', '');
                    }
                }
                if (data.includes('ferrum_open:')) {
                    const items = data.split('\n');
                    const openItem = items.find(x => x.includes('ferrum_open:'))
                    if (openItem) {

                        const link = openItem.slice(openItem.indexOf('ferrum_open:') + 12).replace('\n', '').trim();
                        this.logInfo(`open link ${link}`);
                        this.events.emit('openLink', link);
                        const parts = link.split('=');
                        if (parts.length > 1) {
                            this.tunnelKey = parts[1];
                        }
                        const url = new URL(link);
                        /*  this.host = url.hostname;
                         this.protocol = url.protocol;
                         this.port = url.port; */
                    }

                }
                if (data.includes('ferrum_tunnel_opened:')) {
                    if (!this.sshPID)
                        throw new Error('ssh pid is not valid');
                    const items = data.split(':')
                    if (items.length == 2) {
                        //create tun interface name
                        const tun = items[1].replace('\n', '');
                        // get assigned ip and service network
                        const iplist = await this.api.getTunnelAndServiceIpList(this.tunnelKey);


                        this.logInfo(`configuring tunnel: ${tun} with ${JSON.stringify(iplist)}`)
                        // prepare network for connection
                        await this.pipeMain?.write(`network assignedIp:${iplist.assignedIp} serviceNetwork:${iplist.serviceNetwork}`)

                    }
                }
                if (data.includes("network ok")) {
                    await this.api.confirmTunnel(this.tunnelKey);
                    ////
                    this.events.emit("tunnelOpened", this.net?.id);
                    this.isTunnelCreated = true;
                    this.logInfo(`tunnel created and configured successfully`);
                }
                if (data.includes('ferrum_exit:') || data.includes('disconnected:') || data.includes("network failed") || data.includes('Terminated') || data.includes('No route to host') || data.includes('Connection refused')) {
                    if (!this.isDisconnected) {
                        this.sshPID = '';
                        this.isTunnelCreated = false;
                        this.events.emit('tunnelClosed', this.net?.id);
                        this.logInfo(`tunnel closed`);
                        await this.pipeMain?.close();
                        await this.pipeChild?.close();
                        this.isDisconnected = true;
                        if (this.isSSHTunnelStarting)
                            clearTimeout(this.isSSHTunnelStarting);
                        this.isSSHTunnelStarting = null;
                    }
                }
            } catch (err: any) {
                this.logError(err.message || err.toString());
                this.events.emit('tunnelFailed', `Could not connect:${err.message}`);
                await this.tryKillSSHFerrumProcess();
            }
        }

        this.iamAliveInterval = setIntervalAsync(async () => {
            await this.sendIAmAlive();
        }, 30000)
        this.isInitted = true;

    }
    ////./ssh_ferrum -c none -N -F ../etc/ssh_config -w any  -o "StrictHostKeyChecking no"  ferrum@192.168.88.243 -p3333
    public override async openTunnel(isRoot = true): Promise<void> {
        await this.init();
        await this.connectToService();

    }
    public async sendIAmAlive() {
        try {
            if (this.isTunnelCreated) {
                this.logInfo('sending I am alive');
                await this.api.iAmAlive(this.tunnelKey);
            }
        } catch (err: any) {
            this.logError(err.toString())
        }
    }

    public async startNewSSHFerrum() {
        this.logInfo(`starting new tunnel ${this.sshCommand}`);
        await this.tryKillSSHFerrumProcess();


        await this.pipeMain?.write(`connect ${this.sshCommand}`);
        if (this.isSSHTunnelStarting)
            clearTimeout(this.isSSHTunnelStarting);
        this.isSSHTunnelStarting = setTimeout(async () => {
            if (!this.isTunnelCreated) {
                this.events.emit('tunnelFailed', this.net?.id);
                await this.tryKillSSHFerrumProcess();
            }
        }, 45000);


    }


    public async tryKillSSHFerrumProcess(processname = 'ssh_ferrum') {
        this.logInfo(`killing tunnel`)
        await this.pipeMain?.write(`disconnect`);
        this.events.emit('tunnelClosed');
    }
    public override async closeTunnel(): Promise<void> {
        await this.tryKillSSHFerrumProcess();
    }





    /**
     * @summary kill all created process list
     */
    public async tryKillAllProcess() {
        try {
            this.logInfo(`killing all related process list`)

            await this.tryKillSSHFerrumProcess();


        } catch (err: any) {
            this.logError(err.message || err.toString());
        }
    }
}