cd backend
$env:DOCKER_SOCKET_PATH="//./pipe/docker_engine"
$env:DOCKER_IMAGE="prona/p4-container"
$env:DOCKER_CMD="-s"
$env:DOCKER_MAX_INSTANCE_LIFETIME_MINUTES=120
$env:SSH_USERNAME="p4"
$env:SSH_PASSWORD="p4"
$env:MONGODB_URL = "mongodb+srv://<username>:<password-here>@cluster0.tdnvj.mongodb.net/learn-sdn-hub?retryWrites=true&w=majority"
npm run start:docker
