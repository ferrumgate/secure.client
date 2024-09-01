
import Axios, { AxiosRequestConfig } from "axios";
import { EventService } from "../eventsService";
import { ClientDevicePosture, DevicePostureParameter, NetworkEx } from "./models";
import https from 'https';
import http from 'http'
import { Config } from "../cross/configService";
/**
 * @summary http requests
 */
export class TunnelApiService {

    conf?: Config;
    isRedirect = false;
    isRedirectChecked = false;
    constructor(protected url: string, protected events: EventService) {
        this.events.on('confResponse', (conf: Config) => {
            this.conf = conf;
        })

    }


    private createHttpsAgent(url: URL) {
        //if (url.protocol == 'http:')
        //    return undefined;
        return new https.Agent({
            rejectUnauthorized: this.conf?.sslVerify,
        })
    }
    private createHttpAgent(url: URL) {
        // if (url.protocol == 'https:')
        //    return undefined;
        return new http.Agent()

    }

    private getUrl() {
        let url = this.url;
        if (this.isRedirect && this.url.startsWith('http://'))
            url = this.url.replace('http://', 'https://');
        return new URL(url);
    }
    public setUrl(url: string) {
        this.isRedirectChecked = false;
        this.isRedirect = false;
        this.url = url;
    }

    public async checkRedirect() {
        if (this.isRedirectChecked) return;
        if (this.url.startsWith('https://')) {
            this.isRedirectChecked = true;
            this.isRedirect = false;
            return;
        }
        let url = this.getUrl();
        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {

            },
            httpsAgent: this.createHttpsAgent(url),
            httpAgent: this.createHttpAgent(url),
            maxRedirects: 0,
            validateStatus: (num) => {
                if (num == 301 || num == 302 || num == 200)
                    return true;
                return false
            }


        };
        const response = await Axios.get(url.toString() + 'api/test', options)
        if (response.status == 302 || response.status == 301)
            this.isRedirect = true;
        this.isRedirectChecked = true;
    }


    public async getTunnelAndServiceIpList(tunnelKey: string) {
        console.log("/api/client/tunnel/ip")
        await this.checkRedirect();
        let url = this.getUrl();

        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {
                TunnelKey: tunnelKey
            },
            httpsAgent: this.createHttpsAgent(url),
            httpAgent: this.createHttpAgent(url),
            maxRedirects: 0

        };
        const response = await Axios.get(url.toString() + 'api/client/tunnel/ip', options)
        return response.data as { assignedIp: string, serviceNetwork: string, resolvIp?: string, resolvSearch: string };


    }

    public async confirmTunnel(tunnelKey: string) {
        console.log("/api/client/tunnel/confirm")
        await this.checkRedirect();
        let url = this.getUrl();

        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {
                TunnelKey: tunnelKey
            },
            httpsAgent: this.createHttpsAgent(url),
            httpAgent: this.createHttpAgent(url),
            maxRedirects: 0
        };
        const response = await Axios.post(url.toString() + 'api/client/tunnel/confirm', {}, options)
        return response.data as {};


    }
    public async iAmAlive(tunnelKey: string) {
        await this.checkRedirect();
        let url = this.getUrl();

        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {
                TunnelKey: tunnelKey
            },
            httpsAgent: this.createHttpsAgent(url),
            httpAgent: this.createHttpAgent(url),
            maxRedirects: 0
        };
        const response = await Axios.get(url.toString() + 'api/client/tunnel/alive', options)
        return response.data as {};

    }
    private urlPort(url: URL) {
        if (url.port)
            return Number(url.port);

        if (url.protocol.startsWith('https')) return 443;
        return 80;


    }


    public async getNetworks(accessToken: string) {
        console.log("/api/user/current/network")
        await this.checkRedirect();
        let url = this.getUrl();

        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            httpsAgent: this.createHttpsAgent(url),
            httpAgent: this.createHttpAgent(url),
            maxRedirects: 0
        };

        const response = await Axios.get(url.toString() + 'api/user/current/network', options)
        return response.data as { items: NetworkEx[] };
    }


    public async createTunnel(accessToken: string, tunnelKey: string) {
        console.log("/api/client/tunnel")
        await this.checkRedirect();
        let url = this.getUrl();

        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            httpsAgent: this.createHttpsAgent(url),
            httpAgent: this.createHttpAgent(url),
            maxRedirects: 0
        };
        var data = { tunnelKey: tunnelKey, clientId: this.conf?.id }
        const response = await Axios.post(url.toString() + 'api/client/tunnel', { tunnelKey: tunnelKey, clientId: this.conf?.id }, options);
        //return response.data as {}
        return data;
    }

    public async getDevicePostureParameters(accessToken: string) {
        console.log("/api/user/current/device/posture/parameters")
        await this.checkRedirect();
        let url = this.getUrl();

        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            httpsAgent: this.createHttpsAgent(url),
            httpAgent: this.createHttpAgent(url),
            maxRedirects: 0
        };

        const response = await Axios.get(url.toString() + 'api/user/current/device/posture/parameters', options)
        return response.data as { items: DevicePostureParameter[] };
    }

    public async saveDevicePosture(accessToken: string, posture: ClientDevicePosture) {
        console.log("/api/user/current/device/posture")
        await this.checkRedirect();
        let url = this.getUrl();

        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            httpsAgent: this.createHttpsAgent(url),
            httpAgent: this.createHttpAgent(url),
            maxRedirects: 0
        };

        const response = await Axios.post(url.toString() + 'api/user/current/device/posture', posture, options)
        return response.data as {};
    }

}