declare module "pkgcloud" {
  interface CreateServerOptions {
    name: string;
    flavor: string;
    image: string;
    personality?: [];
    networks?: { uuid: string }[];
    key_name?: string;
  }

  interface OpenStackOptions {
    provider: string;
    username: string;
    password: string; // required
    authUrl: string; // required,
    keystoneAuthVersion: string;
    region: string;
    tenantId: string;
    domainName: string;
  }

  interface OpenStackClient {
    getServer(
      server: string,
      callback: (err: Error | null, server: string) => void
    ): void;
    createServer(
      options: CreateServerOptions,
      callback: (err: Error | null, server: string) => void
    ): void;
    destroyServer(): null;
  }

  export namespace compute {
    function createServer(options: CreateServerOptions): null;
    function createClient(options: OpenStackOptions): OpenStackClient;
  }
}
