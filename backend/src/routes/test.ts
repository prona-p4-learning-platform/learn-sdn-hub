import { exec } from "child_process";
import { Router } from "express";

export default (): Router => {
  const router = Router();

  router.get("/", (_, res) => {
    const ymlPath = "<path-to-topo.yml>"; // Test path to topology

    function execAsync(command: string) {
      return new Promise((resolve, reject) => {
        exec(command, (error: any, stdout: any, stderr: any) => {
          if (error) {
            reject(`Ausführungsfehler: ${error}`);
            return;
          }
          resolve({ stdout, stderr });
        });
      });
    }

    async function runCommandsSequentially() {
      console.log("Hello world this is containerlab endpoint"); // Does not get printed
      try {
        const result2: any = await execAsync(
          `sudo containerlab graph --topo ${ymlPath} --srv ":3003"`
        );
        console.log("Befehl ausgeführt:", result2.stdout); // Does not get printed
      } catch (error) {
        console.error("Fehler:", error);
      }
    }

    runCommandsSequentially();
    res.status(200); // Status 200 gets returned
  });

  return router;
};
