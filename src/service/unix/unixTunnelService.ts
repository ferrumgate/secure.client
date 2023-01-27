import { TunnelService } from "../worker/tunnelService";
import path from 'path';
const sudo = require('../../lib/sudoprompt')
import child_process from 'child_process';
import { EventService } from "../eventsService";
import { clearIntervalAsync, setIntervalAsync } from "set-interval-async";
import { Network } from "../worker/models";
import { TunnelApiService } from "../worker/tunnelApiService";
const { EOL } = require('os');
/**
 * @summary unix tunnel controller, this service works on root worker process
 */
export class UnixTunnelService extends TunnelService {

    isRootShellWorking = false;
    sshCommand = '';
    sshCommands: string[] = [];
    isInitted = false;
    sshPID = '';
    isTunnelCreated = false;
    iamAliveInterval: any;
    isSSHTunnelStarting: any;
    port = '2223';
    host = 'localhost';
    net: Network | null = null;
    childProcess: child_process.ChildProcess | null = null;
    accessToken: string = '';
    onstderr = async (data: string) => { };
    onstdout = async (data: string) => { };
    newLineBufferStderr = '';
    newLineBufferStdout = '';
    constructor(net: Network, accessToken: string, event: EventService, api: TunnelApiService) {
        super(event, api);
        this.net = net;
        this.accessToken = accessToken;
        if (net.sshHost) {
            let parts = net.sshHost?.split(':');
            if (parts.length)
                this.host = parts[0];
            if (parts.length > 1)
                this.port = parts[1];
        }
    }
    public getSSHPath() {
        const sshFile = path.join(__dirname, 'ssh_ferrum');
        const sshConfigFile = path.join(__dirname, 'ssh_config');
        return { sshFile, sshConfigFile };
    }
    public prepareCommand() {

        const { sshFile, sshConfigFile } = this.getSSHPath();


        const parameters = ['-N', '-F', `"${sshConfigFile}"`, "-w", "any", "-o", '"StrictHostKeyChecking no"', "-o", '"UserKnownHostsFile /dev/null"']

        this.sshCommand = `"${sshFile}" ${parameters.join(' ')} ferrum@${this.host} -p${this.port}`;
        this.sshCommands = [];
        this.sshCommands.push(`${sshFile}`);
        this.sshCommands.push(...['-N', '-F', `${sshConfigFile}`, "-w", "any", "-o", 'StrictHostKeyChecking no', "-o", 'UserKnownHostsFile /dev/null']);
        this.sshCommands.push(`ferrum@${this.host}`);
        this.sshCommands.push(`-p${this.port}`);

    }


