# secure.client

ssh based electronjs client for secure.server

### prepare
>
> npm install
>
### build
>
> npm run build

### test

before testing start chromedriver with below command
> npm run preparefortest

then run test with
> npm run test

### start
>
> npm run start

### linux package
>
> npm run pack
>
### dist
>
> npm run build && npm run dist

### windows package

setting bash for npm run build
> npm config set script-shell "C:\\Program Files\\git\\bin\\bash.exe"
if you want to revert script-shell
> npm config delete script-shell
>
### dist
>
> npm run build && npm run distwin32

### dns problem solving

on linux

    show all
> resolvctl

    set dns

> resolvectl domain ${tun} '${resolvSearch}'

>resolvectl llmnr ${tun} false

>resolvectl default-route ${tun} false

>resolvectl dns ${tun} ${resolvIp}

on windows

    show dns searchlist

> reg query HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters /v SearchList

    show all

> netsh interface ip show dns

    set dns

> netsh interface ip set dns ${tun} static ${resolvIp}

    delete dns

> netsh interface ip delete dns ${tun} all

macos

    show all list

> scutil --dns

    list all services
> networksetup -listallnetworkservices

    get dns

> networksetup -getdnsservers $tun

    set dns

> networksetup -setdnsservers $tun 172.28.28.1

    search dns list

> networksetup -getsearchlist $tun

    set searchlist

> networksetup -setsearchlist $tun 172.28.28.1
