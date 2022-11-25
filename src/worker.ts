import { app } from 'electron';
import { EventService } from './service/eventsService';
import { Util } from './service/util';
import { ApiService } from './service/apiService';
import { BaseWorker } from './service/worker/baseWorker';
import yargs from 'yargs';








let events: EventService;
let api: ApiService;
let worker: BaseWorker;
// Don't show the app in the doc


export async function init(url: string, pipename: string) {

    events = new EventService(true);
    api = new ApiService(url, events, true);

    worker = new BaseWorker(pipename, events, api);
    worker.logInfo('starting worker');
    await worker.start();
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





