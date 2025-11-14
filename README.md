# learn-sdn-hub

learn-sdn-hub offers an environment to experiment with Software-defined Networking (SDN) technologies like [P4](https://p4.org/). Though the use-case for learn-sdn-hub is not limited to teaching and learning SDN, allowing an easy entry to programmable data plane solutions was one of the main goals the tool was designed for. It is used for masters' and bachelors' courses in the area of network programmability at [Darmstadt University of Applied Sciences](https://fbi.h-da.de/en/study-with-us/laboratories/networks-telecommunications) and [Fulda University of Applied Sciences](https://www.hs-fulda.de/en/studies/departments/applied-computer-science/about-us/laboratories/netlab). learn-sdn-hub can also be used for different lab environments, esp. as long as terminal-based access to a lab environment, web-based configuration, programming tools and a provided lab exercise should be made available. Therefore, it could also be used for other teaching and exploratory learning approaches in the Dev, Ops as well as DevOps area.

Initial development was partially funded by the research programme [digLL](https://www.digll-hessen.de/), to improve digitally supported teaching and learning in Hesse, Germany.

## Features

* Web-based lab environment based on React and TypeScript
* Multiple assignments can be provided for users and deployed to hosts running the exercises' tasks
* Web-based access to terminals for each assigment based on [xterm.js](https://xtermjs.org/) (using SSH), Apache Guacamole (remote desktop using VNC, RDP etc.) and web frames (iframe)
* Editing of, e.g., SDN-related files, as well as other configuration or source code files used by the assignments, using web-based [monaco editor](https://microsoft.github.io/monaco-editor/)
* Augmentation of monaco editor to support SDN and P4 languages, facilitating development tasks by supporting features like auto completion, syntax highlighting, error feedback etc. using [monaco-languageclient](https://github.com/TypeFox/monaco-languageclient)
* Collaboration support for terminals (tmux), Guacamole (inherently supported by shared remote desktops) as well as collaborative editing in the monaco editor (based on yjs [y-monaco](https://github.com/yjs/y-monaco))
* Modular authentication backend (included are a simple single user, simple multi user and a MongoDB based authentication backend)
* Modular assignment host backend (included is an SSH backend for single user, multi user (using hosts, VMs, containers to run the assignments) and an OpenStack (VM), Docker (container) and Firecracker (microVM) provider starting and configuring instances to run the assignments)
* Support for tests and submissions in assignments, e.g., for practical examination or bonus points in labs and courses
* Support for assignments in a Kubernetes environment
* Support for OpenID Connect (OIDC) to connect multiple external identity providers, e.g., for federation or common identity sources like GitHub, Google etc.
* Early support for topology visualization for containerlab-based labs using contained [graph](/examples/SAL-Proxmox-Files/containerlab_scripts/generate_graph.sh) feature

learn-sdn-hub and the surrounding ProNA ecosystem with p4-container and p4-boilerplate etc. was also published and presented in our paper at NOMS 2024-2024 IEEE Network Operations and Management Symposium [https://ieeexplore.ieee.org/document/10575540](https://ieeexplore.ieee.org/document/10575540).

The following figures show screenshots of the environment, used to teach the basic functions of a P4-based Layer 2 "learning" (flooding & filtering) switch:

![learn-sdn hub assignment roster](/examples/screenshots/prona-learn-sdn-hub-assignments-screenshot.png "overview and deployment of assignments")

![learn-sdn hub used for exploratory learning of the basic functions of a P4-based L2 switch](/examples/screenshots/prona-learn-sdn-hub-completion-screenshot.png "web-based environment with markdown lab sheet incl. mermaid figures/diagrams and monaco editor incl. code completion")

![gns3 proxy setup figure including external clients, backend servers and the proxy in the middle as well as its functions](/examples/screenshots/prona-learn-sdn-hub-terminal-split-completion-screenshot.png "terminal access to mininet and collaborative editing of Python code of the controller app in the monaco editor")

The assignment shown in the screenshots was based on the [p4-boilerplate](https://github.com/prona-p4-learning-platform/p4-boilerplate). You can find the code and lab exercises in [Example3-LearningSwitch](https://github.com/prona-p4-learning-platform/p4-boilerplate/tree/main/Example3-LearningSwitch). [p4-container](https://github.com/prona-p4-learning-platform/p4-container) can be used as container image for the instances using the docker providerto run the tasks of the assignment. It already contains all requirements for a learn-sdn-hub instance (primarily, SSH server and LSP proxy).

## Quick start installation and configuration using provided Docker image

For test deployments you can use our provided docker image. It is not intended for production use cases. However, to get a self-contained environment that can be used to test learn-sdn-hub right away,
we provide a docker-compose file. Clone or download this repository and simply run

```sh
docker-compose up
```

This should get you a fully functional learn-sdn-hub deployment together with a [p4-container](https://github.com/prona-p4-learning-platform/p4-container) (based on [p4lang/p4app](https://github.com/p4lang/p4app) image) that can be used to test the assignments. You can use the typical docker-compose setup, e.g., ```docker-compose up -d``` and ```docker-compose down``` to start and stop the entire environment in the background. Configuration of required environment variables can be done using provided [.env](/.env) file. The contained parameters can also be overridden by setting env vars with the same name. You can use ```source examples/sample-config-env.sh``` as a starting point to set the environment variables.
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

Examples for the Configuration.ts file and the assignments directory are provided in [examples](/examples).

More sophisticated examples to run learn-sdn-hub in production environments are provided in [docker-container-scripts](/examples/docker-container-scripts).

The startup script [start-learn-sdn-hub.sh](/examples/start-learn-sdn-hub.sh) for the container image entrypoint can be used as a reference.

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
npm install
cd frontend
npm run build
```

You can copy the production build of the frontend to the static directory of the backend. This way, the frontend is included and served in the backend. See [Dockerfile](/Dockerfile)

## Configuration

### Run the backend using Docker instances for assignments
(using [DockerProvider.ts](/backend/src/providers/DockerProvider.ts))

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
(using [OpenStackProvider.ts](/backend/src/providers/OpenStackProvider.ts))

Instead of using a preinstalled local VM or host to run your P4 code and assignments, also an OpenStack provider is available, that creates OpenStack instances for deployed assignments. In OpenStack an image is necessary, that contains p4 tool chain etc., as documented above for the local VM use-case. OpenStack keystone needs to be available using v3.

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

[start-learn-sdn-hub.sh](/examples/start-learn-sdn-hub.sh) can be used as a reference to create a startup script.


### Run the backend using Firecracker microVMs for assignments
(using [FirecrackerProvider.ts](/backend/src/providers/FirecrackerProvider.ts))

t.b.w.

### Run the frontend separatly (only recommended for development and debugging purposes)

To run the frontend in development mode you can use the following command:

```sh
cd frontend
npm run dev
```

A web browser will open automatically leading you to the login in the frontend. If you use the demo authentication provider, you can use default user "p4" and password "p4".

Vite proxies calls to the backend automatically. If the backend is not running on the same machine you can use environment variables to manually redirect this traffic. Create a ".env.local" file in the frontend directory and use the following variables:

```sh
VITE_REACT_APP_API_HOST=http://localhost:3001
VITE_REACT_APP_WS_HOST=ws://localhost:3001
```

If you run the backend on a custom port other than the default TCP port 3001, you can also specify this port in the .env.local file to be used by the frontend to connect to the backend:

```sh
VITE_REACT_APP_BACKEND_HTTP_PORT=16000
```

### Assignment Configuration

Configuration of assignments, editable files, lab sheets, SSH consoles etc. needs to be done in backend/src/Configuration.ts. Assignment lab sheets can be stored in backend/src/assigments or retrieved from the deployed instance.

### Using MongoDB as authentication and persistence provider

Connection to MongoDB can be configured using the following environment variable. The example shows
the use of MongoDB Atlas service.

```sh
export MONGODB_URL="mongodb+srv://admin:password-here@cluster0.tdnvj.mongodb.net/learn-sdn-hub?retryWrites=true&w=majority"
```

### MongoDB Default Structure

The default configuration for MongoDB is to use the following collections:
- assignments
- courses
- submissions
- users

### Using MongoDB to filter assignments

If you want to use MongoDB to filter assignments based on the assigned courses in the admin panel, you can use the following environment variable:

```sh
export BACKEND_ASSIGNMENT_TYPE="mongodb"
```

Ommitting this environment variable or providing another value will use the default filtering provided by a Regex String or by the assignments configured in the environment variable:

```sh
BACKEND_USER_ALLOWED_ASSIGNMENTS
```

### Assigning points to submissions

If you want to be able to assign points to subimssions, you need to set ``maxBonusPoints`` in the assignment configuration file. The points can then be assigned in the admin panel.
For MongoDB you can also set the ``maxBonusPoints`` in the assignment document of the ``assignments`` collection as an ``Int32``.

### Enable Collaboration

Users in the same group can use collaboration to work in the editor together.
To enable collaboration, ``useCollaboration: true`` needs to be set in the assignment configuration file.

Currently yjs is used for the implementation of editor collaboration. An environment variable needs to be set to configure yjs websocket connection:

Connection currently uses anonymous connection, so if security is an issue for collaboration, yjs server and backend should be placed on the same host using localhost for the connection. By default y-websocket is used.

```sh
VITE_REACT_APP_YJS_WEBSOCKET_HOST = "localhost"
VITE_REACT_APP_YJS_WEBSOCKET_PORT = "1234"
```

Collaboration server backend can be started, e.g., using:

```sh
cd backend
HOST=localhost PORT=1234 npx y-websocket
```

The code for FileEditor.tsx also contains a y-webrtc provider example.

The examples in the repository also show how to use tmux to allow shared terminal usage.

### Enable languageClient

To enable monaco languageClient, ``useLanguageClient: true`` needs to be set in the assignment configuration file. ``rootPath`` and ``workspaceFolders`` can also be defined there, to allow, e.g., auto completion across files in these folders. The instance must provide an LSP port (LSP proxy as described above), e.g., 3005 TCP supporting the languages used in the editor. See [servers.yml](https://github.com/prona-p4-learning-platform/p4-container/blob/master/servers.yml) for an example to use Python and P4 LSP in the proxy. The [lsp.service](https://github.com/prona-p4-learning-platform/p4-container/blob/master/lsp.service) file and [Dockerfile](https://github.com/prona-p4-learning-platform/p4-container/blob/58647e3cdda328f805678e974ea8e780bc9aa27a/Dockerfile#L100) show how the LSP proxy can be configured and started.


### Kubernetes Assignments
You can run assignments in a Kubernetes environment using the [cc-container](https://github.com/prona-p4-learning-platform/cc-container) as assignment template. A `kubeconfig` file can be generated by the endpoint in the Kubernetes cluster and this file is than mounted in the assignment container/VM. Simply add the `mountKubeconfig` field to the assignment configuration.

> Make sure that the Kubernetes cluster has setup the [cc-mgmt](https://github.com/prona-p4-learning-platform/cc-mgmt) environment.

For the connection to the Kubernetes cluster, you need to set the following environment variables when running the backend:
```sh
# IP of the Kubernetes management service
K8S_MGMT_SVC_IP="xxx.xxx.xxx.xxx" 

# SSH Password for the Kubernetes management service
K8S_MGMT_PASSWORD="..." 

# Cluster IP that is used in the kubeconfig file
K8S_CLUSTER_IP="https://xxx.xxx.xxx.xxx:6443" 

# The certificate authority data (base64 encoded) that is used in the kubeconfig file
K8S_CERT_AUTH_DATA="LS0tLS1CRUd..."

# The path in the backend where the kubeconfig file is stored
KUBECTL_STORE_PATH="/tmp" 
```

### OIDC example
An example to use OIDC is provided in the examples folder of this repo [oidc-extension](/examples/oidc-extension).
