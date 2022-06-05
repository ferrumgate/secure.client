import path from 'path';
import fspromise from 'fs/promises';
import fs from 'fs';
import { app } from 'electron';

/**
 * @summary util functions
 */
export class Util {

    /**
     * @summary get current app version from package.json version field
     * @returns 
     */
    static async getAppVersion(): Promise<string | undefined> {
        var filePath = path.join(__dirname, '../', 'package.json');
        if (!fs.existsSync(filePath))
            filePath = path.join(__dirname, '../../', 'package.json');
        console.log(filePath);
        const packageFile = JSON.parse((await fspromise.readFile(filePath)).toString()) as any;
        return packageFile.version;
    }


    static convertAppVersionToNumber(version: string) {
        if (version.startsWith('v'))
            version = version.slice(1);
        const parts = version.split('.');
        if (parts.length != 3) return 0;//not valid
        let items = [];
        for (let i = 0; i < parts.length; ++i) {
            const nu = Number(parts[i])
            if (nu == undefined) return 0;//not valid
            items.push(parts[i].padStart(5, '0'));
        }
        return Number(items.join(''));
    }

    static getPlatform() {
        return process.platform;
    }
    static getArch() {
        const arch = process.arch;
        return arch;
    }


}