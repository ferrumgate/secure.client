import { BaseHttpService } from "./baseService";
import { ConfigService } from "./cross/configService";
import { EventService } from "./eventsService";
import { EventEmitter } from 'events';
import { BaseService } from './baseService';
import child_process from 'child_process';
import { net } from "electron";
import { NetworkEx } from "./worker/models";
import Axios, { AxiosRequestConfig } from "axios";
import { safeStorage } from "electron/main";

/**
 * @summary http requests
 */
export class ApiService extends BaseHttpService {


    isRedirect = false;
    isRedirectChecked = false;
    constructor(protected url: string, protected events: EventService, protected cert?:string) {
        super(events);

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


    private urlPort(url: URL) {
        if (url.port)
            return Number(url.port);
        if (url.protocol.startsWith('https')) return 443;
        return 80;

    }
    public clear() {
        this.isRedirect = false;
        this.isRedirectChecked = false;
    }
    public async checkRedirect() {
        if (this.isRedirectChecked) return;
        if (this.url.startsWith('https://')) {
            this.isRedirectChecked = true;
            this.isRedirect = false;
            return;
        }
        let url = this.getUrl();
        const response: Buffer = await new Promise((resolve, reject) => {

            const request = net.request({
                method: 'GET',
                protocol: url.protocol as any,
                hostname: url.hostname,
                port: this.urlPort(url),
                path: '/api/test',
                redirect: 'follow',

            });

            this.prepareRequest(request, resolve, reject);
            request.setHeader('Accept', "Accept: application/json");
            request.on('redirect', () => {
                this.isRedirect = true;
            })
            request.end();
        });
        const data = response.toString();
        this.isRedirectChecked = true;
        return
    }

    public async test() {
        let url = this.getUrl();
        let statusCode = 0;
        const response: Buffer = await new Promise((resolve, reject) => {

            const request = net.request({
                method: 'GET',
                protocol: url.protocol as any,
                hostname: url.hostname,
                port: this.urlPort(url),
                path: '/api/test',
                redirect: 'follow',
            });

            this.prepareRequest(request, resolve, reject);
            request.setHeader('Accept', "Accept: application/json");

            request.on('response', (response) => {
                statusCode = response.statusCode as number;
            });
            request.end();
        });
        const data = response.toString();
        if (statusCode !== 200) throw new Error("HTTP error: " + statusCode);
        return JSON.parse(data) as { result: string };
    }


    public async getExchangeToken() {
        console.log("getExchangeToken")
        await this.checkRedirect();
        let url = this.getUrl();
        const response: Buffer = await new Promise((resolve, reject) => {

            const request = net.request({
                method: 'GET',
                protocol: url.protocol as any,
                hostname: url.hostname,
                port: this.urlPort(url),
                path: '/api/auth/exchangetoken',
                redirect: 'error',


            });

            this.prepareRequest(request, resolve, reject);
            request.setHeader('Accept', "Accept: application/json");
            request.end();
        });
        return JSON.parse(response.toString()) as { token: string }
    }
    public async changeExchangeToken(token: string) {
        console.log("changeExchangeToken")
        await this.checkRedirect();
        let url = this.getUrl();
        const response: Buffer = await new Promise((resolve, reject) => {

            const request = net.request({
                method: 'POST',
                protocol: url.protocol as any,
                hostname: url.hostname,
                port: this.urlPort(url),
                path: '/api/auth/exchangetoken',
                redirect: 'error',

            });
            this.prepareRequest(request, resolve, reject);
            request.setHeader('Accept', "Accept: application/json");
            request.setHeader('Content-type', 'application/json');
            request.write(JSON.stringify({ exchangeKey: token }));
            request.end();
        });
        return JSON.parse(response.toString()) as { accessToken: string, refreshToken: string, accessTokenExpiresAt: string, refreshTokenExpiresAt: string }
    }

    public async refreshToken(accessToken: string, refreshToken: string, timeInMs = 12 * 60 * 60 * 1000) {
        console.log("/api/auth/refreshtoken")
        await this.checkRedirect();
        let url = this.getUrl();
        const response: Buffer = await new Promise((resolve, reject) => {

            const request = net.request({
                method: 'POST',
                protocol: url.protocol as any,
                hostname: url.hostname,
                port: this.urlPort(url),
                path: '/api/auth/refreshtoken',
                redirect: 'error',

            });
            this.prepareRequest(request, resolve, reject);
            request.setHeader('Accept', "Accept: application/json");
            request.setHeader('Content-type', 'application/json');
            request.setHeader('Authorization', `Bearer ${accessToken}`);
            request.write(JSON.stringify({ refreshToken: refreshToken, timeInMs }));
            request.end();
        });
        return JSON.parse(response.toString()) as { accessToken: string, refreshToken: string, refreshTokenExpiresAt: string, accessTokenExpiresAt: string }
    }

    public async downloadCertificate(accessToken:string) {
        
        await this.checkRedirect();
        let url = this.getUrl();
        const response: Buffer = await new Promise((resolve, reject) => {

            const request = net.request({
                method: 'GET',
                protocol: url.protocol as any,
                hostname: url.hostname,
                port: this.urlPort(url),
                path: '/api/user/current/sensitiveData',
                redirect: 'error',

            });
            this.prepareRequest(request, resolve, reject);
            request.setHeader('Accept', "Accept: application/json");
            request.setHeader('Content-type', 'application/json');
            request.setHeader('Authorization', `Bearer ${accessToken}`);
            request.end();
        });
        const retData = await JSON.parse(response.toString()) as { cert?: {publicCrt?:string}, apiKey?:{key?:string} };
        return retData;

    }

    public async authenticateWithCert(cert:string){
        console.log("posting cert to /api/auth")
        await this.checkRedirect();
        let url = this.getUrl();
        const response: Buffer = await new Promise((resolve, reject) => {

            const request = net.request({
                method: 'POST',
                protocol: url.protocol as any,
                hostname: url.hostname,
                port: this.urlPort(url),
                path: '/api/auth',
                redirect: 'error',

            });

            this.prepareRequest(request, resolve, reject);
            request.setHeader('Accept', "Accept: application/json");
            request.setHeader('Cert', Buffer.from(cert).toString('base64'));
            request.end();
        });

        var retData=  JSON.parse(response.toString()) as { key: string }
        console.log("posting key to /api/auth/accesstoken")

        const response2: Buffer = await new Promise((resolve, reject) => {

            const request = net.request({
                method: 'POST',
                protocol: url.protocol as any,
                hostname: url.hostname,
                port: this.urlPort(url),
                path: '/api/auth/accesstoken',
                redirect: 'error',
            });

            this.prepareRequest(request, resolve, reject);
            request.setHeader('Accept', "Accept: application/json");
            request.setHeader('Content-type', 'application/json');
            request.write(JSON.stringify({ key: retData.key,timeInMs : 12 * 60 * 60 * 1000 }));
            request.end();
        });

        return  JSON.parse(response2.toString()) as { accessToken: string,refreshToken:string,accessTokenExpiresAt:string,refreshTokenExpiresAt:string }
    }


}