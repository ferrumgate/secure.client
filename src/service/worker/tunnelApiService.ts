
import Axios, { AxiosRequestConfig } from "axios";
import { EventService } from "../eventsService";
import { ClientDevicePosture, DevicePostureParameter, NetworkEx } from "./models";
import https from 'https';
import { Config } from "../cross/configService";
/**
 * @summary http requests
 */
export class TunnelApiService {

    conf?: Config;
    constructor(protected url: string, protected events: EventService) {
        this.events.on('confResponse', (conf: Config) => {
            this.conf = conf;
        })

    }

    private createHttpsAgent() {
        return new https.Agent({
            rejectUnauthorized: this.conf?.sslVerify,
        })
    }

    private getUrl() {

        return new URL(this.url);
    }
    public setUrl(url: string) {

        this.url = url;
    }

    public async getTunnelAndServiceIpList(tunnelKey: string) {
        console.log("/api/client/tunnel/ip")
        let url = this.getUrl();

        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {
                TunnelKey: tunnelKey
            },
            httpsAgent: this.createHttpsAgent()

        };
        const response = await Axios.get(url.toString() + 'api/client/tunnel/ip', options)
        return response.data as { assignedIp: string, serviceNetwork: string, resolvIp?: string, resolvSearch: string };


    }

    public async confirmTunnel(tunnelKey: string) {
        console.log("/api/client/tunnel/confirm")
        let url = this.getUrl();

        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {
                TunnelKey: tunnelKey
            },
            httpsAgent: this.createHttpsAgent()
        };
        const response = await Axios.post(url.toString() + 'api/client/tunnel/confirm', {}, options)
        return response.data as {};


    }
    public async iAmAlive(tunnelKey: string) {
        let url = this.getUrl();

        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {
                TunnelKey: tunnelKey
            },
            httpsAgent: this.createHttpsAgent()
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
        let url = this.getUrl();

        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            httpsAgent: this.createHttpsAgent()
        };

        const response = await Axios.get(url.toString() + 'api/user/current/network', options)

        return response.data as { items: NetworkEx[] };


    }


    public async createTunnel(accessToken: string, tunneKey: string) {
        console.log("/api/client/tunnel")
        let url = this.getUrl();

        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            httpsAgent: this.createHttpsAgent()
        };

        const response = await Axios.post(url.toString() + 'api/client/tunnel', { tunnelKey: tunneKey }, options)

        return response.data as {}



    }
    public async getDevicePostureParameters(accessToken: string) {
        console.log("/api/user/current/device/posture/parameters")
        let url = this.getUrl();

        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            httpsAgent: this.createHttpsAgent()
        };

        const response = await Axios.get(url.toString() + 'api/user/current/device/posture/parameters', options)

        return response.data as { items: DevicePostureParameter[] };

    }
    public async saveDevicePosture(accessToken: string, posture: ClientDevicePosture) {
        console.log("/api/user/current/device/posture")
        let url = this.getUrl();

        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            httpsAgent: this.createHttpsAgent()
        };

        const response = await Axios.post(url.toString() + 'api/user/current/device/posture', posture, options)
        return response.data as {};


    }



}