import { TunnelService } from "../worker/tunnelService";
import path from 'path';
import child_process from 'child_process';
import { EventService } from "../eventsService";
import { Logger } from "selenium-webdriver/lib/logging"
import { PipeClient } from "../cross/pipeClient";
import { ApiService } from "../apiService";
import { Network } from "../worker/models";
import { clearIntervalAsync, setIntervalAsync } from "set-interval-async";
import { TunnelApiService } from "../worker/tunnelApiService";
import { UnixTunnelService } from "../unix/unixTunnelService";
import { EOL } from 'os';

/**
 * @summary windows tunnel controller
 */
export class Win32TunnelService extends UnixTunnelService {
    tun: string

    constructor(net: Network, accessToken: string, event: EventService, api: TunnelApiService) {
        super(net, accessToken, event, api);
        this.tun = '';
    }
    public override prepareCommand() {

        const sshFile = path.join(__dirname, 'ssh_ferrum.exe');
        const sshConfigFile = path.join(__dirname, 'ssh_config');

        const parameters = ['-N', '-F', `"${sshConfigFile}"`, "-w", "any", "-o", '"StrictHostKeyChecking no"', "-o", '"UserKnownHostsFile /dev/null"'];

        this.sshCommand = `"${sshFile}" ${parameters.join(' ')} ferrum@${this.host} -p${this.port}`;
        this.sshCommands = [];
        this.sshCommands.push(`${sshFile}`);
        this.sshCommands.push(...['-N', '-F', `${sshConfigFile}`, "-w", "any", "-o", 'StrictHostKeyChecking no', '-o', 'UserKnownHostsFile /dev/null']);
        this.sshCommands.push(`ferrum@${this.host}`);
        this.sshCommands.push(`-p${this.port}`);


    }

    public override async onStdOut(data: string) {
        if (data.startsWith('interface_name:')) {
            let parts = data.split(':');
            if (parts.length > 1)
                this.tun = parts[1].replace(EOL, '');
        }

    }
    public override async configureNetwork(tun: string, conf: { assignedIp: string; serviceNetwork: string; }) {
        this.logInfo(`configuring tunnel: ${tun} with ${JSON.stringify(conf)}`)
        //ExecuteCmd("cmd.exe /c netsh interface ipv4 set address \"" + interfacename + "\" static " + ip + " 255.255.255.255");
        //   ExecuteCmd("/c route ADD "+route+" "+ip+" IF "+index);

        await this.execOnShell(`cmd.exe /c netsh interface ipv4 set address "${tun}" static  ${conf.assignedIp}  255.255.255.255`)

        const outputBuf = await this.execOnShell("cmd.exe /c netsh int ipv4 show interfaces");
        const output = (outputBuf as any).toString() as string;
        const line = output.split(EOL).find(x => x.includes(tun));
        let index = '';
        if (line) {
            index = line.split(' ').map(x => x.trim()).filter(y => y)[0];
        }
        if (index)
            await this.execOnShell(`cmd.exe /c route ADD  ${conf.serviceNetwork}  ${conf.assignedIp} IF ${index}`);
        else
            await this.execOnShell(`cmd.exe /c route ADD  ${conf.serviceNetwork}  ${conf.assignedIp}`);
    }

    protected async forceKillPid() {
        //taskkill /F /PID pid_number
        if (this.sshPID) {
            this.logInfo(`forcing to kill ${this.sshPID}`);
            await this.execOnShell(`taskkill.exe /F /PID ${this.sshPID}`);
            this.sshPID = '';
        }
    }

}