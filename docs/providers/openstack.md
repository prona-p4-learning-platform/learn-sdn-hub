# OpenStack provider

(using [OpenStackProvider.ts](/backend/src/providers/OpenStackProvider.ts))

Instead of using a preinstalled local VM or host to run your P4 code and assignments, also an OpenStack provider is available, that creates OpenStack instances for deployed assignments. In OpenStack an image is necessary, that contains the p4 tool chain etc. OpenStack keystone needs to be available using v3.

```
export OPENSTACK_USERNAME=<Username to access OpenStack API>
export OPENSTACK_PASSWORD=<Password for connection to OpenStack>
export OPENSTACK_AUTHURL=<OpenStack Auth URL, needs to support keystone identity API v3, e.g., "https://my-openstack-cloud:5000/v3">
export OPENSTACK_REGION=<OpenStack region, e.g., "RegionOne">
export OPENSTACK_TENANTID=<OpenStack tenant/project ID>
export OPENSTACK_DOMAINNAME=<OpenStack domain, e.g., "default">
export SSH_USERNAME=<Username to be used for the ssh connection, e.g., "p4">
export SSH_PASSWORD=<Password to be used for the ssh connection>
```

Optionally you can also ```export SSH_PRIVATE_KEY_PATH=<SSH keyfile>``` to use an SSH keyfile for the connections to the host running your P4 assignments.

[start-learn-sdn-hub.sh](/examples/start-learn-sdn-hub.sh) can be used as a reference to create a startup script.
