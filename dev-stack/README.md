# dev-stack
## Requirements
- [docker](https://docs.docker.com/engine/install)
- [k3d](https://k3d.io/stable/#releases)
- [helm](https://helm.sh/docs/intro/install/)
- 

## K3d
### Create local kubernetes cluster
```shell
k3d cluster create learn-sdn-hub --k3s-arg "--disable=traefik@server:*"
```

### Delete local kubernetes cluster
```shell
k3d cluster delete learn-sdn-hub
```