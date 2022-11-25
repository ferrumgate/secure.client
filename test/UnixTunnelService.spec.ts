
import chai from 'chai';
import { shell } from 'electron';
import { ConfigService } from '../src/service/configService';
import { EventService } from '../src/service/eventsService';
import { UnixTunnelService } from '../src/service/unix/unixTunnelService';
const expect = chai.expect;
import chprocess from 'child_process'
import { Util } from '../src/service/util';
import child_process from 'child_process';
import { until } from 'selenium-webdriver';
import { ApiService } from '../src/service/apiService'

describe.skip('UnixTunnelService ', async () => {

    /* 
        before(async () => {
        })
    
        it.skip('openTunnel integration testing', async () => {
            const events = {
                on: (eventName: string, listener: (...args: any[]) => void) => {
    
                },
                emit: (eventName: string, ...args: any[]) => {
                    chprocess.exec(`xdg-open ${args[0]}`);
                }
            } as EventService;
            const config = {
                getConfig: () => {
                    return { host: '192.168.10.103:3333' }
                }
            } as unknown as ConfigService;
            const apiService = {
    
            } as unknown as ApiService;
            const tunnel = new UnixTunnelService(events, config, apiService);
            await tunnel.openTunnel();
    
    
        }).timeout(539999);
    
        it('startRootShell', async () => {
            if (Util.getPlatform() != 'linux')
                return;
            const configService = {
                getConfig: () => { return { host: 'localhost' } }
            } as unknown as ConfigService;
    
            const eventService = {
                on: () => { }
            } as unknown as EventService;
            const apiService = {
    
            } as unknown as ApiService;
            const unix = new UnixTunnelService(eventService, configService, apiService);
            await unix.init();
            await unix.startRootShell(false);
            await Util.sleep(1000);
            await unix.executeOnRootShell('echo ferrum');
            //how to check execution
            await Util.sleep(1000);
            expect(unix.processLastOutput).to.equal('ferrum\n');
    
        }).timeout(35000);
    
        it('tryKillSSHFerrumProcess', async () => {
            if (Util.getPlatform() != 'linux')
                return;
            //mock services
            const configService = {
                getConfig: () => { return { host: 'localhost:10000' } }
            } as unknown as ConfigService;
    
            const eventService = {
                on: () => { }
            } as unknown as EventService;
    
            // lets create
            const apiService = {
    
            } as unknown as ApiService;
            const unix = new UnixTunnelService(eventService, configService, apiService);
    
            await unix.openTunnel(false);
            await child_process.exec(`sleep 10`)
            await Util.sleep(500);
            const output = await Util.exec('pgrep sleep')
            expect(output).to.not.empty;
            await unix.tryKillSSHFerrumProcess('sleep');
            let isError = false;
            try {
                const output2 = await Util.exec('pgrep sleep')
    
            } catch (err) {
                isError = true;
            }
            expect(isError).to.be.true;
    
    
        }).timeout(35000); */


})