# Proxmox provider

(using [ProxmoxProvider.ts](/backend/src/providers/ProxmoxProvider.ts))

The backend also supports proxmox lxc to run the assignments.

```
export PROXMOX_NETWORK_CIDR="172.30.0.0/16"
export PROXMOX_NETWORK_GATEWAY_IP="172.30.0.1"

export PROXMOX_HOST="10.2.3.4:8006"
export PROXMOX_TOKENID="user@pam!learn-sdn-hub"
export PROXMOX_TOKENSECRET="34e..."

export PROXMOX_TEMPLATE_TAG="learn-sdn-hub-template"
export PROXMOX_TARGET_HOST="pvecompute2"

export PROXMOX_SSH_JUMP_HOST="10.1.2.3"
export PROXMOX_SSH_JUMP_HOST_PORT="22"
export PROXMOX_SSH_JUMP_HOST_USER="p4"
export PROXMOX_SSH_JUMP_HOST_PASSWORD="p4"

export PROXMOX_MAX_INSTANCE_LIFETIME_MINUTES=120
```

Connection to proxmox uses a token that is allowed to create lxc containers. Assignments are cloned from the specified template (`PROXMOX_TEMPLATE_TAG`) and placed as new lxc containers on the target host (`PROXMOX_TARGET_HOST`) in the proxmox cluster.

To isolate the lxc instances in proxmox, a separate (isolated) virtual network (`PROXMOX_NETWORK_CIDR`) should be created first and an lxc created as a router with an interface in the isolated virtual network for the assignment lxcs (`PROXMOX_NETWORK_GATEWAY_IP`) and an interface connecting to external networks. The router also acts as a jumphost on its external IP (`PROXMOX_SSH_JUMP_HOST`) to allow the backend to reach the isolated assignment instances. Another option would be to host the backend on the router.
