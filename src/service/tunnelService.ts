import { EventEmitter } from 'events';
import { BaseService } from './baseService';
import { ConfigService } from './configService';
import { EventService } from './eventsService';


export class TunnelService extends BaseService {
    /**
     * @summary tunnel status
     */
    status = {
        isOpened: false
    }

    protected sudoOptions = {
        name: 'Ferrum Gate',
        onstdout: (data: any) => { }
    };
    /**
     *
     */
    constructor(protected events: EventService, protected config: ConfigService) {
        super(events);

        this.events.on('openTunnel', async () => {
            try {
                await this.openTunnel();
            } catch (err: any) {
                this.logError(err.toString());
            }
        });
    }

    public async openTunnel() {

    }



}