import { ChildProcess } from "child_process";

declare namespace firecrackerode {
  interface BootSource {
    kernel_image_path: string;
    boot_args: string;
  }

  interface VMInfo {
    id: string;
    state: string;
    vmm_version: string;
    app_name: string;
  }

  interface Preboot {
    path_on_host: string;
    is_root_device: boolean;
    is_read_only: boolean;
  }

  class Drive {
    constructor(modem: Modem, drive_id: string);

    updatePreboot(data: Preboot): Promise<Preboot>;
    updatePostboot(data: Preboot): Promise<Preboot>;
  }

  class Interface {
    constructor(modem: Modem, iface_id: string);

    create(props: InterfaceProperties): Promise<InterfaceProperties>;
    update(props: InterfaceProperties): Promise<InterfaceProperties>;
  }

  interface InterfaceProperties {
    iface_id: string;
    host_dev_name: string;
    guest_mac?: string;
    //rx_rate_limiter?: RateLimiter
    //tx_rate_limiter?: RateLimiter;
  }

  class MachineConfig {
    constructor(modem: Modem);

    get(): Promise<MachineConfigInfo>;

    update(data: MachineConfigInfo): Promise<MachineConfigInfo>;
  }

  interface MachineConfigInfo {
    vcpu_count: number;
    mem_size_mb: number;
    ht_enabled: boolean;
    track_dirty_pages: boolean;
  }

  //declare class MMDS {
  //  constructor(modem: Modem, opts: {});
  //
  //  create(callback): Promise<data>;
  //  get(): Promise<data>;
  //  update(data): Promise<data>;
  //}

  class Modem {
    constructor(options: ModemOptions);
  }

  interface ModemOptions {
    socketPath: string | undefined;
    timeout?: number;
    connectionTimeout?: number;
    headers?: Record<string, string>;
  }
}

declare class Firecrackerode {
  constructor(opts: firecrackerode.ModemOptions);

  info(): Promise<firecrackerode.VMInfo>;
  action(action: string): Promise<{ state: string }>;
  bootSource(
    data: firecrackerode.BootSource
  ): Promise<firecrackerode.BootSource>;
  //mmds(): MMDS;
  drive(id: string): firecrackerode.Drive;
  interface(id: string): firecrackerode.Interface;
  machineConfig(): firecrackerode.MachineConfig;
  //logger(data: {}): Promise<{}>;
  //metrics(data: {}): Promise<{}>;
  //vsock(data: {}): Promise<{}>;
  downloadImage(url: string, dest: string): Promise<void>;
  spawn(binPath: string): Promise<ChildProcess>;
  kill(): boolean;
}

export = Firecrackerode;
