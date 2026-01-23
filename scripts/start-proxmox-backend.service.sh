#!/bin/bash
. /root/.nvm/nvm.sh
export BACKEND_HTTP_PORT="11000"
export BACKEND_TYPE="proxmox"

#export PROXMOX_MAX_INSTANCE_LIFETIME_MINUTES=5
export PROXMOX_MAX_INSTANCE_LIFETIME_MINUTES=120
#export PROXMOX_MAX_INSTANCE_LIFETIME_MINUTES=1

export PROXMOX_NETWORK_CIDR="172.30.0.0/16"
export PROXMOX_NETWORK_GATEWAY_IP="172.30.0.1"

export PROXMOX_HOST="10.32.12.153:8006"
#export PROXMOX_TOKENID="learn-sdn-hub@pve!learn-sdn-hub"
#export PROXMOX_TOKENSECRET="9a20dacd-67c0-4e3f-9d27-a7ec574de2f6"
export PROXMOX_TOKENID="root@pam!root"
export PROXMOX_TOKENSECRET="85087e58-ac4e-4858-8971-c88f5188dd74"

export PROXMOX_TEMPLATE_TAG="learn-sdn-hub-template"
export PROXMOX_TARGET_HOST="pve3"

export PROXMOX_SSH_JUMP_HOST="10.33.19.17"
export PROXMOX_SSH_JUMP_HOST_PORT="22"
export PROXMOX_SSH_JUMP_HOST_USER="p4"
export PROXMOX_SSH_JUMP_HOST_PASSWORD="p4"

export MONGODB_URL="mongodb+srv://admin:5LO9WyPavIE9OhZk@cluster0.tdnvj.mongodb.net/learn-sdn-hub?retryWrites=true&w=majority"

export SSH_USERNAME="p4"
export SSH_PASSWORD="p4"

export NODE_EXTRA_CA_CERTS="/opt/learn-sdn-hub/scripts/proxmox-cert.pem"

#export BACKEND_ASSIGNMENT_TYPE="mongodb"

#Set-Location C:\Users\fdai109\git\learn-sdn-hub
#npm run build
#Remove-Item -Path "backend\static\" -Recurse
#Copy-Item -Path "frontend\build\*" -Destination "backend\static\" -Recurse

cd /opt/learn-sdn-hub/backend
npm run start:proxmox
