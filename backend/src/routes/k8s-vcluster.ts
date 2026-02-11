import { Router } from "express";
import authenticationMiddleware, {
  RequestWithUser,
} from "../authentication/AuthenticationMiddleware";



export default (): Router => {
  const router = Router()
  
  router.post("/deploy", authenticationMiddleware, (req, res) => {
    const reqWithUser = req as RequestWithUser;
    reqWithUser.user.groupNumber
  
    res.status(200)
  })

  router.delete("/undeploy", authenticationMiddleware, (req, res) => {
    const reqWithUser = req as RequestWithUser;
    reqWithUser.user.groupNumber
  
    res.status(200)
  })

  router.get("/kube-config", authenticationMiddleware, (req, res) => {
    const reqWithUser = req as RequestWithUser;
    reqWithUser.user.groupNumber
  
    res.status(200)
  })
  
  return router;
}