
import chai from 'chai';
import { Util } from '../src/service/util';
const ServerMock = require('mock-http-server');
import { ConfigService } from '../src/service/configService';
import { EventService } from '../src/service/eventsService';
import { TunnelService } from '../src/service/tunnelService';
const expect = chai.expect;

//we need to set some variables, lets extend the class
class ExTunnelService extends TunnelService {
    /**
     *
     */
    constructor(ev: EventService, cf: ConfigService) {
        super(ev, cf);
        this.host = 'localhost';
        this.port = '15000';
        this.protocol = 'http:'
        this.tunnelKey = 'somekey'

    }
}

describe('tunnelService ', async () => {

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


        const tunnelService = new ExTunnelService(eventService, configService);
        const result = await tunnelService.getTunnelAndServiceIpList()
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



        const tunnelService = new ExTunnelService(eventService, configService);
        const result = await tunnelService.confirmTunnel()
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


        const tunnelService = new ExTunnelService(eventService, configService);
        const result = await tunnelService.iAmAlive()
        expect(result).exist;



    }).timeout(1000);
})