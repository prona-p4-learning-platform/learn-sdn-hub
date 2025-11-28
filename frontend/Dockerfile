# stage I: build with node
FROM node:22-slim AS build

LABEL de.hs-fulda.netlab.name="prona/learn-sdn-hub" \
      de.hs-fulda.netlab.description="P4 and SDN learning environment" \
      de.hs-fulda.netlab.url="https://github.com/prona-p4-learning-platform/learn-sdn-hub" \
      de.hs-fulda.netlab.vcs-url="https://github.com/prona-p4-learning-platform/learn-sdn-hub" \
      de.hs-fulda.netlab.docker.cmd="docker run -it --rm -p 3001:3001 prona/learn-sdn-hub -t localvm -a 127.0.0.1"

ENV VITE_REACT_APP_API_HOST=""
ENV VITE_REACT_APP_WS_HOST=""

RUN useradd -m -s /bin/bash p4
WORKDIR /home/p4/learn-sdn-hub/frontend

# install dependencies
COPY package.json ./
RUN npm install

# copy source and build for production
COPY . .
RUN npm run build    # produces /home/p4/learn-sdn-hub/frontend/build

# stage II: Runtime with nginx
FROM nginx:1.29-trixie AS runtime

# nginx-config (SPA-Routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# copy static files to nginx root
COPY --from=build /home/p4/learn-sdn-hub/frontend/build /usr/share/nginx/html

# install bash and tools for action logic
RUN apt-get update && apt-get install -y bash wget && rm -rf /var/lib/apt/lists/*

# create entry point for github actions
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# port for nginx
EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]