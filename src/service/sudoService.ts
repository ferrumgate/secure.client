import child_process from 'child_process';
import { net } from "electron";
import { BaseService } from './baseService';
import { EventService } from './eventsService';
import { Util } from './util';
const sudo = require('../lib/sudoprompt')
import path from 'path';
import childprocess from 'child_process';
import { PipeClient } from './cross/pipeClient';
/**
 * @summary sudo service that creates a sudo bash
 */
export class SudoService extends BaseService {
    windowsToken: string = '';

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
    setToken(token: string) {
        this.windowsToken = token;
    }

    /**
 * when windows user click open, connect to win32 svc and start ui
 */
    async trigger_win32_svc(url: string, socket: string) {


        const pipe = new PipeClient('ferrumgate');
        pipe.onConnect = async () => {
            this.logInfo(`connected to ferrumgate svc pipe`);
            // await pipe.write(Buffer.from(`connectWith ${this.windowsToken} ${url} ${socket}`));
            await pipe.write(Buffer.from(`connect ${url} ${socket}`));
        }
        pipe.onError = async (err: Error) => {

            this.logError(`connecto ferrumgate svc failed:${err.message}`);
            pipe.close();

        };

        pipe.onData = async (data) => {
            const msg = data.toString('utf-8');
            if (msg.startsWith("ok")) {
            }
            else {

            }
            pipe.close();
        }
        await pipe.connect();


    }

    /**
 * @summary opened bash with sudo
 * @returns 
 */
    public async runWorker(url: string, pipename: string) {
        const workerJS = path.join(__dirname, '../worker.js')
        const root = this.sudoOptions.child as unknown as child_process.ChildProcess;
        const platform = Util.getPlatform()
        switch (platform) {
            case 'linux':
            case 'netbsd':
            case 'freebsd':
            case 'darwin':
                {
                    const start = `ELECTRON_RUN_AS_NODE=true ${process.execPath} ${workerJS} --url=${url} --socket=${pipename} \n`
                    this.logInfo(`starting worker : ${start}`)
                    root.stdin?.write(start);
                }
                break;


            case 'win32':
                {
                    //root.stdin?.write(`set  ELECTRON_RUN_AS_NODE=true \r\n`);
                    //const start = `${process.execPath} ${workerJS} --url=${url} --socket=${pipename} \r\n`
                    //this.logInfo(`starting worker : ${start}`)
                    //root.stdin?.write(start);
                    this.logInfo(`starting worker on service`);
                    await this.trigger_win32_svc(url, pipename);
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
                            this.logInfo(`root shell exited ${stdout}`);
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
                break;
            case 'darwin':
                await this.startRootShell(true, '/bin/bash -c "echo SUDOPROMPT;/bin/bash"');
                break;
            case 'win32':
                await this.windowsStartShell();
                break;
            default:
                break;
        }
    }



}