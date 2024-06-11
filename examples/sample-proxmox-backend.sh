#!/bin/bash
export BACKEND_HTTP_PORT="3001"
export BACKEND_TYPE="proxmox"

export PROXMOX_MAX_INSTANCE_LIFETIME_MINUTES=5
#export PROXMOX_MAX_INSTANCE_LIFETIME_MINUTES=120
#export PROXMOX_MAX_INSTANCE_LIFETIME_MINUTES=1

export PROXMOX_NETWORK_CIDR="172.30.0.0/16"
export PROXMOX_NETWORK_GATEWAY_IP="172.30.0.1"

export PROXMOX_HOST="192.168.0.1:8006"
export PROXMOX_TOKENID="<proxmox-token-id>"
export PROXMOX_TOKENSECRET="<proxmox-token-secret>"

export PROXMOX_TEMPLATE_TAG="learn-sdn-hub-template"
export PROXMOX_TARGET_HOST="pve3"

export PROXMOX_SSH_JUMP_HOST="192.168.0.200"
export PROXMOX_SSH_JUMP_HOST_PORT="22"
export PROXMOX_SSH_JUMP_HOST_USER="p4"
export PROXMOX_SSH_JUMP_HOST_PASSWORD="p4"

export MONGODB_URL="mongodb+srv://<username>:<password>@cluster0.tdnvj.mongodb.net/learn-sdn-hub?retryWrites=true&w=majority"

export SSH_USERNAME="p4"
export SSH_PASSWORD="p4"

export NODE_EXTRA_CA_CERTS="/home/username/learn-sdn-hub/scripts/proxmox-cert.pem"

#Set-Location C:\Users\username\git\learn-sdn-hub
#npm run build
#Remove-Item -Path "backend\static\" -Recurse
#Copy-Item -Path "frontend\build\*" -Destination "backend\static\" -Recurse

cd /home/username/learn-sdn-hub/backend
npm run start:proxmox
