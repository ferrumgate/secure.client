import { Network } from "../cross/model";
import { TunnelService } from "./tunnelService";

export interface Cmd {
    type: 'logRequest' | 'tokenRequest' | 'tokenResponse' | 'tunnelFailed' | 'tunnelClosed' | 'tunnelOpened' | 'networkStatusReply' | 'networkStatusRequest' | 'confRequest' | 'confResponse';
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
        resolvTimes: number[],
        resolvErrorCount: number,
        tun?: string;
        isMasterResolv?: boolean;
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
    registries: { isExists: boolean, path: string, key?: string, value?: string }[];
    files: { isExists: boolean, path: string, sha256?: string }[];
    processes: { name: string }[];
    processSearch: string[];
    memory: { total: number, free: number };
    serial: { serial: string };
    encryptedDiscs: { isEncrypted: boolean }[];
    antiviruses: { isEnabled: boolean }[];
    firewalls: { isEnabled: boolean }[];
}

