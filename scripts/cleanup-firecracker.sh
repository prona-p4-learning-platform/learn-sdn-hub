#!/bin/bash
killall firecracker
rm /tmp/firecracker*

TAP_DEVICES=$(ip a | grep fctap | cut -d " " -f 2 | cut -d ":" -f 1)
for TAP_DEVICE in $TAP_DEVICES; do
  sudo brctl delif fc0 $TAP_DEVICE
  sudo ip tuntap del $TAP_DEVICE mode tap
done
