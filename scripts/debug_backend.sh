#!/bin/bash
# Trace what credentials are being used
export CLAB_USERNAME="DEBUG_clab"
export CLAB_PASSWORD="DEBUG_clab"
export CLAB_APIURL="http://localhost:8080/"
export BACKEND_HTTP_PORT="3001"
export MONGODB_URL="mongodb+srv://admin:5LO9WyPavIE9OhZk@cluster0.tdnvj.mongodb.net/learn-sdn-hub?retryWrites=true&w=majority"

# Add logging to provider temporarily
cd ../backend/src/providers
cp ContainerlabProvider.ts ContainerlabProvider.ts.backup

# Add debug logging
sed -i '/const data_auth = {/a\
              console.log("DEBUG: Attempting login with username:", this.clab_username);\
              console.log("DEBUG: API URL:", providerInstance.clab_apiUrl + "login");' ContainerlabProvider.ts

cd ../..
npm run start:containerlab
