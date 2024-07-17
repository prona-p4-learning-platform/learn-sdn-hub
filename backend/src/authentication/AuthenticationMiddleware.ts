import type { Response, Request, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface TokenPayload {
  username: string;
  id: string;
  groupNumber: number;
  role?: string;
  sessionId: string;
}

export type RequestWithUser = Request & {
  user: TokenPayload;
};

function middleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization;

  try {
    if (token) {
      const result = jwt.verify(token, process.env.JWT_TOKENSECRET ?? "some-secret") as TokenPayload;
      const reqWithUser = req as RequestWithUser;

      reqWithUser.user = result;
      next();
    } else throw new Error("No authorization header found.");
  } catch (err) {
    res.status(401).json({ error: true, message: "Invalid token." });
  }
}

export default middleware;
