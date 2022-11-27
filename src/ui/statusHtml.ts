

(() => {
    const windowx = window as any;


    function notify(data: { type: string, msg: string }) {

        windowx.electronAPI.emit('notify', data);
    }



    function statusInit() {


        document.querySelector('#el-close-window')?.addEventListener('click', () => {
            windowx.electronAPI.emit('closeStatusWindow');
        })

        document.querySelector('#el-link-ferrumgate')?.addEventListener('click', () => {
            windowx.electronAPI.emit('openLink', 'https://ferrumgate.com');
        })


        function escapeHtml(str: string) {
            return str.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
                return '&#' + i.charCodeAt(0) + ';';
            });
        }
        function getRow(name: string, css0: string, css1: string, css2: string, css3: string, why: string) {
            return `
            <li class="list-group-item">
          
            <div class="ferrum-status-network-item ${escapeHtml(css0)}">

            <img class="img-circle media-object pull-left" src="../assets/img/logo.png"
            width="24" height="24">
                <div class="ferrum-status-network-item-name">${escapeHtml(name)}</div>
                <div class="ferrum-status-network-item-status">
                    <span style="padding-left: 10px;">${escapeHtml(why)}</span>
                    <span class="icon icon-check ${escapeHtml(css1)}" style="color:green ;font-size: 18px;"></span>
                    <span class="icon icon-cancel ${escapeHtml(css2)}"" style="color:red ;font-size: 18px;"></span>
                    <span class="icon icon-help ${escapeHtml(css3)}"" style="color:red ;font-size: 14px;"></span>

                </div>
            </div>
            </li>
                    `
        }
        interface Network {
            id: string;
            name: string;
            action: 'allow' | 'deny'
            needs2FA: boolean,
            needsIp: boolean,
            sshHost?: string
            tunnel: {
                lastTryTime: number;
                tryCount: number;
                lastError?: string;
                isWorking?: boolean;
            }
        }


        windowx.electronAPI.on('networkStatus', (data: Network[]) => {
            if (!data) return;
            const tbody = document.querySelector('#el-ferrum-status-net-list') as HTMLInputElement;
            let results = '';
            for (const network of data) {
                let css0 = '';
                let css1 = '';
                let css2 = '';
                let css3 = '';
                let why = '';
                if ((network.needs2FA || network.needsIp || !network.sshHost)) {
                    css0 = 'skipped';
                    css1 = 'ferrum-display-none';
                    css2 = 'ferrum-display-none';
                    css3 = '';
                    why = network.needs2FA ? 'needs 2FA' : '';
                    why += network.needsIp ? "location does not match" : '';
                    why += (!network.sshHost) ? 'network host invalid' : '';
                } else
                    if (network.tunnel.isWorking) {
                        css0 = 'ok';
                        css1 = '';
                        css2 = 'ferrum-display-none';
                        css3 = 'ferrum-display-none';
                        why = '';
                    } else {
                        css0 = 'failed';
                        css1 = 'ferrum-display-none';
                        css2 = '';
                        css3 = 'ferrum-display-none';
                        why = network.tunnel.lastError || 'unknown error';
                    }
                results += getRow(network.name, css0, css1, css2, css3, why);
            }
            if (results) {
                tbody.innerHTML = results;
            }
            else tbody.innerHTML = '<div></div>';


        })


        windowx.electronAPI.on('replyAppVersion', (data: any) => {
            const versionEl = document.querySelector('#el-version');
            if (versionEl)
                versionEl.textContent = data;
        })
        windowx.electronAPI.on('logFileReply', (data: any) => {
            console.log(data);
            const logFile = document.querySelector('#el-logfile');
            if (logFile) {
                logFile.setAttribute('href', `file://${data}`);
                logFile.textContent = `file://${data}`;
            }
        })

        windowx.electronAPI.emit('appVersion');
        windowx.electronAPI.emit('logFile');
        windowx.electronAPI.emit('networkStatusRequest');



    }


    window.onerror = function myErrorHandler(errorMsg, url, lineNumber) {
        const msg = `Something went wrong at file: ${url}  line: ${lineNumber} msg:${errorMsg}`;
        windowx.electronAPI.emit('log', 'error', msg);
        alert(msg);//or any message
        return false;
    }

    // Update initial weather when loaded
    document.addEventListener('DOMContentLoaded', () => {

        statusInit();
    })

})();

