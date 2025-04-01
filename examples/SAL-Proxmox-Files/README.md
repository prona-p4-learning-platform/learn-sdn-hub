# Schritt 1 - Grundlagen: Host-zu-Host-Verbindung

## Einleitung
Dieses Lab behandelt die grundlegende Netzwerkkommunikation zwischen zwei direkt verbundenen Hosts. Die Studierenden lernen, wie Hosts in einem einfachen Netzwerk interagieren, IP-Adressen konfigurieren, ARP-Tabellen verwalten und Netzwerkpakete analysieren.

## Voraussetzungen
- Grundlegende Linux-Kenntnisse
- Vertrautheit mit grundlegenden Netzwerkbefehlen

## Aufgaben

### 1. Netzwerkkonfiguration untersuchen
- **Anzeige der IP-Konfiguration:**
  ip a
- **Anzeigen der Netzwerkkarten und deren Status**
  ip link show
- **Anzeigen der Routing-Tabelle (hier sollte nur der direkte Link sichtbar sein)**
  ip route
		
### 2. Netzwerkverbindung testen
- **Ping zwischen den Hosts**
  - Versuche, `ping <IP-Adresse des anderen Hosts>` auszuführen
  - Warum funktioniert `ping` nur, wenn IP-Adressen konfiguriert sind?

### 3. Manuelles ARP-Management
- **Anzeigen der aktuellen ARP-Tabelle**
  arp -a
- **Löschen eines Eintrags und erneut einen Ping senden. Was passiert mit der ARP-Tabelle, wenn erneut ein Ping gesendet wird?**
  arp -d <IP-Adresse>

### 4. Paketanalyse mit tcpdump
- **Lauschen auf ICMP-Pakete während ein Ping läuft**
  tcpdump -i eth1 -n icmp
- **Lauschen auf ARP-Pakete während ein Ping läuft**
  tcpdump -i eth1 -n arp
- **Löschen eines Eintrags und erneut einen Ping senden und beobachten, wie ARP-Anfragen und -Antworten ablaufen**
  arp -d <IP-Adresse>
	
### 5. Broadcast vs. Unicast
- Sende ein Ping an die Broadcast-Adresse (ping -b 192.168.<GRUPPEN-ID>.255)
- Prüfe mit tcpdump, was passiert
	
### 6. Netzwerkausfall simulieren
- **Schnittstelle deaktivieren und prüfen, was passiert**
  ip link set eth1 down
- **Schnittstelle wieder aktivieren und prüfen, was passiert. Welche Auswirkungen hat das auf die ARP-Tabelle**
   ip link set eth1 up

## 7. Netzwerkkommunikation über alternative Ports
- Starte einen einfachen HTTP-Server mit python3 -m http.server 8080.
- Greife vom anderen Host darauf zu mit curl <IP-Adresse>:8080