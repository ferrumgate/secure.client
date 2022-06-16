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
