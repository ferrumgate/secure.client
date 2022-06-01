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

    async getConfig() {
        if (!fs.existsSync(this.filename)) return null;

        const file = (await fspromise.readFile(this.filename)).toString();
        return JSON.parse(file) as Config;
    }
    async saveConfig(config: Config) {
        await fspromise.mkdir(this.folder, { recursive: true });
        await fspromise.writeFile(this.filename, JSON.stringify(config));
    }



}