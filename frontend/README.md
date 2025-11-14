# learn-sdn-hub frontend

## Docker support

The frontend contains a Dockerfile to build and run the app in a standalone container.

### Build
``` bash
docker build -t frontend .
```

### Run
``` bash
docker run --rm -p 3001:80 frontend
```
---
Open http://localhost:3001 in your browser.