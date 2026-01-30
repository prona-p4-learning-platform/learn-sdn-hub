import { K8sClient, K8sClientConfig } from './utils/k8s-client';
import { AxiosError } from 'axios';
import * as fs from 'node:fs';

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

  const responseData = result as unknown as { 
    body: { 
      items: Array<{ metadata?: { name?: string } }> 
    }, 
    items?: Array<{ metadata?: { name?: string } }> 
  };
    
    const items = responseData.items || responseData.body?.items || [];

    console.log(`Verbindung steht.`);
    console.log(`Gefundene Namespaces: ${items.length}`);
    
    items.forEach((ns) => {
        console.log(`   - ${ns.metadata?.name ?? 'unnamed'}`);
    });

  } catch (error) {
    if (error instanceof AxiosError) {
      console.error("\nVerbindung fehlgeschlagen!");
      console.error("Fehler:", error.message);

      if (error.response) {
        console.error("Status Code:", error.response.status);
        console.error("Details:", JSON.stringify(error.response.data, null, 2));
      }
    } else if (error instanceof Error) {
      console.error("\nEin Fehler ist aufgetreten:", error.message)
    } else {
      console.error("\nUnbekannter Fehler:", error);
    }
  }
}

k8sClientTest();