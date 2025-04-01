declare module 'node-ssh-forward' {
    export interface SSHConnectionOptions {
      username?: string
      password?: string
      privateKey?: string | Buffer
      agentForward? : boolean
      bastionHost?: string
      passphrase?: string
      endPort?: number
      endHost: string
      agentSocket?: string,
      skipAutoPrivateKey?: boolean
      noReadline?: boolean
    }
  
    export interface ForwardingOptions {
      fromPort: number
      toPort: number
      toHost?: string
    }

    export class SSHConnection {
      constructor(options: SSHConnectionOptions);
      forward(options: ForwardingOptions): Promise<void>;
      shutdown(): Promise<void>;
    }
  }
  