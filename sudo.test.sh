#!/bin/bash

sudo ELECTRON_RUN_AS_NODE=true /work/projects/ferrum/secure.client/node_modules/.bin/electron \
    /work/projects/ferrum/secure.client/build/src/worker.js \
    --url=http://192.168.88.51 \
    --socket=/tmp/ferrumgate.sock
