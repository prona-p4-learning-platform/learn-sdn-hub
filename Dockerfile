FROM node:18

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

# copy frontend and backend files to the image
COPY frontend frontend
COPY backend backend

# build backend and frontend, create static backend
RUN cd backend && npm install && npm run compile
RUN cd frontend && npm install && npm run build && npm run create-static-backend

# copy example startup script and use it as the entrypoint when running the container
COPY examples/start-learn-sdn-hub.sh start-learn-sdn-hub.sh
RUN chmod +x start-learn-sdn-hub.sh

ENTRYPOINT ["/home/p4/learn-sdn-hub/start-learn-sdn-hub.sh"]
