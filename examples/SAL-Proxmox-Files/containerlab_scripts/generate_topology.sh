#!/bin/bash

# Check params
if [ $# -lt 3 ]; then
    echo "Error: LAB_NAME, GROUP_ID and HOST_ID must be specified!"
    echo "Example: ./generate_topology.sh "test_lab" 5 1"
    exit 1
fi

LAB_NAME=$1
GROUP_ID=$2
HOST_ID=$3

# Replace all illegal characters with "_" (allowed are letters, numbers and underscores)
LAB_NAME=$(echo "$LAB_NAME" | sed 's/[^a-zA-Z0-9_]/_/g')

# Create ip-adresses
IP1="192.168.${GROUP_ID}.1"
IP2="192.168.${GROUP_ID}.2"

LAB_NAME="${LAB_NAME}_${GROUP_ID}"
TOPOLOGY_FILE="clab_${LAB_NAME}.yml"

# Check, if file exists to avoid overwriting
if [ -f "$TOPOLOGY_FILE" ]; then
    echo "File '$TOPOLOGY_FILE' already exists. Skip generation."
else
    echo "Create topology file: $TOPOLOGY_FILE"

    cat > "$TOPOLOGY_FILE" <<EOF
name: ${LAB_NAME}

topology:
  kinds:
    linux:
      image: wbitt/network-multitool:alpine-extra
  nodes:
    host1:
      kind: linux
      exec:
	    - apk add python3
        - ip addr add ${IP1}/24 dev eth1
        - ip link set eth1 up
    host2:
      kind: linux
      exec:
	    - apk add python3
        - ip addr add ${IP2}/24 dev eth1
        - ip link set eth1 up
  links:
    - endpoints: ["host1:eth1", "host2:eth1"]
EOF
fi

# Start endless loop for monitoring and container start
while true; do
    clear
    echo "Check Containerlab status..."
    
    sudo clab inspect -t ${TOPOLOGY_FILE} &>/dev/null
    if [ $? -eq 1 ]; then
        echo "Start Containerlab with topology: $TOPOLOGY_FILE"
        sudo clab deploy -t "$TOPOLOGY_FILE" &>/dev/null
    else
        echo "Containerlab already running."
    fi
    
    # Dynamic selection of docker container based on HOST_ID
    TARGET_HOST="host${HOST_ID}"

    echo "Start terminal for: clab-${LAB_NAME}-${TARGET_HOST}"
    sudo docker exec -it clab-${LAB_NAME}-${TARGET_HOST} bash
done
