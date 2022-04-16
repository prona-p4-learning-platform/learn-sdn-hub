# backend connection and type
export BACKEND_HTTP_PORT="3001"
export BACKEND_TYPE="docker"

# docker daemon connection, defaults to var/run/docker.sock, see https://github.com/apocas/dockerode 
#export DOCKER_SOCKET_PATH="//./pipe/docker_engine"
#export DOCKER_SOCKET_PATH="/var/run/docker.sock"
#export DOCKER_HOST="127.0.0.1"
#export DOCKER_PORT="3000"
#export DOCKER_PROTOCOL="http"

# docker provider config, default image/entrypoint/cmd and instance lifetime
# image must provide SSH port and connection
export DOCKER_IMAGE="prona/p4-container"
export DOCKER_CMD="-s"
export DOCKER_MAX_INSTANCE_LIFETIME_MINUTES="120"

# mongodb persister config
export MONGODB_URL="mongodb+srv://admin:password-here@cluster0.tdnvj.mongodb.net/learn-sdn-hub?retryWrites=true&w=majority"

# ssh instance credentials
export SSH_USERNAME=p4
export SSH_PASSWORD=p4
