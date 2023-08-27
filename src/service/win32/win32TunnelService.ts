import { TunnelService } from "../worker/tunnelService";
import path from 'path';
import child_process from 'child_process';
import { EventService } from "../eventsService";
import { Logger } from "selenium-webdriver/lib/logging"
import { PipeClient } from "../cross/pipeClient";
import { ApiService } from "../apiService";
import { NetworkEx } from "../worker/models";
import { clearIntervalAsync, setIntervalAsync } from "set-interval-async";
import { TunnelApiService } from "../worker/tunnelApiService";
import { UnixTunnelService } from "../unix/unixTunnelService";
import { EOL } from 'os';

/**
 * @summary windows tunnel controller
 */
export class Win32TunnelService extends UnixTunnelService {
    tun: string

    constructor(net: NetworkEx, accessToken: string, event: EventService, api: TunnelApiService) {
        super(net, accessToken, event, api);
        this.tun = '';
    }
    public override getSSHPath() {
        const sshFile = path.join(__dirname, 'ssh_ferrum.exe');
        const sshConfigFile = path.join(__dirname, 'ssh_config');
        return { sshFile, sshConfigFile };
    }
    public override getQuicPath() {
        const quicFile = path.join(__dirname, 'quic_ferrum.exe');
        return { quicFile };
    }

    public override async onStdOut(data: string) {
        if (data.startsWith('interface_name:')) {
            let parts = data.split(':');
            if (parts.length > 1)
                this.tun = parts[1].replace(EOL, '');
        }

    }
    async tryCatchorDefault<T>(func: () => Promise<T>, def: T) {
        try {
            return await func();
        } catch (err: any) {
            this.logError(err.message || err.toString())
            return def;
        }
    }
    public async getResolvSearchList() {
        const result = await this.tryCatchorDefault(async () => { return await this.execOnShell(`reg query HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters /v SearchList`) as string }
            , '');
        const item = result.split('\r\n').map(x => x.trim()).find(x => x.startsWith('SearchList'));
        if (!item) return [];
        const values = item.replace('SearchList', '').replace('REG_SZ', '').split(' ').map(x => x.trim()).filter(y => y).find(x => x);
        return values?.split(',') || [];
    }

    public async saveResolvSearchList(fqdns: string[]) {
        const result = (await this.execOnShell(`reg add HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters /v SearchList /t REG_SZ /d "${fqdns.join(',')}" /f`) as string);

    }
    public override async closeTunnel(): Promise<void> {
        try {//remove resovlSearch
            if (this.net.tunnel.resolvSearch) {
                const items = await this.getResolvSearchList();
                if (items.includes(this.net.tunnel.resolvSearch))
                    await this.saveResolvSearchList(items.filter(x => x != this.net.tunnel.resolvSearch));
            }

        } catch (ignore) {

        }
        super.closeTunnel();

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
        if (!items.includes(conf.resolvSearch)) {
            items.splice(0, 0, conf.resolvSearch);
            await this.saveResolvSearchList(items);
        }
        this.net.tunnel.isResolvConfigured = true;


    }
    public override async flushDnsCache(): Promise<void> {
        try {
            await this.execOnShell(`ipconfig /flushdns`);
        } catch (err: any) {
            this.logError(err.message || err.toString());
        }
    }

    public async getInterfaceResolvDomains() {
        //on win no need
        return [];
    }
    public override async makeDns(primary = true) {

        if (primary) {
            if (!this.net.tunnel.isMasterResolv) {
                this.logInfo(`make dns router ${this.net.name}`);
                await this.execOnShell(`netsh interface ip set dns ${this.net.tunnel.tun} static ${this.net.tunnel.resolvIp}`)
                await this.flushDnsCache();
            }
            this.net.tunnel.isMasterResolv = true;
        } else {
            if (this.net.tunnel.isMasterResolv) {
                this.logInfo(`remove dns router ${this.net.name}`);
                await this.execOnShell(`netsh interface ip delete dns ${this.net.tunnel.tun} all`)
            }
            this.net.tunnel.isMasterResolv = false;
        }

    }

    public override async configureNetwork(tun: string, conf: { assignedIp: string; serviceNetwork: string; resolvIp?: string, resolvSearch: string }) {
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
        await this.configureDns(tun, conf);
    }

    protected async forceKillPid() {
        //taskkill /F /PID pid_number
        if (this.processPID) {
            this.logInfo(`forcing to kill ${this.processPID}`);
            await this.execOnShell(`taskkill.exe /F /PID ${this.processPID}`);
            this.processPID = '';
        }
    }

}