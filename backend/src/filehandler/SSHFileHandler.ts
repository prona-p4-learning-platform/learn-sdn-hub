import { Client } from "ssh2";
import { JumpHost } from "../consoles/SSHConsole";
import fs from "fs";

export default class SSHFileHandler {
  private client: Client;
  private hasClosed = false;
  private hasErrored = false;

  constructor(ipaddress: string, port: number, jumpHost?: JumpHost) {
    this.client = new Client();
    if (jumpHost?.ipaddress !== undefined) {
      console.log(
        "Establishing SFTP connection " +
          ipaddress +
          ":" +
          port +
          " via jump host " +
          jumpHost.ipaddress +
          ":" +
          jumpHost.port,
      );
      const sshJumpHostConnection = new Client();
      sshJumpHostConnection
        .on("ready", () => {
          sshJumpHostConnection.forwardOut(
            "127.0.0.1",
            0,
            ipaddress,
            port,
            (err, stream) => {
              if (err) {
                console.log("Unable to forward connection on jump host");
                this.client.end();
                sshJumpHostConnection.end();
                console.log(err);
                this.hasErrored = true;
              } else {
                this.client
                  .on("ready", () => {
                    console.log("SFTP connection via jump host :: ready");
                  })
                  .on("close", () => {
                    console.log("SFTP connection via jump host :: close");
                    this.client.end();
                    sshJumpHostConnection.end();
                    this.hasClosed = true;
                  })
                  .on("error", (err) => {
                    console.log(err);
                    this.client.end();
                    sshJumpHostConnection.end();
                    this.hasErrored = true;
                  })
                  .connect({
                    sock: stream,
                    username: process.env.SSH_USERNAME,
                    password: process.env.SSH_PASSWORD,
                    privateKey: process.env.SSH_PRIVATE_KEY_PATH
                      ? fs.readFileSync(process.env.SSH_PRIVATE_KEY_PATH)
                      : undefined,
                    readyTimeout: 1000,
                  });
              }
            },
          );
        })
        .on("error", (err) => {
          this.client.end();
          sshJumpHostConnection.end();
          console.log(err);
          this.hasErrored = true;
        })
        .connect({
          host: jumpHost.ipaddress,
          port: jumpHost.port,
          username: jumpHost.username,
          password: jumpHost.password,
          privateKey: jumpHost.privateKey
            ? fs.readFileSync(jumpHost.privateKey)
            : undefined,
          //debug: (debug) => {
          //  console.log(debug);
          //},
          readyTimeout: 1000,
        });
    } else {
      console.log("Establishing SFTP connection " + ipaddress + ":" + port);
      this.client
        .on("ready", () => {
          console.log("SFTP connection :: ready");
        })
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
          username: process.env.SSH_USERNAME,
          password: process.env.SSH_PASSWORD,
          privateKey: process.env.SSH_PRIVATE_KEY_PATH
            ? fs.readFileSync(process.env.SSH_PRIVATE_KEY_PATH)
            : undefined,
          readyTimeout: 1000,
        });
    }
  }

  readFile(absolutePath: string, encoding?: BufferEncoding): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.hasClosed) {
        reject(new Error("SSHFileHandler: SSH connection closed."));
        return;
      } else if (this.hasErrored) {
        reject(new Error("SSHFileHandler: SSH connection error."));
        return;
      }

      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        //console.log("Retrieved via sftp.");
        sftp.readFile(
          absolutePath,
          (err: Error | undefined, content: Buffer) => {
            if (err) {
              reject(err);
              return;
            }
            //console.log("retrieved file.", content);
            // sftp.emit("close")?
            sftp.end();

            if (encoding) {
              resolve(content.toString(encoding));
            } else {
              resolve(content.toString("utf-8"));
            }
          },
        );
      });
    });
  }

  writeFile(absolutePath: string, content: string): Promise<void> {
    if (this.hasClosed) {
      return Promise.reject(
        new Error("SSHFileHandler: SSH connection closed."),
      );
    }
    if (this.hasErrored) {
      return Promise.reject(new Error("SSHFileHandler: SSH connection error."));
    }
    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        console.log("Deployed via sftp.");

        const writeStream = sftp.createWriteStream(absolutePath);
        writeStream.on("close", () => {
          console.log("stream closed");
          // sftp.emit("close")?
          sftp.end();
          resolve();
        });
        writeStream.on("finish", () => {
          console.log("stream finished");
        });
        writeStream.on("error", () => {
          console.log("stream error");
          // sftp.emit("close")?
          sftp.end();
          reject(new Error("SSHFileHandler: SFTP stream error."));
        });
        writeStream.write(content);
        writeStream.end();
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.hasClosed) resolve();
      else if (this.hasErrored)
        reject(new Error("SSHFileHandler: SFTP connection error."));
      else {
        this.client.end();
        resolve();
      }
    });
  }
}
