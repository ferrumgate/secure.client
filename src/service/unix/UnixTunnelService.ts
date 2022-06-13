import { TunnelService } from "../tunnelService";
import path from 'path';
const sudo = require('../../lib/sudoprompt')

export class UnixTunnelService extends TunnelService {
    private tunnelKey = '';
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
        this.sudoOptions.onstdout = async (data: string) => {
            if (data.startsWith('ferrum_open:')) {
                const link = data.replace('ferrum_open:', '').replace('\n', '');

                this.events.emit('openLink', link);
                const parts = link.split('=');
                if (parts.length > 1) {
                    this.tunnelKey = parts[1];
                }

            }
            if (data.startsWith('ferrum_tunnel_opened:')) {
                const items = data.split(':')
                if (items.length == 2) {
                    const tun = items[1].replace('\n', '');
                    await new Promise((resolve, reject) => {
                        sudo.exec(`echo ${this.tunnelKey}`, this.sudoOptions, (error?: Error, stdout?: any, stderr?: any) => {
                            if (error)
                                reject(error.message);
                            else
                                if (stderr)
                                    reject(stderr.toString());
                                else
                                    if (stdout) {
                                        resolve(stdout);
                                    }

                        })
                    })
                }
            }
        }
        const all = `${sshFile} ${parameters.join(' ')} ferrum@${host} -p${port}`;
        console.log(all);
        await new Promise((resolve, reject) => {
            sudo.exec('/bin/bash', this.sudoOptions, (error?: Error, stdout?: any, stderr?: any) => {
                if (error)
                    reject(error.message);
                else
                    if (stderr)
                        reject(stderr.toString());
                    else
                        if (stdout) {
                            resolve(stdout);
                        }

            })
        })

    }
}