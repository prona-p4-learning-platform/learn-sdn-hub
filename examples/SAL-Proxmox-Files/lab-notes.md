# Lab Notes - Schritt 1: Grundlagen der Netzwerktechnik

## 1. Netzwerkkonfiguration untersuchen
**Welche IP-Adressen haben die Hosts (Interface eth0 und eth1)?**

- Host1: 
- Host2:

**Welche Netzwerkkarten sind verfügbar und welchen Status haben sie?**

- `ip link show` Ausgabe:

**Welche Route ist sichtbar?**

- `ip route` Ausgabe:

## 2. Netzwerkverbindung testen

**Warum funktioniert `ping` nur, wenn IP-Adressen konfiguriert sind?**

- Antwort:

## 3. ARP-Management
**Was zeigt die ARP-Tabelle vor und nach dem Ping?**

- Vor dem Ping:

- Nach dem Ping:


## 4. Paketanalyse mit tcpdump
**Welche Pakete wurden beim Ping erfasst?**

- `tcpdump -i eth1 -n icmp` Ausgabe:

- `tcpdump -i eth1 -n arp` Ausgabe:

## 5. Broadcast vs. Unicast
**Wie unterscheidet sich die Broadcast-Kommunikation von Unicast?**

- `ping -b 192.168.<GRUPPEN-ID>.255` Ergebnisse:


## 6. Netzwerkausfall simulieren
**Was passiert mit der ARP-Tabelle, wenn die Schnittstelle deaktiviert wird?**

- Vorher:

- Nach `ip link set eth1 down`:

**Was passiert mit der ARP-Tabelle, wenn die Schnittstelle deaktiviert wird?**

- Nach `ip link set eth1 up`: 

## 7. Netzwerkkommunikation über alternative Ports
**Kann eine Verbindung zum HTTP-Server hergestellt werden?**

- `curl <IP-Adresse>:8080` Ergebnis:
