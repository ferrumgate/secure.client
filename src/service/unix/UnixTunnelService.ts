import { TunnelService } from "../tunnelService";
import path from 'path';
const sudo = require('../../lib/sudoprompt')
import child_process from 'child_process';
import { EventService } from "../eventsService";
import { Logger } from "selenium-webdriver/lib/logging";

/**
 * @summary unit tunnel controller
 */
export class UnixTunnelService extends TunnelService {

    isRootShellWorking = false;
    sshCommand = '';
    isInitted = false;
    sshPID = '';
    isTunnelCreated = false;
    iamAliveInterval: any;
    isSSHTunnelStarting: any;
    public async init() {
        if (this.isInitted) return;
        const sshFile = path.join(__dirname, 'ssh_ferrum');
        const sshConfigFile = path.join(__dirname, 'ssh_config');
        const parameters = ['-N', '-F', sshConfigFile, "-w", "any", "-o", "StrictHostKeyChecking no"]
        const config = await this.config.getConfig();
        let port = '22';
        let host = 'localhost';
        if (config?.host) {
            let parts = config.host.split(':');
            if (parts.length)
                host = parts[0];
            if (parts.length > 1)
                port = parts[1];
        }
        this.sshCommand = `${sshFile} ${parameters.join(' ')} ferrum@${host} -p${port}`;

        /////

        this.sudoOptions.onstderr = async (data: string) => {
            this.processLastOutput = data.toString();
            this.logError(data.toString());
        }

        this.sudoOptions.onstdout = async (data: string) => {
            try {
                this.processLastOutput = data;
                console.log(data);
                this.logInfo(`process data: ${data}`);
                if (data.startsWith("SUDOPROMPT")) {
                    await this.startNewSSHFerrum();
                }
                if (data.startsWith('ferrum_pid:')) {
                    this.sshPID = data.replace('ferrum_pid:', '').replace('\n', '');
                }
                if (data.startsWith('ferrum_open:')) {
                    const link = data.replace('ferrum_open:', '').replace('\n', '');
                    this.logInfo(`open link ${link}`);
                    this.events.emit('openLink', link);
                    const parts = link.split('=');
                    if (parts.length > 1) {
                        this.tunnelKey = parts[1];
                    }
                    const url = new URL(link);
                    this.host = url.hostname;
                    this.protocol = url.protocol;
                    this.port = url.port;

                }
                if (data.startsWith('ferrum_tunnel_opened:')) {
                    const items = data.split(':')
                    if (items.length == 2) {
                        //create tun interface name
                        const tun = items[1].replace('\n', '');
                        // get assigned ip and service network
                        const iplist = await this.getTunnelAndServiceIpList();


                        this.logInfo(`configuring tunnel: ${tun} with ${iplist}`)
                        // prepare network for connection
                        await this.executeOnRootShell(`ip addr add ${iplist.assignedIp}/32 dev ${tun}`)
                        await this.executeOnRootShell(`ip link set ${tun} up`);
                        await this.executeOnRootShell(`ip route add ${iplist.serviceNetwork} dev ${tun}`)


                        await this.executeOnRootShell(`wait ${this.sshPID} || echo "ferrum_exit:"`)
                        await this.confirmTunnel();
                        ////
                        this.events.emit("tunnelOpened");
                        this.notifyInfo(`Connected successfully`);
                        this.isTunnelCreated = true;
                        this.logInfo(`tunnel ${tun} created and configured successfully`);
                    }
                }
                if (data.startsWith('ferrum_exit:')) {
                    this.sshPID = '';
                    this.isTunnelCreated = false;
                    this.notifyError('Ferrum disconnected');
                    this.events.emit('tunnelClosed');
                    this.logInfo(`tunnel closed`);
                }
            } catch (err: any) {
                this.logError(err.message || err.toString());
                this.notifyError(`Could not connect:${err.message}`);
                await this.tryKillSSHFerrumProcess();
            }
        }
        this.iamAliveInterval = setInterval(async () => {
            await this.sendIAmAlive();
        }, 30000)
        this.isInitted = true;

    }
    ////./ssh_ferrum -c none -N -F ../etc/ssh_config -w any  -o "StrictHostKeyChecking no"  ferrum@192.168.88.243 -p3333
    public override async openTunnel(isRoot = true): Promise<void> {
        await this.init();
        const rootShellAllReadyStarted = this.isRootShellWorking;
        await this.startRootShell(isRoot);
        if (rootShellAllReadyStarted)
            await this.startNewSSHFerrum();
    }
    public async sendIAmAlive() {
        try {
            if (this.isTunnelCreated) {
                this.logInfo('sending I am alive');
                await this.iAmAlive();
            }
        } catch (err: any) {
            this.logError(err.toString())
        }
    }
    public async startNewSSHFerrum() {
        this.logInfo(`starting new tunnel`);
        await this.tryKillSSHFerrumProcess();
        const rootShell = this.rootShell();
        if (rootShell) {
            rootShell.stdin?.write(`${this.sshCommand} & \n`);
        }
    }
    public async executeOnRootShell(cmd: string) {

        const rootShell = this.rootShell();
        if (rootShell) {
            this.logInfo(`executing on root shell: ${cmd}`)
            rootShell.stdin?.write(`${cmd} \n`);
        }
    }

    public async tryKillSSHFerrumProcess(processname = 'ssh_ferrum') {
        this.logInfo(`killing tunnel`)
        await this.executeOnRootShell(`pkill ${processname}`);
    }
    public override async closeTunnel(): Promise<void> {
        await this.tryKillSSHFerrumProcess();
    }

    /**
     * @summary opened bash with sudo
     * @returns 
     */
    private rootShell() {
        return this.sudoOptions.child as unknown as child_process.ChildProcess;
    }

    /**
     * @summary start a bash shell with sudo
     * @returns 
     */
    public async startRootShell(isRoot = true) {
        if (this.isRootShellWorking) return;
        this.logInfo(`starting root shell`);
        this.isRootShellWorking = true;
        if (isRoot) {
            sudo.exec('/bin/bash', this.sudoOptions, (error?: Error, stdout?: any, stderr?: any) => {
                this.isRootShellWorking = false;
                if (error)
                    this.logError(error.message);
                else
                    if (stderr)
                        this.logError(stderr.toString());
                    else
                        if (stdout) {
                            this.logInfo("root shell exited");
                        }

            })
        } else { //for testing open
            const child = child_process.exec(`/bin/bash -c "/bin/bash"`, (error, stdout, stderr) => {
                this.isRootShellWorking = false;
                if (error)
                    this.logError(error.message);
                else
                    if (stderr)
                        this.logError(stderr.toString());
                    else
                        if (stdout) {

                            this.logInfo("root shell exited");
                        }
            })
            this.sudoOptions.child = child;
            child.stdout?.on('data', (data) => {

                this.sudoOptions.onstdout(data)
            });
            child.stderr?.on('data', (data) => {
                this.sudoOptions.onstderr(data)
            });
        }
    }


    /**
     * @summary kill all created process list
     */
    public async tryKillAllProcess() {
        try {
            this.logInfo(`killing all related process list`)
            const rootShell = this.rootShell();
            if (rootShell) {
                rootShell.kill();
                if (rootShell.pid) {
                    process.kill(rootShell.pid);
                }
                await this.tryKillSSHFerrumProcess();
            }

        } catch (err: any) {
            this.logError(err.message || err.toString());
        }
    }
}