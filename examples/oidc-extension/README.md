# OIDC Extension

This project sets up a development environment using Docker Compose.

## Prerequisites

- Docker Compose

## Setup Instructions

### 1. Configure the `.env` File

In the root directory, you will find a `.env` file. Update the necessary environment variables to match your local configuration. This file will be used to configure the containers.

> Warning: The following instructions are under the assumption that the `.env` is not altered.

### 2. Docker Compose Setup

In the root directory, there is a `docker-compose.yml` file that configures the following containers:

- **MongoDB** (for the application)
- **Keycloak** (for authentication using OIDC)
- **PostgreSQL** (for Keycloak database)
- **Mongo-Express** (Webinterface for managing MongoDB)

Run the following command in the root directory to start the services:

```bash
docker-compose up -d
```

This will start the containers in the background.

### 3. Configure Keycloak

Once the containers are up and running, follow these steps to configure Keycloak:

1. **Create a Realm**:
    - Access the Keycloak admin console at `http://localhost:8080`.
    - On the first login, you'll be prompted to set the admin credentials. Set the credentials as desired.
    - Log in using the newly set admin credentials.
    - Create a new realm named `learn-sdn-hub` in the top left corner.

2. **Import the Client Configuration**:
    - Import the client configuration file located in the root directory: `learn-sdn-hub-frontend-service.json` [here](./learn-sdn-hub-frontend-service.json).
    - This will create a new client within the `learn-sdn-hub` realm.

### 4. Configuring the Application

Both the backend and frontend require environment variable configuration. The necessary parameters need to be defined in their respective `.env` files:

- **Backend**: [../../backend/.env](../../backend/.env)
  - Reference: [./backend/.env](./backend/.env)
- **Frontend**: [../../frontend/.env](../../frontend/.env)
  - Reference: [./frontend/.env](./frontend/.env)

Additionally, these parameters are also present in the `.env.development` files inside the backend and frontend modules for development mode.
After this the application can be started as normal and should automatically import the variables from the `.env` files.
