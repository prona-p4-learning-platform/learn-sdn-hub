#!/bin/bash
PROJECT_ID=$(openstack project show prona1 -f value -c id)
openstack image save --file prona-image-v2.raw prona-image-v2
virt-sparsify --convert qcow2 --compress prona-image-v2.raw prona-image-v2.qcow2
openstack image create --disk-format qcow2 --project $PROJECT_ID --file prona-image-v2.qcow2 prona-image-compressed-v2
openstack image delete prona-image-v2
