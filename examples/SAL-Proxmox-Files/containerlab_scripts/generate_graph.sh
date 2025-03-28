#!/bin/bash

# Check params
if [ $# -lt 2 ]; then
    echo "Error: LAB_NAME and GROUP_ID must be specified!"
    echo "Example: ./generate_graph.sh "test_lab" 5"
    exit 1
fi

LAB_NAME=$1
GROUP_ID=$2

# Replace all illegal characters with "_" (allowed are letters, numbers and underscores)
LAB_NAME=$(echo "$LAB_NAME" | sed 's/[^a-zA-Z0-9_]/_/g')

LAB_NAME="${LAB_NAME}_${GROUP_ID}"
TOPOLOGY_FILE="clab_${LAB_NAME}.yml"

# Start endless loop for monitoring and container start
while true; do
    clear
    echo "Check Containerlab status..."
    
    sudo clab inspect -t ${TOPOLOGY_FILE} &>/dev/null
    if [ $? -eq 1 ]; then
        echo "Wait for Containerlab start: $TOPOLOGY_FILE"
        sleep 1
    else
        # Dynamic selection of port based on GROUP_ID
        PORT=$((50080 + GROUP_ID))

        echo "Generate graph for '${TOPOLOGY_FILE}' on port ${PORT}"
        sudo clab graph --topo ${TOPOLOGY_FILE} --srv ":${PORT}"
    fi
done