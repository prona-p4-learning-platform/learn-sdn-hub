ARG NODE_VERSION=22-slim

FROM node:${NODE_VERSION}

LABEL de.hs-fulda.netlab.name="prona/learn-sdn-hub" \
      de.hs-fulda.netlab.description="P4 and SDN learning environment" \
      de.hs-fulda.netlab.url="https://github.com/prona-p4-learning-platform/learn-sdn-hub" \
      de.hs-fulda.netlab.vcs-url="https://github.com/prona-p4-learning-platform/learn-sdn-hub" \
      de.hs-fulda.netlab.docker.cmd="docker run -it --rm -p 3001:3001 prona/learn-sdn-hub -t localvm -a 127.0.0.1"

WORKDIR /app

# copy necessary files to image
COPY package.json .

# build frontend and create static backend
RUN npm install

COPY . .

# add a user 
RUN useradd -m -s /bin/bash p4 && \
      chown -R p4:p4 /app

USER p4


# default port, can be overriden by using -p when running docker and as BACKEND_PORT using -p parameter of start-learn-sdn-hub.sh
EXPOSE 3001/tcp

CMD [ "npm", "run", "start:k8s" ]