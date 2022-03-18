$env:HOST="localhost"
$env:PORT="1234"

cd backend
npx y-websocket-server
#YPERSISTENCE=./dbDir node ./node_modules/y-websocket/bin/server.js

