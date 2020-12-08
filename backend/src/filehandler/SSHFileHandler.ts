import { Client } from "ssh2";
import fs from "fs";

export default class SSHFileHandler {
  private client: Client;
  constructor(ipaddress: string, port: number) {
    this.client = new Client();
    this.client.connect({
      host: ipaddress,
      port,
      username: "p4",
      password: "p4",
      privateKey: process.env.SSH_PRIVATE_KEY_PATH
        ? fs.readFileSync(process.env.SSH_PRIVATE_KEY_PATH)
        : undefined,
      readyTimeout: 60000,
    });
  }

  async readFile(absolutePath: string): Promise<string> {
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
