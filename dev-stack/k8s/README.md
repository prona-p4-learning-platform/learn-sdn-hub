# dev-stack
## Requirements
- [docker](https://docs.docker.com/engine/install)
- [k3d](https://k3d.io/stable/#releases)
- [helm](https://helm.sh/docs/intro/install/)
- [terraform](https://developer.hashicorp.com/terraform/install)

## Local cluster - k3d
In the directory `dev-stack/k8s` are some helper scripts to start/stop the local dev cluster.

You must be in the directory to run the scrips.
### Start

```shell
./start.sh
```

### Stop
```shell
./stop.sh
```

## DNS Entries
You must edit your local `/etc/hosts` and add some entries to access the components in the cluster.

```
127.0.0.1   rancher.local
127.0.0.1   prona.local
```

## Rancher
Default bootstrap password: `admin`

To change rancher settings edit `dev-stack/k8s/components/helm/rancher-values.yaml`.

## Import local images to k3d for dev
Build images in /frontend and /backend with:
```shell
docker build . -f learn-sdn-hub-frontend
docker build . -f learn-sdn-hub-backend
```
Import images to k3d cluster:
```shell
k3d image import learn-sdn-hub-frontend:latest -c learn-sdn-hub
k3d image import learn-sdn-hub-backend:latest -c learn-sdn-hub
```

## Cert-manager
To change cert-manager settings edit `dev-stack/k8s/components/helm/cert-manager-values.yaml`.

## Components in k8s cluster
- [nginx-ingress-controller](https://artifacthub.io/packages/helm/ingress-nginx/ingress-nginx)
- [fluxcd](https://fluxcd.control-plane.io/operator/install/)
- [cert-manager](https://cert-manager.io/)
- [rancher](https://www.rancher.com/)
