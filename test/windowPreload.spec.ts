
import chai from 'chai';
import { contextBridge } from 'electron';
import * as preload from '../src/ui/windowPreload';
const expect = chai.expect;


describe('configPreload ', async () => {


    before(async () => {

    })

    it('api methods must exists', async () => {

        expect(preload.api).exist;
        expect(preload.api.on).exist;
        expect(preload.api.emit).exist;
    })
})