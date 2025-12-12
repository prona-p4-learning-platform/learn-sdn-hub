check_dependency() {
  if ! command -v "$1" &> /dev/null; then
    echo "Error: '$1' not found in PATH"
    exit 1
  fi
}

check_cluster_exists() {
  if k3d cluster list -o json | jq -e '.[] | select(.name=="'"$CLUSTER_NAME"'")' > /dev/null; then
    delete_cluster
    create_cluster
  else
    create_cluster
  fi
}

create_cluster() {
  echo "creating cluster $CLUSTER_NAME"
  k3d cluster create $CLUSTER_NAME \
    --k3s-arg "--disable=traefik@server:*" \
    -p "80:80@loadbalancer" \
    -p "443:443@loadbalancer" \
    --servers 1 \
    --api-port 7428
  echo "done"
}

delete_cluster() {
  echo "deleting cluster $CLUSTER_NAME"
  k3d cluster delete $CLUSTER_NAME
}

wait_for_cluster_ready() {
  echo "waiting for k3d cluster to be ready"
  sleep 2
  kubectl wait --for=condition=Ready node/"k3d-$CLUSTER_NAME-server-0" --timeout=300s
}

terraform_apply() {
  wait_for_cluster_ready

  echo "Applying dependency in k3d cluster"
  cd components
  terraform init
  terraform apply -auto-approve
}