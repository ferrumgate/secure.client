
import chai from 'chai';
import fs from 'fs';
import { LogService } from '../src/service/logService';
const expect = chai.expect;


describe('logService ', async () => {

    let service: LogService;
    beforeEach(async () => {
        service = new LogService();
        const filename = service.logfile;
        if (fs.existsSync(filename))
            fs.unlinkSync(filename);
    })

    it('file must exits with content', async () => {

        service.write('error', 'test error');
        const filename = service.logfile;
        expect(fs.existsSync(filename)).to.be.true;
        expect(fs.readFileSync(filename).toString()).includes('test error');
    })
})