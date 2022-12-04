import { Client } from "ssh2";
import fs from "fs";

export default class SSHFileHandler {
  private client: Client;
  private hasClosed = false;
  private hasErrored = false;
  constructor(ipaddress: string, port: number) {
    console.log("Establishing SFTP connection " + ipaddress + ":" + port);
    this.client = new Client();
    this.client
      .on("error", (err) => {
        console.log(err);
        this.hasErrored = true;
      })
      .on("close", () => {
        console.log("SSHFileHandler has been closed.");
        this.hasClosed = true;
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

  async readFile(
    absolutePath: string,
    encoding?: BufferEncoding
  ): Promise<string> {
    if (this.hasClosed) {
      return Promise.reject(
        new Error("SSHFileHandler: SSH connection closed.")
      );
    }
    if (this.hasErrored) {
      return Promise.reject(new Error("SSHFileHandler: SSH connection error."));
    }
    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) return reject(err);
        //console.log("Retrieved via sftp.");
        sftp.readFile(absolutePath, (err: Error, content: Buffer) => {
          if (err) return reject(err);
          //console.log("retrieved file.", content);
          sftp.end();
          if (encoding) {
            return resolve(content.toString(encoding));
          } else {
            return resolve(content.toString("utf-8"));
          }
        });
      });
    });
  }

  async writeFile(absolutePath: string, content: string): Promise<void> {
    if (this.hasClosed) {
      return Promise.reject(
        new Error("SSHFileHandler: SSH connection closed.")
      );
    }
    if (this.hasErrored) {
      return Promise.reject(new Error("SSHFileHandler: SSH connection error."));
    }
    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) return reject(err);
        console.log("Deployed via sftp.");
        const writeStream = sftp.createWriteStream(absolutePath);
        writeStream.on("close", () => {
          console.log("stream closed");
          sftp.end();
          return resolve();
        });
        writeStream.on("finish", () => {
          console.log("stream finished");
        });
        writeStream.on("error", () => {
          console.log("stream error");
          sftp.end();
          return reject(new Error("SSHFileHandler: SFTP stream error."));
        });
        writeStream.write(content);
        writeStream.end();
      });
    });
  }

  async close(): Promise<void> {
    if (this.hasClosed) {
      // already closed
      return Promise.resolve();
    }
    if (this.hasErrored) {
      return Promise.reject(
        new Error("SSHFileHandler: SFTP connection error.")
      );
    }
    this.client.end();
  }
}