    public async init() {

        this.prepareCommand();

        console.log(this.sshCommand);
        if (this.isInitted) return;
        /////

        this.onstderr = async (data: string) => {
            this.processLastOutput = data.toString();
            this.logError(data.toString());

        }

        this.onstdout = async (data: string) => {
            try {
                await this.onStdOut(data);
                this.processLastOutput = data;
                //console.log(data);
                this.logInfo(`${data}`);
                if (data.includes('ferrum_pid:')) {
                    const items = data.split(EOL);
                    const pidItem = items.find(x => x.startsWith('ferrum_pid:'))
                    if (pidItem) {
                        this.sshPID = pidItem.replace('ferrum_pid:', '').replace(EOL, '');
                    }
                }
                if (data.includes('ferrum_open:')) {
                    const items = data.split(EOL);
                    const openItem = items.find(x => x.includes('ferrum_open:'))

                    if (openItem) {
                        const link = openItem.slice(openItem.indexOf('ferrum_open:') + 12).replace(EOL, '').trim();
                        const parts = link.split('=');
                        if (parts.length > 1) {
                            this.tunnelKey = parts[1];
                        }
                        if (this.tunnelKey) {
                            await this.api.createTunnel(this.accessToken, this.tunnelKey);
                        }
                    }
                }
                if (data.includes('ferrum_tunnel_opened:')) {
                    if (!this.sshPID)
                        throw new Error('ssh pid is not valid');
                    const items = data.split(':')
                    if (items.length == 2) {
                        //create tun interface name
                        const tun = items[1].replace(EOL, '');
                        // get assigned ip and service network
                        this.logInfo(`getting tunnel ip list ${tun}`);
                        const iplist = await this.api.getTunnelAndServiceIpList(this.tunnelKey);


                        await this.configureNetwork(tun, iplist);


                        //await this.executeOnRootShell(`wait ${this.sshPID} || echo "ferrum_exit:"`)
                        this.logInfo(`confirming tunnel ${tun}`);
                        await this.api.confirmTunnel(this.tunnelKey);
                        ////
                        this.events.emit("tunnelOpened", this.net?.id);

                        this.isTunnelCreated = true;
                        this.isWorking = true;
                        this.logInfo(`tunnel ${tun} created and configured successfully`);

                        if (this.isSSHTunnelStarting)
                            clearTimeout(this.isSSHTunnelStarting);
                        this.isSSHTunnelStarting = null;
                        await this.startIAmAlive();
                        this.lastError = '';

                    }
                }
                if (data.includes('ferrum_exit:') || data.includes('Terminated') || data.includes('No route to host') || data.includes('Connection refused')) {
                    this.sshPID = '';
                    this.isTunnelCreated = false;
                    this.isWorking = false;
                    this.events.emit('tunnelClosed', this.net?.id);
                    this.logInfo(`tunnel closed`);
                    if (this.isSSHTunnelStarting)
                        clearTimeout(this.isSSHTunnelStarting);
                    this.isSSHTunnelStarting = null;
                    this.lastError = data;


                }
            } catch (err: any) {
                this.logError(err.message || err.toString());
                this.lastError = err.message;
                this.events.emit(`tunnelFailed`, `Could not connect:${err.message}`);
                await this.tryKillProcess();
            }
        }
        this.isInitted = true;


    }
    public async onStdOut(data: string) {

    }
    public async configureNetwork(tun: string, conf: { assignedIp: string, serviceNetwork: string }) {
        this.logInfo(`configuring tunnel: ${tun} with ${JSON.stringify(conf)}`)
        // prepare network for connection
        await this.execOnShell(`ip addr add ${conf.assignedIp}/32 dev ${tun}`)
        await this.execOnShell(`ip link set ${tun} up`);
        await this.execOnShell(`ip route add ${conf.serviceNetwork} dev ${tun}`)
    }
    ////./ssh_ferrum -c none -N -F ../etc/ssh_config -w any  -o "StrictHostKeyChecking no"  ferrum@192.168.88.243 -p3333
    public override async openTunnel(isRoot = true): Promise<void> {
        if (this.isSSHTunnelStarting) return;
        await this.init();
        await this.startSSHFerrum();

    }
    public async startIAmAlive() {
        if (this.iamAliveInterval)
            clearIntervalAsync(this.iamAliveInterval);
        this.iamAliveInterval = null;
        this.iamAliveInterval = setIntervalAsync(async () => {
            this.sendIAmAlive();
        }, 3 * 60 * 1000)

    }
    public async stopIAmAlive() {
        if (this.iamAliveInterval)
            clearIntervalAsync(this.iamAliveInterval);
        this.iamAliveInterval = null;

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

    public async startSSHFerrum() {
        this.logInfo(`starting new tunnel ${this.sshCommand}`);
        await this.tryKillProcess();
        await this.startProcess();
        this.isSSHTunnelStarting = setTimeout(async () => {

            this.tryKillProcess();
        }, 60000)
    }



    public override async closeTunnel(): Promise<void> {
        await this.tryKillProcess();
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



    /**
     * @summary start a bash shell with sudo
     * @returns 
     */
    public async startProcess() {

        /* const child = child_process.exec(`${this.sshCommand}`, (err, stdout, stderr) => {
            if (stdout)
                this.onstdout(stdout.toString());
            if (stderr) {
                this.onstderr(stderr.toString());
                this.onstdout(stderr.toString());
            }

        }); */
        //this.lastError = '';
        this.logInfo("executing process command");
        //const child = child_process.spawn(`${this.sshCommand}`)
        const child = child_process.spawn(this.sshCommands[0], this.sshCommands.slice(1))
        //const child = child_process.spawn(`sleep`, ['60'])
        child.stdout?.on('data', (data: Buffer) => {
            this.newLineBufferStdout += data.toString();
            while (true) {
                let index = this.newLineBufferStdout.indexOf('\n');
                if (index < 0)
                    break;

                this.onstdout(this.newLineBufferStdout.substring(0, index + 1));
                this.newLineBufferStdout = this.newLineBufferStdout.substring(index + 1);
            }
        });
        child.stderr?.on('data', (data: Buffer) => {

            this.newLineBufferStderr += data.toString();
            while (true) {
                let index = this.newLineBufferStderr.indexOf('\n');
                if (index < 0)
                    break;

                this.onstdout(this.newLineBufferStderr.substring(0, index + 1));
                this.newLineBufferStderr = this.newLineBufferStderr.substring(index + 1);
            }
        });
        child.on('exit', async () => {
            this.childProcess = null;
            this.isTunnelCreated = false;
            this.isWorking = false;
            if (this.isSSHTunnelStarting)
                clearTimeout(this.isSSHTunnelStarting);
            this.isSSHTunnelStarting = null;
            await this.stopIAmAlive();
        })
        this.childProcess = child;

    }


    /**
     * @summary kill all created process list
     */
    public async tryKillProcess() {
        try {
            if (this.isSSHTunnelStarting)
                clearTimeout(this.isSSHTunnelStarting);
            this.isSSHTunnelStarting = null;
            await this.stopIAmAlive();
            if (this.childProcess)
                this.logInfo(`killing process tunnel`)

            this.childProcess?.kill();
            await this.forceKillPid();
            this.isWorking = false;

        } catch (err: any) {
            this.logError(err.message || err.toString());
        }
    }
    protected async forceKillPid() {
        if (this.sshPID) {
            this.logInfo(`forcing to kill ${this.sshPID}`);
            await this.execOnShell('kill -9 ' + this.sshPID);
            this.sshPID = '';
        }
    }
}