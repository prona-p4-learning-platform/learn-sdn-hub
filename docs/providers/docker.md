# Docker provider

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

Also, an entrypoint/initial cmd can be specified.

```sh
DOCKER_CMD="-s"
```

Instances and containers can be automatically
stopped and deleted (pruning) after a specified maximum lifetime.

```sh
DOCKER_MAX_INSTANCE_LIFETIME_MINUTES="120"
```

Further configuration options can be specified on a per-assignment basis in the assignment configuration file.
