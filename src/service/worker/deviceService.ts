import { EventService } from "../eventsService";
import { Util } from "../util";
import { ClientDevicePosture, DevicePostureParameter, OSType } from "./models";
import os from 'os';
import child_process from 'child_process';
import fsp from 'fs/promises';
import fs from 'fs';

export class DeviceService {

    /**
     *
     */
    constructor(protected events: EventService
    ) {

    }

    logInfo(msg: string) {

        this.events.emit('log', 'info', msg);
    }
    logError(msg: string) {

        this.events.emit('log', 'error', msg);
    }
    logWarn(msg: string) {

        this.events.emit('log', 'warn', msg);
    }

    async getCurrentVersion(): Promise<string> {

        return await Util.getAppVersion() || '';

    }
    async getCurrentSHA256(): Promise<string> {

        return '';

    }

    async getHostname(): Promise<string> {
        return os.hostname();
    }

    async getMacs(): Promise<string[]> {

        let macs = new Set<string>();
        const interfaces = os.networkInterfaces();
        const keys = Object.keys(interfaces);

        keys.forEach(x => {
            const tmp = interfaces[x]?.map(y => y.mac).filter(x => x && x != '00:00:00:00:00:00');
            if (tmp)
                tmp.forEach(y => macs.add(y));

        })
        return [...macs];
    }

    async calculateSHA256(file: string) {

        const platform = os.platform();
        switch (platform) {
            case 'linux':
                {
                    const lines: string = (await Util.exec(`shasum -a 256 "${file}"`)) as string;
                    const sha256 = lines.split(' ')[0];
                    return sha256;
                }
            case 'win32':
                {
                    const lines: string = (await Util.exec(`cmd.exe /c certUtil -hashfile "${file}" SHA256`)) as string;
                    const sha256 = lines.replace(/\r/g, '').split('\n')[1];
                    return sha256;
                }
            case 'darwin':
                {
                    const lines: string = (await Util.exec(`shasum -a 256 "${file}"`)) as string;
                    const sha256 = lines.split(' ')[0];
                    return sha256;
                }
            default:
                throw new Error('not implemented for os:' + platform);
        }

    }
    async getPlatform() {
        return os.platform();

    }


    async getOS(): Promise<{ name: string, version: string }> {

        const platform = os.platform();
        switch (platform) {
            case 'linux':
                {
                    const result = (await Util.exec('uname -r')) as string;
                    const linuxversion = result.split('-')[0];
                    const distro = (await Util.exec(`cat /etc/os-release | grep "ID"|grep -v "LIKE"|tr -d '"'`)) as string;
                    const lines = distro.split('\n');
                    let osname = ''
                    let osversion = '';
                    lines.forEach(x => {
                        if (x.startsWith('ID='))
                            osname = x.split('=')[1];
                        if (x.startsWith('VERSION_ID='))
                            osversion = x.split('=')[1];
                    })

                    return { name: osname + ' ' + osversion, version: linuxversion };
                }
            case 'win32':
                {
                    let output = (await Util.exec(`wmic os get Caption,Version /value`)) as string;
                    let lines = output.replace(/\r/g, '').split('\n');
                    let osname = ''
                    let osversion = '';
                    lines.forEach(x => {
                        if (x.startsWith('Caption=')) {
                            osname = x.split('=')[1];
                            if (osname)
                                osname = osname.trim();
                        }
                        if (x.startsWith('Version=')) {
                            osversion = x.split('=')[1];
                            if (osversion)
                                osversion = osversion.trim();
                        }

                    })

                    return { name: osname, version: osversion?.split(' ')[0] };

                }
            case 'darwin':
                {
                    const output: string = (await Util.exec(`sw_vers`)) as string;
                    const lines = output.split('\n');
                    let osname = ''
                    let osversion = '';
                    lines.forEach(x => {
                        if (x.startsWith('ProductName:')) {
                            osname = x.split(' ')[1];
                        }
                        if (x.startsWith('OS Version:')) {
                            osversion = x.split(' ')[1];
                        }
                    })
                    return { name: osname?.trim(), version: osversion?.trim() };
                }
            default:
                throw new Error('not implemented for os:' + platform);
        }

    }


