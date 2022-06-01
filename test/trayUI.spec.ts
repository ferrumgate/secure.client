
import chai from 'chai';
import { TrayUI } from '../src/ui/trayUI';
import { EventService } from '../src/service/eventsService';
const expect = chai.expect;


describe('trayUI ', async () => {


    before(async () => {
    })

    it('check if constructor works', async () => {
        const tray = new TrayUI(new EventService());
        //wait 1 second 
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve('');
            }, 1000);
        })
        expect(tray).exist;
    })
})