import { net } from "electron";
import { setIntervalAsync } from "set-interval-async";
import { BaseService } from "./baseService";
import { EventService } from "./eventsService";
import { Util } from "./util";


/**
 * @summary describes a release item over github.com 
 */
export interface ReleaseItem {
    name: string, draft: boolean, prerelease: boolean, published_at: string, publish_time: number, assets: { url: string, name: string, content_type: string, download_url: string }[]
}

/**
 * @summary update check service, if a new version exits on github
 */
export class UpdateService extends BaseService {

    constructor(protected events: EventService) {
        super(events);
        this.startChecking();
    }


    private async curl(hostname: string, path: string) {
        const response: Buffer = await new Promise((resolve, reject) => {

            const buflist: Buffer[] = [];
            const request = net.request({
                method: 'GET',
                protocol: 'https:',
                hostname: hostname,
                path: path,
                redirect: 'follow'
            });
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
            request.setHeader('Accept', "Accept: application/vnd.github.v3+json");
            request.end();
        });
        return response;
    }

    async getReleaseList(): Promise<ReleaseItem[]> {
        const response = await this.curl('api.github.com', '/repos/ferrumgate/secure.client/releases');

        const items = JSON.parse(response.toString('utf-8'));
        return items.map((x: any) => {
            let draft: ReleaseItem = {
                name: x.name, draft: x.draft, prerelease: x.prerelease, published_at: x.published_at, publish_time: new Date(x.publish_time).getTime(), assets: []
            };
            x.assets.map((y: any) => {
                draft.assets.push({ url: y.url, name: y.name, content_type: y.content_type, download_url: y.browser_download_url })
            })
            return draft;
        });

    }

    private startChecking() {
        setIntervalAsync(async () => {
            this.logInfo('checking update');
            try {

                await this.check();


            } catch (err: any) {
                this.logError(err.toString());
            }
        }, 1 * 60 * 60 * 1000);
    }


    async check(): Promise<{ name: string }[] | null> {
        const currentVersion = await Util.getAppVersion();
        if (!currentVersion) {
            this.logWarn('current version is null');
            return null;
        }

        const currentVersionAsNumber = Util.convertAppVersionToNumber(currentVersion);
        if (!currentVersionAsNumber) {
            this.logWarn('current version is 0');
            return null;
        }

        const releases = await this.getReleaseList();
        const platform = Util.getPlatform();
        let arch = Util.getArch() as string;
        if (arch == 'x64')
            arch = 'amd64';//electron-builder use amd64

        this.logInfo(`current platform: ${platform},  arch:${arch}, version: ${currentVersion} versionNumber:${currentVersionAsNumber}`);
        //filter rlated platform and arch releases

        const filteredReleases = releases
            .filter(x => !x.prerelease).filter(x => !x.draft)
            .filter(x => x.assets.find(y => y.name.includes(platform)))
            .filter(x => x.assets.find(y => y.name.includes(arch)));


        const newReleases = filteredReleases.map(x => {
            return { name: x.name, assets: x.assets, version: Util.convertAppVersionToNumber(x.name), publish_date: x.publish_time }
        }).filter(x => x.version > currentVersionAsNumber);

        const sortedList = newReleases.sort((a, b) => {
            return -1 * (a.version - b.version);
        })



        if (sortedList.length && sortedList[0].version != currentVersionAsNumber) {
            this.logInfo(`new version founded ${sortedList[0].name}`);
            this.events.emit('release', sortedList[0].name);
        } else {
            this.logInfo(`no new version found`)
        }
        return sortedList;

    }





}