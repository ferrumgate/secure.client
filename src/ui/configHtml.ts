
(() => {


    const windowx = window as any;


    function notify(data: { type: string, msg: string }) {

        windowx.electronAPI.emit('notify', data);
    }




    let config: { host: string, id: string, sslVerify: boolean, protocol: string, certLogin:boolean } = { host: '', id: '', sslVerify: true, protocol: '' ,certLogin:false};
    function configInit() {

        document.querySelector('#myform')?.addEventListener('keypress', (e: any) => {
            var key = e.charCode || e.keyCode || 0;
            if (key == 13) {

                e.preventDefault();
            }
        })

        document.querySelector('#el-login')?.addEventListener('input', (e: any) => {

            config.host = e.target.value;
        })
        document.querySelector('#el-ssl-verify')?.addEventListener('click', (e: any) => {

            config.sslVerify = e.target.checked;
            windowx.electronAPI.emit('notify', { type: 'info', msg: 'Needs restart for applying verification' });
        })

        document.querySelector('#el-cert-login')?.addEventListener('click', (e: any) => {

            config.certLogin = e.target.checked;
        })


        document.querySelector('#el-close-window')?.addEventListener('click', () => {
            windowx.electronAPI.emit('closeOptionsWindow');
        })

        document.querySelector('#el-link-ferrumgate')?.addEventListener('click', () => {
            windowx.electronAPI.emit('openLink', 'https://ferrumgate.com');
        })


        document.querySelector('#el-save-config')?.addEventListener('click', () => {
            windowx.electronAPI.emit('saveConfig', config);
        })
        document.querySelector('#el-protocol')?.addEventListener('change', (ev: any) => {
            config.protocol = ev.target.value;
        })

        windowx.electronAPI.on('appVersionReply', (data: any) => {
            const versionEl = document.querySelector('#el-version');
            if (versionEl)
                versionEl.textContent = data;
        })

        windowx.electronAPI.emit('appVersion');
        function findProtocolIndex(val: string) {
            if (val == 'auto') return 0;
            if (val == 'udp') return 1;
            if (val == 'tcp') return 2;
            return 1;
        }

        windowx.electronAPI.on('configReply', (data: { host: string, id: string, sslVerify: boolean, protocol: string, certLogin:boolean }) => {
            console.log('reply config ' + new Date().toISOString());
            config = data;
            const inputServer = document.querySelector('#el-login') as HTMLInputElement;
            if (inputServer && config.host)
                inputServer.value = config.host;

            const inputSSLVerify = document.querySelector('#el-ssl-verify') as HTMLInputElement;
            if (inputSSLVerify && config)
                inputSSLVerify.checked = config.sslVerify;


            const inputProtocol = document.querySelector('#el-protocol') as HTMLSelectElement;
            if (inputProtocol && config)
                inputProtocol.selectedIndex = findProtocolIndex(config.protocol);

        })

        //display none all test buttons 

        if (windowx.electronAPI.node_env() != 'development') {
            document.querySelectorAll('.el-test-button').forEach(x => {
                x.classList.add('ferrum-display-none');
            })
        }
    }

    function testError() {
        (document.querySelector('dee') as any).textContent = 'adb';

    }
    function testError2() {
        windowx.electronAPI.emit('throwError', 'error from html');

    }



    window.onerror = function myErrorHandler(errorMsg, url, lineNumber) {
        const msg = `Something went wrong at file: ${url}  line: ${lineNumber} msg:${errorMsg}`;
        windowx.electronAPI.emit('log', 'error', msg);
        alert(msg);//or any message
        return false;
    }


    // Update initial weather when loaded
    document.addEventListener('DOMContentLoaded', () => {
        configInit();
    })
})();

