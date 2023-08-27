import { Network } from "../cross/model";
import { TunnelService } from "./tunnelService";

export interface Cmd {
    type: 'logRequest' | 'tokenRequest' | 'tokenResponse' | 'tunnelFailed' | 'tunnelClosed' | 'tunnelOpened' | 'networkStatusReply' | 'networkStatusRequest' | 'confRequest' | 'confResponse' | 'checkingDevice';
    data: any;
}
/**
 * @summary
 * @remark there is an other implementation on statusHtml
 */
export interface NetworkEx extends Network {

    tunnel: {
        lastTryTime: number;
        tryCount: number;
        lastError?: string;
        isWorking: boolean;
        assignedIp?: string,
        serviceNetwork?: string,
        resolvIp?: string,
        resolvSearch?: string,
        pingTimes: number[],
        pingErrorCount: number,
        dnsTimes: number[],
        dnsErrorCount: number;
        tun?: string;
        isMasterResolv?: boolean;
        isResolvConfigured?: boolean;
        resolvTunDomains?: { tun: string, domains: string[] }[]

    }
}

// this types comes from rest.portal project
export type OSType = 'win32' | 'darwin' | 'linux' | 'android' | 'ios';

/**
 * @summary Dynamic device posture
 */
export interface DevicePostureParameter {
    os: OSType;
    file?: { path: string };
    registry?: { path: string; key?: string };
    process?: { path: string };
}


export interface ClientDevicePosture {
    clientId: string;
    clientVersion: string;
    clientSha256: string;
    hostname: string;
    macs: string[]
    platform: string;
    os: { name: string, version: string };
    registries: { path: string, key?: string, value?: string }[];
    files: { path: string, sha256?: string }[];
    processes: { path: string, sha256?: string }[];
    processSearch: string[];
    memory: { total: number, free: number };
    serial: { value: string };
    encryptedDiscs: { isEncrypted: boolean }[];
    antiviruses: { isEnabled: boolean }[];
    firewalls: { isEnabled: boolean }[];
}

