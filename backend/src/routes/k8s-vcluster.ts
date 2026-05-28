import { Router } from "express";
import authenticationMiddleware, {
  RequestWithUser,
} from "../authentication/AuthenticationMiddleware";
import { K8sClient } from "../utils/k8s-client";



export default (): Router => {
  const router = Router()
  
  router.post("/deploy", authenticationMiddleware, (req, res, next) => {
    const reqWithUser = req as RequestWithUser;
    const client = new K8sClient(K8sClient.getConfig())
    client.createVCluster(reqWithUser.user.groupNumber)
      .then(() => { res.status(200).send(); })
      .catch(next);
  })

  router.delete("/undeploy", authenticationMiddleware, (req, res, next) => {
    const reqWithUser = req as RequestWithUser;
    const client = new K8sClient(K8sClient.getConfig())
    client.deleteVCluster(reqWithUser.user.groupNumber)
      .then(() => { res.status(200).send(); })
      .catch(next);
  })

  router.get("/kube-config", authenticationMiddleware, (req, res, next) => {
    const reqWithUser = req as RequestWithUser;
    const client = new K8sClient(K8sClient.getConfig())
    client.getVClusterKubeconfigForUser({
        groupNumber: reqWithUser.user.groupNumber,
        serviceUrl: `https://vcluster-group-${reqWithUser.user.groupNumber}.prona.local`
      })
      .then((kubeConfigString) => {
        res.setHeader('Content-Disposition', 'attachment; filename="kubeconfig"');
        res.setHeader('Content-Type', 'application/x-yaml');
        res.status(200).send(kubeConfigString);
      })
      .catch(next);
  })
  
  return router;
}