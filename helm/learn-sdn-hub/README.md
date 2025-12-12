## start helm chart
```bash
helm install learn-sdn-hub . -n learn-sdn-hub \
        --set cert-manager.enabled=false \
        --set ingress-nginx.enabled=false
```