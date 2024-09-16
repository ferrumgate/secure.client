import net from 'net';
import path from 'path';
import { Util } from '../util';

export class PipeClient {
    private buffer: Buffer = Buffer.from([]);
    private socket: net.Socket | null = null;
    private isDisconnected = false;
    private name: string = '';
    /**
     *
     */
    constructor(name: string) {
        this.name = name;
    }

    async connect() {
        const platform = Util.getPlatform();
        let filepath = '';
        switch (platform) {
            case 'linux':
            case 'netbsd':
            case 'freebsd':
            case 'darwin':
                filepath = this.name.startsWith('/') ? this.name : '/tmp/' + this.name; break;
            case 'win32':
                filepath = this.name.startsWith("\\") ? this.name : path.join('\\\\?\\pipe', this.name); break;
            default:
                throw new Error('not implemented');
                break;

        }
        this.isDisconnected = false;
        this.socket = net.connect({
            path: filepath,
            writable: true, readable: true
        })
        this.socket.on('close', () => {
            if (!this.isDisconnected) {
                this.isDisconnected = true;
                this.onClose();
            }

        })

        this.socket.on('error', (err: Error) => {
            if (!this.isDisconnected) {
                this.isDisconnected = true;
                this.onError(err);
            }
        })
        this.socket.on('connect', () => {
            this.isDisconnected = false;
            this.onConnect();
        })

        this.socket.on('data', (data: Buffer) => {
            let bufs = [this.buffer, data];
            this.buffer = Buffer.concat(bufs);
            while (true) {
                if (this.buffer.length <= 4)
                    return;
                let len = this.buffer.readInt32BE(0);
                if (this.buffer.length < len + 4)// not enough body
                    return;
                const msglist = this.buffer.slice(4, 4 + len);
                this.buffer = this.buffer.slice(4 + len);

                this.onData(msglist);
            }

        });

    }

    onStdout = async (data: string) => { }
    onData = async (data: Buffer) => { }
    onConnect = async () => { };
    onError = async (error: Error) => { };
    onClose = async () => { };
    async write(msg: Buffer) {
        let data = msg;
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