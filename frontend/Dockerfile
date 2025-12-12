# stage I: build with node
ARG NODE_VERSION=22-slim
ARG NGINX_VERSION=1.29-trixie

FROM node:${NODE_VERSION} AS build

LABEL de.hs-fulda.netlab.name="prona/learn-sdn-hub" \
      de.hs-fulda.netlab.description="P4 and SDN learning environment" \
      de.hs-fulda.netlab.url="https://github.com/prona-p4-learning-platform/learn-sdn-hub" \
      de.hs-fulda.netlab.vcs-url="https://github.com/prona-p4-learning-platform/learn-sdn-hub" \
      de.hs-fulda.netlab.docker.cmd="docker run -it --rm -p 3001:3001 prona/learn-sdn-hub -t localvm -a 127.0.0.1"

ENV VITE_REACT_APP_API_HOST=""
ENV VITE_REACT_APP_WS_HOST=""

WORKDIR /app

COPY . .

# install dependencies and build
RUN npm install && \
      npm run build

# stage II: Runtime with nginx
FROM nginx:${NGINX_VERSION} AS runtime

# nginx-config (SPA-Routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# copy static files to nginx root
COPY --from=build /app/build /app

# change permissions      
RUN chown -R www-data:www-data /app

# create entry point for github actions
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# port for nginx
EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]