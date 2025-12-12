#!/bin/bash
function usage ()
{
cat <<EOF
Usage:  start-learn-sdn-hub.sh [OPTIONS]

Example start script for ProNA learn-sdn-hub backend.

Options:
  -h         print this help message

  Mandatory:
  -t type    host instance type to run assignments on, can be
             <localvm, localmultiuservm, openstack>

  Optional:
  -p port    HTTP TCP port the backend listens on for incoming requests
             (BACKEND_HTTP_PORT, default: 3001)

  -a list    comma-separated list of addresses to be used as hosts users run
             assignments on (VBOX_IP_ADDRESSES, required for localvm and
             localmultiuservm)
  -s list    comma-separated list of SSH ports to be used for the hosts users
             run assignments on if using localvm or localmultiuservm 
             (VBOX_SSH_PORTS, default: 22 for all hosts, required for localvm
             and localmultiuservm)

  -u string  username to use for the SSH connection to the hosts (SSH_USERNAME,
             default: p4)
  -w string  password to use for the SSH connection to the hosts (SSH_PASSWORD,
             default: p4)

  -b list    comma-separated list of username:password, to be used to login to
             the backend if localmultiuservm is used (BACKEND_USERS, required
             for localmultiuservm)
  -m list    comma-separated list of username:instanceNumber, to map users to
             host instance, instanceNumber is pointing to list specified in 
             VBOX_IP_ADDRESSES beginning with 0 (BACKEND_USER_MAPPING, if not
             specified when using localmultiuservm, all users will be mapped to
             the first host instance)
EOF
}
 
unset BACKEND_HTTP_PORT
unset BACKEND_TYPE

unset VBOX_IP_ADDRESSES
unset VBOX_SSH_PORTS

unset SSH_USERNAME
unset SSH_PASSWORD

unset BACKEND_USERS
unset BACKEND_USER_MAPPING

while getopts ":hp:t:a:s:u:w:b:m:" opt; do
  case $opt in
        h)
            usage; exit 0 ;;
        p)
            export BACKEND_HTTP_PORT=$OPTARG ;;
        t)
            export BACKEND_TYPE=":$OPTARG" ;;
        a)
            export VBOX_IP_ADDRESSES="$OPTARG" ;;
        s)
            export VBOX_SSH_PORTS="$OPTARG" ;;
        u)
            export SSH_USERNAME="$OPTARG" ;;
        w)
            export SSH_PASSWORD="$OPTARG" ;;
        b)
            export BACKEND_USERS="$OPTARG" ;;
        m)
            export BACKEND_USER_MAPPING="$OPTARG" ;;
        :)
            echo "bad option arg $OPTARG."
            usage
            exit 1
            ;;
        \?)
            echo "bad option $1"
            usage
            exit 1
            ;;
  esac
done
 
shift $((OPTIND-1))

if [ "$BACKEND_HTTP_PORT" == "" ] ; then
  echo "BACKEND_HTTP_PORT not specified, backend will use default port: 3001"
else
  echo "BACKEND_HTTP_PORT: $BACKEND_HTTP_PORT"
fi

if [ -z ${BACKEND_TYPE} ] ; then
  echo "ERROR: BACKEND_TYPE not specified, must be localvm, localmultivm or openstack"
  usage
  exit 1
elif [ "$BACKEND_TYPE" == ":openstack" ] ; then
  # currently openstack provider is the default, and is started using 
  # "npm run start", hence also set BACKEND_TYPE to "" in case of openstack
  export BACKEND_TYPE=""
  echo "BACKEND_TYPE not specified, backend will be started using default host instance provider (OpenStack)"
else
  if [ "$BACKEND_TYPE" == ":localvm" ] || [ "$BACKEND_TYPE" == ":localmultiuservm" ] ; then
    echo "BACKEND_TYPE: $BACKEND_TYPE"
  else
    echo "ERROR: illegal BACKEND_TYPE, must be localvm, localmultivm or openstack"
    usage
    exit 1
  fi
fi

if [ -z ${VBOX_IP_ADDRESSES} ] ; then
  if [ "$BACKEND_TYPE" == ":localvm" ] || [ "$BACKEND_TYPE" == ":localmultiuservm" ] ; then
    echo "ERROR: option -a must be specified when using localvm or localmultiuservm as host instance type (VBOX_IP_ADDRESSES)"
    usage
    exit 1
  fi
else
  echo "VBOX_IP_ADDRESSES: $VBOX_IP_ADDRESSES"
fi

if [ "$VBOX_SSH_PORTS" == "" ] ; then
  echo "VBOX_SSH_PORTS not specified, backend will use default port 22 for all host instances"
else
  echo "VBOX_SSH_PORTS: $VBOX_SSH_PORTS"
fi

if [ "$SSH_USERNAME" == "" ] ; then
  echo "SSH_USERNAME not specified, backend will connect to host instances using default username: p4"
else
  echo "SSH_USERNAME: $SSH_USERNAME"
fi

if [ "$SSH_PASSWORD" == "" ] ; then
  echo "SSH_PASSWORD not specified, backend will connect to host instances using default password: p4"
else
  echo "SSH_PASSWORD: $SSH_PASSWORD"
fi

if [ -z ${BACKEND_USERS} ] ; then
  if [ "$BACKEND_TYPE" == ":localmultiuservm" ] ; then
    echo "ERROR: option -b must be specified when using localmultiuservm as host instance type (BACKEND_USERS)"
    usage
    exit 1
  fi
else
  echo "BACKEND_USERS: $BACKEND_USERS"
fi

if [ -z ${BACKEND_USER_MAPPING} ] ; then
  if [ "$BACKEND_TYPE" == ":localmultiuservm" ] ; then
    echo "BACKEND_USER_MAPPING not specified and type localmultiuservm is used, all users will be mapped to the first host instance"
  fi
else
  if [ "$BACKEND_TYPE" == ":localmultiuservm" ] ; then
    echo "BACKEND_USER_MAPPING: $BACKEND_USER_MAPPING"
  else
    echo "BACKEND_USER_MAPPING will be ignored as backend type is not localmultiuservm"
  fi
fi

echo
echo "Starting learn-sdn-hub..."

npm run start$BACKEND_TYPE
