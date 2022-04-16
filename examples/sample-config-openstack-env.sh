# backend connection and type
export BACKEND_HTTP_PORT="3001"
export BACKEND_TYPE="openstack"

# OpenStack provider config
export OPENSTACK_USERNAME="my-openstack-user"
export OPENSTACK_PASSWORD="my-openstack-password"
export OPENSTACK_AUTHURL="https://my-openstack-private-cloud-fqdn-or-ip:5000"
export OPENSTACK_REGION="RegionOne"
export OPENSTACK_PROJECTID="42ab56b8692446f3ac6249498c23325b"
export OPENSTACK_DOMAINNAME="Default"
export OPENSTACK_P4_HOST_IMAGE="cd43e1a0-be8b-4dff-8b55-b468615a54e8"
export OPENSTACK_FLAVOR="2"
export OPENSTACK_NETWORKID="4ce033fd-5ceb-4eb4-80b9-ef4ee3b7555f"
export OPENSTACK_KEYNAME="my-keypair-pub"
export OPENSTACK_ASSOCIATE_FLOATING_IP="true"
export OPENSTACK_FLOATING_NETWORKID="c5ed0f0a-57ca-4b0b-884b-0c1944573650"
export OPENSTACK_MAX_INSTANCE_LIFETIME_MINUTES="120"

# ssh instance credentials
export SSH_USERNAME=p4
export SSH_PASSWORD=p4
