#!/bin/bash
HOST=localhost PORT=1234 npx y-websocket
# can be used as: ws://localhost:1234

#with persistence (keeping document content for group after restart of environement and/or server):
#HOST=localhost PORT=1234 YPERSISTENCE=./dbDir node ./node_modules/y-websocket/bin/server.js