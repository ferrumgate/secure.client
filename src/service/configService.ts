import { MenuItem, safeStorage, app } from "electron";
import fspromise from 'fs/promises'
import fs from 'fs';
import path from 'path';

/**
 * @summary system wide config interface
 */
export interface Config {
    host: string;
}

/**
 * @summary loads and saves @see Config in a safe environment
 */
export class ConfigService {
    protected _baseDirectory: string;
    protected _filename: string;
    protected conf: Config | null = null;
    /**
     *
     */
    constructor() {
        this._baseDirectory = path.join(app.getPath('appData'), 'ferrumgate');
        this._filename = 'ferrum.json';
    }

    get filename() {
        return path.join(this._baseDirectory, this._filename);
    }
    get folder() {
        return this._baseDirectory;
    }
    async getConf() {
        if (this.conf) return this.conf;
        this.conf = await this.getConfig();
        return this.conf;
    }

    async getConfig() {
        if (!fs.existsSync(this.filename)) return null;
        //console.log(`reading config file ${this.filename}`);
        const file = (await fspromise.readFile(this.filename)).toString();
        return JSON.parse(file) as Config;
    }
    async saveConfig(config: Config) {
        await fspromise.mkdir(this.folder, { recursive: true });
        //console.log(`saving config file ${this.filename}`);
        await fspromise.writeFile(this.filename, JSON.stringify(config));
        this.conf = config;
    }



}