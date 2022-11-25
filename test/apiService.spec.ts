
import chai from 'chai';
import { Util } from '../src/service/util';
const ServerMock = require('mock-http-server');
import { ConfigService } from '../src/service/configService';
import { EventService } from '../src/service/eventsService';
import { TunnelService } from '../src/service/worker/tunnelService';
import { ApiService } from '../src/service/apiService';
const expect = chai.expect;

const data = {
    host: 'localhost',
    port: '15000',
    protocol: 'http',
    tunnelKey: 'somekey'
}



describe('apiService ', async () => {

    const server = new ServerMock({ host: "localhost", port: 15000 });

    beforeEach((done) => {
        server.start(done);
    });

    afterEach((done) => {
        server.stop(done);
    });

    it('getTunnelAndServiceIpList', async () => {

        // mock http response
        server.on({
            method: 'GET',
            path: '/api/client/tunnel/ip',
            reply: {
                status: 200,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ assignedIp: "192.168.1.1", serviceNetwork: '10.0.0.0/24' })
            }
        });

        //mock services
        const configService = {
            getConfig: () => { return { host: 'localhost:9000' } }
        } as unknown as ConfigService;

        const eventService = {
            on: () => { },
            emit: () => { }
        } as unknown as EventService;


        const apiService = new ApiService('localhost:9000', eventService);
        const result = await apiService.getTunnelAndServiceIpList(data.tunnelKey)
        expect(result.assignedIp).to.equal('192.168.1.1');
        expect(result.serviceNetwork).to.equal('10.0.0.0/24');


    }).timeout(1000);
    it('confirmTunnel', async () => {

        // mock http response
        server.on({
            method: 'POST',
            path: '/api/client/tunnel/confirm',
            reply: {
                status: 200,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({})
            }
        });

        //mock services
        const configService = {
            getConfig: () => { return { host: 'localhost:9000' } }
        } as unknown as ConfigService;

        const eventService = {
            on: () => { },
            emit: () => { }
        } as unknown as EventService;



        const apiService = new ApiService('localhost:9000', eventService);
        const result = await apiService.confirmTunnel(data.tunnelKey);
        expect(result).exist;



    }).timeout(1000);

    it('iAmAlive', async () => {

        // mock http response
        server.on({
            method: 'GET',
            path: '/api/client/tunnel/alive',
            reply: {
                status: 200,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({})
            }
        });

        //mock services
        const configService = {
            getConfig: () => { return { host: 'localhost:9000' } }
        } as unknown as ConfigService;

        const eventService = {
            on: () => { },
            emit: () => { }
        } as unknown as EventService;


        const apiService = new ApiService('localhost:9000', eventService);
        const result = await apiService.iAmAlive(data.tunnelKey);
        expect(result).exist;



    }).timeout(1000);
})