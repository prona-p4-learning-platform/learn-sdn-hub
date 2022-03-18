#!/bin/bash

# basic install depedencies
DEBIAN_FRONTEND=noninteractive apt-get -y update
#DEBIAN_FRONTEND=noninteractive apt-get -y upgrade
DEBIAN_FRONTEND=noninteractive apt-get -y --no-install-recommends --fix-missing install \
  sudo \
  curl \
  git \
  ca-certificates \
  openssh-server

# add a user p4 with password p4 as used by common p4 tutorials
sudo useradd -m -d /home/p4 -s /bin/bash p4
echo "p4:p4" | chpasswd
echo "p4 ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/g' /etc/ssh/sshd_config

su p4
# continue in new script for user p4
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

# install openvswitch - needed to run mininet from the console without p4 etc.
sudo DEBIAN_FRONTEND=noninteractive apt-get -y --no-install-recommends --fix-missing install \
  openvswitch-switch

# install docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

sudo usermod -aG docker $USER
newgrp docker
#sudo systemctl enable docker.service
#sudo systemctl enable containerd.service

# install firecracker?

# install node, needed to run language server proxy
# alternative: use nvm?
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo DEBIAN_FRONTEND=noninteractive apt-get -y --no-install-recommends --fix-missing install \
  nodejs

# fetch typical tutorials and our p4-boilerplate and p4environment, so they can be used directly in the container for our courses
git clone https://github.com/jafingerhut/p4-guide
# install scripts provided in p4-guide contain nearly everything we need for typical P4 assignments used in our masters' courses (e.g., p4c, bmv2, pi, mininet, ...)
# currently recommended version: install-p4dev-v5.sh
p4-guide/bin/install-p4dev-v5.sh

# install-p4dev-v5.sh offers fast installation, but is not supporting python2 anymore, to be able to use python2, install-p4dev-v2.sh can be executed instead, though it will run ~100 minutes

# cleanup afterwards, as we don't need sources etc. for the labs, (jafingerhut p4-guide build stuff occupies ~6 GB)
#p4-guide/bin/install-p4dev-v2.sh && sudo rm -rf PI behavioral-model p4c grpc protobuf mininet install-details p4setup.bash p4setup.csh


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
## learning controller examples require bridge-utils
sudo DEBIAN_FRONTEND=noninteractive apt-get -y --no-install-recommends --fix-missing install \
  bridge-utils
cd /home/p4

# p4env currently still depends on python2

## currently support for p4environment is disabled, due to missing netem support in the base container image
## also: p4environment kills eth0@ifXYZ interface providing ip address of container during stop
##
#git clone https://gitlab.cs.hs-fulda.de/flow-routing/cnsm2020/p4environment
### CAUTION: p4environment can currently not be used with wsl2 under windows due to missing sch_netem module/support
### python modules would also be installed by p4environment on first use, psutil already installed for p4 tutorials
## should be "scapy>=2.4.3", but currently p4environment would still install 2.4.3 anyway
#sudo pip install networkx "scapy==2.4.3" psutil numpy matplotlib scikit-learn pyyaml nnpy thrift
## fix for current mixup of python2 and python3 in p4-guide install script and p4environment deps still using python2
## luckily bm_runtime and sswitch_runtime do not seem to even use python3 stuff
#ln -s /usr/local/lib/python3.6/site-packages/bm_runtime /home/p4/p4environment/bm_runtime && \
#  ln -s /usr/local/lib/python3.6/site-packages/sswitch_runtime /home/p4/p4environment/sswitch_runtime

git clone https://github.com/prona-p4-learning-platform/p4-boilerplate
# make examples using p4 tutorials relative utils import work in boilerplate
ln -s tutorials/utils utils

## fix for current mixup of python2 and python3 in p4-guide install script
#ln -s /usr/local/lib/python3.6/site-packages/bmpy_utils.py /home/p4/p4-boilerplate/Example3-LearningSwitch/bmpy_utils.py && \
#  ln -s /usr/local/lib/python3.6/site-packages/bm_runtime /home/p4/p4-boilerplate/Example3-LearningSwitch/bm_runtime && \
#  ln -s /usr/local/lib/python3.6/site-packages/sswitch_runtime /home/p4/p4-boilerplate/Example3-LearningSwitch/sswitch_runtime

# fetch language server proxy
git clone https://github.com/wylieconlon/jsonrpc-ws-proxy
cd jsonrpc-ws-proxy && npm install && npm run prepare

cd /home/p4
# fetch our p4 langugage server/vscode extension
git clone https://github.com/prona-p4-learning-platform/p4-vscode-extension.git
cd p4-vscode-extension && npm install && cd server && npm run build && cp -a src/antlr_autogenerated build/

cd /home/p4
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

sudo update-rc.d ssh enable
sudo update-rc.d openvswitch-switch enable

cat << EOF >> lsp.service
[Unit]
Description=LSP load balancer server
After=network.target

[Service]
Type=simple
Restart=always
RestartSec=1
KillMode=process
User=p4
WorkingDirectory=/home/p4/jsonrpc-ws-proxy
ExecStart=node dist/server.js --port 3005 --languageServers servers.yml

[Install]
WantedBy=multi-user.target
Alias=lsp-loadbalancer.service
EOF
sudo cp lsp.service /lib/systemd/system/
sudo systemctl enable lsp
