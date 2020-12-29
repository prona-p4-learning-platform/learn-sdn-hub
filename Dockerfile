FROM node:15
LABEL de.hs-fulda.netlab.name="flex/p4-container" \
      de.hs-fulda.netlab.description="P4 and SDN learning environment" \
      de.hs-fulda.netlab.url="https://github.com/prona-p4-learning-platform/learn-sdn-hub" \
      de.hs-fulda.netlab.vcs-url="https://github.com/prona-p4-learning-platform/learn-sdn-hub" \
      de.hs-fulda.netlab.docker.cmd="docker run -it --rm -p 3000:3000 flex/p4-container 127.0.0.1"

EXPOSE 3000/tcp

RUN useradd -m -s /bin/bash p4
WORKDIR /home/p4/learn-sdn-hub

COPY frontend frontend
COPY backend backend

RUN cd backend && npm install && npm run compile
RUN cd frontend && npm install && npm run build

RUN echo 'REACT_APP_API_HOST=http://localhost:3001\n' \
         'REACT_APP_WS_HOST=ws://localhost:3001\n' >frontend/.env.local

RUN echo '#!/bin/bash\n' \
         'if [ $# -eq 0 ]\n' \
         'then\n' \
         '  echo "You need to specify the IP address of a host running p4 and being accessible via SSH (see VBOX_IP_ADDRESS in documentation)"\n' \
         '  exit 1\n' \
         'fi\n' \
         'export VBOX_IP_ADDRESS=$1\n' \
         'cd backend && npm run start:localvm &\n' \
         'cd frontend && npm run start\n' >start-learn-sdn-hub-with-localvm.sh
RUN chmod +x start-learn-sdn-hub-with-localvm.sh

ENTRYPOINT ["./start-learn-sdn-hub-with-localvm.sh"]
