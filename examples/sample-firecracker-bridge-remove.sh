#!/bin/bash
BRIDGE_DEV="fc0"
BRIDGE_IP="172.16.0.1"
MASK_SHORT="/30"
NET_DEV="ens18"
TAP_DEV="tap0"

sudo ifconfig ${TAP_DEV} down
sudo brctl delif ${BRIDGE_DEV} ${TAP_DEV}
sudo ip tuntap del dev ${TAP_DEV} mode tap

sudo iptables -F
sudo iptables -F -t nat
sudo sysctl -w net.ipv4.ip_forward=0
sudo ip link set dev ${BRIDGE_DEV} down
sudo ip addr del ${BRIDGE_IP}${MASK_SHORT} dev ${BRIDGE_DEV}
sudo ip link del name ${BRIDGE_DEV} type bridge