
import chai from 'chai';
import { Util } from '../../src/service/util';
const ServerMock = require('mock-http-server');
import { ConfigService } from '../../src/service/cross/configService';
import { EventService } from '../../src/service/eventsService';
import { TunnelService } from '../../src/service/worker/tunnelService';
import { DeviceService } from '../../src/service/worker/deviceService';
const expect = chai.expect;
import fs from 'fs';


describe('deviceService ', async () => {



    beforeEach((done) => {
        done()
    });

    afterEach((done) => {
        done();
    });

    it('getCurrentVersion', async () => {
        const deviceService = new DeviceService(new EventService());
        const version = await deviceService.getCurrentVersion();
        console.log(version);
        expect(version).exist;

    })
    it('getHostname', async () => {
        const deviceService = new DeviceService(new EventService());
        const hostname = await deviceService.getHostname();
        console.log(hostname);
        expect(hostname).exist;

    })
    it('getMacs', async () => {
        const deviceService = new DeviceService(new EventService());
        const macs = await deviceService.getMacs();
        console.log(macs);
        expect(macs.length > 0).to.be.true;

    })
    it('calculateSha256', async () => {
        fs.writeFileSync('test.txt', "hello");
        const deviceService = new DeviceService(new EventService());
        const sha256 = await deviceService.calculateSHA256('test.txt');
        console.log(sha256);
        expect(sha256).to.equal('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')

    })
    it('getOS', async () => {

        const deviceService = new DeviceService(new EventService());
        const os = await deviceService.getOS();
        console.log(os);
        const platform = await deviceService.getPlatform();
        switch (platform) {
            case 'linux':
                expect(os.name.includes('ubuntu')).to.be.true;
                break;
            case 'win32':
                expect(os.name.includes('Windows')).to.be.true;
                break;
            case 'darwin':
                expect(os.name.includes('OS')).to.be.true;
                break;
        }

    })
    it('getRegistry', async () => {

        const deviceService = new DeviceService(new EventService());

        const platform = await deviceService.getPlatform();
        const registry = await deviceService.getRegistry('HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters')
        switch (platform) {

            case 'win32':
                expect(registry.isExists).to.be.true;
                break;

        }
        let isError = false;
        try {
            const registry2 = await deviceService.getRegistry('HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters2')
            switch (platform) {

                case 'win32':
                    expect(registry2.isExists).to.be.false;
                    break;

            }
        } catch (err) {
            isError = true;
        }
        expect(isError).to.be.true;
        const registry3 = await deviceService.getRegistry('HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters', 'ICSDomain')
        switch (platform) {

            case 'win32':
                expect(registry3.isExists).to.be.true;
                break;

        }

    })

    it('getProcessLike', async () => {

        const deviceService = new DeviceService(new EventService());

        const platform = await deviceService.getPlatform();
        if (platform == 'linux') {
            const result = await deviceService.getProcessLike(['code'])
            console.log(result);

            expect(result.length > 0).to.be.true;
        }

        if (platform == 'darwin') {
            const result = await deviceService.getProcessLike(['syslogd'])
            console.log(result);

            expect(result.length > 0).to.be.true;
        }

    })

    it('getMemory', async () => {

        const deviceService = new DeviceService(new EventService());

        const result = await deviceService.getMemory();

        console.log(result);

        expect(result.free > 0).to.be.true;
        expect(result.total > 0).to.be.true;

    })

    it('getSerial', async () => {

        const deviceService = new DeviceService(new EventService());

        const result = await deviceService.getSerial(true);

        console.log(result);

        expect(result.serial).exist;


    })
    it('getDiscEncrypted', async () => {

        const deviceService = new DeviceService(new EventService());

        const result = await deviceService.getDiscEncrypted();

        console.log(result);

        expect(result[0].isEncrypted).false;


    })

    it('getFirewall', async () => {

        const deviceService = new DeviceService(new EventService());

        const result = await deviceService.getFirewall();

        console.log(result);

        expect(result[0].isEnabled).false;


    })
    it('getAntivirus', async () => {

        const deviceService = new DeviceService(new EventService());

        const result = await deviceService.getAntivirus();

        console.log(result);
        const platform = await deviceService.getPlatform();
        if (platform == 'win32')
            expect(result[0].isEnabled).true;
        else
            expect(result[0].isEnabled).false;


    })


})