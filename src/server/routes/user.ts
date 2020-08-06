import { Router } from "express";
import bodyParser from "body-parser";
import jsonwebtoken from "jsonwebtoken";
import { Persister } from "../database/MongoDBPersister";

export default (persister: Persister): Router => {
  const router = Router();
  router.post("/login", bodyParser.json(), (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    if (username === "testuser") {
      const token = jsonwebtoken.sign({ username: "testuser" }, "shhhhh");
      return res.status(200).json({ token });
    }
    return res.status(401).json({ error: "Not authenticated." });
  });
  return router;
};
