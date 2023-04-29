/**
 * @summary
 * @remark there is an other implementation on statusHtml
 */
export interface Network {
    id: string;
    name: string;
    action: 'allow' | 'deny';
    needs2FA: boolean;
    needsIp: boolean;
    needsTime: boolean;
    sshHost?: string;
    needsDevicePosture?: boolean;

}