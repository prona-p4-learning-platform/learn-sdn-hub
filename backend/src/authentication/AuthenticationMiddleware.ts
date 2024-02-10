import type { Response, Request, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface TokenPayload {
  username: string;
  id: string;
  groupNumber: number;
}

export type RequestWithUser = Request & {
  user: TokenPayload;
};

function middleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization;
  try {
    /* TODO: replace secret */
    const result = jwt.verify(token, "some-secret") as TokenPayload;
    const reqWithUser = req as RequestWithUser;

    reqWithUser.user = result;
    next();
  } catch (err) {
    res.status(401).json({ error: true, message: "Invalid token." });
  }
}

export default middleware;
