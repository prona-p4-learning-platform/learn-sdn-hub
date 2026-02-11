import { Router } from "express";
import authenticationMiddleware, {
  RequestWithUser,
} from "../authentication/AuthenticationMiddleware";
import { K8sClient } from "../utils/k8s-client";



export default (): Router => {
  const router = Router()
  
  router.post("/deploy", authenticationMiddleware, (req, res) => {
    const reqWithUser = req as RequestWithUser;
    
    const client = new K8sClient(K8sClient.getConfig())
    client.createVCluster(reqWithUser.user.groupNumber)

    res.status(200)
  })

  router.delete("/undeploy", authenticationMiddleware, (req, res) => {
    const reqWithUser = req as RequestWithUser;
    
    const client = new K8sClient(K8sClient.getConfig())
    client.deleteVCluster(reqWithUser.user.groupNumber)
  
    res.status(200)
  })

  router.get("/kube-config", authenticationMiddleware, (req, res) => {
    const reqWithUser = req as RequestWithUser;
    reqWithUser.user.groupNumber
  
    res.status(200)
  })
  
  return router;
}