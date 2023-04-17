
import chai, { util } from 'chai';
import { Util } from '../src/service/util';
const expect = chai.expect;
import ping from 'ping';
import { Resolver } from 'dns/promises';

describe('util ', async () => {


    before(async () => {
    })

    it('getAppVersion', async () => {
        const version = await Util.getAppVersion();
        expect(version?.startsWith('1.'));
    })
    it('convertAppVersionToNumber', async () => {
        const version = await Util.convertAppVersionToNumber("0.0.0");
        expect(version).to.equal(0);

        const version2 = await Util.convertAppVersionToNumber("0.0.1");
        expect(version2).to.equal(1);

        const version3 = await Util.convertAppVersionToNumber("0.2.1");
        expect(version3).to.equal(200001);

        const version4 = await Util.convertAppVersionToNumber("3.2.1");
        expect(version4).to.equal(30000200001);

        const version5 = await Util.convertAppVersionToNumber("3.10.9");
        expect(version5).to.equal(30001000009);

    })

    it('exec', async () => {
        const output = await Util.exec('ls');
        expect(output).exist;
    })
    it('ping', async () => {
        const output = await ping.promise.probe('1.1.1.1', {
            timeout: 2
        })
        console.log(output);
    }).timeout(10000)
    it('resolve', async () => {
        const resolver = new Resolver({ tries: 1, timeout: 2000 })
        resolver.setServers(['1.1.1.1'])
        const result = await resolver.resolve4(`ferrumgate.com`);
        console.log(result);
    }).timeout(10000)
})
