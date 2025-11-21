#!/bin/bash
CLUSTER_NAME="learn-sdn-hub"

set -e

source ./helpers

echo "start dependency checks..."
check_dependency jq
check_dependency docker
check_dependency k3d
check_dependency terraform
check_dependency kubectl
echo "done"

check_cluster_exists
terraform_apply