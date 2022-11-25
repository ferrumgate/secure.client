import { TunnelService } from "./tunnelService";

export interface Cmd {
    type: 'logRequest' | 'tokenRequest' | 'tokenResponse' | 'tunnelFailed' | 'tunnelClosed' | 'tunnelOpened'
    data: any;
}

export interface Network {
    id: string;
    name: string;
    action: 'allow' | 'deny'
    needs2FA: boolean,
    needsIp: boolean,
    sshHost?: string
    tunnel: {
        lastTryTime: number;
        tryCount: number;
        process?: TunnelService;
    }
}
