import { Router } from "express";
import KubernetesManager, { KubernetesCert } from "../KubernetesManager";
import authenticationMiddleware, {
  RequestWithUser,
} from "../authentication/AuthenticationMiddleware";

export default (): Router => {
  const router = Router();

  router.post("/setup", authenticationMiddleware, (req, res) => {
    const reqWithUser = req as RequestWithUser;
    const k8s: KubernetesManager = new KubernetesManager();
    const namespaceName: string = k8s.buildNamespaceName(
      reqWithUser.user.groupNumber,
    );

    k8s
      .createUserCert(namespaceName)
      .then((cert: KubernetesCert) => {
        const kubeconfig: string = k8s.getKubeconfig(cert, namespaceName);
        console.log(kubeconfig);

        k8s
          .setupNamespace(namespaceName)
          .then(() => {
            res
              .status(200)
              .json({ status: "success", message: "K8S setup successful" });
          })
          .catch((err) => {
            res.status(500).json({ status: "error", message: String(err) });
          });
      })
      .catch((err) => {
        res.status(500).json({ status: "error", message: String(err) });
      });
  });

  router.delete("/undeploy", authenticationMiddleware, (req, res) => {
    const reqWithUser = req as RequestWithUser;
    const k8s: KubernetesManager = new KubernetesManager();
    const namespaceName: string = k8s.buildNamespaceName(
      reqWithUser.user.groupNumber,
    );

    k8s
      .undeployNamespace(namespaceName)
      .then(() => {
        res
          .status(200)
          .json({ status: "success", message: "K8S undeploy successful" });
      })
      .catch((err) => {
        res.status(500).json({ status: "error", message: String(err) });
      });
  });

  router.get("/download-kubeconfig", authenticationMiddleware, (req, res) => {
    const reqWithUser = req as RequestWithUser;
    const k8s: KubernetesManager = new KubernetesManager();
    const namespaceName: string = k8s.buildNamespaceName(
      reqWithUser.user.groupNumber,
    );

    k8s
      .getUserCert(namespaceName)
      .then((cert: KubernetesCert) => {
        const kubeconfig: string = k8s.getKubeconfig(cert, namespaceName);
        res.setHeader(
          "Content-disposition",
          `attachment; filename=${namespaceName}-kubeconfig`,
        );
        res.setHeader("Content-type", "text/yaml");
        res.write(kubeconfig);
        res.end();
      })
      .catch((err) => {
        res.status(500).json({ status: "error", message: String(err) });
      });
  });

  return router;
};
