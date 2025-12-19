#!/bin/bash
CLUSTER_NAME="learn-sdn-hub"

set -e

source ./helpers.sh

delete_mongo_db
delete_cluster