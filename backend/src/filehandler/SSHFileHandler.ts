import { Client } from "ssh2";
import { JumpHost } from "../consoles/SSHConsole";
import fs from "fs";

export default class SSHFileHandler {
  private client!: Client; //SAL
  private hasClosed = false;
  private hasErrored = false;
  private parentJumpHostClient: Client | undefined;

  private static sftpConnections: Map<string, SSHFileHandler> = new Map();

  // SAL
  // constructor(
  //   environmentId: string,
  //   username: string,
  //   groupNumber: number,
  //   sessionId: string,
  //   ipaddress: string,
  //   port: number,
  //   jumpHost?: JumpHost,
  // ) {
  //   const fileHandlerIdentifier = `${ipaddress}:${port}:${environmentId}:${username}:${groupNumber}:${sessionId}`;
  //   const sftpConnection = SSHFileHandler.sftpConnections.get(
  //     fileHandlerIdentifier,
  //   );

  //   if (sftpConnection) {
  //     this.client = sftpConnection.client;
  //     this.hasClosed = sftpConnection.hasClosed;
  //     this.hasErrored = sftpConnection.hasErrored;
  //     this.parentJumpHostClient = sftpConnection.parentJumpHostClient;
  //   } else {
  //       this.client = new Client();
  //       if (jumpHost?.ipaddress !== undefined) {
  //         // console.debug(
  //         //   "Establishing SFTP connection " +
  //         //     ipaddress +
  //         //     ":" +
  //         //     port +
  //         //     " via jump host " +
  //         //     jumpHost.ipaddress +
  //         //     ":" +
  //         //     jumpHost.port,
  //         // );
  //         const sshJumpHostConnection = new Client();
  //         sshJumpHostConnection
  //           .on("ready", () => {
  //             sshJumpHostConnection.forwardOut(
  //               "127.0.0.1",
  //               0,
  //               ipaddress,
  //               port,
  //               (err, stream) => {
  //                 if (err) {
  //                   console.error("Unable to forward connection on jump host");
  //                   this.client.end();
  //                   sshJumpHostConnection.end();
  //                   console.error(err);
  //                   this.hasErrored = true;
  //                 } else {
  //                   this.client
  //                     .on("ready", () => {
  //                       //console.debug("SFTP connection via jump host :: ready");
  //                       this.parentJumpHostClient = sshJumpHostConnection;
  //                       SSHFileHandler.sftpConnections.set(
  //                         fileHandlerIdentifier,
  //                         this,
  //                       );
  //                     })
  //                     .on("close", () => {
  //                       //console.debug("SFTP connection via jump host :: close");
  //                       this.client.end();
  //                       sshJumpHostConnection.end();
  //                       this.hasClosed = true;
  //                       SSHFileHandler.sftpConnections.delete(
  //                         fileHandlerIdentifier,
  //                       );
  //                     })
  //                     .on("error", (err) => {
  //                       console.error(err);
  //                       this.client.end();
  //                       sshJumpHostConnection.end();
  //                       this.hasErrored = true;
  //                       SSHFileHandler.sftpConnections.delete(
  //                         fileHandlerIdentifier,
  //                       );
  //                     })
  //                     .connect({
  //                       sock: stream,
  //                       username: process.env.SSH_USERNAME,
  //                       password: process.env.SSH_PASSWORD,
  //                       privateKey: process.env.SSH_PRIVATE_KEY_PATH
  //                         ? fs.readFileSync(process.env.SSH_PRIVATE_KEY_PATH)
  //                         : undefined,
  //                       readyTimeout: 1000,
  //                     });
  //                 }
  //               },
  //             );
  //           })
  //           .on("error", (err) => {
  //             this.client.end();
  //             sshJumpHostConnection.end();
  //             console.error(err);
  //             this.hasErrored = true;
  //           })
  //           .connect({
  //             host: jumpHost.ipaddress,
  //             port: jumpHost.port,
  //             username: jumpHost.username,
  //             password: jumpHost.password,
  //             privateKey: jumpHost.privateKey
  //               ? fs.readFileSync(jumpHost.privateKey)
  //               : undefined,
  //             //debug: (debug) => {
  //             //  console.debug(debug);
  //             //},
  //             readyTimeout: 1000
  //           });
  //       } else {
  //         //console.debug("Establishing SFTP connection " + ipaddress + ":" + port);
  //         this.client
  //           .on("ready", () => {
  //             //console.debug("SFTP connection :: ready");
  //             SSHFileHandler.sftpConnections.set(fileHandlerIdentifier, this);
  //           })
  //           .on("error", (err) => {
  //             console.error(err);
  //             this.hasErrored = true;
  //             SSHFileHandler.sftpConnections.delete(fileHandlerIdentifier);
  //           })
  //           .on("close", () => {
  //             //console.debug("SSHFileHandler has been closed.");
  //             this.hasClosed = true;
  //             SSHFileHandler.sftpConnections.delete(fileHandlerIdentifier);
  //           })
  //           .connect({
  //             host: ipaddress,
  //             port,
  //             username: process.env.SSH_USERNAME,
  //             password: process.env.SSH_PASSWORD,
  //             privateKey: process.env.SSH_PRIVATE_KEY_PATH
  //               ? fs.readFileSync(process.env.SSH_PRIVATE_KEY_PATH)
  //               : undefined,
  //             readyTimeout: 1000,
  //           });
  //       }
  //   }
  // }

  constructor() {}

