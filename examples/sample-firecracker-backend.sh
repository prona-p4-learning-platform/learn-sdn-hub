#!/bin/bash
export BACKEND_HTTP_PORT="3001"
export BACKEND_TYPE="firecracker"

export FIRECRACKER_SOCKET_PATH_PREFIX="/tmp/firecracker.socket"
#export FIRECRACKER_KERNEL_IMAGE="/home/username/hello-vmlinux.bin"
#export FIRECRACKER_KERNEL_BOOT_ARGS=""
#export FIRECRACKER_ROOTFS_DRIVE="/home/username/hello-rootfs.ext4"
#export FIRECRACKER_KERNEL_IMAGE="/home/username/vmlinux.bin"
#export FIRECRACKER_KERNEL_BOOT_ARGS="console=ttyS0 reboot=k panic=1 pci=off"
#export FIRECRACKER_ROOTFS_DRIVE="/home/username/ubuntu.ext4"
export FIRECRACKER_KERNEL_IMAGE="/storage/ubuntu-firecracker/ubuntu-vmlinux"
export FIRECRACKER_KERNEL_BOOT_ARGS="console=ttyS0 reboot=k panic=1 pci=off"
export FIRECRACKER_ROOTFS_DRIVE="/storage/ubuntu-firecracker/ubuntu-containerlab.ext4"
export FIRECRACKER_VCPU_COUNT="4" 
export FIRECRACKER_MEM_SIZE_MIB="4096"
export FIRECRACKER_NETWORK_CIDR="172.16.0.0/24"
export FIRECRACKER_BRIDGE_INTERFACE="fc0"

#export FIRECRACKER_MAX_INSTANCE_LIFETIME_MINUTES=10
export FIRECRACKER_MAX_INSTANCE_LIFETIME_MINUTES=120
#export FIRECRACKER_MAX_INSTANCE_LIFETIME_MINUTES=1

export MONGODB_URL="mongodb+srv://<username>:<password>@cluster0.tdnvj.mongodb.net/learn-sdn-hub?retryWrites=true&w=majority"

export SSH_USERNAME="p4"
export SSH_PASSWORD="p4"

#Set-Location C:\Users\username\git\learn-sdn-hub
#npm run build
#Remove-Item -Path "backend\static\" -Recurse
#Copy-Item -Path "frontend\build\*" -Destination "backend\static\" -Recurse

cd /home/username/learn-sdn-hub/backend
npm run start:firecracker
