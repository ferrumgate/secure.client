import { UnixTunnelService } from "../unix/unixTunnelService";
import { TunnelService } from "../worker/tunnelService";
import path from 'path';
import process from 'process';

export class DarwinTunnelService extends UnixTunnelService {

    public override getSSHPath(): { sshFile: string; sshConfigFile: string; } {
        const arch = process.arch;
        this.logInfo(`current arch is ${arch}`);
        switch (arch) {
            case 'x64':
                const sshFile = path.join(__dirname, 'x86_64', 'ssh_ferrum');
                const sshConfigFile = path.join(__dirname, 'x86_64', 'ssh_config');
                return { sshFile, sshConfigFile };
            case 'arm64':
                const sshFile2 = path.join(__dirname, 'arm64', 'ssh_ferrum');
                const sshConfigFile2 = path.join(__dirname, 'arm64', 'ssh_config');
                return { sshFile: sshFile2, sshConfigFile: sshConfigFile2 };
            default:
                throw new Error(`no ssh program found for arch: ${arch}`);
        }
    }
    public async configureNetwork(tun: string, conf: { assignedIp: string, serviceNetwork: string, resolvIp?: string, resolvSearch: string }) {
        this.logInfo(`configuring tunnel: ${tun} with ${JSON.stringify(conf)}`)
        // prepare network for connection

        await this.execOnShell(`ifconfig ${tun} ${conf.assignedIp} ${conf.assignedIp} netmask 255.255.255.255 up`)

        await this.execOnShell(`route add -net ${conf.serviceNetwork} -interface ${tun}`)
    }

}