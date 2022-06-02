import chai from 'chai';
import { EventService } from '../src/service/eventsService';
const expect = chai.expect;
import { EventEmitter } from 'events';

describe('eventService ', async () => {


    before(async () => {
    })

    it('not supported events throw exception', async () => {
        const events = new EventService();

        //check on subscribe 
        let isError = false;
        try {
            events.on('something', () => { });
        } catch (err) { isError = true; }
        expect(isError).to.be.true;

        //check on emit
        isError = false;

        try {
            events.emit('something', {})
        } catch (err) { isError = true; }

    })
    it('valid events working', (done) => {
        const events = new EventService();

        events.on('tunnelOpened', (args) => {
            expect(args.item).exist;
            done();
        })
        events.emit('tunnelOpened', { item: 'bla bal' });



    })
})
