import { TunnelService } from "../tunnelService";
import path from 'path';
const sudo = require('../../lib/sudoprompt')

export class UnixTunnelService extends TunnelService {

    ////./ssh -c none -N -F ../etc/ssh_config -w any  -o "StrictHostKeyChecking no"  ferrum@192.168.88.243 -p3333
    public override async openTunnel(): Promise<void> {
        const sshFile = path.join(__dirname, 'ssh_ferrum');
        const sshConfigFile = path.join(__dirname, 'ssh_config');
        const parameters = ['-N', '-F', sshConfigFile, "-w", "any"]
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

        const all = `${sshFile} ${parameters.join(' ')} ferrum@${host} -p${port}`;
        console.log(all);
        await new Promise((resolve, reject) => {
            sudo.exec(all, this.sudoOptions, (error?: Error, stdout?: any, stderr?: any) => {
                if (error)
                    reject(error.message);
                else
                    if (stderr)
                        reject(stderr.toString());
                    else
                        if (stdout) {
                            let output = (stdout as Buffer).toString();
                            const parts = output.split('\n');
                            if (parts.length) {

                            }
                        }




            })
        })

    }
}