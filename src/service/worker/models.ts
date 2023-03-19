import { Network } from "../cross/model";
import { TunnelService } from "./tunnelService";

export interface Cmd {
    type: 'logRequest' | 'tokenRequest' | 'tokenResponse' | 'tunnelFailed' | 'tunnelClosed' | 'tunnelOpened' | 'networkStatusReply' | 'networkStatusRequest';
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
