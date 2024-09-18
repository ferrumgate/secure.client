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
    public override getQuicPath(): { quicFile: string; } {
        const arch = process.arch;
        this.logInfo(`current arch is ${arch}`);
        switch (arch) {
            case 'x64':
                const quicFile = path.join(__dirname, 'x86_64', 'quic_ferrum');
                return { quicFile, };
            case 'arm64':
                const quicFile2 = path.join(__dirname, 'arm64', 'quic_ferrum');

                return { quicFile: quicFile2 };
            default:
                throw new Error(`no quic program found for arch: ${arch}`);
        }
    }
    public async configureNetwork(tun: string, conf: { assignedIp: string, serviceNetwork: string, resolvIp?: string, resolvSearch: string }) {
        this.logInfo(`configuring tunnel: ${tun} with ${JSON.stringify(conf)}`)
        // prepare network for connection

        await this.execOnShell(`ifconfig ${tun} ${conf.assignedIp} ${conf.assignedIp} netmask 255.255.255.255 up`)

        await this.execOnShell(`route add -net ${conf.serviceNetwork} -interface ${tun}`)
        await this.configureDns(tun, conf);
        await this.flushDnsCache();
    }

    public async getMacNetworkList() {
        const result = (await this.execOnShell(`networksetup -listallnetworkservices |grep -v denotes|grep -v '*'||true`)) as string;
        const nets = result.split('\n').map(x => x.trim()).filter(x => x);
        return nets;
    }

    public async getResolvSearchList(net?: string) {

        let items = [];
        const nets = net ? [net] : await this.getMacNetworkList();
        for (const net of nets) {
            const searchlist = (await this.execOnShell(`networksetup -getsearchdomains "${net}"|grep -v "aren't"||true`)) as string;
            const domains = searchlist.split('\n').map(x => x).filter(y => y);
            items.push({
                svc: net, domains: domains
            })
        }
        return items;
    }

    public async saveResolvSearchList(svc: string, fqdns: string[]) {

        await this.execOnShell(`networksetup -setsearchdomains "${svc}" ${fqdns.length ? fqdns.join(' ') : 'empty'}`)
    }


    public async getResolvIpList(net?: string) {

        let items = [];
        const nets = net ? [net] : await this.getMacNetworkList();
        for (const net of nets) {
            const searchlist = (await this.execOnShell(`networksetup -getdnsservers "${net}"|grep -v "aren't"||true`)) as string;
            const ips = searchlist.split('\n').map(x => x).filter(y => y);
            items.push({
                svc: net, ips: ips
            })
        }
        return items;
    }

    public async saveResolvIpList(svc: string, fqdns: string[]) {

        await this.execOnShell(`networksetup -setdnsservers "${svc}" ${fqdns.length ? fqdns.join(' ') : 'empty'}`)
    }

    public override async closeTunnel(): Promise<void> {
        try {//remove resovlSearch
            this.logInfo(`removing resolve search ${this.net.tunnel.resolvSearch}`)
            if (this.net.tunnel.resolvSearch) {
                const items = await this.getResolvSearchList();
                for (const item of items) {
                    if (item.domains.includes(this.net.tunnel.resolvSearch)) {
                        await this.saveResolvSearchList(item.svc, item.domains.filter(x => x != this.net.tunnel.resolvSearch));
                    }
                }
            }

        } catch (err: any) {
            this.logError(err.message || err.toString());
        }
        try {//remove ip
            this.logInfo(`removing resolve ip ${this.net.tunnel.resolvIp}`)
            if (this.net.tunnel.resolvIp) {
                const nets = await this.getResolvIpList();
                for (const net of nets) {
                    if (this.net.tunnel.resolvIp && net.ips.includes(this.net.tunnel.resolvIp)) {
                        await this.saveResolvIpList(net.svc, net.ips.filter(x => x != this.net.tunnel.resolvIp));
                    }
                }
            }

        } catch (err: any) {
            this.logError(err.message || err.toString());
        }
        super.closeTunnel();

    }
    public override async flushDnsCache() {
        try {
            await this.execOnShell(`dscacheutil -flushcache||true`)
            await this.execOnShell(`killall -HUP mDNSResponder||true`);
        } catch (err: any) {
            console.log(err);
            this.logError(err.message || err.toString());
        }
    }

    public override async configureDns(tun: string, conf: { assignedIp: string, serviceNetwork: string, resolvIp?: string, resolvSearch: string }) {
        if (this.net) {
            this.net.tunnel.assignedIp = conf.assignedIp;
            this.net.tunnel.serviceNetwork = conf.serviceNetwork;
            this.net.tunnel.resolvIp = conf.resolvIp;
            this.net.tunnel.resolvSearch = conf.resolvSearch;
            this.net.tunnel.tun = tun;
            this.net.tunnel.isMasterResolv = false;
            this.net.tunnel.resolvTunDomains = await this.getInterfaceResolvDomains()
        }

        let items = await this.getResolvSearchList();
        for (const item of items) {
            if (!item.domains.includes(conf.resolvSearch)) {
                item.domains.splice(0, 0, conf.resolvSearch);
                await this.saveResolvSearchList(item.svc, item.domains);
            }
        }
        this.net.tunnel.isResolvConfigured = true;

    }

    public async getInterfaceResolvDomains() {
        //on mac no need
        return [];
    }
    public override async makeDns(primary = true) {

        if (primary) {
            if (!this.net.tunnel.isMasterResolv) {
                this.logInfo(`make dns router ${this.net.name}`);
                const nets = await this.getResolvIpList();
                for (const net of nets) {
                    if (this.net.tunnel.resolvIp && !net.ips.includes(this.net.tunnel.resolvIp)) {
                        net.ips.splice(0, 0, this.net.tunnel.resolvIp);
                        await this.saveResolvIpList(net.svc, net.ips);
                    }
                }
                await this.flushDnsCache();
            }
            this.net.tunnel.isMasterResolv = true;
        } else {
            if (this.net.tunnel.isMasterResolv) {
                this.logInfo(`remove dns router ${this.net.name}`);
                const nets = await this.getResolvIpList();
                for (const net of nets) {
                    if (this.net.tunnel.resolvIp && net.ips.includes(this.net.tunnel.resolvIp)) {
                        await this.saveResolvIpList(net.svc, net.ips.filter(x => x != this.net.tunnel.resolvIp));
                    }
                }
            }
            this.net.tunnel.isMasterResolv = false;
        }

    }


}