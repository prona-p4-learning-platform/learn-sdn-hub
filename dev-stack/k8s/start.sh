#!/bin/bash
CLUSTER_NAME="learn-sdn-hub"

set -e

source ./helpers.sh

echo "start dependency checks..."
check_dependency jq
check_dependency docker
check_dependency k3d
check_dependency terraform
check_dependency kubectl
echo "done"

echo "starting cluster..."
check_cluster_exists
terraform_apply
echo "done"

echo "install MongoDB..."
wait_for_mongo_operator
create_mongo_db
echo "done"