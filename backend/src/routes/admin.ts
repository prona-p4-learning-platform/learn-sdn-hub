import { RequestHandler, Router, json } from "express";
import authenticationMiddleware, {
  RequestWithUser,
} from "../authentication/AuthenticationMiddleware";
import adminRoleMiddleware from "../admin/AdminRoleMiddleware";
import { CourseUserAction, FileData, Persister } from "../database/Persister";
import bodyParser from "body-parser";
import environments from "../Configuration";
import {
  SubmissionAdminOverviewEntry,
  TerminalStateType,
} from "../Environment";
import ActiveEnvironmentTracker from "../trackers/ActiveEnvironmentTracker";

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

  router.get(
    "/environments",
    authenticationMiddleware,
    adminRoleMiddleware,
    (_, res) => {
      res
        .status(200)
        .json(Object.fromEntries(ActiveEnvironmentTracker.getActivityMap()));
    },
  );

  return router;
};
