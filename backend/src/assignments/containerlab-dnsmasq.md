# Containerlab Lab: dnsmasq (Topology from URL)

This lab is deployed from a topology URL: the backend fetches the containerlab
topology from the configured web server, stages every file referenced by its
bind mounts (here `server1/dnsmasq.conf`) into the clab-api-server workspace,
and deploys the lab there. The lab contains a dnsmasq DHCP/DNS server
(`server1`, 192.168.188.1) attached to a bridge (`switch1`) together with two
DHCP clients (`host1`, `host2`), which request addresses with `dhcpcd` on
startup.

## Terminals

- **dnsmasq-host** (`DockerShell` in `server1`): a shell directly inside the
  dnsmasq server container via clab-api-server terminal sessions — no `sshd`
  is needed in the image.
- **jumphost** (`Shell`): a regular SSH shell on the management host of the
  lab, for comparison with the container-based terminal.

## Hints

- Check which addresses the clients received: run `ifconfig eth1` in
  `host1`/`host2`, and inspect the lease file
  (`/var/lib/dnsmasq/dnsmasq.leases`) on `server1`.
- The dnsmasq configuration is bind-mounted to `/etc/dnsmasq.conf` inside
  `server1`; edit it there and restart dnsmasq to apply changes.