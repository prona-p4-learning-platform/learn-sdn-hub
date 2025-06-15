import { Client } from 'ssh2';
import fs from 'fs';
import * as net from 'net';

// TODO: use this class in the entire backend to handle SSH connections and port forwarding

export interface SSHConnectionOptions {
  username?: string;
  password?: string;
  privateKey?: string | Buffer;
  agentForwarding?: boolean;
  jumpHost?: string;
  passphrase?: string;
  endPort?: number;
  endHost: string;
  agentSocket?: string;
  noReadline?: boolean;
}

export interface ForwardingOptions {
  fromPort: number;
  toPort: number;
  toHost?: string;
}

export class SSHConnection {
  private options: SSHConnectionOptions;
  private jumpHostClient?: Client;
  private forwardingConnections: Map<string, Client | net.Server> = new Map();
  private isShutdown = false;

  constructor(options: SSHConnectionOptions) {
    this.options = options;
  }

  async forward(forwardOptions: ForwardingOptions): Promise<void> {
    if (this.isShutdown) {
      throw new Error('SSHConnection has been shut down');
    }

    const { fromPort, toPort, toHost } = forwardOptions;
    const targetHost = toHost || this.options.endHost;
    const connectionKey = `${fromPort}-${targetHost}-${toPort}`;

    return new Promise((resolve, reject) => {
      // If we have a jump host, we need to create a connection through it
      if (this.options.jumpHost) {
        this.createJumpHostConnection()
          .then((jumpHostClient) => {
            this.createForwardingThroughJumpHost(
              jumpHostClient,
              fromPort,
              targetHost,
              toPort,
              connectionKey
            )
              .then(() => resolve())
              .catch(reject);
          })
          .catch(reject);
      } else {
        // Direct connection to the target host
        this.createForwarding(fromPort, targetHost, toPort, connectionKey)
          .then(() => resolve())
          .catch(reject);
      }
    });
  }

  private async createJumpHostConnection(): Promise<Client> {
    if (this.jumpHostClient) {
      return this.jumpHostClient;
    }

    return new Promise((resolve, reject) => {
      const client = new Client();
      
      client
        .on('ready', () => {
          this.jumpHostClient = client;
          resolve(client);
        })
        .on('error', (err) => {
          reject(new Error(`jumpHost connection failed: ${err.message}`));
        })
        .connect({
          host: this.options.jumpHost,
          port: this.options.endPort || 22,
          username: this.options.username,
          password: this.options.password,
          privateKey: this.getPrivateKey(),
          passphrase: this.options.passphrase,
          readyTimeout: 10000,
        });
    });
  }

  private async createForwardingThroughJumpHost(
    jumpHostClient: Client,
    fromPort: number,
    targetHost: string,
    toPort: number,
    connectionKey: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create a local server that forwards to the jump host
      const server = net.createServer((localSocket: net.Socket) => {
        jumpHostClient.forwardOut(
          '127.0.0.1',
          0,
          targetHost,
          toPort,
          (err: Error | undefined, stream: NodeJS.ReadWriteStream) => {
            if (err) {
              localSocket.end();
              return;
            }

            // Pipe data between local socket and remote stream
            localSocket.pipe(stream).pipe(localSocket);
            
            localSocket.on('error', () => {
              stream.end();
            });
            
            stream.on('error', () => {
              localSocket.end();
            });
          }
        );
      });

      server.listen(fromPort, '127.0.0.1', () => {
        // Store the server for cleanup
        this.forwardingConnections.set(connectionKey, server);
        resolve();
      });

      server.on('error', (err: Error) => {
        reject(new Error(`Failed to create forwarding server: ${err.message}`));
      });
    });
  }

  private async createForwarding(
    fromPort: number,
    targetHost: string,
    toPort: number,
    connectionKey: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = new Client();
      
      client
        .on('ready', () => {
          // Create a local server that forwards directly to the target
          const server = net.createServer((localSocket: net.Socket) => {
            client.forwardOut(
              '127.0.0.1',
              0,
              targetHost,
              toPort,
              (err: Error | undefined, stream: NodeJS.ReadWriteStream) => {
                if (err) {
                  localSocket.end();
                  return;
                }

                // Pipe data between local socket and remote stream
                localSocket.pipe(stream).pipe(localSocket);
                
                localSocket.on('error', () => {
                  stream.end();
                });
                
                stream.on('error', () => {
                  localSocket.end();
                });
              }
            );
          });

          server.listen(fromPort, '127.0.0.1', () => {
            // Store both client and server for cleanup
            this.forwardingConnections.set(connectionKey, client);
            this.forwardingConnections.set(`${connectionKey}_server`, server);
            resolve();
          });

          server.on('error', (err: Error) => {
            client.end();
            reject(new Error(`Failed to create forwarding server: ${err.message}`));
          });
        })
        .on('error', (err) => {
          reject(new Error(`Direct connection failed: ${err.message}`));
        })
        .connect({
          host: targetHost,
          port: this.options.endPort || 22,
          username: this.options.username,
          password: this.options.password,
          privateKey: this.getPrivateKey(),
          passphrase: this.options.passphrase,
          readyTimeout: 10000,
        });
    });
  }

  private getPrivateKey(): Buffer | undefined {
    if (!this.options.privateKey) {
      return undefined;
    }

    if (Buffer.isBuffer(this.options.privateKey)) {
      return this.options.privateKey;
    }

    if (typeof this.options.privateKey === 'string') {
      // If it looks like a file path, read the file
      if (this.options.privateKey.includes('/') || this.options.privateKey.includes('\\')) {
        try {
          return fs.readFileSync(this.options.privateKey);
        } catch (error) {
          throw new Error(`Failed to read private key file: ${(error as Error).message}`);
        }
      } else {
        // Assume it's the key content itself
        return Buffer.from(this.options.privateKey);
      }
    }

    return undefined;
  }

  async shutdown(): Promise<void> {
    this.isShutdown = true;

    const shutdownPromises: Promise<void>[] = [];

    // Close all forwarding connections
    for (const [_key, connection] of this.forwardingConnections) {
      shutdownPromises.push(
        new Promise<void>((resolve) => {
          if (connection instanceof Client) {
            // SSH Client
            connection.end();
            resolve();
          } else if (connection instanceof net.Server) {
            // Net Server
            connection.close(() => resolve());
          } else {
            resolve();
          }
        })
      );
    }

    // Close jump host connection
    if (this.jumpHostClient) {
      shutdownPromises.push(
        new Promise<void>((resolve) => {
          this.jumpHostClient!.end();
          this.jumpHostClient = undefined;
          resolve();
        })
      );
    }

    await Promise.all(shutdownPromises);
    this.forwardingConnections.clear();
  }
}
