
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

describe('win32TunnelService ', async () => {


    before(async () => {
    })

    it('getRegistry', async () => {
        const net: NetworkEx = {
            action: 'allow', id: 'someid', name: 'test',
            needs2FA: false, needsIp: false, needsTime: false, tunnel: {} as any
        }
        const win = new Win32TunnelService(net, '', new EventService(), new TunnelApiService('', new EventService()));
        const items = await win.getRegistry();
        expect(items).exist;

    }).timeout(120000)

    it('saveRegistry', async () => {
        const net: NetworkEx = {
            action: 'allow', id: 'someid', name: 'test',
            needs2FA: false, needsIp: false, needsTime: false, tunnel: {} as any
        }
        const win = new Win32TunnelService(net, '', new EventService(), new TunnelApiService('', new EventService()));
        await win.saveRegistry(['test.ferrumgate.zero', 'ops.ferrumgate.zero']);
        const items = await win.getRegistry();
        expect(items.length).to.equal(2);


        await win.saveRegistry(['test.ferrumgate.zero']);
        const items2 = await win.getRegistry();
        expect(items2.length).to.equal(1);

        await win.saveRegistry([]);
        const items3 = await win.getRegistry();
        expect(items3.length).to.equal(0);

    }).timeout(120000)






})