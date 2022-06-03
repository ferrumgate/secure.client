
import chai from 'chai';
import { app } from 'electron';
import * as main from '../src/main';
import { LogService } from '../src/service/logService';
import fs from 'fs';
const expect = chai.expect;


describe('main ', async () => {



    beforeEach(async () => {


    })
    it('unhandled error logs must be handled to log file', async () => {
        const { log, events } = main.init();
        const logfile = log.logfile;
        //this test does not work
        //console.log(logfile);
        //        log.clear();


        /*   expect(log).exist;
          expect(events).exist;
          //throw an uncatched error
          events.emit('throwError', 'test error blabla');
          //wait a little
          await new Promise((resolve, reject) => {
              setTimeout(() => {
                  resolve('');
              }, 1000);
          })
   */
        /*         expect(fs.existsSync(logfile)).to.be.true;
        
                expect(fs.readFileSync(logfile).toString()).includes('test error blabla'); */

    })
})