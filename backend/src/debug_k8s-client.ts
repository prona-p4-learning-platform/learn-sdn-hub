import { K8sClient, K8sClientConfig } from './utils/k8s-client';
import * as fs from 'fs';
import * as path from 'path';

async function k8sClientTest() {

  const configDir = '../dev-stack/k8s/cluster-config';
  const tokenPath = path.join(configDir, 'token'); 
  const caPath = path.join(configDir, 'ca.crt');
  const kubeconfigPath = path.join(configDir, 'kubeconfig');
  
  // Standard-Fallback, falls Kubeconfig nicht geparst werden kann
  let apiUrl = 'https://127.0.0.1:42875'; 

  if (!fs.existsSync(tokenPath) || !fs.existsSync(caPath)) {
    console.error(`Fehler: Cluster-Konfigurationsdateien in ${configDir} nicht gefunden!`);
    process.exit(1);
  }

  // Versuch, die aktuelle API-URL aus der kubeconfig zu lesen (da sich Ports ändern können)
  if (fs.existsSync(kubeconfigPath)) {
    try {
        const kubeconfigContent = fs.readFileSync(kubeconfigPath, 'utf8');
        const serverMatch = kubeconfigContent.match(/server:\s+(https?:\/\/[^\s]+)/);
        if (serverMatch && serverMatch[1]) {
            apiUrl = serverMatch[1];
            console.log(`API-URL aus Kubeconfig ermittelt: ${apiUrl}`);
        }
    } catch (e) {
        console.warn("Konnte Kubeconfig nicht lesen, nutze Fallback-URL.");
    }
  }

  const token = fs.readFileSync(tokenPath, 'utf8').trim();
  const caBuffer = fs.readFileSync(caPath);
  const caBase64 = caBuffer.toString('base64');

  const config: K8sClientConfig = {
    apiUrl: apiUrl,
    token: token,
    ca: caBase64
  };

  try {
    console.log(`Verbinde zu: ${apiUrl}`);
    const client = new K8sClient(config);

    console.log("Frage Namespaces ab...");
    const result = await client.coreV1Api.listNamespace();
    const items = result.items || (result as any).body?.items; 
    console.log(`Verbindung steht. Gefundene Namespaces: ${items.length}`);
    
    // -----------------------------------------------------------------------
    // SETUP: Voraussetzungen schaffen (Nur Namespace)
    // -----------------------------------------------------------------------
    console.log("\n--- Setup Prerequisites ---");
    const fluxNs = 'flux-system';
    
    // 1. Prüfe/Erstelle Namespace "flux-system"
    try {
        await client.coreV1Api.readNamespace({ name: fluxNs });
        console.log(`✅ Namespace '${fluxNs}' existiert.`);
    } catch (e: any) {
        if (is404(e)) {
            console.log(`Creating Namespace '${fluxNs}'...`);
            await client.coreV1Api.createNamespace({ 
                body: { metadata: { name: fluxNs } } 
            });
            console.log(`✅ Namespace '${fluxNs}' erstellt.`);
        }
    }

    // (HelmRepository Check entfernt, da wir davon ausgehen, dass es existiert)

    // -----------------------------------------------------------------------
    // TEST: vCluster Erstellung
    // -----------------------------------------------------------------------
    console.log("\n--- Test: vCluster Erstellung ---");
    console.log("Erstelle vCluster für Gruppe 02...");
    
    await client.createVCluster('02');
    
    console.log("✅ Test erfolgreich: vCluster für Gruppe 02 wurde angefordert.");
    console.log("---------------------------------------------------");

  } catch (error: any) {
    console.error("\n❌ Operation fehlgeschlagen!");
    console.error("Fehler:", error.message);
    logErrorDetails(error);
  }
}

/**
 * Hilfsfunktion, um 404 Fehler in verschiedenen Error-Objekt-Strukturen zu erkennen.
 */
function is404(e: any): boolean {
    if (!e) return false;
    if (e.response && e.response.statusCode === 404) return true;
    if (e.code === 404) return true;
    if (e.body && e.body.code === 404) return true;
    return false;
}

function logErrorDetails(error: any) {
    if (error.response) {
       console.error("Status Code:", error.response.statusCode);
       if (error.response.body && typeof error.response.body === 'object') {
         console.error("Details:", JSON.stringify(error.response.body, null, 2));
       } else if (error.body) {
         console.error("Details:", error.body);
       }
    } else if (error.body) {
         console.error("Body Details:", typeof error.body === 'object' ? JSON.stringify(error.body, null, 2) : error.body);
    }
}

k8sClientTest();