    async getFile(path: string): Promise<{ path: string, sha256?: string } | undefined> {

        const isExists = await fs.existsSync(path);
        if (isExists)
            return { path: path, sha256: isExists ? await this.tryCalculateSha256(path) : '' }
        return undefined;

    }
    async getRegistry(path: string, key?: string): Promise<{ path: string, key?: string, value?: string } | undefined> {

        if (os.platform() == 'win32') {
            const output = (await Util.exec(`reg query ${path} ${key ? '/v' : ''} ${key ? key : ''} 2> nul`)) as string;
            if (!output.includes('ERROR:'))
                return { path: path, key: key }
        } return undefined

    }
    async tryCalculateSha256(path: string) {
        return await this.tryCatchorDefault(async () => this.calculateSHA256(path), '');
    }
    async getProcessLike(names: string[]): Promise<{ path: string, sha256?: string }[]> {
        const search = names.map(x => x.toLowerCase());
        const platform = os.platform();
        switch (platform) {
            case 'linux':
                {
                    const result = (await Util.exec(`ps -eo pid | awk '{print "/proc/"$1"/exe"}' | xargs readlink -f  |sort|uniq`)) as string;
                    const lines = result.split('\n');
                    const processlist = [];
                    for (const line of lines) {
                        const finded = search.some(y => line.includes(y))
                        if (finded)
                            processlist.push({ path: line, sha256: await this.tryCalculateSha256(line) });
                    }

                    return processlist;
                }
            case 'win32':
                {
                    const output = (await Util.exec(`tasklist /FO list`)) as string;
                    const lines = output.replace(/\r/g, '').split('\n');
                    const processlist = [];
                    for (const line of lines) {
                        if (!line.startsWith('Image Name:'))
                            continue;
                        const process = line.split(':')[1];
                        const finded = search.some(y => process.includes(y))
                        if (finded)
                            processlist.push({ path: process.trim(), sha256: undefined/*  await this.tryCalculateSha256(line) */ });
                    }

                    return processlist;

                }
            case 'darwin':
                {
                    const result = (await Util.exec(`ps -eo comm | xargs which | sort | uniq -u`)) as string;
                    const lines = result.split('\n');
                    const processlist = [];
                    for (const line of lines) {
                        const finded = search.some(y => line.includes(y))
                        if (finded)
                            processlist.push({ path: line, sha256: await this.tryCalculateSha256(line) });
                    }

                    return processlist;
                }
            default:
                throw new Error('not implemented for os:' + platform);
        }
    }
    async getMemory(): Promise<{ total: number, free: number }> {
        return { total: os.totalmem(), free: os.freemem() }
    }
    async getSerial(sudo = false) {

        const platform = os.platform();
        switch (platform) {
            case 'linux':
                {
                    const result = (await Util.exec(`${sudo ? 'sudo' : ''} dmidecode -s system-serial-number`)) as string;
                    let serialNumber = result.trim();
                    if (!serialNumber) {
                        serialNumber = (await Util.exec(`${sudo ? 'sudo' : ''} dmidecode -s system-uuid`)) as string;
                    }
                    return { value: serialNumber.replace(/\n/g, '').trim() }
                }
            case 'win32':
                {
                    const output = (await Util.exec(`wmic bios get serialnumber`)) as string;
                    const lines = output.replace(/\r/g, '').split('\n');
                    let serialnumber = lines[1];
                    serialnumber = serialnumber?.trim()
                    if (!serialnumber || serialnumber == '0') {
                        const output = (await Util.exec(`wmic csproduct get uuid`)) as string;
                        const lines = output.replace(/\r/g, '').split('\n');
                        serialnumber = lines[1];
                    }
                    if (serialnumber)
                        serialnumber = serialnumber.trim()

                    return { value: serialnumber };

                }
            case 'darwin':
                {
                    const result = (await Util.exec(`system_profiler SPHardwareDataType`)) as string;
                    const lines = result.split('\n');
                    let serial = '';
                    let uuid = '';
                    for (const line of lines) {
                        if (line.includes('Serial Number'))
                            serial = line.split(':')[1];
                        if (line.includes('UUID'))
                            uuid = line.split(':')[1];
                    }
                    serial = serial?.trim();
                    if (serial && serial == '0')
                        serial = '';

                    uuid = uuid?.trim();
                    return { value: serial || uuid };
                }
            default:
                throw new Error('not implemented for os:' + platform);
        }

    }
    async getDiscEncrypted(): Promise<{ isEncrypted: boolean }[]> {
        const platform = os.platform();
        switch (platform) {
            case 'linux':
                {
                    const result = (await Util.exec(`lsblk|grep crypt|wc -l`)) as string;
                    return [{ isEncrypted: result.replace(/\n/g, '').trim() == '0' ? false : true }]
                }
            case 'win32':
                {
                    const output = (await Util.exec(`manage-bde -status 2> nul`)) as string;
                    const lines = output.replace(/\r/g, '').split('\n');
                    let isEncrytped = false;
                    for (const line of lines) {
                        if (line.includes('Lock Status')) {
                            let tmp = line.split(':')[1];
                            if (tmp)
                                tmp = tmp.trim();
                            if (tmp != 'Unlocked')
                                isEncrytped = true;
                        }

                    }

                    return [{ isEncrypted: isEncrytped }];

                }
            case 'darwin':
                {
                    const result = (await Util.exec(`diskutil info /System/Volumes/Data 2>/dev/null |grep FileVault`)) as string;
                    const lines = result.split('\n');
                    let serial = '';
                    let uuid = '';
                    let isEncrytped = false;
                    for (const line of lines) {
                        if (line.includes('FileVault')) {
                            let tmp = line.split(':')[1];
                            if (tmp)
                                tmp = tmp.trim();
                            if (tmp != 'No')
                                isEncrytped = true;
                        }
                    }

                    return [{ isEncrypted: isEncrytped }];
                }
            default:
                throw new Error('not implemented for os:' + platform);
        }
    }
    async getFirewall(): Promise<{ isEnabled: boolean }[]> {
        const platform = os.platform();
        switch (platform) {
            case 'linux':
                {
                    // const result = (await Util.exec(`lsblk|grep crypt|wc -l`)) as string;
                    return [{ isEnabled: false }]
                }
            case 'win32':
                {
                    const output = (await Util.exec(`netsh advfirewall show publicprofile`)) as string;
                    const lines = output.replace(/\r/g, '').split('\n');
                    let isEnabled = false;
                    for (const line of lines) {
                        if (line.startsWith('State')) {
                            let tmp = line.replace('State', '').trim();
                            if (tmp.toLowerCase() != 'off')
                                isEnabled = true
                        }

                    }

                    return [{ isEnabled: isEnabled }];

                }
            case 'darwin':
                {
                    const result = (await Util.exec(`pfctl -s info 2>/dev/null`)) as string;
                    const lines = result.split('\n');
                    let isEnabled = false;
                    for (const line of lines) {
                        if (line.includes('Status:')) {
                            let tmp = line.split(':')[1];
                            if (tmp)
                                tmp = tmp.trim();
                            if (!tmp.includes('Disabled')) {
                                isEnabled = true;
                            }
                        }
                    }

                    return [{ isEnabled: isEnabled }];
                }
            default:
                throw new Error('not implemented for os:' + platform);
        }
    }

