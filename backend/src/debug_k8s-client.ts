import { K8sClient, K8sClientConfig } from './utils/k8s-client';
import * as fs from 'fs';

async function k8sClientTest() {

  const tokenPath = './src/cluster-config/token'; 
  const caPath = './src/cluster-config/ca.crt';
  const apiUrl = 'https://127.0.0.1:46597';

  if (!fs.existsSync(tokenPath) || !fs.existsSync(caPath)) {
    console.error(`Fehler: Dateien nicht gefunden!`);
    process.exit(1);
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
    
    // Fallback Check: Je nach Version ist es result.body.items oder result.items
    const items = result.items || (result as any).body?.items;

    console.log(`Verbindung steht.`);
    console.log(`Gefundene Namespaces: ${items.length}`);
    
    items.forEach((ns: any) => {
        console.log(`   - ${ns.metadata.name}`);
    });

  } catch (error: any) {
    console.error("\nVerbindung fehlgeschlagen!");
    console.error("Fehler:", error.message);
    
    if (error.response) {
       console.error("Status Code:", error.response.statusCode);
       console.error("Details:", error.response.body);
    }
  }
}

k8sClientTest();