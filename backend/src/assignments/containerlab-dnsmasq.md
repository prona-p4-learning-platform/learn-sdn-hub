# Cheat Sheet: SSH Praktikum
Dieses Dokument liefert technische Hinweise und Konzepte für die Lösung der Aufgaben.

## Aufgabe 3

1. Alpine Linux verwendet `apk`. Nutzen sie die Flag `-h`, um den genauen Befehl zur Installation eines Pakets zu finden.
2. Der SSH Server verweigert den Start ohne eigene SSH-Keys. Nutzen sie das Tool `ssh-keygen` mit der korrekten Flag `-A`, um alle fehlenden Host Keys des Systems generieren zu lassen.
3. Sie müssen den SSH-Server nun starten. Die ausführbare Datei liegt in `/usr/sbin/` und heißt `sshd`.
4. Verbinden sie sich nun mit dem Server über den Client. Der Syntax für SSH lautet: `ssh <user>@<hostname or ip>`. Die IP beider Container können sie über den Befehl `ifconfig` herausfinden. Die IPs beginnen mit `172.x.x.x`. Den Namen des aktuellen Benutzers erhalten sie über den Befehl `whoami`.
4. Generieren sie nun auf dem Client ein eigenes Schlüsselpaar. Dort ist die `-A` Flag nicht notwendig.
5. Der öffentliche Schlüssel ihres Clients muss auf den Server übertragen werden. Kopieren sie sich den Inhalt des öffentlichen Schlüssels in ihre Zwischenablage. Der Inhalt dieses Schlüssels muss in der Datei `authorized_keys` auf dem Server hinterlegt sein. Diese befindet sich im Verzeichnis `/root/.ssh/`. Falls diese nicht existiert, erstellen sie diese. Falls sie einen Texteditor benötigen, installieren sie das Paket `nano`.
6. Verbinden sie sich nun vom Client aus mit dem Server, indem sie ihren privaten Schlüssel als Argument übergeben. Nutzen sie dafür die Flag `-i` mit dem Dateipfad des privaten Schlüssels.
7. Erstellen oder modifizieren sie nun ihre SSH-Konfigurationsdatei `config` auf ihrem Client. Diese befindet sich in `/root/.ssh/`. Modifizieren sie nun ihre Konfiguratonsdatei, sodass sie sich mit dem Befehl `ssh server` mit dem Server verbinden können. Die Konfigurationsdatei hat folgendes Format: 
```code
Host <alias>
  HostName <hostname_or_ip>
  User <username>
  IdentityFile <path_to_file>
```

## Aufgabe 4

1. Die Nutzung von SCP setzt einen aktiven SSH-Server mit hinterlegten Keys voraus. Falls sie direkt mit dieser Aufgabe nach der vorigen fortfahren, können sie diesen weiter verwenden. Andernfalls müssen sie erneut einen SSH-Server und -Client aufsetzen.
2. Sie müssen bei SCP ebenfalls mit Keypairs arbeiten. Falls sie einen Alias mithilfe der SSH-Config aufgesetzt haben, können sie diesen verwenden. Andernfalls müssen sie erneut das Keypair mit der Flag `-i` angeben.
3. Der Syntax, um eine Datei von Lokal auf Remote zu kopieren, lautet: `scp <args> <path-to-file> <user>@<hostname or ip>:<path-to-file>`.
4. Um eine Datei von Remote auf Lokal zu kopieren, tauschen sie die Blöcke `<path-to-file>` und `<user>@<hostname or ip>:<path-to-file>`.
