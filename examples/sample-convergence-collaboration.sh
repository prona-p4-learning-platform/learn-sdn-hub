#!/bin/bash
docker rm --force convergence
docker run -p "8000:80" --name convergence convergencelabs/convergence-omnibus
