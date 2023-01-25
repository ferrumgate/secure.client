import net from 'net';
import { Util } from '../util';
import path from 'path';

export class PipeServer {
    private buffer: Buffer = Buffer.from([]);
    private server: net.Server | null = null;
    private isDisconnected = false;
    private name: string = '';
    /**
     *
     */
    constructor(name: string) {
        this.name = name;
    }

    async listen() {
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
        this.server = net.createServer()
        this.server.on('connection', (socket: net.Socket) => {
            console.log(`client connected to ${filepath}`);
            this.onConnect(socket);


            socket.on('data', (data: Buffer) => {
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
        })
        this.server.on('close', () => {
            console.log(`pipe closing at ${filepath}`)
            this.onClose();
        })
        this.server.listen(filepath, () => {
            console.log(`pipe listening at ${filepath}`)
            this.onListen();
        })
    }

    onListen = async () => { };
    onData = async (data: Buffer) => { }
    onConnect = async (socket: net.Socket) => { };
    onError = async (error: Error) => { };
    onClose = async () => { };
    async write(socket: net.Socket, msg: Buffer) {
        let data = msg;
        let tmp = Buffer.from([0, 0, 0, 0]).slice(0, 4);
        let buffers = [tmp, data];
        let enhancedData = Buffer.concat(buffers)
        let len = data.length;
        enhancedData.writeInt32BE(len);//write how many bytes
        socket?.write(enhancedData);

    }
    async close() {
        this.server?.close();
    }
}