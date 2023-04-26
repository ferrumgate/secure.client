
import chai, { config } from 'chai';
import fs from 'fs';
import { ConfigService } from '../src/service/cross/configService';
const expect = chai.expect;


describe('configService ', async () => {


    beforeEach(async () => {
        const configService = new ConfigService();
        if (fs.existsSync(configService.filename))
            fs.unlinkSync(configService.filename);
    })

    it('filename and directory name', async () => {
        const configService = new ConfigService();
        //on every platform directory names changed, because of this check only known variables
        expect(configService.filename).to.includes('ferrum.json');
        expect(configService.folder).to.includes('ferrumgate');
    })
    it('getConfig returns null if not exits', async () => {
        const configService = new ConfigService();
        expect(await configService.getConfig()).to.be.null;

    })
    it('saveConfig', async () => {
        const configService = new ConfigService();
        await configService.saveConfig({ host: 'test', id: '123123' });
        //get again and verify
        const config1 = await configService.getConfig();
        expect(config1).to.be.not.null;
        expect(config1?.host).to.equal('test');
    })
})