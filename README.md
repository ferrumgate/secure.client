# secure.client
ssh based electronjs client for secure.server

### prepare
> npm install
### build 
> npm run build

### test
before testing start chromedriver with below command
> npm run preparefortest

then run test with
> npm run test

### start
> npm run start

### linux package
> npm run pack
### dist
> npm run build && npm run dist

### windows package
setting bash for npm run build
> npm config set script-shell "C:\\Program Files\\git\\bin\\bash.exe"
if you want to revert script-shell
> npm config delete script-shell
### dist
> npm run build && npm run distwin32
























macos
 
list all services
> networksetup -listallnetworkservices

get dns

> networksetup -getdnsservers $tun

set dns

>
