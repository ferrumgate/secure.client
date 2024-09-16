import { EventService } from './service/eventsService';
import yargs from 'yargs';
import { PipeClient } from './service/cross/pipeClient';
import child_process from 'child_process';


export async function init(pipename: string) {
    let events: EventService;
    let pipe: PipeClient;
    let prc: child_process.ChildProcessWithoutNullStreams | null = null;
    events = new EventService(true);
    pipe = new PipeClient(pipename);
    pipe.onData = async (data) => {
        try {
            if (prc)
                prc.kill();
        } catch (ignore) {

        }
        try {
            const cmd = JSON.parse(data.toString()) as { cmd: string, args: any[], env: any }
            prc = child_process.spawn(cmd.cmd, cmd.args, { env: { ...process.env, ...cmd.env } });
        } catch (ignore) {
            prc = child_process.spawn(data.toString());
        }

        process.on('exit', (code) => {
            pipe.write(Buffer.from(`process exit:${code}`));
            prc = null;
        })
        process.stdout.on('data', (data) => {

            pipe.write(data);
        })
        process.stderr.on('data', (data) => {
            pipe.write(data);
        })


    }

    process.on('SIGABRT', () => {
        if (prc)
            prc.kill();
        prc = null;
    })
    process.on('SIGTERM', () => {
        if (prc)
            prc.kill();
        prc = null;
    })
    process.on('SIGINT', () => {
        if (prc)
            prc.kill();
        prc = null;
    })
    await pipe.connect();
}

async function main() {
    const options = await yargs
        .option("s", { alias: "socket", type: "string", demandOption: true })
        .argv;
    await init(options.s);
}

main().catch(err => {
    console.log(err);
    //fs.appendFileSync('/tmp/test.log', JSON.stringify(err) + '\n');
    process.exit(1);
})