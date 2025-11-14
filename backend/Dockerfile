FROM node:22

LABEL de.hs-fulda.netlab.name="prona/learn-sdn-hub" \
      de.hs-fulda.netlab.description="P4 and SDN learning environment" \
      de.hs-fulda.netlab.url="https://github.com/prona-p4-learning-platform/learn-sdn-hub" \
      de.hs-fulda.netlab.vcs-url="https://github.com/prona-p4-learning-platform/learn-sdn-hub" \
      de.hs-fulda.netlab.docker.cmd="docker run -it --rm -p 3001:3001 prona/learn-sdn-hub -t localvm -a 127.0.0.1"

# default port, can be overriden by using -p when running docker and as BACKEND_PORT using -p parameter of start-learn-sdn-hub.sh
EXPOSE 3001/tcp

ENV BACKEND_HTTP_PORT="3001"
ENV BACKEND_TYPE="localmultiuservm"
ENV DOCKER_CMD="-s"

ENV DOCKER_SOCKET_PATH="//./pipe/docker_engine"
# ENV DOCKER_SOCKET_PATH="/var/run/docker.sock"
ENV DOCKER_IMAGE="prona/p4-container"
ENV MONGODB_URL=""
ENV DOCKER_MAX_INSTANCE_LIFETIME_MINUTES="120"
ENV SSH_USERNAME="p4"
ENV SSH_PASSWORD="p4"


# add a user 
RUN useradd -m -s /bin/bash p4
WORKDIR /home/p4/learn-sdn-hub

# copy necessary files to image
COPY ../backend backend
COPY ../package.json .
COPY ../package-lock.json .

# build frontend and create static backend
#RUN npm clean-install
RUN npm install
#CMD ["cd", "backend"]
#CMD ["npm", "run", "start:docker"]
WORKDIR /home/p4/learn-sdn-hub
# copy example startup script and use it as the entrypoint when running the container
COPY ../examples/start-learn-sdn-hub.sh start-learn-sdn-hub.sh
RUN sed -i 's/\r$//' start-learn-sdn-hub.sh && chmod +x start-learn-sdn-hub.sh

ENTRYPOINT ["/home/p4/learn-sdn-hub/start-learn-sdn-hub.sh"]
