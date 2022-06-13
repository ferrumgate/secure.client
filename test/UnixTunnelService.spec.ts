
import chai from 'chai';
import { shell } from 'electron';
import { ConfigService } from '../src/service/configService';
import { EventService } from '../src/service/eventsService';
import { UnixTunnelService } from '../src/service/unix/UnixTunnelService';
const expect = chai.expect;
import chprocess from 'child_process'


describe('UnixTunnelService ', async () => {


    before(async () => {
    })

    it('openTunnel', async () => {
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
        const tunnel = new UnixTunnelService(events, config);
        await tunnel.openTunnel();
    }).timeout(539999);
})