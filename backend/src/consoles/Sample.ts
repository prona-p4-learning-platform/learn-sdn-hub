import { Client } from "ssh2";

const ssh = new Client();

ssh.on("error", (err) => console.log(err));
ssh.connect({
  host: "192.168.178.55",
  port: 22,
  username: "test",
  password: "test",
});

setInterval(() => console.log("periodic task"), 1000);
