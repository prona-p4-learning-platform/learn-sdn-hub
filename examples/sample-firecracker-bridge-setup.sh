#!/bin/bash
BRIDGE_DEV="fc0"
BRIDGE_IP="172.16.0.1"
MASK_SHORT="/24"
NET_DEV="ens18"
TAP_DEV="tap0"

sudo ip link add name ${BRIDGE_DEV} type bridge
sudo ip addr add ${BRIDGE_IP}${MASK_SHORT} dev ${BRIDGE_DEV}
sudo ip link set dev ${BRIDGE_DEV} up
sudo sysctl -w net.ipv4.ip_forward=1
sudo iptables --table nat --append POSTROUTING --out-interface ${NET_DEV} -j MASQUERADE
sudo iptables --insert FORWARD --in-interface ${NET_DEV} -j ACCEPT

sudo ip tuntap add dev ${TAP_DEV} mode tap
sudo brctl addif ${BRIDGE_DEV} ${TAP_DEV}
sudo ifconfig ${TAP_DEV} up