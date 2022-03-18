#!/bin/bash

# basic install depedencies
DEBIAN_FRONTEND=noninteractive apt-get -y update
DEBIAN_FRONTEND=noninteractive apt-get -y --no-install-recommends --fix-missing install \
  sudo \
  curl \
  git \
  ca-certificates \
  openssh-server

# add a user p4 with password p4 as used by common p4 tutorials
useradd -m -d /home/p4 -s /bin/bash p4
echo "p4:p4" | chpasswd
echo "p4 ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
su p4
cd /home/p4

# install packages needed for common assignments
sudo DEBIAN_FRONTEND=noninteractive apt-get -y --no-install-recommends --fix-missing install \
  tmux \
  iperf \
  iperf3 \
  net-tools \
  iputils-ping \
  iputils-tracepath \
  mtr \
  htop \
  tcpdump \
  tshark \
  wget \
  unzip \
  vim \
  joe \
  nano

# install node, needed to run language server proxy
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo DEBIAN_FRONTEND=noninteractive apt-get -y --no-install-recommends --fix-missing install \
  nodejs

# fetch typical tutorials and our p4-boilerplate and p4environment, so they can be used directly in the container for our courses
git clone https://github.com/jafingerhut/p4-guide
# install scripts provided in p4-guide contain nearly everything we need for typical P4 assignments used in our masters' courses (e.g., p4c, bmv2, pi, mininet, ...)
# currently recommended version: install-p4dev-v2.sh
# cleanup afterwards, as we don't need sources etc. for the labs, (jafingerhut p4-guide build stuff occupies ~6 GB)
p4-guide/bin/install-p4dev-v2.sh && sudo rm -rf PI behavioral-model p4c grpc protobuf mininet install-details p4setup.bash p4setup.csh

###############################################################################
#
# all changes above this point will possibly cost you some hours of build
# time, as running install-p4dev-v2.sh can take some time compiling the
# entire p4 toolchain (PI behavioral-model p4c grpc protobuf mininet)
#
###############################################################################

git clone https://github.com/p4lang/tutorials

git clone https://github.com/nsg-ethz/p4-learning
git clone https://github.com/nsg-ethz/p4-utils
cd p4-utils && sudo ./install.sh
cd ..
# learning controller examples require bridge-utils
sudo DEBIAN_FRONTEND=noninteractive apt-get -y --no-install-recommends --fix-missing install \
  bridge-utils

# currently support for p4environment is disabled, due to missing netem support in the base container image
# also: p4environment kills eth0@ifXYZ interface providing ip address of container during stop
#
git clone https://gitlab.cs.hs-fulda.de/flow-routing/cnsm2020/p4environment
## CAUTION: p4environment can currently not be used with wsl2 under windows due to missing sch_netem module/support
## python modules would also be installed by p4environment on first use, psutil already installed for p4 tutorials
# should be "scapy>=2.4.3", but currently p4environment would still install 2.4.3 anyway
sudo pip install networkx "scapy==2.4.3" psutil numpy matplotlib scikit-learn pyyaml nnpy thrift
# fix for current mixup of python2 and python3 in p4-guide install script and p4environment deps still using python2
# luckily bm_runtime and sswitch_runtime do not seem to even use python3 stuff
ln -s /usr/local/lib/python3.6/site-packages/bm_runtime /home/p4/p4environment/bm_runtime && \
  ln -s /usr/local/lib/python3.6/site-packages/sswitch_runtime /home/p4/p4environment/sswitch_runtime

git clone https://github.com/prona-p4-learning-platform/p4-boilerplate
# make examples using p4 tutorials relative utils import work in boilerplate
ln -s tutorials/utils utils
# fix for current mixup of python2 and python3 in p4-guide install script
ln -s /usr/local/lib/python3.6/site-packages/bmpy_utils.py /home/p4/p4-boilerplate/Example3-LearningSwitch/bmpy_utils.py && \
  ln -s /usr/local/lib/python3.6/site-packages/bm_runtime /home/p4/p4-boilerplate/Example3-LearningSwitch/bm_runtime && \
  ln -s /usr/local/lib/python3.6/site-packages/sswitch_runtime /home/p4/p4-boilerplate/Example3-LearningSwitch/sswitch_runtime

# fetch language server proxy
git clone https://github.com/wylieconlon/jsonrpc-ws-proxy
cd jsonrpc-ws-proxy && npm install && npm run prepare
cd ~

# fetch our p4 langugage server/vscode extension
git clone https://github.com/prona-p4-learning-platform/p4-vscode-extension.git
cd p4-vscode-extension && npm install && cd server && npm run build && cp -a src/antlr_autogenerated build/
cd ~

# fetch python language server
pip install python-language-server

# configure language server proxy
cat << EOF >> jsonrpc-ws-proxy/servers.yml
langservers:
  p4:
    - node
    - /home/p4/p4-vscode-extension/server/build/server.js
    - --stdio
  python:
    - pyls
EOF

# finishing touches
# cleanup
sudo DEBIAN_FRONTEND=noninteractive apt-get -y clean

# copy start script example
# cat << EOF >> /home/p4/start-p4-container.sh

# ensure unix line breaks
#sudo chmod +x /home/p4/start-p4-container.sh
