#!/bin/bash
export BACKEND_HTTP_PORT="3001"
export BACKEND_TYPE="docker"

export DOCKER_SOCKET_PATH="/var/run/docker.sock"
#export DOCKER_HOST="192.168.229.129"
#export DOCKER_PORT="3000"
#export DOCKER_PROTOCOL="http"
export DOCKER_IMAGE="prona/p4-container"
export DOCKER_CMD="-s"
export DOCKER_MAX_INSTANCE_LIFETIME_MINUTES="120"
#export DOCKER_MAX_INSTANCE_LIFETIME_MINUTES="2"

export MONGODB_URL="mongodb+srv://admin:5LO9WyPavIE9OhZk@cluster0.tdnvj.mongodb.net/learn-sdn-hub?retryWrites=true&w=majority"

export SSH_USERNAME="p4"
export SSH_PASSWORD="p4"

#Set-Location C:\Users\fdai109\git\learn-sdn-hub
#npm run build
#Remove-Item -Path "backend\static\" -Recurse
#Copy-Item -Path "frontend\build\*" -Destination "backend\static\" -Recurse

cd /home/Kemaleb/Desktop/BachProj/learn-sdn-hub/backend
npm run start:docker
