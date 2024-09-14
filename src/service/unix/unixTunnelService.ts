import { TunnelService } from "../worker/tunnelService";
import path from 'path';
const sudo = require('../../lib/sudoprompt')
import child_process from 'child_process';
import { EventService } from "../eventsService";
import { clearIntervalAsync, setIntervalAsync } from "set-interval-async";
import { NetworkEx } from "../worker/models";
import { TunnelApiService } from "../worker/tunnelApiService";
const { EOL } = require('os');
import { Resolver } from 'dns/promises';
import ping from 'ping';
/**
 * @summary unix tunnel controller, this service works on root worker process
 */
export class UnixTunnelService extends TunnelService {

    isRootShellWorking = false;
    sshCommand = '';
    sshCommands: string[] = [];
    quicCommand = '';
    quicCommands: string[] = [];
    isInitted = false;
    processPID = '';
    isTunnelCreated = false;
    errorCount = 0;
    iamAliveInterval: any;
    pingCheckInterval: any;
    dnsCheckInterval: any;
    isTunnelStarting: any;
    port = '2223';
    host = 'localhost';
    net: NetworkEx;
    childProcess: child_process.ChildProcess | null = null;
    accessToken: string = '';
    onstderr = async (data: string) => { };
    onstdout = async (data: string) => { };
    newLineBufferStderr = '';
    newLineBufferStdout = '';
    resolver: Resolver;
    selectedProtocol: 'auto' | 'tcp' | 'udp' = 'udp';
    selectedProtocolIndex = 0;
    constructor(net: NetworkEx, accessToken: string, event: EventService, api: TunnelApiService) {
        super(event, api);
        this.net = net;
        this.networkId = net.id;
        this.accessToken = accessToken;
        if (net.sshHost) {
            let parts = net.sshHost?.split(':');
            if (parts.length)
                this.host = parts[0];
            if (parts.length > 1)
                this.port = parts[1];
        }
        this.resolver = new Resolver({ tries: 1, timeout: 2000 })
        this.selectedProtocol = this.findProtocol();
    }
    public findProtocol() {
        if (this.net.tunnel.protocol == 'auto')
            return 'auto';
        if (this.net.tunnel.protocol == 'tcp')
            return 'tcp';
        if (this.net.tunnel.protocol == 'udp')
            return 'udp';
        return 'udp';
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

    public getQuicPath() {
        const quicFile = path.join(__dirname, 'quic_ferrum');
        return { quicFile };
    }

    public prepareCommandQuic() {

        const { quicFile } = this.getQuicPath();


        const parameters = ["--insecure", "--loglevel", "info", "--host", `${this.host}:${this.port}`]

        this.quicCommand = `"${quicFile}" ${parameters.join(' ')}`;
        this.quicCommands = [];
        this.quicCommands.push(`${quicFile}`);
        this.quicCommands.push(...["--insecure", "--loglevel", "info", "--host"]);
        this.quicCommands.push(`${this.host}:${this.port}`);


    }


    public async init() {

        this.prepareCommand();
        this.prepareCommandQuic();

        console.log(this.sshCommand);
        console.log(this.quicCommand);
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

                this.logInfo(`${data}`);
                if (data.includes('ferrum_pid:')) {
                    const items = data.split(EOL);
                    const pidItem = items.find(x => x.startsWith('ferrum_pid:'))
                    if (pidItem) {
                        this.processPID = pidItem.replace('ferrum_pid:', '').replace(EOL, '').trim();
                    }
                }
                if (data.includes('ferrum_open:')) {
                    const items = data.split(EOL);
                    const openItem = items.find(x => x.includes('ferrum_open:'))

                    if (openItem) {
                        const link = openItem.slice(openItem.indexOf('ferrum_open:') + 12).replace(EOL, '').trim();
                        const parts = link.split('=');
                        if (parts.length > 1) {
                            this.tunnelKey = parts[1].trim();
                        }
                        if (this.tunnelKey) {
                            var datax = await this.api.createTunnel(this.accessToken, this.tunnelKey);
                            this.logInfo(`tunnel created with clientId ${datax.clientId}`);
                        }
                    }
                }

                if (data.includes('ferrum_tunnel_opened:')) {
                    if (!this.processPID)
                        throw new Error('ssh pid is not valid');
                    const items = data.split(':')
                    if (items.length == 2) {
                        //create tun interface name
                        const tun = items[1].replace(EOL, '').trim();
                        // get assigned ip and service network
                        this.logInfo(`getting tunnel ip list for ${tun} with ${this.tunnelKey}`);
                        const iplist = await this.api.getTunnelAndServiceIpList(this.tunnelKey);


                        await this.configureNetwork(tun, iplist);


                        //await this.executeOnRootShell(`wait ${ this.processPID } || echo "ferrum_exit:"`)
                        this.logInfo(`confirming tunnel ${tun}`);
                        await this.api.confirmTunnel(this.tunnelKey);
                        ////
                        this.events.emit("tunnelOpened", this.net);

                        this.isTunnelCreated = true;
                        this.isWorking = true;
                        this.errorCount = 0;
                        this.logInfo(`tunnel ${tun} created and configured successfully`);

                        if (this.isTunnelStarting)
                            clearTimeout(this.isTunnelStarting);
                        this.isTunnelStarting = null;
                        await this.startIAmAlive();
                        await this.startPingCheck();
                        await this.startDnsCheck();
                        this.lastError = '';

                    }
                }
                if (data.includes('ferrum_exit:') || data.includes('Terminated') || data.includes('No route to host') || data.includes('Connection refused') || data.includes('could not connect')) {
                    let error = 'Tunnel Closed';
                    if (data.includes('Connection refused'))
                        error = 'Connection refused';
                    else if (data.includes('No route to host'))
                        error = 'No route to host';
                    else if (data.includes('Terminated'))
                        error = 'Terminated';
                    else if (data.includes('could not connect'))
                        error = 'Could not connect';
                    const wasWorking = this.isWorking;
                    this.processPID = '';
                    this.isTunnelCreated = false;
                    this.isWorking = false;
                    this.logInfo(`tunnel closed`);
                    this.errorCount++;
                    if (!wasWorking && this.errorCount % 5 == 0) {
                        this.events.emit('tunnelFailed', error);
                    }
                    if (this.isTunnelStarting)
                        clearTimeout(this.isTunnelStarting);
                    this.isTunnelStarting = null;
                    this.lastError = data.includes('ferrum_exit') ? 'Tunnel Closed' : data;
                    if (wasWorking)
                        this.events.emit('tunnelClosed', this.net);

                }
            } catch (err: any) {
                this.logError(err.message || err.toString());
                this.lastError = err.message;
                if (this.net)
                    this.net.tunnel.lastError = err.message;
                this.events.emit(`tunnelFailed`, this.net || `Could not connect:${err.message}`);
                await this.tryKillProcess();
            }
        }
        this.isInitted = true;


    }
    public async onStdOut(data: string) {

    }
    public async configureDns(tun: string, conf: { assignedIp: string, serviceNetwork: string, resolvIp?: string, resolvSearch: string }) {
        if (this.net) {
            this.net.tunnel.assignedIp = conf.assignedIp;
            this.net.tunnel.serviceNetwork = conf.serviceNetwork;
            this.net.tunnel.resolvIp = conf.resolvIp;
            this.net.tunnel.resolvSearch = conf.resolvSearch;
            this.net.tunnel.tun = tun;
            this.net.tunnel.isMasterResolv = false;
            this.net.tunnel.resolvTunDomains = await this.getInterfaceResolvDomains()
        }

        if (conf.resolvIp) {
            this.logInfo(`configuring dns for tunnel:${tun} resolvIp:${conf.resolvIp} resolvSearch:${conf.resolvSearch}`);
            await this.execOnShell(`resolvectl domain ${tun} '${conf.resolvSearch}'`);
            await this.execOnShell(`resolvectl llmnr ${tun} false`);
            await this.execOnShell(`resolvectl default-route ${tun} false`);
            await this.execOnShell(`resolvectl dns ${tun} ${conf.resolvIp}`);

        }
        this.net.tunnel.isResolvConfigured = true;

    }
    public async getInterfaceResolvDomains() {
        const result: string = (await this.execOnShell(`resolvectl domain`)) as string;
        const allDomainLines = result.split('\n');
        let items: { tun: string, domains: string[] }[] = [];
        for (const line of allDomainLines) {

            const parts = line.split(':');
            const part1 = parts[0];
            const part2 = parts[1];
            if (part2 && part1.includes('(') && part1.includes(')')) {
                let tmp1 = part1.split('(')[1];
                if (tmp1) {
                    let tun = tmp1.replace(')', '').trim();
                    let domains = part2.split(' ').map(x => x.trim()).filter(y => y);
                    items.push({
                        tun: tun,
                        domains: domains
                    })
                }
            }

        }

        return items;
    }
    public override async makeDns(primary = true) {
        const allRoute = `~.`;
        if (primary) {
            if (!this.net.tunnel.isMasterResolv) {
                this.logInfo(`make dns router ${this.net.name}`);
                await this.execOnShell(`resolvectl domain ${this.net.tunnel.tun} '${this.net.tunnel.resolvSearch}' '~.'`);
                await this.execOnShell(`resolvectl default-route ${this.net.tunnel.tun} true`);
                const domains = await this.getInterfaceResolvDomains();
                for (const dom of domains) {
                    if (dom.tun != this.net.tunnel.tun && dom.domains.includes(allRoute)) {
                        const rlist = dom.domains.filter(x => x != '~.').join(' ');
                        await this.execOnShell(`resolvectl domain ${dom.tun} "${rlist}"`)
                    }
                }

                await this.execOnShell(`resolvectl flush-caches`);
            }
            this.net.tunnel.isMasterResolv = true;
        } else {
            if (this.net.tunnel.isMasterResolv) {
                this.logInfo(`remove dns router ${this.net.name}`);
                await this.execOnShell(`resolvectl default-route ${this.net.tunnel.tun} false`);
                await this.execOnShell(`resolvectl domain ${this.net.tunnel.tun} '${this.net.tunnel.resolvSearch}'`);
            }
            this.net.tunnel.isMasterResolv = false;
        }
    }
    public async configureNetwork(tun: string, conf: { assignedIp: string, serviceNetwork: string, resolvIp?: string, resolvSearch: string }) {
        this.logInfo(`configuring tunnel: ${tun} with ${JSON.stringify(conf)}`)
        // prepare network for connection
        await this.execOnShell(`ip addr add ${conf.assignedIp}/32 dev ${tun}`)
        await this.configureDns(tun, conf);
        await this.execOnShell(`ip link set ${tun} up`);
        await this.execOnShell(`ip route add ${conf.serviceNetwork} dev ${tun}`)
        await this.flushDnsCache();
    }
    ////./ssh_ferrum -c none -N -F ../etc/ssh_config -w any  -o "StrictHostKeyChecking no"  ferrum@192.168.88.243 -p3333
    public override async openTunnel(isRoot = true): Promise<void> {
        if (this.isTunnelStarting) return;
        await this.init();
        await this.startFerrumTunnel();
    }
    iAmAliveLastCheck = new Date().getTime();
    public async startIAmAlive() {
        this.iAmAliveLastCheck = new Date().getTime();
        if (this.iamAliveInterval)
            clearIntervalAsync(this.iamAliveInterval);
        this.iamAliveInterval = null;
        this.iamAliveInterval = setIntervalAsync(async () => {
            await this.sendIAmAlive();
        }, 30 * 1000)

    }
    public async stopIAmAlive() {
        if (this.iamAliveInterval)
            clearIntervalAsync(this.iamAliveInterval);
        this.iamAliveInterval = null;

    }
    public async sendIAmAlive() {
        try {
            if (this.isTunnelCreated) {
                if (new Date().getTime() - this.iAmAliveLastCheck < 3 * 60 * 1000) {
                    return;
                }
                this.logInfo('sending I am alive');
                await this.api.iAmAlive(this.tunnelKey);
                this.iAmAliveLastCheck = new Date().getTime();
            }
        } catch (err: any) {
            this.logError(err.toString())
        }
    }


    public async startPingCheck() {
        if (this.pingCheckInterval)
            clearIntervalAsync(this.pingCheckInterval);
        this.pingCheckInterval = null;
        this.pingCheckInterval = setIntervalAsync(async () => {
            await this.pingCheck();
        }, 3 * 1000)

    }
    public async stopHealthCheck() {
        this.net.tunnel.pingErrorCount = 0;
        this.net.tunnel.pingTimes = [];
        if (this.pingCheckInterval)
            clearIntervalAsync(this.pingCheckInterval);
        this.pingCheckInterval = null;

    }
    public async pingCheck() {
        try {

            if (this.isTunnelCreated && this.net.tunnel.resolvIp) {
                const result = await ping.promise.probe(this.net.tunnel.resolvIp, {
                    timeout: 1,
                });
                if (!result.alive)
                    throw new Error("ping failed");
                const latency = Number(result.time) || 3000;

                this.net.tunnel.pingErrorCount = 0;
                this.net.tunnel.pingTimes.splice(0, 0, latency);

            }
        } catch (err: any) {
            this.logError(err.toString());
            this.net.tunnel.pingTimes.push(3000);
            this.net.tunnel.pingErrorCount++;
        } finally {
            // only 1.5 minutes data
            if (this.net.tunnel.pingTimes.length > 30)
                this.net.tunnel.pingTimes.splice(29);// slice it
        }
    }


    public async startDnsCheck() {
        if (this.dnsCheckInterval)
            clearIntervalAsync(this.dnsCheckInterval);
        this.dnsCheckInterval = null;
        this.dnsCheckInterval = setIntervalAsync(async () => {
            await this.dnsCheck();
        }, 5 * 1000)

    }
    public async stopDnsCheck() {
        this.net.tunnel.dnsErrorCount = 0;
        this.net.tunnel.dnsTimes = [];
        if (this.dnsCheckInterval)
            clearIntervalAsync(this.dnsCheckInterval);
        this.dnsCheckInterval = null;

    }

    public async dnsCheck() {
        try {

            if (this.isTunnelCreated && this.net.tunnel.resolvIp) {


                this.resolver.setServers([this.net.tunnel.resolvIp]);
                const pStart = process.hrtime();
                const dnsResult = await this.resolver.resolve4(`dns.${this.net.tunnel.resolvSearch}`);
                const pong = process.hrtime(pStart);
                const latency = (pong[0] * 1000000000 + pong[1]) / 1000000;
                //if(new Date().getTime()%7==0)
                //this.logInfo(`dns resolution ${dnsResult} milisecond:${latency}`);
                this.net.tunnel.dnsErrorCount = 0;
                this.net.tunnel.dnsTimes.splice(0, 0, latency);

            }
        } catch (err: any) {
            this.logError(err.toString());
            this.net.tunnel.dnsTimes.push(1000);
            this.net.tunnel.dnsErrorCount++;
        } finally {
            // only 1.5 minutes data
            if (this.net.tunnel.dnsTimes.length > 30)
                this.net.tunnel.dnsTimes.splice(29);// slice it
        }
    }

    public async startFerrumTunnel() {
        //this.logInfo(`starting new tunnel ${this.sshCommand}`);
        await this.tryKillProcess();
        await this.startProcess();
        this.isTunnelStarting = setTimeout(async () => {

            this.tryKillProcess();
        }, 110000)
    }


    public override async closeTunnel(): Promise<void> {
        await this.tryKillProcess();
        await this.flushDnsCache();
    }

    public async flushDnsCache() {
        try {
            await this.execOnShell(`resolvectl flush-caches`);
        } catch (err: any) {
            this.logError(err.message || err.toString());
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


    /**
     * @summary start a bash shell with sudo
     * @returns 
     */
    public async startProcess() {

        let useQuic = true;
        if (this.selectedProtocol == 'udp')
            useQuic = true;
        else
            if (this.selectedProtocol == 'tcp')
                useQuic = false;
            else {//auto
                if ((this.selectedProtocolIndex % 2) == 0)
                    useQuic = true;
                else useQuic = false;
            }


        this.logInfo(`executing process command ${useQuic ? "quic" : "ssh"}`);
        this.logInfo(`executing process command ${useQuic ? this.quicCommand : this.sshCommand}`);
        //this.logInfo(`${this.quicCommands.join(' ')}`);
        const child = child_process.spawn(
            useQuic ? this.quicCommands[0] : this.sshCommands[0],
            useQuic ? this.quicCommands.slice(1) : this.sshCommands.slice(1))
        this.logInfo(`process started with pid: ${child.pid}`);
        let outputData = '';
        child.stdout?.on('data', async (data: Buffer) => {
            this.newLineBufferStdout += data.toString();
            outputData += data.toString();
            while (true) {
                let index = this.newLineBufferStdout.indexOf('\n');
                if (index < 0)
                    break;

                await this.onstdout(this.newLineBufferStdout.substring(0, index + 1));
                this.newLineBufferStdout = this.newLineBufferStdout.substring(index + 1);
            }
        });
        child.stderr?.on('data', async (data: Buffer) => {
            outputData += data.toString();
            this.newLineBufferStderr += data.toString();
            while (true) {
                let index = this.newLineBufferStderr.indexOf('\n');
                if (index < 0)
                    break;

                await this.onstdout(this.newLineBufferStderr.substring(0, index + 1));
                this.newLineBufferStderr = this.newLineBufferStderr.substring(index + 1);
            }
        });
        const exitFunc = async (tryAgain = false) => {
            this.selectedProtocolIndex++;
            this.childProcess = null;
            this.isTunnelCreated = false;
            this.isWorking = false;
            if (this.isTunnelStarting)
                clearTimeout(this.isTunnelStarting);
            this.isTunnelStarting = null;
            await this.stopIAmAlive();
            await this.stopHealthCheck();
            if (this.selectedProtocol == 'auto' && tryAgain)
                await this.startProcess();
        }

        child.on('exit', async () => {
            this.logInfo(`process exited`);
            let processFailed = outputData.includes("ferrum_exit") && (outputData.includes('could not connect') || outputData.includes('ERROR'));
            await exitFunc(processFailed);
        })
        this.childProcess = child;


    }


    /**
     * @summary kill all created process list
     */
    public async tryKillProcess() {
        try {
            if (this.isTunnelStarting)
                clearTimeout(this.isTunnelStarting);
            this.isTunnelStarting = null;
            await this.stopIAmAlive();
            await this.stopHealthCheck();
            if (this.childProcess)
                this.logInfo(`killing process tunnel`)

            this.childProcess?.kill();
            await this.forceKillPid();
            this.isWorking = false;
            this.isTunnelCreated = false;

        } catch (err: any) {
            this.logError(err.message || err.toString());
        }
    }
    protected async forceKillPid() {
        try {
            if (this.processPID) {
                this.logInfo(`forcing to kill ${this.processPID}`);
                let pid = this.processPID;
                this.processPID = '';
                await this.execOnShell('kill -9 ' + pid);
            }
        } catch (ignore) {

        }
    }
}