#!/bin/bash

# Check params
if [ $# -lt 3 ]; then
    echo "Error: LAB_NAME, GROUP_ID and HOST_ID must be specified!"
    echo "Example: ./start_container.sh "test_lab" 5 1"
    exit 1
fi

LAB_NAME=$1
GROUP_ID=$2
HOST_ID=$3

# Replace all illegal characters with "_" (allowed are letters, numbers and underscores)
LAB_NAME=$(echo "$LAB_NAME" | sed 's/[^a-zA-Z0-9_]/_/g')

#TOPOLOGY_FILE="clab_test_sal_topology_${GROUP_ID}.yml"
#LAB_NAME="test_sal_${GROUP_ID}"

LAB_NAME="${LAB_NAME}_${GROUP_ID}"
TOPOLOGY_FILE="clab_${LAB_NAME}.yml"

# Start endless loop for monitoring and container start
while true; do
    clear  # Terminal aufräumen
    echo "Check Containerlab status..."
    
    sudo clab inspect -t ${TOPOLOGY_FILE} &>/dev/null
    if [ $? -eq 1 ]; then
        echo "Wait for Containerlab start: $TOPOLOGY_FILE"
        sleep 1
    else
        # Dynamic selection of docker container based on HOST_ID
        TARGET_HOST="host${HOST_ID}"

        echo "Start terminal for: clab-${LAB_NAME}-${TARGET_HOST}"
        sudo docker exec -it clab-${LAB_NAME}-${TARGET_HOST} bash
    fi
done