  static async create(
    environmentId: string,
    username: string,
    groupNumber: number,
    sessionId: string,
    ipaddress: string,
    port: number,
    jumpHost?: JumpHost,
    retryTimeoutMs: number = 60000,
    retryDelayMs: number = 3000
  ): Promise<SSHFileHandler> {
    const handler = new SSHFileHandler();
    await handler.retryConnection(environmentId, username, groupNumber, sessionId, ipaddress, port, jumpHost, retryTimeoutMs, retryDelayMs);
    return handler;
  }

  private async retryConnection(
    environmentId: string,
    username: string,
    groupNumber: number,
    sessionId: string,
    ipaddress: string,
    port: number,
    jumpHost?: JumpHost,
    retryTimeoutMs: number = 600000,
    retryDelayMs: number = 3000
  ) {
    const startTime = Date.now();

    while (Date.now() - startTime < retryTimeoutMs) {
      try {
        this.hasErrored = false;
        console.log(`Verbindung zu ${ipaddress}:${port} wird versucht...`);
        await this.connect(environmentId, username, groupNumber, sessionId, ipaddress, port, jumpHost);
        console.log("Verbindung erfolgreich!");
        return;
      } catch (error) {
        console.error(`Verbindung fehlgeschlagen: ${error}`);
        console.log(`Neuer Versuch in ${retryDelayMs / 1000} Sekunden...`);
        await this.sleep(retryDelayMs);
      }
    }

    throw new Error(`Verbindung zu ${ipaddress}:${port} konnte nicht hergestellt werden (Timeout).`);
  }
  
  private async connect(
    environmentId: string,
    username: string,
    groupNumber: number,
    sessionId: string,
    ipaddress: string,
    port: number,
    jumpHost?: JumpHost
  ): Promise<void> {
    return new Promise((resolve, reject) => {
		const fileHandlerIdentifier = `${ipaddress}:${port}:${environmentId}:${username}:${groupNumber}:${sessionId}`;
		const sftpConnection = SSHFileHandler.sftpConnections.get(
		  fileHandlerIdentifier,
		);

		if (sftpConnection) {
		  this.client = sftpConnection.client;
		  this.hasClosed = sftpConnection.hasClosed;
		  this.hasErrored = sftpConnection.hasErrored;
		  this.parentJumpHostClient = sftpConnection.parentJumpHostClient;
		  
		  return resolve();
		} else {
			this.client = new Client();
			if (jumpHost?.ipaddress !== undefined) {
			  // console.debug(
			  //   "Establishing SFTP connection " +
			  //     ipaddress +
			  //     ":" +
			  //     port +
			  //     " via jump host " +
			  //     jumpHost.ipaddress +
			  //     ":" +
			  //     jumpHost.port,
			  // );
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
              console.error("Unable to forward connection on jump host");
              this.client.end();
              sshJumpHostConnection.end();
              console.error(err);
              this.hasErrored = true;
              
              return reject(err);
					  } else {
              this.client
                .on("ready", () => {
                  //console.debug("SFTP connection via jump host :: ready");
                  this.parentJumpHostClient = sshJumpHostConnection;
                  SSHFileHandler.sftpConnections.set(
                    fileHandlerIdentifier,
                    this,
                  );
                  
                  return resolve();
                })
                .on("close", () => {
                  //console.debug("SFTP connection via jump host :: close");
                  this.client.end();
                  sshJumpHostConnection.end();
                  this.hasClosed = true;
                  SSHFileHandler.sftpConnections.delete(
                    fileHandlerIdentifier,
                  );
                })
                .on("error", (err) => {
                  console.error(err);
                  this.client.end();
                  sshJumpHostConnection.end();
                  this.hasErrored = true;
                  SSHFileHandler.sftpConnections.delete(
                    fileHandlerIdentifier,
                  );
                  
                  return reject(err);
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
          });
				})
				.on("error", (err) => {
				  this.client.end();
				  sshJumpHostConnection.end();
				  console.error(err);
				  this.hasErrored = true;
				  
				  return reject(err);
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
				  //  console.debug(debug);
				  //},
				  readyTimeout: 1000
				});
			} else {
			  //console.debug("Establishing SFTP connection " + ipaddress + ":" + port);
			  this.client
				.on("ready", () => {
				  //console.debug("SFTP connection :: ready");
				  SSHFileHandler.sftpConnections.set(fileHandlerIdentifier, this);
				  
				  return resolve();
				})
				.on("error", (err) => {
				  console.error(err);
				  this.hasErrored = true;
				  SSHFileHandler.sftpConnections.delete(fileHandlerIdentifier);
				  
				  return reject(err);
				})
				.on("close", () => {
				  //console.debug("SSHFileHandler has been closed.");
				  this.hasClosed = true;
				  SSHFileHandler.sftpConnections.delete(fileHandlerIdentifier);
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
    });
  }

  //SAL


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
          sftp.end();
          reject(err);
          return;
        }

        //console.debug("Retrieved via sftp.");
        sftp.readFile(
          absolutePath,
          (err: Error | undefined, content: Buffer) => {
            if (err) {
              sftp.end();
              reject(err);
              return;
            }
            //console.debug("retrieved file.", content);
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

        //console.debug("Deployed via sftp.");

        const writeStream = sftp.createWriteStream(absolutePath);
        writeStream.on("close", () => {
          //console.debug("sftp stream closed");
          // sftp.emit("close")?
          sftp.end();
          resolve();
        });
        writeStream.on("finish", () => {
          //console.debug("sftp stream finished");
        });
        writeStream.on("error", () => {
          console.error("sftp stream error");
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
        this.parentJumpHostClient?.end();
        resolve();
      }
    });
  }

  sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
