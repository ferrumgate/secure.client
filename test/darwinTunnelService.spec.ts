
import chai from 'chai';
import { shell } from 'electron';
import { ConfigService } from '../src/service/cross/configService';
import { EventService } from '../src/service/eventsService';
import { Win32TunnelService } from '../src/service/win32/win32TunnelService';
const expect = chai.expect;
import chprocess from 'child_process'
import { Util } from '../src/service/util';
import child_process from 'child_process';
import { until } from 'selenium-webdriver';
import Axios from 'axios';
import { ApiService } from '../src/service/apiService';
import { TunnelApiService } from '../src/service/worker/tunnelApiService';
import { NetworkEx } from '../src/service/worker/models';
import { DarwinTunnelService } from '../src/service/darwin/darwinTunnelService';

describe('darwinTunnelService ', async () => {


    before(async () => {
    })

    it('getResolvSearchList', async () => {
        // first execute on command line
        //networksetup -setsearchdomains Ethernet dev.ferrumgate.zero
        //
        const net: NetworkEx = {
            action: 'allow', id: 'someid', name: 'test',
            needs2FA: false, needsIp: false, needsTime: false, tunnel: {} as any
        }
        const darwin = new DarwinTunnelService(net, '', new EventService(), new TunnelApiService('', new EventService()));
        const items = await darwin.getResolvSearchList();
        console.log(items);
        expect(items.length).to.equal(2);
        expect(items[0].domains.includes("dev.ferrumgate.zero"));

    }).timeout(120000)

    it('saveResolvSearchList', async () => {
        const net: NetworkEx = {
            action: 'allow', id: 'someid', name: 'test',
            needs2FA: false, needsIp: false, needsTime: false, tunnel: {} as any
        }
        const darwin = new DarwinTunnelService(net, '', new EventService(), new TunnelApiService('', new EventService()));
        const svc = await darwin.getMacNetworkList();
        await darwin.saveResolvSearchList(svc[0], ['test.ferrumgate.zero', 'ops.ferrumgate.zero']);
        const items = await darwin.getResolvSearchList();
        expect(items[0].domains.length).to.equal(2);


        await darwin.saveResolvSearchList(svc[0], ['test.ferrumgate.zero']);
        const items2 = await darwin.getResolvSearchList();
        expect(items2[0].domains.length).to.equal(1);

        await darwin.saveResolvSearchList(svc[0], []);
        const items3 = await darwin.getResolvSearchList();
        expect(items3[0].domains.length).to.equal(0);

    }).timeout(120000);
    it('flushDnsCache', async () => {
        const net: NetworkEx = {
            action: 'allow', id: 'someid', name: 'test',
            needs2FA: false, needsIp: false, needsTime: false, tunnel: {} as any
        }
        const darwin = new DarwinTunnelService(net, '', new EventService(), new TunnelApiService('', new EventService()));
        const svc = await darwin.flushDnsCache();

    }).timeout(120000)






})