    async getAntivirus(): Promise<{ isEnabled: boolean }[]> {
        const platform = os.platform();
        switch (platform) {
            case 'linux':
                {
                    // const result = (await Util.exec(`lsblk|grep crypt|wc -l`)) as string;
                    return [{ isEnabled: false }]
                }
            case 'win32':
                {
                    const output = (await Util.exec(`wmic /namespace:\\\\root\\SecurityCenter2 path AntivirusProduct get * /value`)) as string;
                    const lines = output.replace(/\r/g, '').split('\n');
                    let isEnabled = false;
                    for (const line of lines) {
                        if (line.includes('displayName')) {
                            console.log(line);
                            let tmp = line.split('=')[1];
                            if (tmp)
                                tmp = tmp.trim();


                        }
                        if (line.includes('productState')) {
                            let tmp = line.split('=')[1];
                            if (tmp) {
                                tmp = tmp.trim();

                                let result = Number(tmp) & 0x0000f000 & 0x1000;

                                if (result)
                                    isEnabled = true;
                            }

                        }

                    }


                    return [{ isEnabled: isEnabled }];

                }
            case 'darwin':
                {

                    return [{ isEnabled: false }];
                }
            default:
                throw new Error('not implemented for os:' + platform);
        }
    }

    async tryCatchorDefault<T>(func: () => Promise<T>, def: T) {
        try {
            return await func();
        } catch (err: any) {
            this.logError(err.message || err.toString())
            return def;
        }
    }
    async getRegistries(postures: DevicePostureParameter[]) {
        const platform = os.platform() as OSType;

        let results = [];
        const items = postures.filter(x => x.os == platform && x.registry).map(x => x.registry).filter(x => x)
        for (const item of items) {
            if (item) {
                let res = await this.tryCatchorDefault(async () => { return await this.getRegistry(item.path, item.key); }, undefined)
                if (res)
                    results.push(res);
            }
        }
        return results;
    }
    async getFiles(postures: DevicePostureParameter[]) {
        const platform = os.platform() as OSType;

        let results = [];
        const items = postures.filter(x => x.os == platform && x.file).map(x => x.file).filter(x => x)
        for (const item of items) {
            if (item) {
                let res = await this.getFile(item.path);
                if (res)
                    results.push(res);
            }
        }
        return results;
    }
    async getProcesses(postures: DevicePostureParameter[]) {
        const platform = os.platform() as OSType;

        let results: { path: string, sha256?: string }[] = [];
        const items = postures.filter(x => x.os == platform && x.process).map(x => x.process).filter(x => x)
        let search = await this.getProcessSearch(postures);
        if (search.length) {
            let res = await this.getProcessLike(search);
            results.push(...res);
        }
        return results;
    }

