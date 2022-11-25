const windowx = window as any;


function notify(data: { type: string, msg: string }) {

    windowx.electronAPI.emit('notify', data);
}




let config: { host: string } = { host: '' };
function configInit() {
    document.querySelector('#el-login')?.addEventListener('input', (e: any) => {

        config.host = e.target.value;
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

    windowx.electronAPI.on('replyAppVersion', (data: any) => {
        const versionEl = document.querySelector('#el-version');
        if (versionEl)
            versionEl.textContent = data;
    })

    windowx.electronAPI.emit('appVersion');

    windowx.electronAPI.on('replyConfig', (data: { host: string }) => {
        config = data;
        const inputServer = document.querySelector('#el-login') as HTMLInputElement;
        if (inputServer && config.host)
            inputServer.value = config.host;
    })
    windowx.electronAPI.emit('config');
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

