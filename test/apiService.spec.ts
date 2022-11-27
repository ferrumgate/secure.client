
import chai from 'chai';
import { Util } from '../src/service/util';
const ServerMock = require('mock-http-server');
import { ConfigService } from '../src/service/configService';
import { EventService } from '../src/service/eventsService';
import { TunnelService } from '../src/service/worker/tunnelService';
import { ApiService } from '../src/service/apiService';
import { net } from 'electron';
import { TunnelApiService } from '../src/service/worker/tunnelApiService';
const { app } = require('electron')

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
    const url = 'http://localhost:15000';





    //no way to test
    it.skip('getExchangeToken', async () => {

        // mock http response
        server.on({
            method: 'GET',
            path: '/api/auth/exchangetoken',
            reply: {
                status: 200,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ token: 'sometoken' })
            }
        });




        const eventService = {
            on: () => { },
            emit: () => { }
        } as unknown as EventService;

        const apiService = new ApiService(url, eventService);
        const result = await apiService.getExchangeToken();
        expect(result).exist;
        expect(result.token).to.equal('sometoken');




    }).timeout(1000);

    it.skip('changeExchangeToken', async () => {

        // mock http response
        server.on({
            method: 'POST',
            path: '/api/auth/exchangetoken',

            reply: {
                status: 200,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ accessToken: 'sometoken', refreshToken: 'sometoken2' })
            }
        });


        const eventService = {
            on: () => { },
            emit: () => { }
        } as unknown as EventService;


        const apiService = new ApiService(url, eventService);
        const result = await apiService.changeExchangeToken('atoken');
        expect(result).exist;
        expect(result.accessToken).to.equal('sometoken');
        expect(result.refreshToken).to.equal('sometoken');



    }).timeout(1000);

    it.skip('refreshtoken', async () => {

        // mock http response
        server.on({
            method: 'POST',
            path: '/api/auth/refreshtoken',

            reply: {
                status: 200,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ accessToken: 'sometoken', refreshToken: 'sometoken2' })
            }
        });


        const eventService = {
            on: () => { },
            emit: () => { }
        } as unknown as EventService;


        const apiService = new ApiService(url, eventService);
        const result = await apiService.refreshToken('atoken', 'atoken2');
        expect(result).exist;
        expect(result.accessToken).to.equal('sometoken');
        expect(result.refreshToken).to.equal('sometoken');



    }).timeout(1000);


})