import child_process from 'child_process';
import { net } from "electron";
import { BaseService } from './baseService';
import { EventService } from './eventsService';
import { Util } from './util';
const sudo = require('../lib/sudoprompt')
import path from 'path';
import childprocess from 'child_process';
/**
 * @summary sudo service that creates a sudo bash
 */
export class SudoService extends BaseService {
    protected sudoOptions = {
        name: 'FerrumGate',
        onstdout: (data: any) => {
            if (data.startsWith("SUDOPROMPT")) {
                this.events.emit('sudoIsReady');
            }
        },
        onstderr: (data: any) => {
            if (data.startsWith("SUDOPROMPT")) {
                this.events.emit('sudoFailed');
            }
        },
        child: null
    } as { name: string, onstdout: any, onstderr: any, child: any };
    protected isRootShellWorking = false;
    protected isWorkerWorking = false;
    // we are using for test 
    public processLastOutput = '';
    /**
     *
     */
    constructor(event: EventService) {
        super(event);

    }
    /**
 * @summary opened bash with sudo
 * @returns 
 */
    public runWorker(url: string, pipename: string) {
        const workerJS = path.join(__dirname, '../worker.js')
        const root = this.sudoOptions.child as unknown as child_process.ChildProcess;
        const platform = Util.getPlatform()
        switch (platform) {
            case 'linux':
            case 'netbsd':
            case 'freebsd':
                {
                    const start = `ELECTRON_RUN_AS_NODE=true ${process.execPath} ${workerJS} --url=${url} --socket=${pipename} \n`
                    this.logInfo(`starting worker : ${start}`)
                    root.stdin?.write(start);
                }
                break;

            case 'win32':
                {
                    root.stdin?.write(`set  ELECTRON_RUN_AS_NODE=true \r\n`);
                    const start = `${process.execPath} ${workerJS} --url=${url} --socket=${pipename} \r\n`
                    this.logInfo(`starting worker : ${start}`)
                    root.stdin?.write(start);
                }

                break;
            default:
                break;
        }

    }



    /**
     * @summary start a bash shell with sudo
     * @returns 
     */
    private async startRootShell(isRoot = true, cmd: string) {
        if (this.isRootShellWorking) {
            this.events.emit('sudoIsReady');
            return;
        }
        this.logInfo(`starting root shell`);
        this.isRootShellWorking = true;
        if (isRoot) {
            sudo.exec(cmd, this.sudoOptions, (error?: Error, stdout?: any, stderr?: any) => {
                this.isRootShellWorking = false;
                if (error)
                    this.logError(error.message);
                else
                    if (stderr)
                        this.logError(stderr.toString());
                    else
                        if (stdout) {
                            this.logInfo("root shell exited");
                        }

            })
        }
    }

    async windowsStartShell() {
        if (this.isRootShellWorking) {
            this.events.emit('sudoIsReady');
            return;
        }
        this.isRootShellWorking = true;
        const child = child_process.spawn('cmd.exe');
        this.sudoOptions.child = child;
        this.sudoOptions.child = child;
        child.stdout.on('data', (data) => {
            this.sudoOptions.onstdout(data.toString());
        })
        child.stderr.on('data', (data) => {
            this.sudoOptions.onstdout(data.toString());
            this.sudoOptions.onstderr(data.toString());
        })
        this.events.emit('sudoIsReady');
    }

    async start() {
        const platform = Util.getPlatform()
        switch (platform) {
            case 'linux':
            case 'netbsd':
            case 'freebsd':
                await this.startRootShell(true, '/bin/bash');
            case 'win32':
                await this.windowsStartShell();
                break;
            default:
                break;
        }
    }



}