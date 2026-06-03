#!/usr/bin/env bash
set -e

echo "Building frontend..."
docker build ../../frontend -f ../../frontend/Dockerfile -t learn-sdn-hub-frontend
echo "Building backend..."
docker build ../../backend -f ../../backend/Dockerfile -t learn-sdn-hub-backend

echo "Importing images..."
k3d image import learn-sdn-hub-frontend:latest -c learn-sdn-hub
k3d image import learn-sdn-hub-backend:latest -c learn-sdn-hub

echo "Deploying helm chart..."
helm upgrade --install learn-sdn-hub ../../helm/learn-sdn-hub \
  -n learn-sdn-hub
