FROM node:15
LABEL de.hs-fulda.netlab.name="prona/learn-sdn-hub" \
      de.hs-fulda.netlab.description="P4 and SDN learning environment" \
      de.hs-fulda.netlab.url="https://github.com/prona-p4-learning-platform/learn-sdn-hub" \
      de.hs-fulda.netlab.vcs-url="https://github.com/prona-p4-learning-platform/learn-sdn-hub" \
      de.hs-fulda.netlab.docker.cmd="docker run -it --rm -p 3001:3001 prona/learn-sdn-hub 127.0.0.1 22 p4 p4"

EXPOSE 3001/tcp

RUN useradd -m -s /bin/bash p4
WORKDIR /home/p4/learn-sdn-hub

COPY frontend frontend
COPY backend backend

RUN cd backend && npm install && npm run compile
RUN cd frontend && npm install && npm run build

RUN cp -a frontend/build/* backend/static/

RUN echo '#!/bin/bash\n' \
         'if [ ! $# -eq 4 ]\n' \
         'then\n' \
         '  echo "You need to specify a host used to run the P4 assignments.\nThis can be done, e.g., by running \"docker run -it --rm -p 3001:3001 prona/learn-sdn-hub <VBOX_IP_ADDRESSES> <VBOX_SSH_PORTS> <SSH_USERNAME> <SSH_PASSWORD>\"\n(see also VBOX_IP_ADDRESSES, VBOX_SSH_PORT, SSH_USERNAME and SSH_PASSWORD in learn-sdn-hub documentation)"\n' \
         '  exit 1\n' \
         'fi\n' \
         'export VBOX_IP_ADDRESSES=$1\n' \
         'export VBOX_SSH_PORTS=$2\n' \
         'export SSH_USERNAME=$3\n' \
         'export SSH_PASSWORD=$4\n' \
         'cd backend && npm run start:localvm\n' >start-learn-sdn-hub.sh
RUN chmod +x start-learn-sdn-hub.sh

ENTRYPOINT ["./start-learn-sdn-hub.sh"]
