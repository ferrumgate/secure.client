import { EventService } from "./eventsService";

export class BaseService {
    /**
     *
     */
    constructor(protected events: EventService) {


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
}