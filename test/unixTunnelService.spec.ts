
import chai from 'chai';
import { shell } from 'electron';
import { ConfigService } from '../src/service/cross/configService';
import { EventService } from '../src/service/eventsService';
import { UnixTunnelService } from '../src/service/unix/unixTunnelService';
const expect = chai.expect;
import chprocess from 'child_process'
import { Util } from '../src/service/util';
import child_process from 'child_process';
import { until } from 'selenium-webdriver';
import { ApiService } from '../src/service/apiService'
import { NetworkEx } from '../src/service/worker/models';
import { TunnelApiService } from '../src/service/worker/tunnelApiService';

describe('UnixTunnelService ', async () => {


    before(async () => {
    })
    function createNet() {
        const net: NetworkEx = {
            id: '123', name: '123', action: 'allow', sshHost: 'localhost:2323', needs2FA: false, needsIp: false, needsTime: false, needsDevicePosture: false, tunnel: { isWorking: false, lastTryTime: 0, tryCount: 0, resolvErrorCount: 0, resolvTimes: [] }
        }
        return net;
    }

    it('getInterfaceResolvDomains', async () => {
        const net: NetworkEx = {
            action: 'allow', id: 'someid', name: 'test',
            needs2FA: false, needsIp: false, needsTime: false, tunnel: {} as any
        }
        const unix = new UnixTunnelService(net, '', new EventService(), new TunnelApiService('', new EventService()));
        const items = await unix.getInterfaceResolvDomains();
        expect(items.length > 0).to.be.true;

    })

    it('makeDns', async () => {
        const net: NetworkEx = {
            action: 'allow', id: 'someid', name: 'test',
            needs2FA: false, needsIp: false, needsTime: false, needsDevicePosture: false, tunnel: { tun: 'dummy2', resolvSearch: 'test.com' } as any
        }
        //ip link add dummy2 type dummy
        // ip link del dummy2

        const unix = new UnixTunnelService(net, '', new EventService(), new TunnelApiService('', new EventService()));
        const items = await unix.makeDns(true);
        const items2 = await unix.makeDns(false);


    }).timeout(120000)






})