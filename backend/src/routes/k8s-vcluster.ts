import { Router } from "express";
import authenticationMiddleware, {
  RequestWithUser,
} from "../authentication/AuthenticationMiddleware";
import { K8sClient } from "../utils/k8s-client";



export default (): Router => {
  const router = Router()
  
  router.post("/deploy", authenticationMiddleware, async (req, res) => {
    const reqWithUser = req as RequestWithUser;
    
    const client = new K8sClient(K8sClient.getConfig())
    await client.createVCluster(reqWithUser.user.groupNumber)

    res.status(200)
  })

  router.delete("/undeploy", authenticationMiddleware, async (req, res) => {
    const reqWithUser = req as RequestWithUser;
    
    const client = new K8sClient(K8sClient.getConfig())
    await client.deleteVCluster(reqWithUser.user.groupNumber)
  
    res.status(200)
  })

  router.get("/kube-config", authenticationMiddleware, async (req, res) => {
    const reqWithUser = req as RequestWithUser;
    const client = new K8sClient(K8sClient.getConfig())

    const kubeConfigString = await client.getVClusterKubeconfigForUser(
      {
        groupNumber: reqWithUser.user.groupNumber,
        serviceUrl: `https://vcluster-group-${reqWithUser.user.groupNumber}.prona.local`
      }
    )
  
    res.setHeader('Content-Disposition', 'attachment; filename="kubeconfig"');
    res.setHeader('Content-Type', 'application/x-yaml');
    res.status(200).send(kubeConfigString)
  })
  
  return router;
}