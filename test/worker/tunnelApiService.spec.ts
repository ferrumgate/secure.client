
import chai from 'chai';
import { Util } from '../../src/service/util';
const ServerMock = require('mock-http-server');
import { ConfigService } from '../../src/service/cross/configService';
import { EventService } from '../../src/service/eventsService';
import { TunnelService } from '../../src/service/worker/tunnelService';
import { TunnelApiService } from '../../src/service/worker/tunnelApiService';
const expect = chai.expect;



describe('tunnelApiService ', async () => {



    beforeEach((done) => {
        done();
    });

    afterEach((done) => {
        done();
    });

    it('checkRedirect', async () => {
        /* const deviceService = new TunnelApiService('http://test.ferrumgate.com', new EventService());
        const version = await deviceService.checkRedirect();
        expect(deviceService.isRedirect).to.be.true;
        console.log(version);
 */

    })


})