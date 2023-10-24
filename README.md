# learn-sdn-hub

learn-sdn-hub offers an environment to experiment with Software-defined Networking (SDN) technologies like [P4](https://p4.org/). Though the use-case for learn-sdn-hub is not limited to teaching and learning SDN, allowing an easy entry to programmable data plane solutions was one of the main goals the tool was designed for. It is used for masters' and bachelors' courses in the area of network programmability at [Darmstadt University of Applied Sciences](https://fbi.h-da.de/en/study-with-us/laboratories/networks-telecommunications) and [Fulda University of Applied Sciences](https://www.hs-fulda.de/en/studies/departments/applied-computer-science/about-us/laboratories/netlab). learn-sdn-hub can also be used for different lab environments, esp. as long as terminal-based access to a lab environment, web-based configuration, programming tools and a provided lab exercise should be made available. Therefore, it could also be used for other teaching and exploratory learning approaches in the Dev, Ops as well as DevOps area.

Initial development was partially funded by the research programme [digLL](https://www.digll-hessen.de/), to improve digitally supported teaching and learning in Hesse, Germany.

## Features

* Web-based lab environment based on React and TypeScript
* Multiple assignments can be provided for users and deployed to hosts running the exercises' tasks
* Web-based access to terminals for each assigment based on [xterm.js](https://xtermjs.org/) (esp. using SSH)
* Editing of, e.g., SDN-related files, as well as other configuration or source code files used by the assignments, using web-based [monaco editor](https://microsoft.github.io/monaco-editor/)
* Augmentation of monaco editor to support SDN and P4 languages, facilitating development tasks by supporting features like auto completion, syntax highlighting, error feedback etc.
* Modular authentication backend (included are a simple single user, simple multi user and a MongoDB based authentication backend)
* Modular assignment host backend (included is an SSH backend for single user, multi user (using hosts, VMs, containers to run the assignments) and an OpenStack (VM), Docker (container) and Firecracker (microVM) provider starting and configuring instances to run the assignments)

The following figures show screenshots of the environment, used to teach the basic functions of a P4-based Layer 2 "learning" (flooding & filtering) switch:

![learn-sdn hub used for exploratory learning of the basic functions of a P4-based L2 switch](https://raw.githubusercontent.com/prona-p4-learning-platform/learn-sdn-hub/master/examples/screenshots/learn-sdn-hub-screenshot1-small.png "web-based environment with markdown lab sheet incl. mermaid figures/diagrams and monaco editor incl. code completion")

![gns3 proxy setup figure including external clients, backend servers and the proxy in the middle as well as its functions](https://raw.githubusercontent.com/prona-p4-learning-platform/learn-sdn-hub/master/examples/screenshots/learn-sdn-hub-screenshot2-small.png "terminal access to mininet and editing of Python code of the controller app in monaco editor")

The assignment shown in the screenshots was based on the [p4-boilerplate](https://github.com/prona-p4-learning-platform/p4-boilerplate). You can find the code and lab exercises in [Example3-LearningSwitch](https://github.com/prona-p4-learning-platform/p4-boilerplate/tree/main/Example3-LearningSwitch). [p4-container](https://github.com/prona-p4-learning-platform/p4-container) can be used as a host to run the tasks of the assignment.

## Quick start installation and configuration using provided Docker image

For test deployments you can use our provided docker image. It is not intended for production use cases. However, to get a self-contained environment that can be used to test learn-sdn-hub right away,
we provide a docker-compose file. Clone or download this repository and simply run

```sh
docker-compose up
```

This should get you a fully functional learn-sdn-hub deployment together with a [p4-container](https://github.com/prona-p4-learning-platform/p4-container) (based on [p4lang/p4app](https://github.com/p4lang/p4app) image) that can be used to test the assignments. You can use the typical docker-compose setup, e.g., ```docker-compose up -d``` and ```docker-compose down``` to start and stop the entire environment in the background. Configuration of required environment variables can be done using provided [.env](https://github.com/prona-p4-learning-platform/learn-sdn-hub/blob/master/.env) file. The contained parameters can also be overridden by setting env vars with the same name. You can use ```source examples/sample-config-env.sh``` as a starting point to set the environment variables.
Again, this is not intended to be used in production environments. Proper setup for production environments is described below.

If you change the IP address used for VBOX_IP_ADDRESSES in .env file for docker-compose, you can login using a user defined in BACKEND_USERS, e.g., user: user1 and password: password1, login to learn-sdn-hub and deploy assignments to the started p4-container or other hosts capable of compiling and running P4, you specified in the .env file.

To run learn-sdn-hub alone (without p4-container) using the docker image with contained default configuration and assignments, run for example:

```sh
export BACKEND_TYPE="localvm"
export VBOX_IP_ADDRESSES="127.0.0.1"
export VBOX_SSH_PORTS="22"
export SSH_USERNAME="p4"
export SSH_PASSWORD="p4"
docker run -it --rm -p 3001:3001 prona/learn-sdn-hub -t $BACKEND_TYPE -a $VBOX_IP_ADDRESSES -s $VBOX_SSH_PORTS -u $SSH_USERNAME -w $SSH_PASSWORD
```

The container image runs the backend using the provider specified by "-t". Possible providers are localvm, localmultiuservm and openstack. You can get further help regarding the options by running ```docker run -it --rm prona/learn-sdn-hub -h```. In the case of localvm or localmultiuservm backend type, VBOX_IP_ADDRESSES is expected to lead to a host or a list of hosts that can be reached using SSH (on the port specified by VBOX_SSH_PORTS, and login using SSH_USERNAME, SSH_PASSWORD). For P4 assignments, the host needs to contain all necessary P4 tools, p4c, bmv2, mininet etc. See next [section](#prepare-a-p4-host) for details, if you do not already have a host containing P4 toolchain (like P4 tutorials VM, p4-learning VM etc.)

Configuration of assignments, editable files, lab sheets, SSH consoles etc. needs to be done in backend/src/Configuration.ts. Assignment lab sheets need to be stored in backend/src/assigments. You can mount a local Configuration.ts file and a local assignments directory in the container using:

```sh
docker run -it --mount type=bind,source="$(pwd)"/assignments,target=/home/p4/learn-sdn-hub/backend/src/assignments --mount type=bind,source="$(pwd)"/Configuration.ts,target=/home/p4/learn-sdn-hub/backend/src/Configuration.ts --rm -p 3001:3001 prona/learn-sdn-hub -t $BACKEND_TYPE -a $VBOX_IP_ADDRESSES
```

Examples for the Configuration.ts file and the assignments directory are provided in [examples](https://github.com/prona-p4-learning-platform/learn-sdn-hub/tree/master/examples).

More sophisticated examples to run learn-sdn-hub in production environments are provided in [docker-container-scripts](https://github.com/prona-p4-learning-platform/learn-sdn-hub/tree/master/examples/docker-container-scripts).

The startup script [start-learn-sdn-hub.sh](https://github.com/prona-p4-learning-platform/learn-sdn-hub/tree/master/examples/start-learn-sdn-hub.sh) for the container image entrypoint can be used as a reference.

## Prepare a P4 host

(e.g. virtual machine/image/host) to be used by the backend to run P4 code and the language server for the monaco editor

Best way to get started and install a host that can be used to run P4 exercises is using the [p4 tutorials VM](https://github.com/p4lang/tutorials) 
and run it in VirtualBox or another hypervisor. You also need to give the machine an IP address that can be reached from the backend (see providers in next steps).
You can also prepare a Ubuntu VM by using the [installation scripts](https://github.com/jafingerhut/p4-guide/blob/master/bin/install-p4dev-v2.sh) from the p4 guide
repo. By default and for the following example configuration, we assume the VM to have a user p4 with password p4 (as the default for the p4 tutorial vms).

To install the LSP and the LSP load balancer in the VM, run the following in the VM (currently using latest production/stable version of node):

```sh
git clone https://github.com/wylieconlon/jsonrpc-ws-proxy
cd jsonrpc-ws-proxy
npm install
npm run prepare
```

Create a servers.yml file in the jsonrpc-ws-proxy directory containing the location of the p4 LSP, e.g.:

```yaml
langservers:
  p4:
    - node
    - /home/p4/p4-vscode-extension/server/build/server.js
    - --stdio
```

You can add further LSP so support additional languages in the LSP load balancer.
Install the p4 vscode extension in the VM (make sure that it will be in the location you specified in servers.yml file above, in
this case ```/home/p4/p4-vscode-extension/server/build/server.js```):

```sh
git clone https://github.com/prona-p4-learning-platform/p4-vscode-extension.git
cd p4-vscode-extension
npm install
cd server
npm run build
cp -a src/antlr_autogenerated build/
```

Start the LSP load balancer:

```sh
node dist/server.js --port 3005 --languageServers servers.yml
```

If everything went well, you should make sure that the LSP load balancer is started automatically when the VM starts. You can use a systemd unit like this for that:

```ini
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
ExecStart=/home/p4/.nvm/versions/node/v15.4.0/bin/node dist/server.js --port 3005 --languageServers servers.yml

[Install]
WantedBy=multi-user.target
Alias=lsp-loadbalancer.service
```

## Manual Installation

### Prerequisites

Both the host running the backend and frontend as well as the VM or host executing the p4 environment need node.js. To install it, you can use, e.g., nvm:

```sh
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash
nvm install
bash
```

Make sure to close and reopen the shell afterwards to have nvm automatically in your environment.

### Installation

```sh
git clone https://github.com/prona-p4-learning-platform/learn-sdn-hub.git
cd learn-sdn-hub
cd backend
npm install
npm run compile
cd ..
cd frontend
npm install
npm run build
```

You can copy the production build of the frontend to the static directory of the backend. This way, the frontend is included and served in the backend. See [Dockerfile](https://github.com/prona-p4-learning-platform/learn-sdn-hub/tree/master/Dockerfile)

### Run the backend using a local VM
(using [LocalVMProvider.ts](https://github.com/prona-p4-learning-platform/learn-sdn-hub/blob/master/backend/src/providers/LocalVMProvider.ts))

You can use a virtual machine or a physical or even your local machine and specify the IP address to be used by the backend to run P4 code and assignments. The machine must contain p4 tool chain (esp. [p4c](https://github.com/p4lang/p4c)) and needs to be reachable using SSH. Also, it should run the LSP load balancer, as described above. Start the backend:

```sh
export VBOX_IP_ADDRESSES=<IP addresses of the hosts to execute P4 on>
export VBOX_SSH_PORTS=<SSH ports of the hosts to execute P4 on>
export SSH_USERNAME=<Username to be used for the ssh connection, e.g., "p4">
export SSH_PASSWORD=<Password to be used for the ssh connection>
cd backend
npm run start:localvm
```

Optionally you can also ```export SSH_PRIVATE_KEY_PATH=<SSH keyfile>``` to use an SSH keyfile for the connections to the host running your P4 assignments.

*CAUTION:* VBOX_IP_ADDRESSES is a list of possible instances. Everytime you deploy an assignment, an entry of the list is consumed (disposable instances). Therefore localvm should be used primarily for test and development. If you plan to use the specified hosts permanently to serve as instances to run the assignments, you should use localmultiuservm provider as described in the next section.

[start-learn-sdn-hub.sh](https://github.com/prona-p4-learning-platform/learn-sdn-hub/tree/master/examples/start-learn-sdn-hub.sh) can be used as a reference to create a startup script.

### Run the backend using a local multiuser VM
(using [LocalMultiuserVMProvider.ts](https://github.com/prona-p4-learning-platform/learn-sdn-hub/blob/master/backend/src/providers/LocalMultiuserVMProvider.ts))

You can use multiple virtual machines or physical hosts as host instances the backend will run assignments on. Again, these hosts must contain p4 tool chain (esp. [p4c](https://github.com/p4lang/p4c)) and need to be reachable using SSH. Also, they should run the LSP load balancer, as described above. Start the backend:

```sh
export VBOX_IP_ADDRESSES=<IP addresses of the hosts to execute P4 on>
export VBOX_SSH_PORTS=<SSH ports of the hosts to execute P4 on>
export SSH_USERNAME=<Username to be used for the ssh connection, e.g., "p4">
export SSH_PASSWORD=<Password to be used for the ssh connection>
export BACKEND_USERS=<Comma-separated list of username:password to be used to connect to the backend, e.g., "group0:p4,group1:passwordX,group2:passwortY">
export BACKEND_USER_MAPPING=<Comma-separated list of username:instance allowing to map users to specific instances, e.g., to deploy all assignments of group0 to the first instance specified in the list VBOX_IP_ADDRESSES, and all assignments of group1 to the second, "group0:0,group1:1">

cd backend
npm run start:localmultiuservm
```
Optionally you can also ```export SSH_PRIVATE_KEY_PATH=<SSH keyfile>``` to use an SSH keyfile for the connections to the host running your P4 assignments.

[start-learn-sdn-hub.sh](https://github.com/prona-p4-learning-platform/learn-sdn-hub/tree/master/examples/start-learn-sdn-hub.sh) can be used as a reference to create a startup script.

### Run the backend using Docker instances for assignments
(using [DockerProvider.ts](https://github.com/prona-p4-learning-platform/learn-sdn-hub/blob/master/backend/src/providers/DockerProvider.ts))

Assignments for users and their groups can be started using Docker containers offering a light weight
instance format. 

```sh
BACKEND_HTTP_PORT="3001"
BACKEND_TYPE="docker"
```

Docker daemon connection defaults to var/run/docker.sock, see https://github.com/apocas/dockerode.
Using Windows ``//./pipe/docker_engine`` should be used. dockerode also supports using a remote
connection to Docker daemon.

```sh
DOCKER_SOCKET_PATH="//./pipe/docker_engine"
DOCKER_SOCKET_PATH="/var/run/docker.sock"
DOCKER_HOST="127.0.0.1"
DOCKER_PORT="3000"
DOCKER_PROTOCOL="http"
```

Docker provider configuration must provide a default image that will be used for the started 
containers. 

```sh
# image must provide SSH port and connection
export DOCKER_IMAGE="prona/p4-container"
```

Also, an entrypoint/iniial cmd can be specified. 

```sh
DOCKER_CMD="-s"
```

Instances and containers can be automatically
stopped and deleted (pruning) after a specified maximum lifetime.

```sh
DOCKER_MAX_INSTANCE_LIFETIME_MINUTES="120"
```

Further configuration options can be specified on a per-assignment basis in the assignment configuration file.

### Run the backend using OpenStack instances for assignments
(using [OpenStackProvider.ts](https://github.com/prona-p4-learning-platform/learn-sdn-hub/blob/master/backend/src/providers/OpenStackProvider.ts))

Instead of using a preinstalled local VM or host to run your P4 code and assignments, also an OpenStack provider is available, that creates OpenStack instances for deployed assignments. In OpenStack an image is necessary, that contains p4 tool chain etc., as documented above for the local VM use-case. The provider is based on [pkgcloud](https://github.com/pkgcloud/pkgcloud). OpenStack keystone needs to be available using v3.

```
export OPENSTACK_USERNAME=<Username to access OpenStack API>
export OPENSTACK_PASSWORD=<Passwort for connection to OpenStack>
export OPENSTACK_AUTHURL=<OpenStack Auth URL, needs to support keystone identity API v3, e.g., "https://my-openstack-cloud:5000/v3">
export OPENSTACK_REGION=<OpenStack region, e.g., "RegionOne">
export OPENSTACK_TENANTID=<OpenStack tenant/project ID>
export OPENSTACK_DOMAINNAME=<OpenStack domain, e.g., "default">
export SSH_USERNAME=<Username to be used for the ssh connection, e.g., "p4">
export SSH_PASSWORD=<Password to be used for the ssh connection>
cd backend
npm run start
```
Optionally you can also ```export SSH_PRIVATE_KEY_PATH=<SSH keyfile>``` to use an SSH keyfile for the connections to the host running your P4 assignments.

[start-learn-sdn-hub.sh](https://github.com/prona-p4-learning-platform/learn-sdn-hub/tree/master/examples/start-learn-sdn-hub.sh) can be used as a reference to create a startup script.

### Run the frontend separatly (only recommended for development and debugging purposes)

To run the frontend in development mode (we recommend to rather copy the production build of the frontend to the backend as described in the Installation section and let the backend contain and serve the frontend), you need to create frontend config file as ".env.local" file in the frontend directory:

```sh
REACT_APP_API_HOST=http://localhost:3001
REACT_APP_WS_HOST=ws://localhost:3001
```

You need to adapt "localhost" in the .env.local file if your backend is not running on the same host as the frontend.
After creating the file, run the frontend by issuing:

```sh
cd frontend
npm run start
```

A web browser will open automatically leading you to the login in the frontend. If you use the demo authentication provider, you can use default user "p4" and password "p4".

If you run the backend on a custom port other than the default TCP port 3001, you can also specify this port in the .env.local file to be used by the frontend to connect to the backend:

```sh
REACT_APP_BACKEND_HTTP_PORT=16000
```

### Configuration

Configuration of assignments, editable files, lab sheets, SSH consoles etc. needs to be done in backend/src/Configuration.ts. Assignment lab sheets can be stored in backend/src/assigments or retrieved from the deployed instance.

### Using MongoDB as authentication and persistence provider

Connection to MongoDB can be configured using the following environment variable. The example shows
the use of MongoDB Atlas service.

```sh
export MONGODB_URL="mongodb+srv://admin:password-here@cluster0.tdnvj.mongodb.net/learn-sdn-hub?retryWrites=true&w=majority"
```

### Enable Collaboration ###

Users in the same group can use collaboration to work in the editor together.
To enable collaboration, ``useCollaboration: true`` needs to be set in the assignment configuration file.

Currently convergence.io is used for the implementation of editor collaboration. An environment variable needs to be set to configure convergence connection:

Connection currently uses anonymous connection, so if security is an issue for collaboration, convergence server and backend should be placed on the same host using localhost for the connection.

```sh
CONVERGENCE_URL = "http://localhost:8000/api/realtime/convergence/default"
```

Convergence server can be started, e.g., using:

```docker
docker rm --force convergence
docker run -p "8000:80" --name convergence convergencelabs/convergence-omnibus
```

The examples in the repository also show how to use tmux to allow shared terminal usage.

### Enable languageClient

To enable monaco languageClient, ``useLanguageClient: true`` needs to be set in the assignment configuration file. ``rootPath`` and ``workspaceFolders`` can also be defined there, to allow, e.g., auto completion across files in these folders.
