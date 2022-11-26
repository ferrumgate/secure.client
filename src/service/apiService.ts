import { BaseHttpService } from "./baseService";
import { ConfigService } from "./configService";
import { EventService } from "./eventsService";
import { EventEmitter } from 'events';
import { BaseService } from './baseService';
import child_process from 'child_process';
import { net } from "electron";
import { Network } from "./worker/models";
import Axios, { AxiosRequestConfig } from "axios";

/**
 * @summary http requests
 */
export class ApiService extends BaseHttpService {




    constructor(protected url: string, protected events: EventService, private headless = false) {
        super(events);

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
            }
        };
        const response = await Axios.get(url.toString() + 'api/client/tunnel/ip', options)
        return response.data as { assignedIp: string, serviceNetwork: string };


    }

    public async confirmTunnel(tunnelKey: string) {
        console.log("/api/client/tunnel/confirm")
        let url = this.getUrl();

        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {
                TunnelKey: tunnelKey
            }
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
            }
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

    public async getExchangeToken() {
        console.log("/api/auth/exchangetoken")
        let url = this.getUrl();
        const response: Buffer = await new Promise((resolve, reject) => {

            const request = net.request({
                method: 'GET',
                protocol: url.protocol,
                hostname: url.hostname,
                port: this.urlPort(url),
                path: '/api/auth/exchangetoken',
                redirect: 'follow',

            });
            this.prepareRequest(request, resolve, reject);
            request.setHeader('Accept', "Accept: application/json");
            request.end();
        });
        return JSON.parse(response.toString()) as { token: string }
    }
    public async changeExchangeToken(token: string) {
        console.log("/api/auth/exchangetoken")
        let url = this.getUrl();
        const response: Buffer = await new Promise((resolve, reject) => {

            const request = net.request({
                method: 'POST',
                protocol: url.protocol,
                hostname: url.hostname,
                port: this.urlPort(url),
                path: '/api/auth/exchangetoken',
                redirect: 'follow',

            });
            this.prepareRequest(request, resolve, reject);
            request.setHeader('Accept', "Accept: application/json");
            request.setHeader('Content-type', 'application/json');
            request.write(JSON.stringify({ exchangeKey: token }));
            request.end();
        });
        return JSON.parse(response.toString()) as { accessToken: string, refreshToken: string }
    }

    public async refreshToken(accessToken: string, refreshToken: string) {
        console.log("/api/auth/refreshtoken")
        let url = this.getUrl();
        const response: Buffer = await new Promise((resolve, reject) => {

            const request = net.request({
                method: 'POST',
                protocol: url.protocol,
                hostname: url.hostname,
                port: this.urlPort(url),
                path: '/api/auth/refreshtoken',
                redirect: 'follow',

            });
            this.prepareRequest(request, resolve, reject);
            request.setHeader('Accept', "Accept: application/json");
            request.setHeader('Content-type', 'application/json');
            request.setHeader('Authorization', `Bearer ${accessToken}`);
            request.write(JSON.stringify({ refreshToken: refreshToken }));
            request.end();
        });
        return JSON.parse(response.toString()) as { accessToken: string, refreshToken: string }
    }
    public async getNetworks(accessToken: string) {
        console.log("/api/user/current/network")
        let url = this.getUrl();

        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        };

        const response = await Axios.get(url.toString() + 'api/user/current/network', options)

        return response.data as { items: Network[] };


    }

    public async createTunnel(accessToken: string, tunneKey: string) {
        console.log("/api/client/tunnel")
        let url = this.getUrl();

        let options: AxiosRequestConfig = {
            timeout: 15 * 1000,
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        };

        const response = await Axios.post(url.toString() + 'api/client/tunnel', { tunnelKey: tunneKey }, options)

        return response.data as {}



    }



}