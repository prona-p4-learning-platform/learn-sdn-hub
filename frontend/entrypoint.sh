#!/bin/bash

BUILD_MODE="${1:-production}"
GREET_MESSAGE="${2:-World}"

echo "Init: Preparing container in mode '$BUILD_MODE'..."

if [ -n "$GITHUB_OUTPUT" ]; then
    echo "built-path=/usr/share/nginx/html" >> "$GITHUB_OUTPUT"
    echo "Info: GitHub Action detected. Output 'built-path' set."
else
    echo "Info: Running in standard Docker mode (local or server)."
fi

echo "Starting Nginx..."

exec nginx -g 'daemon off;'
