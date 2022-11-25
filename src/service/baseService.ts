import { EventService } from "./eventsService";

export class BaseService {
    /**
     *
     */
    constructor(protected events: EventService) {


    }

    logInfo(msg: string) {
        console.log(msg);
        this.events.emit('log', 'info', msg);
    }
    logError(msg: string) {
        console.log(msg);
        this.events.emit('log', 'error', msg);
    }
    logWarn(msg: string) {
        console.log(msg);
        this.events.emit('log', 'warn', msg);
    }
    notifyInfo(msg: string) {
        this.events.emit('notify', { type: 'info', msg: msg });
    }
    notifyError(msg: string) {
        this.events.emit('notify', { type: 'error', msg: msg });
    }
}


export class BaseHttpService extends BaseService {
    /**
    *
    */
    constructor(protected events: EventService) {
        super(events);

    }
    protected prepareRequest(request: Electron.ClientRequest, resolve: any, reject: any) {

        const buflist: Buffer[] = [];
        request.on('response', (response) => {
            if (response.statusCode == 200) {
                response.on('data', (chunk) => {
                    buflist.push(Buffer.from(chunk));
                });
                response.on('aborted', () => {
                    reject(new Error('response aborted'))
                })
                response.on('error', () => {
                    reject(new Error('response error'));
                })
                response.on('end', () => {
                    resolve(Buffer.concat(buflist));
                })
            } else
                reject(new Error(`http response status code: ${response.statusCode}`))


        });

        request.on('abort', () => {
            reject(new Error('aborted'));
        });
        request.on('error', (error) => {
            reject(error);
        });

    }
}
