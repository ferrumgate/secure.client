
import chai, { assert } from 'chai';
import { Util } from '../src/service/util';
const ServerMock = require('mock-http-server');
import { ConfigService } from '../src/service/configService';
import { EventService } from '../src/service/eventsService';
import { TunnelService } from '../src/service/worker/tunnelService';
const expect = chai.expect;
import childprocess from 'child_process';
import { PipeClient } from '../src/service/win32/pipeClient';
const controller = new AbortController();
const { signal } = controller;
import path from 'path';

describe('PipeClient ', async () => {


    let cprocess: childprocess.ChildProcess | null;
    beforeEach((done) => {
        let p = path.join(__dirname, '../src/service/win32/svc', 'FerrumGateService.exe');
        console.log(p);
        cprocess = childprocess.exec(p + " interactive", { signal }, (error: any, stdout: any, stderr: any) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
        });
        done();
    });

    afterEach((done) => {
        if (cprocess)
            cprocess.kill('SIGKILL');
        cprocess = null;

        done();
    });


    it('ping pong working', async () => {
        if (Util.getPlatform() != 'win32')
            return;

        await Util.sleep(1000);
        let msg = '';
        const client = new PipeClient();
        client.onStdout = async (data: string) => {
            msg = data;
        }
        await client.connect('ferrumgate');
        await client.write('ping');
        await Util.sleep(1000);
        expect(msg).to.equal('pong');
        await client.write('exit');
        await Util.sleep(1000);
        await client.close();


    }).timeout(5000);

});