# Firecracker provider

(using [FirecrackerProvider.ts](/backend/src/providers/FirecrackerProvider.ts))

The backend also supports Firecracker microVMs to run the assignments offering a balance between light-weight fast deployment and increased isolation compared to using docker containers. This can for example prevent situations where loops created in networks lead to high load of kernel processes when using containers.

```
export FIRECRACKER_SOCKET_PATH_PREFIX="/tmp/firecracker.socket"

export FIRECRACKER_KERNEL_IMAGE="/storage/ubuntu-firecracker/ubuntu-vmlinux"
export FIRECRACKER_KERNEL_BOOT_ARGS="console=ttyS0 reboot=k panic=1 pci=off"
export FIRECRACKER_ROOTFS_DRIVE="/storage/ubuntu-firecracker/ubuntu-containerlab.ext4"

export FIRECRACKER_VCPU_COUNT="4"
export FIRECRACKER_MEM_SIZE_MIB="4096"
export FIRECRACKER_MEM_BALLOON_SIZE_MIB="2048"

export FIRECRACKER_NETWORK_CIDR="172.16.0.0/24"
export FIRECRACKER_BRIDGE_INTERFACE="fc0"

export FIRECRACKER_MAX_INSTANCE_LIFETIME_MINUTES=120
```

To setup the firecracker bridge, see, e.g., provided [examples](/examples).
