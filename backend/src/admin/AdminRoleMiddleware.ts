import { Response, NextFunction, RequestHandler } from "express";
import { RequestWithUser } from "../authentication/AuthenticationMiddleware";

const middleware: RequestHandler = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  const role = req.user.role;

  if (!role || role !== "admin") {
    return res
      .status(401)
      .json({ error: true, message: "Not authorized to view this resource." });
  }

  // If the user has the "admin" role, proceed to the next middleware or route handler
  next();
};

export default middleware;
