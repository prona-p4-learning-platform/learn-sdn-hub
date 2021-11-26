# Example 0: SDN Intro

## Mininet

* Get an idea about what mininet (http://mininet.org/) does and how it can be used to experiment with SDN.
* Start mininet using ```sudo mn```.
* Experiment with the following commands:

```	
mininet> help

mininet> (dump | net | nodes | links | ports)
mininet> h1 (ifconfig | arp | route | tcpdump | ...)
mininet> pingall
mininet> h1 ping h2
mininet> iperf h1 h2
mininet> link s1 h1 (down | up)
```

* Stop mininet by using ```exit```. You can also cleanup previous mininet runs by using ```sudo mn -c```. See ```sudo mn --help``` for further options.
* Start mininet for different topologies:

```
sudo mn --topo single,4
sudo mn --topo linear,4
sudo mn --topo tree,depth=2,fanout=4
```

* How is mininet related to Software-defined Networking?
* How does a typical SDN architecture look like and what role do switches and controllers play?

## Using mininet together with an SDN controller

* Start mininet using the custom topology defined in OpenFlowTopo.py.

```
sudo python OpenFlowTopo.py
```

* Why do you get a warning regarding missing connection to 127.0.0.1:6633? Examine the code in OpenFlowTopo.py.
* Get an idea about what ryu (https://ryu-sdn.org/) does and how it can be used to experiment with SDN.
* Start the ryu controller together with the provided OpenFlowApp.py

```
sudo ryu-manager OpenFlowApp.py
```

* Change the OpenFlowApp.py to install flows that enable ping (ICMP) between the hosts in the topology. Hint: Ethertype IPv4 = 0x0800 and Ethertype ARP = 0x0806.