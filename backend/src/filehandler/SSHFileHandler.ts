import { Client } from "ssh2";
import fs from "fs";

export default class SSHFileHandler {
  private client: Client;
  private hasClosedOrErrored = false;
  constructor(ipaddress: string, port: number) {
    this.client = new Client();
    this.client
      .on("error", (err) => {
        console.log(err);
        this.hasClosedOrErrored = true;
      })
      .connect({
        host: ipaddress,
        port,
        username: "p4",
        password: "p4",
        privateKey: process.env.SSH_PRIVATE_KEY_PATH
          ? fs.readFileSync(process.env.SSH_PRIVATE_KEY_PATH)
          : undefined,
        readyTimeout: 10000,
      });
  }

  async readFile(absolutePath: string): Promise<string> {
    if (this.hasClosedOrErrored) {
      return Promise.reject(new Error("SSHFileHandler: SSH connection error."));
    }
    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) return reject(err);
        console.log("Retrieved sftp.");
        sftp.readFile(absolutePath, (err: Error, content: Buffer) => {
          if (err) return reject(err);
          console.log("retrieved file.", content);
          resolve(content.toString("utf-8"));
        });
      });
    });
  }

  async writeFile(absolutePath: string, content: string): Promise<void> {
    if (this.hasClosedOrErrored) {
      return Promise.reject(new Error("SSHFileHandler: SSH connection error."));
    }
    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) return reject(err);
        console.log("Retrieved sftp.");
        const writeStream = sftp.createWriteStream(absolutePath);
        writeStream.write(content);
        writeStream.on("close", () => {
          console.log("stream closed 1");
          resolve();
        });
        writeStream.on("finish", () => {
          console.log("stream closed 2");
        });
        writeStream.end();
      });
    });
  }
}
