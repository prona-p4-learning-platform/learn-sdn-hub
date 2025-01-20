FROM node:20

LABEL de.hs-fulda.netlab.name="prona/learn-sdn-hub" \
      de.hs-fulda.netlab.description="P4 and SDN learning environment" \
      de.hs-fulda.netlab.url="https://github.com/prona-p4-learning-platform/learn-sdn-hub" \
      de.hs-fulda.netlab.vcs-url="https://github.com/prona-p4-learning-platform/learn-sdn-hub" \
      de.hs-fulda.netlab.docker.cmd="docker run -it --rm -p 3001:3001 prona/learn-sdn-hub -t localvm -a 127.0.0.1"

# default port, can be overriden by using -p when running docker and as BACKEND_PORT using -p parameter of start-learn-sdn-hub.sh
EXPOSE 3001/tcp

# add a user 
RUN useradd -m -s /bin/bash p4
WORKDIR /home/p4/learn-sdn-hub

# copy necessary files to image
COPY frontend frontend
COPY backend backend
COPY package.json .
COPY package-lock.json .

# build frontend and create static backend
RUN npm clean-install
RUN cd frontend && npm run build && npm run create-static-backend

# copy example startup script and use it as the entrypoint when running the container
COPY examples/start-learn-sdn-hub.sh start-learn-sdn-hub.sh
RUN chmod +x start-learn-sdn-hub.sh

ENTRYPOINT ["/home/p4/learn-sdn-hub/start-learn-sdn-hub.sh"]
