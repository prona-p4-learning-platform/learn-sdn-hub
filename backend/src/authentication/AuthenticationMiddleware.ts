import { Request, RequestHandler } from "express";
import jwt from "jsonwebtoken";

export type TokenPayload = {
  username: string;
  id: string;
  groupNumber: number;
};

export type RequestWithUser = Request & {
  user: TokenPayload;
};

const middleware: RequestHandler = (req: RequestWithUser, res, next) => {
  const token = req.headers.authorization;
  try {
    /* replace secret */
    const result = jwt.verify(token, "some-secret") as TokenPayload;
    req.user = result;
    return next();
  } catch (err) {
    return res.status(401).json({ error: true, message: "Invalid token." });
  }
};
export default middleware;