    async getProcessSearch(postures: DevicePostureParameter[]) {
        const platform = os.platform() as OSType;
        let search = [];
        const items = postures.filter(x => x.os == platform && x.process).map(x => x.process).filter(x => x)
        for (const item of items) {
            if (item && item.path)
                search.push(item.path)
        }
        return search;
    }

    async getDevice(clientId: string, devicePostures: DevicePostureParameter[]) {
        const device: ClientDevicePosture = {
            clientId: clientId,
            clientVersion: await this.tryCatchorDefault(this.getCurrentVersion, ''),
            clientSha256: await this.tryCatchorDefault(this.getCurrentSHA256, ''),
            hostname: await this.tryCatchorDefault(this.getHostname, ''),
            macs: await this.tryCatchorDefault(this.getMacs, []),
            os: await this.tryCatchorDefault(this.getOS, { name: '', version: '' }),
            platform: await this.getPlatform(),
            registries: await this.tryCatchorDefault(async () => { return await this.getRegistries(devicePostures) }, []),
            files: await this.tryCatchorDefault(async () => { return await this.getFiles(devicePostures) }, []),
            processes: await this.tryCatchorDefault(async () => { return await this.getProcesses(devicePostures) }, []),
            processSearch: await this.tryCatchorDefault(async () => { return this.getProcessSearch(devicePostures) }, []),
            memory: await this.tryCatchorDefault(this.getMemory, { total: 1, free: 1 }),
            serial: await this.tryCatchorDefault(this.getSerial, { value: '' }),
            encryptedDiscs: await this.tryCatchorDefault(this.getDiscEncrypted, [{ isEncrypted: false }]),
            antiviruses: await this.tryCatchorDefault(this.getAntivirus, [{ isEnabled: false }]),
            firewalls: await this.tryCatchorDefault(this.getFirewall, [{ isEnabled: false }]),

        }
        return device;
    }



}