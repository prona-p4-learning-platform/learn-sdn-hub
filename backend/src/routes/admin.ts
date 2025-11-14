import express, { RequestHandler, Router, json } from "express";
import authenticationMiddleware, {
  RequestWithUser,
} from "../authentication/AuthenticationMiddleware";
import adminRoleMiddleware from "../admin/AdminRoleMiddleware";
import { CourseUserAction, FileData, Persister, AssignmentUpdate } from "../database/Persister";
import bodyParser from "body-parser";
import environments from "../Configuration";
import {
  SubmissionAdminOverviewEntry,
  TerminalStateType,
} from "../Environment";
import { broadcastSheetUpdate } from "../websocket/SheetHandler";

export interface CreateAssignmentBody {
  name: string;
  maxBonusPoints?: number;
  assignmentLabSheet?: string;
  labSheetName?: string;
}

export interface DeleteAssignmentBody {
  _id: string;
  _sheetId: string;
}

export default (persister: Persister): Router => {
  const router = Router();

  router.get(
    "/users",
    authenticationMiddleware,
    adminRoleMiddleware,
    (_req, res, next) => {
      (async () => {
        try {
          const userData = await persister.GetAllUsers();
          return res.status(200).json(userData);
        } catch (err) {
          if (err instanceof Error) {
            return res.status(500).json({ error: true, message: err.message });
          } else {
            return res.status(500).json({
              error: true,
              message: "An unknown error occurred",
            });
          }
        }
      })().catch(next);
    },
  );

  router.get(
    "/assignments",
    authenticationMiddleware,
    adminRoleMiddleware,
    (_req, res, next) => {
      (async () => {
        try {
          const assignments = await persister.GetAllAssignments();
          return res
            .status(200)
            .json(
              assignments.length > 0
                ? assignments
                : Array.from(new Map(environments).keys()),
            );
        } catch (err) {
          if (err instanceof Error) {
            return res.status(500).json({ error: true, message: err.message });
          } else {
            return res.status(500).json({
              error: true,
              message: "An unknown error occurred",
            });
          }
        }
      })().catch(next);
    },
  );

  router.post(
    "/assignments/create",
    authenticationMiddleware,
    adminRoleMiddleware,
    (_req, res, next) => {
      (async () => {
        try {
          const response = await persister.CreateAssignments();

          return res.status(200).json(response);
        } catch (err) {
          if (err instanceof Error) {
            if (err.message === "Method not implemented.") {
              return res.status(501).json({
                error: true,
                message: "Function not yet supported for this configuration.",
              });
            } else {
              return res.status(500).json({
                error: true,
                message: err.message,
              });
            }
          } else {
            return res.status(500).json({
              error: true,
              message: "An unknown error occurred",
            });
          }
        }
      })().catch(next);
    },
  );

  router.post(
    "/assignments/createNew",
    authenticationMiddleware,
    adminRoleMiddleware,
    json(),
    (_req: express.Request<object, object, CreateAssignmentBody>, res, next) => {
      (async () => {
        console.log('request', _req.body)
        try {
          const { name, maxBonusPoints, assignmentLabSheet, labSheetName } = _req.body;
          if (!name) {
            return res.status(400).json({ error: true, message: "Missing name" });
          }
          const assignment = {
            name: name,
            maxBonusPoints: maxBonusPoints ?? undefined,
            assignmentLabSheet,
            labSheetName,
          };
          const response = await persister.CreateAssignment(assignment);
          return res.status(200).json(response);
        } catch (err) {
          console.log(err);
          if (err instanceof Error) {
            if (err.message.includes("already exists")) {
              return res.status(409).json({
                error: true,
                message: err.message,
              });
            }
            if (err.message === "Method not implemented.") {
              return res.status(501).json({ error: true, message: "Function not yet supported" });
            }
            return res.status(500).json({ error: true, message: err.message });
          }
          return res.status(500).json({ error: true, message: "An unknown error occurred" });
        }
      })().catch(next);
    },
  );

  router.post(
    "/assignments/delete",
    authenticationMiddleware,
    adminRoleMiddleware,
    json(),
    (req, res) => {
      (async () => {
        try {
          const body = req.body as DeleteAssignmentBody;
          const { _id, _sheetId } = body;
          if (!_id) {
            return res.status(400).json({ error: true, message: "Missing Assignment ID" });
          }
          const assignment = { _id: _id, _sheetId: _sheetId };
          await persister.DeleteAssignment(assignment);
          return res.status(200).json({ success: true });
        } catch (err) {
          console.error(err);
          if (err instanceof Error) {
            if (err.message.includes("already exists")) {
              return res.status(409).json({ error: true, message: err.message });
            }
            if (err.message === "Method not implemented.") {
              return res.status(501).json({ error: true, message: "Function not yet supported" });
            }
            return res.status(500).json({ error: true, message: err.message });
          }
          return res.status(500).json({ error: true, message: "An unknown error occurred" });
        }
      })().catch((err) => {
        console.error("Unhandled error in IIFE:", err);
        res.status(500).json({ error: true, message: "Unhandled error" });
      });
    }
  );

  router.get(
    "/courses",
    authenticationMiddleware,
    adminRoleMiddleware,
    (_req, res, next) => {
      (async () => {
        try {
          const courseData = await persister.GetAllCourses();
          return res.status(200).json(courseData);
        } catch (err) {
          if (err instanceof Error) {
            return res.status(500).json({ error: true, message: err.message });
          } else {
            return res.status(500).json({
              error: true,
              message: "An unknown error occurred",
            });
          }
        }
      })().catch(next);
    },
  );

  router.get(
    "/activeEnvironments",
    authenticationMiddleware,
    adminRoleMiddleware,
    (_req, res, next) => {
      (async () => {
        try {
          const courseData = await persister.GetActiveEnvironments();
          return res.status(200).json(courseData);
        } catch (err) {
          if (err instanceof Error) {
            return res.status(500).json({ error: true, message: err.message });
          } else {
            return res.status(500).json({
              error: true,
              message: "An unknown error occurred",
            });
          }
        }
      })().catch(next);
    },
  );

  router.get(
    "/assignment/labSheet/:sheetId",
    authenticationMiddleware,
    adminRoleMiddleware,
    (_req, res, next) => {
      (async () => {
        try {
          const labSheetData = await persister.GetLabSheetContent(_req.params.sheetId,);
          return res.status(200).json(labSheetData);
        } catch (err) {
          if (err instanceof Error) {
            return res.status(500).json({ error: true, message: err.message });
          } else {
            return res.status(500).json({
              error: true,
              message: "An unknown error occurred",
            });
          }
        }
      })().catch(next);
    }
  )

  router.post(
    "/course/create",
    authenticationMiddleware,
    adminRoleMiddleware,
    json(),
    (req, res) => {
      (async () => {
        const reqWithUser = req as RequestWithUser;
        const body = reqWithUser.body as Record<string, string>;
        if (
          body === undefined ||
          body.name === undefined ||
          body.name.trim() === ""
        ) {
          return res.status(400).json({
            error: true,
            message: "Invalid request. Missing course name.",
          });
        }
        const response = await persister.AddCourse(body.name);
        return res
          .status(response.code ?? (response.error ? 500 : 200))
          .json(response);
      })().catch((err) => {
        if (err instanceof Error) {
          return res.status(500).json({ error: true, message: err.message });
        } else {
          console.log(err);
          return res
            .status(500)
            .json({ error: true, message: "Unknown error" });
        }
      });
    },
  );

  router.post(
    "/course/:courseId/users/update",
    authenticationMiddleware,
    adminRoleMiddleware,
    json(),
    (req, res) => {
      (async () => {
        const reqWithUser = req as RequestWithUser;
        const body = reqWithUser.body as CourseUserAction;
        const response = await persister.UpdateCourseForUsers(
          body,
          reqWithUser.params.courseId,
        );
        if (!response.error) {
          return res.status(200).json(response);
        } else {
          return res.status(500).json(response);
        }
      })().catch((err) => {
        if (err instanceof Error) {
          return res.status(500).json({ error: true, message: err.message });
        } else {
          console.log(err);
          return res
            .status(500)
            .json({ error: true, message: "Unknown error" });
        }
      });
    },
  );

  router.post(
    "/assignment/:assignmentId/update",
    authenticationMiddleware,
    adminRoleMiddleware,
    json(),
    (req, res) => {
      (async () => {
        const reqWithUser = req as RequestWithUser;
        const body = reqWithUser.body as Partial<AssignmentUpdate>;
        const update: AssignmentUpdate = {
          _id: reqWithUser.params.assignmentId,
          _sheetId: reqWithUser.params.sheetId,
          ...body,
        };
        await persister.UpdateAssignment(update);
        const environment: string =
          typeof body.name === "string" ? body.name : "default";
        const labSheetContent: string =
          typeof body.labSheetContent === "string"
            ? body.labSheetContent
            : typeof update.labSheetContent === "string"
              ? update.labSheetContent
              : "";
        broadcastSheetUpdate(environment, labSheetContent);
        return res.status(200).json({ success: true });
      })().catch((err: unknown) => {
        console.error("Error updating assignment", err);
        if (err instanceof Error) {
          return res.status(500).json({ error: true, message: err.message });
        } else {
          return res
            .status(500)
            .json({ error: true, message: "Unknown error" });
        }
      });
    }
  );

  router.post(
    "/course/:courseId/assignments/update",
    authenticationMiddleware,
    adminRoleMiddleware,
    bodyParser.json() as RequestHandler,
    (req, res) => {
      (async () => {
        try {
          const reqWithUser = req as RequestWithUser;
          const body = reqWithUser.body as string[];
          const response = await persister.UpdateAssignementsForCourse(
            reqWithUser.params.courseId,
            body,
          );
          return res.status(200).json(response);
        } catch (err) {
          if (err instanceof Error) {
            return res.status(500).json({ error: true, message: err.message });
          } else {
            return res.status(500).json({
              error: true,
              message: "An unknown error occurred",
            });
          }
        }
      })().catch((err) => {
        if (err instanceof Error) {
          return res.status(500).json({ error: true, message: err.message });
        } else {
          console.log(err);
          return res
            .status(500)
            .json({ error: true, message: "Unknown error" });
        }
      });
    },
  );

  router.get(
    "/submissions",
    authenticationMiddleware,
    adminRoleMiddleware,
    (_, res) => {
      (async () => {
        await persister
          .GetAllSubmissions()
          .then((submissions) => {
            return res
              .status(200)
              .json(
                Array.from(
                  submissions ?? ([] as SubmissionAdminOverviewEntry[]),
                ),
              );
          })
          .catch((err) => {
            console.log("No submission found " + err);
            return res
              .status(200)
              .json(Array.from([] as SubmissionAdminOverviewEntry[]));
          });
      })().catch((err) => {
        if (err instanceof Error) {
          return res.status(500).json({ error: true, message: err.message });
        } else {
          console.log(err);
          return res
            .status(500)
            .json({ error: true, message: "Unknown error" });
        }
      });
    },
  );

  router.get(
    "/submission/:submissionID/file/download/:fileName",
    authenticationMiddleware,
    adminRoleMiddleware,
    (req, res) => {
      (async () => {
        const reqWithUser = req as RequestWithUser;
        await persister
          .GetSubmissionFile(
            reqWithUser.params.submissionID,
            reqWithUser.params.fileName,
          )
          .then((file: FileData) => {
            res
              .set(
                "Content-disposition",
                `attachment; filename=${file.fileName}`,
              )
              .set("Content-type", "application/octet-stream")
              .status(200)
              .send(file.content);
          })
          .catch((err) => {
            if (err instanceof Error) {
              return res
                .status(500)
                .json({ error: true, message: err.message });
            } else {
              return res.status(500).json({
                error: true,
                message: "An unknown error occurred",
              });
            }
          });
      })().catch((err) => {
        if (err instanceof Error) {
          return res.status(500).json({ error: true, message: err.message });
        } else {
          console.log(err);
          return res
            .status(500)
            .json({ error: true, message: "Unknown error" });
        }
      });
    },
  );

  router.get(
    "/submission/:submissionID/terminals",
    authenticationMiddleware,
    adminRoleMiddleware,
    (req, res) => {
      (async () => {
        const reqWithUser = req as RequestWithUser;
        await persister
          .GetTerminalData(reqWithUser.params.submissionID)
          .then((data: TerminalStateType[]) => {
            res.status(200).json(data);
          })
          .catch((err) => {
            if (err instanceof Error) {
              return res
                .status(500)
                .json({ error: true, message: err.message });
            } else {
              return res.status(500).json({
                error: true,
                message: "An unknown error occurred",
              });
            }
          });
      })().catch((err) => {
        if (err instanceof Error) {
          return res.status(500).json({ error: true, message: err.message });
        } else {
          console.log(err);
          return res
            .status(500)
            .json({ error: true, message: "Unknown error" });
        }
      });
    },
  );

  router.post(
    "/submission/:submissionID/points",
    authenticationMiddleware,
    adminRoleMiddleware,
    json(),
    (req, res) => {
      (async () => {
        const reqWithUser = req as RequestWithUser;
        const body = reqWithUser.body as Record<string, number>;
        try {
          const response = await persister.UpdateSubmissionPoints(
            reqWithUser.params.submissionID,
            body.points,
          );
          return res.status(200).json(response);
        } catch (err) {
          if (err instanceof Error) {
            return res.status(500).json({ error: true, message: err.message });
          } else {
            return res.status(500).json({
              error: true,
              message: "An unknown error occurred",
            });
          }
        }
      })().catch((err) => {
        if (err instanceof Error) {
          return res.status(500).json({ error: true, message: err.message });
        } else {
          console.log(err);
          return res
            .status(500)
            .json({ error: true, message: "Unknown error" });
        }
      });
    },
  );

  return router;
};
