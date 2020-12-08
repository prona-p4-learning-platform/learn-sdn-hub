import { Router } from "express";
import bodyParser from "body-parser";
import P4Environment from "../P4Environment";
const router = Router();

router.post("/", bodyParser.text({ type: "text/plain" }), (req, res) => {
  P4Environment.compile(req.body)
    .then((result) =>
      res.status(200).json({ status: "compilation successful", result })
    )
    .catch((err: Error) =>
      res.status(200).json({ status: "compilation error", err })
    );
});

router.post("/raw", bodyParser.text({ type: "text/plain" }), (req, res) => {
  P4Environment.compileRawOutput(req.body)
    .then((result) =>
      res.status(200).json({ status: "compilation successful", result })
    )
    .catch((err: Error) =>
      res.status(200).json({ status: "compilation error", err })
    );
});

export default router;
