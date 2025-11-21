#!/bin/bash

# process inputs (e.g. via GitHub-Env)
if [ "$1" = "build" ]; then
  echo "Building app..."
fi

# set output (z. B. path to built files)
if [ -n "$GITHUB_OUTPUT" ]; then
  echo "built-path=/usr/share/nginx/html" >> $GITHUB_OUTPUT
  echo "Output set successfully."
else
  echo "GITHUB_OUTPUT not set (local test mode), skipping output file."
fi

# start nginx (for testing), but stop it short after for action finishing
nginx -g 'daemon off;' &
sleep 5  # wait for logs/test
kill %1  # stop nginx for action finishing

echo "Action completed."
