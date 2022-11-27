
import chai from 'chai';
const expect = chai.expect;
import webdriver from 'selenium-webdriver';
import fs from 'fs';
import { ConfigService } from '../src/service/configService';
import { ipcMain } from 'electron';
import { DriverService } from 'selenium-webdriver/remote';

describe.skip('statusUI ', async () => {

    let driver: webdriver.ThenableWebDriver;

    before(async () => {

        driver = new webdriver.Builder()
            // The "9515" is the port opened by ChromeDriver.
            .usingServer('http://localhost:9515')
            .withCapabilities({
                'goog:chromeOptions': {
                    // Here is the path to your Electron binary.
                    binary: './node_modules/electron/dist/electron',
                    args: ['app=./build/src/main.js', "--status=true"]
                }
            })
            .forBrowser('chrome') // note: use .forBrowser('electron') for selenium-webdriver <= 3.6.0
            .build()
        await driver.manage().setTimeouts({ implicit: 15000, pageLoad: 5000, script: 5000 })


    })
    after(async () => {
        await driver.quit();
    })
    beforeEach(async () => {

    })

    it('status window must be opened', async () => {
        const title = await driver.findElement(webdriver.By.css('#ferrumgate_status'));
        expect(title).exist;
    }).timeout(25000)


    it.skip('networks', async () => {

        ipcMain.emit('networkStatusReply', [
            { id: '123', name: 'name', sshHost: 'sdf', isWorking: 1 },
            { id: '1234', name: 'name4', sshHost: 'sdf4', isWorking: 1 },
        ])
        const elements = await driver.findElements(webdriver.By.css(`.el-ferrum-status-net-list > li`));

        expect(elements.length).to.equal(2);

    })

})