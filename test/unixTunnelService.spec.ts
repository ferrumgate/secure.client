
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
import { Network } from '../src/service/worker/models';

describe.skip('UnixTunnelService ', async () => {


    before(async () => {
    })
    function createNet() {
        const net: Network = {
            id: '123', name: '123', action: 'allow', sshHost: 'localhost:2323', needs2FA: false, needsIp: false, tunnel: { isWorking: false, lastTryTime: 0, tryCount: 0 }
        }
        return net;
    }





})