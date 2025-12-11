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
  private clab_token_duration: number;

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

    const ENV_TOKEN_DURATION = process.env.CLAB_TOKEN_DURATION_IN_MINUTES
    if(ENV_TOKEN_DURATION) {
      const TOKEN_DURATION = parseInt(ENV_TOKEN_DURATION);
      if(!isNaN(TOKEN_DURATION)) {
        this.clab_token_duration = TOKEN_DURATION*60*1000;
      }
      else {
        throw new Error(
          "ContainerLabProvider: Provided token duration cannot be parsed (CLAB_TOKEN_DURATION_IN_MINUTES).",
        );
      }
    }
    else {
      this.clab_token_duration = 60*60*1000; // default token duration 60 minutes
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

    if (this.clab_token && this.providerInstance) {
      console.log("ContainerlabProvider: " + this.clab_username + " " + this.clab_password + " " +
          this.clab_apiUrl + " " + this.maxInstanceLifetimeMinutes);
    }
    this.getToken().catch((err) => {
      console.log(
        "ContainerLabProvider: Initial authentication to ContainerLab failed: " +
          err.message,
      );
    });
  }

  async getToken(): Promise<void> {
    const providerInstance = this.providerInstance;
    return new Promise((resolve, reject) => {
      const tokenExpires = Date.parse(
        providerInstance.clab_token?.expires_at ?? Date(),
      );
      const now = Date.now();

      console.log(
        "Token expires at: " +
          new Date(tokenExpires).toISOString() +
          " now: " +
          new Date(now).toISOString(),
      );

      // add 5 sec for the token to be valid for subsequent operations
      if (
        providerInstance.clab_token !== undefined &&
        now <= tokenExpires + 5000
      ) {
        return resolve();
      } 
      else {
        // authenticate to ContainerLab and get a token
        const data_auth = {
            "username": this.clab_username,
            "password": this.clab_password,
        };
        fetch(providerInstance.clab_apiUrl + "login",{
          signal: AbortSignal.timeout(10000), // 10 seconds timeout
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data_auth)
        })
        .then(response => {
          if(response.ok) {
            if(response.body) {
              return response.json().then(data => {
                if(!data.token) {
                  return reject(
                    new Error("ContainerLabProvider: Authentication failed: No token received"),
                  );
                }
                const issued_at = Date.now()
                const token = data.token as string;
                
                if(providerInstance.clab_token === undefined){
                  providerInstance.clab_token = {} as Token;
                }

                providerInstance.clab_token.token = token;
                providerInstance.clab_token.issued_at = (issued_at - 10000).toString(); // workaround, set issued at to 10 sec in the past, because 10 sec timeout above
                providerInstance.clab_token.expires_at = (issued_at + this.clab_token_duration).toString(); // token valid for configured duration
                return resolve();
              });
            }}
          return reject(
            new Error("ContainerLabProvider: Authentication failed: No token received"),
          );
        })
        .catch(function (err) {
          return reject(new Error("ContainerLabProvider: Authentication failed: " + err));
        });
      }
    });
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
