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
    --image rancher/k3s:v1.31.14-k3s1 \
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
  cd ..
}

wait_for_mongo_operator() {
  until kubectl api-resources --api-group="mongodbcommunity.mongodb.com" 2>/dev/null | grep -q "MongoDBCommunity"; do
    echo "MongoDB Operator not deployed yet. Retry in 10 sec."
    sleep 10
  done
}

wait_for_mongo_db() {
  echo "waiting for mongo db to be running..."
  kubectl wait --for=jsonpath='{.status.phase}'=Running mongodbcommunity/prona4-db -n learn-sdn-hub --timeout=300s
}

create_mongo_db() {
  kubectl apply -f crds/mongo-replica-set.yaml
  wait_for_mongo_db
  echo "creating mongo express..."
  kubectl apply -f crds/mongo-express.yaml
  echo "done"
}
