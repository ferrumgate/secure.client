import child_process from 'child_process';
import { net } from "electron";
import { BaseService } from './baseService';
import { EventService } from './eventsService';
import { Util } from './util';
const sudo = require('../lib/sudoprompt')
import path from 'path';
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
        const start = `ELECTRON_RUN_AS_NODE=true ${process.execPath} ${workerJS} --url=${url} --socket=${pipename} \n`
        this.logInfo(`starting worker : ${start}`)
        root.stdin?.write(start);

    }

    /**
     * @summary start a bash shell with sudo
     * @returns 
     */
    public async startRootShell(isRoot = true) {
        if (this.isRootShellWorking) {
            this.events.emit('sudoIsReady');
            return;
        }
        this.logInfo(`starting root shell`);
        this.isRootShellWorking = true;
        if (isRoot) {
            sudo.exec('/bin/bash', this.sudoOptions, (error?: Error, stdout?: any, stderr?: any) => {
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
        } else { //for testing open
            const child = child_process.exec(`/bin/bash -c "echo SUDOPROMT"`, (error, stdout, stderr) => {
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
            this.sudoOptions.child = child;
            child.stdout?.on('data', async (data) => {

                this.sudoOptions.onstdout(data);
                if (data.startsWith("SUDOPROMPT")) {
                    this.events.emit('sudoIsReady');
                }
            });
            child.stderr?.on('data', (data) => {
                this.sudoOptions.onstderr(data)
            });
        }
    }

    async start() {
        const platform = Util.getPlatform()
        switch (platform) {
            case 'linux':
            case 'netbsd':
            case 'freebsd':
                await this.startRootShell();
            case 'win32':
                break;
            default:
                break;
        }
    }



}