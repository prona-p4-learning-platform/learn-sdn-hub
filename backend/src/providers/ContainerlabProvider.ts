/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// TODO: fix eslint instead of disabling rules
// currently in developement, as the ContainerLab provider is not actively used in our envs

import {
  InstanceProvider,
  VMEndpoint,
  //InstanceNotFoundErrorMessage,
} from "./Provider";
//import { Client } from "ssh2";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
//import Environment from "../Environment";

const schedulerIntervalSeconds = 5 * 60;

interface Token {
  token: string;
  issued_at: string;
  expires_at: string;
}

export default class ContainerLabProvider implements InstanceProvider {
  // ContainerLab config
  private clab_username: string;
  private clab_password: string;
  private clab_apiUrl: string;

  // the authentication token from keystone
  private clab_token?: Token;

  // ContainerLab Provider config
  private maxInstanceLifetimeMinutes: number;

  // SSH and LanguageServer Port config
  //private sshPort: number;
  //private lsPort: number;

  //private axiosInstance: AxiosInstance;

  private providerInstance: ContainerLabProvider;

  constructor() {

    // check for ContainerLab username
    const ENV_USERNAME = process.env.CLAB_USERNAME;
    if (ENV_USERNAME) this.clab_username = ENV_USERNAME;
    else {
      throw new Error(
        "ContainerLabProvider: No username provided (CONTAINERLAB_USERNAME).",
      );
    }

    // check for ContainerLab password
    const ENV_PASSWORD = process.env.CLAB_PASSWORD;
    if (ENV_PASSWORD) this.clab_password = ENV_PASSWORD;
    else {
      throw new Error(
        "ContainerLabProvider: No password provided (CONTAINERLAB_PASSWORD).",
      );
    }

    // check for ContainerLab auth url
    const ENV_URL = process.env.CLAB_APIURL;
    if (ENV_URL) this.clab_apiUrl = ENV_URL;
    else {
      throw new Error(
        "ContainerLabProvider: No API Url provided (CONTAINERLAB_AUTHURL).",
      );
    }

    // check for max instance lifetime
    const ENV_LIFETIME = process.env.CLAB_MAX_INSTANCE_LIFETIME_MINUTES;
    if (ENV_LIFETIME) {
      const parsedLifetime = parseInt(ENV_LIFETIME);

      if (!isNaN(parsedLifetime))
        this.maxInstanceLifetimeMinutes = parsedLifetime;
      else {
        throw new Error(
          "ContainerLabProvider: Provided instance lifetime cannot be parsed (CONTAINERLAB_MAX_INSTANCE_LIFETIME_MINUTES).",
        );
      }
    } else {
      throw new Error(
        "DockerProvider: No instance lifetime provided (CONTAINERLAB_MAX_INSTANCE_LIFETIME_MINUTES).",
      );
    }

    this.providerInstance = this;

    // better use env var to allow configuration of port numbers?
    // this.sshPort = 22;
    // this.lsPort = 3005;

    const scheduler = new ToadScheduler();

    const task = new AsyncTask(
      "ContainerLabProvider Instance Pruning Task",
      () => {
        return this.pruneServerInstance();
      },
      (err: Error) => {
        console.log(
          "ConatinerLabProvider: Could not prune stale server instances..." +
            err.message,
        );
      },
    );
    const job = new SimpleIntervalJob(
      { seconds: schedulerIntervalSeconds, runImmediately: true },
      task,
    );

    scheduler.addSimpleIntervalJob(job);

    console.log("ContainerlabProvider: " + this.clab_username + " " + this.clab_password + " " + this.clab_apiUrl + " " + this.clab_token + " " + this.maxInstanceLifetimeMinutes + " " + this.providerInstance);

  }

  async getToken(): Promise<void> {

    return new Promise(() => {});
  }

  async createServer(): Promise<VMEndpoint> {

    return new Promise(() => {});
  }

  async getServer(): Promise<VMEndpoint> {

    return new Promise(() => {});
  }

  async deleteServer(): Promise<void> {
    return new Promise(() => {});
  }

  async pruneServerInstance(): Promise<void> {

    return new Promise(() => {});
  }

  waitForServerAddresses(): Promise<string> {

    return new Promise<string>(async () => {});
  }

  //waitForServerSSH(ip: string, port: number, timeout: number): Promise<void> {
  //
  //  return new Promise<void>(async () => {});
  //}

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
