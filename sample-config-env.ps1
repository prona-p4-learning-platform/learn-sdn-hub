$env:BACKEND_HTTP_PORT="3001"
$env:BACKEND_TYPE="localmultiuservm"
$env:VBOX_IP_ADDRESSES="192.168.229.101,192.168.229.115"
$env:VBOX_SSH_PORTS="22,22"
#$env:VBOX_IP_ADDRESSES="192.168.56.1,192.168.56.105"
#$env:VBOX_SSH_PORTS="3022,22"
$env:SSH_USERNAME="p4"
$env:SSH_PASSWORD="p4"
$env:BACKEND_USERS="user1:password1,user2:password2,user3:password3"
$env:BACKEND_USER_MAPPING="user1:0,user2:0,user3:1"
$env:BACKEND_USER_ALLOWED_ASSIGNMENTS="user1:(.*),user2:Example(.*),user3:(.*)p4(.*)"

Set-Location C:\Users\flex\git\learn-sdn-hub\backend
npm run start:localmultiuservm
