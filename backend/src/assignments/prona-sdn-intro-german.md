# Beispiel 0: SDN Einführung

## Mininet

* Verschaffen Sie sich einen Überblick über die Funktionen von mininet (http://mininet.org/) und wie es zum Experimentieren mit SDN verwendet werden kann.
* Starten Sie mininet mit ```sudo mn```.
* Experimentieren Sie mit den folgenden Befehlen:

```	
    mininet> help
	
	mininet> (dump | net | nodes | links | ports)
	mininet> h1 (ifconfig | arp | route | tcpdump | ...)
	mininet> pingall
	mininet> h1 ping h2
	mininet> iperf h1 h2
	mininet> link s1 h1 (down | up)
```

* Beenden Sie Mininet mit ```exit```. Mit dem Befehl ```sudo mn -c``` können Sie alle laufenden Mininet-Instanzen beenden. Siehe ```sudo mn --help`` für weitere Optionen.
* Starten Sie Mininet für verschiedene Topologien:

```
    sudo mn --topo single,4
	sudo mn --topo linear,4
	sudo mn --topo tree,depth=2,fanout=4
```

* Wie hängt Mininet mit Software-defined Networking zusammen?
* Wie sieht eine typische SDN-Architektur aus und welche Rolle spielen Switches und Controller?

## Mininet zusammen mit einem SDN controller verwenden

* Starten Sie mininet mit der in OpenFlowTopo.py benutzerdefinierten Topologie

```
sudo python OpenFlowTopo.py
```

* Warum erhalten Sie eine Warnung über eine fehlende Verbindung zu 127.0.0.1:6633? Untersuchen Sie den Code in OpenFlowTopo.py.
* Verschaffen Sie sich einen Überblick über die Funktionsweise von ryu (https://ryu-sdn.org/) und darüber, wie es für Experimente mit SDN genutzt werden kann.
* Starten Sie den ryu controller zusammen mit der OpenFlowApp.py

```
sudo ryu-manager OpenFlowApp.py
```

* Ändern Sie die OpenFlowApp.py um flows zu installieren, die Ping (ICMP) zwischen den Hosts in der Topologie ermöglichen. Tipp: Ethertype IPv4 = 0x0800 und Ethertype ARP = 0x0806.
