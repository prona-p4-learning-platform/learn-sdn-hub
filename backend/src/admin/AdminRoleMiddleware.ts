import { Response, Request, NextFunction } from "express";
import { RequestWithUser } from "../authentication/AuthenticationMiddleware";

function middleware(req: Request, res: Response, next: NextFunction): void {
  const reqWithUser = req as RequestWithUser;
  const role = reqWithUser.user.role;

  if (!role || role !== "admin") {
    res
      .status(401)
      .json({ error: true, message: "Not authorized to view this resource." });
  } else {
    // If the user has the "admin" role, proceed to the next middleware or route handler
    next();
  }
}

export default middleware;
