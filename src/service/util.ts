import path from 'path';
import fspromise from 'fs/promises';
import fs from 'fs';
import { safeStorage } from 'electron';
import childprocess from 'child_process';
import crypto from 'crypto';
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
    static async sleep(ms: number) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve('')
            }, ms);
        })
    }

    static async exec(cmd: string, throwStdErr = true) {
        return new Promise((resolve, reject) => {
            childprocess.exec(cmd, (error, stdout, stderr) => {
                if (error)
                    reject(error);
                else
                    if (stderr)
                        reject(stderr);
                    else
                        if (stdout)
                            resolve(stdout);
                        else
                            resolve('')
            })
        })
    }

    static randomNumberString(string_length: number = 8) {


        var chars = "0123456789abcdefghiklmnopqrstuvwxyzABCDEFGHIKLMNOPQRSTUVWXYZ";
        const bytes = crypto.randomBytes(string_length * 2);
        var randomstring = '';
        for (var i = 0; i < string_length; i++) {
            //var rnum = Math.floor(bytes[i] * chars.length);
            randomstring += chars[bytes[i] % chars.length];
        }
        return randomstring;
    }

}