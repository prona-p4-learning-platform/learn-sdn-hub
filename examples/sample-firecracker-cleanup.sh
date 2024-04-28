#!/bin/bash
killall firecracker
rm -rf /tmp/firecracker*
#killall "npm run start"
killall "npm run start:firecracker"
TAPS=$(ip link | grep fctap | cut -d " " -f 2 | cut -c 1-8)
for TAP in $TAPS
do
  sudo ip link del $TAP
done