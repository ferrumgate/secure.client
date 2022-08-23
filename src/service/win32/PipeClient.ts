
import * as fspromise from 'fs/promises'
import * as fs from 'fs';
import net from 'node:net';
import path from 'path';

export class PipeClient {
    private buffer: Buffer = Buffer.from([]);
    private socket: net.Socket | null = null;
    private isDisconnected = false;
    private name: string = '';
    /**
     *
     */
    constructor() {


    }

    async connect(name: string) {
        this.name = name;
        this.isDisconnected = false;
        this.socket = net.connect({
            path: path.join('\\\\?\\pipe', name),
            writable: true, readable: true,
        })


        this.socket.on('close', () => {
            if (!this.isDisconnected) {
                this.isDisconnected = true;
                this.onStdout(`disconnected:${this.name}`);
            }

        })
        this.socket.on('end', () => {
            if (!this.isDisconnected) {
                this.isDisconnected = true;
                this.onStdout(`disconnected:${this.name}`);
            }
        })
        this.socket.on('error', () => {
            if (!this.isDisconnected) {
                this.isDisconnected = true;
                this.onStdout(`disconnected:${this.name}`);
            }
        })
        this.socket.on('connect', () => {
            this.isDisconnected = false;
            this.onStdout(`connected:${this.name}`);
        })

        this.socket.on('data', (data: Buffer) => {
            let bufs = [this.buffer, data];
            this.buffer = Buffer.concat(bufs);
            if (this.buffer.length <= 4)
                return;
            let len = this.buffer.readInt32BE(0);
            if (this.buffer.length < len + 4)// not enough body
                return;
            const msglist = this.buffer.slice(4, 4 + len).toString('utf-8');
            this.buffer = this.buffer.slice(4 + len);

            this.onStdout(msglist);

        });


    }

    onStdout = async (data: string) => { }
    async write(msg: string) {
        let data = Buffer.from(msg, 'utf-8');
        let tmp = Buffer.from([0, 0, 0, 0]).slice(0, 4);
        let buffers = [tmp, data];
        let enhancedData = Buffer.concat(buffers)
        let len = data.length;
        enhancedData.writeInt32BE(len);//write how many bytes
        this.socket?.write(enhancedData);

    }
    async close() {
        this.socket?.destroy()
    }
}