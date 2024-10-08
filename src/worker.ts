import yargs from 'yargs';
import { EventService } from './service/eventsService';
import { TunnelController } from './service/worker/tunnelController';
import { TunnelApiService } from './service/worker/tunnelApiService';



export async function init(url: string, pipename: string) {
    let events: EventService;
    let api: TunnelApiService;
    let controller: TunnelController;

    events = new EventService(true);
    api = new TunnelApiService(url, events);

    controller = new TunnelController(pipename, events, api);
    controller.logInfo('starting worker');
    process.on('SIGTERM', async () => {
        await controller.stop();
    })
    process.on('SIGINT', async () => {
        await controller.stop();
    })
    process.on('SIGABRT', async () => {
        await controller.stop();
    })
    await controller.start();

}

async function main() {
    const options = await yargs
        .option("u", { alias: "url", type: "string", demandOption: true })
        .option("s", { alias: "socket", type: "string", demandOption: true })
        .argv;
    await init(options.u, options.s);
}

main().catch(err => {
    console.log(err);
    process.exit(1);
})





