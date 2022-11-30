
import chai from 'chai';
const expect = chai.expect;
import webdriver from 'selenium-webdriver';
import fs from 'fs';
import { ConfigService } from '../src/service/cross/configService';

describe.skip('configUI ', async () => {

    let driver: webdriver.ThenableWebDriver;
    let configService: ConfigService;
    before(async () => {
        configService = new ConfigService();
        driver = new webdriver.Builder()
            // The "9515" is the port opened by ChromeDriver.
            .usingServer('http://localhost:9515')
            .withCapabilities({
                'goog:chromeOptions': {
                    // Here is the path to your Electron binary.
                    binary: './node_modules/electron/dist/electron',
                    args: ['app=./build/src/main.js', '--config=true']
                }
            })
            .forBrowser('chrome') // note: use .forBrowser('electron') for selenium-webdriver <= 3.6.0
            .build()
        await driver.manage().setTimeouts({ implicit: 2000, pageLoad: 2000, script: 2000 })
        //const x = await driver.takeScreenshot();
        //fs.writeFileSync('/tmp/bd.png', new Buffer(x, 'base64'));
    })
    after(async () => {
        await driver.close();
    })
    beforeEach(async () => {

        //delete configservice file for resetting
        if (fs.existsSync(configService.filename))
            fs.unlinkSync(configService.filename);
    })

    it('config window must be opened', async () => {
        const title = await driver.findElement(webdriver.By.id('ferrumgate_config'));
        expect(title).exist;
    })


    it('version info check', async () => {

        const version = await driver.findElement(webdriver.By.id('el-version'));
        const value = await version.getText();
        expect(value).exist;

        expect(value.startsWith('1.')).to.be.true;

    })

    it('set server host and save', async () => {

        const version = await driver.findElement(webdriver.By.id('el-login'));
        const value = await version.getText();
        expect(value).to.equal('');
        await version.clear();
        await version.sendKeys('deneme.com');

        const save = await driver.findElement(webdriver.By.id('el-save-config'));
        await save.click();
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve('');
            }, 5000);
        })
        console.log(configService.filename);
        const config = await configService.getConfig();
        expect(config).exist;
        expect(config?.host).to.equal('deneme.com');


    })
})