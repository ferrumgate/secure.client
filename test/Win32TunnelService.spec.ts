
import chai from 'chai';
import { shell } from 'electron';
import { ConfigService } from '../src/service/configService';
import { EventService } from '../src/service/eventsService';
import { Win32TunnelService } from '../src/service/win32/Win32TunnelService';
const expect = chai.expect;
import chprocess from 'child_process'
import { Util } from '../src/service/util';
import child_process from 'child_process';
import { until } from 'selenium-webdriver';
import Axios from 'axios';

describe('win32TunnelService ', async () => {


    before(async () => {
    })

    it('openTunnel integration testing', async () => {
        // start windows service with administrator powershell 
        // FerrumGateService.exe 
        // then run this test manuel
        // it must set ip address to ferrumgate interface
        const events = {
            on: (eventName: string, listener: (...args: any[]) => void) => {

            },
            emit: (eventName: string, ...args: any[]) => {
                // open(args[0]);
            }
        } as EventService;
        const config = {
            getConfig: () => {
                return { host: '192.168.88.243:3333' }
            }
        } as unknown as ConfigService;


        class Win32MockService extends Win32TunnelService {
            public override async getTunnelAndServiceIpList(): Promise<{ assignedIp: string; serviceNetwork: string; }> {
                let response = await Axios.get('http://192.168.88.10:8080/api/client/tunnel/ip', {
                    headers: {
                        "TunnelKey": this.tunnelKey,
                        "Accept": "application/json"
                    }
                });
                return response.data;
            }
            public override async confirmTunnel(): Promise<{ assignedIp: string; serviceNetwork: string; }> {
                let response = await Axios.post('http://192.168.88.10:8080/api/client/tunnel/confirm', {}, {
                    headers: {
                        "TunnelKey": this.tunnelKey,
                        "Accept": "application/json"
                    }
                });
                return response.data;
            }
        }



        const tunnel = new Win32MockService(events, config);
        await tunnel.openTunnel();
        await Util.sleep(600000);

    }).timeout(539999);


    it.skip('tryKillSSHFerrumProcess', async () => {
        if (Util.getPlatform() != 'win32')
            return;
        //mock services
        const configService = {
            getConfig: () => { return { host: 'localhost:10000' } }
        } as unknown as ConfigService;

        const eventService = {
            on: () => { }
        } as unknown as EventService;

        // lets create
        const win32 = new Win32TunnelService(eventService, configService);

        await win32.openTunnel(false);
        await child_process.exec(`sleep 10`)
        await Util.sleep(500);
        const output = await Util.exec('pgrep sleep')
        expect(output).to.not.empty;
        await win32.tryKillSSHFerrumProcess('sleep');
        let isError = false;
        try {
            const output2 = await Util.exec('pgrep sleep')

        } catch (err) {
            isError = true;
        }
        expect(isError).to.be.true;


    }).timeout(35000);


})