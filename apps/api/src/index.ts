// Must be first — initialises Sentry before any other module is imported so
// the SDK's auto-instrumentation can wrap http / express on import. No-op
// when SENTRY_DSN is unset, so local dev without a DSN works unchanged.
import "./instrument";

import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { expressMiddleware } from "@apollo/server/express4";
import { v4 as uuidv4 } from "uuid";
import fileUpload from "express-fileupload";
import * as Sentry from "@sentry/node";

import createGraphqlServer from "./graphql";
import { context } from "./graphql/context";
import { uploadToS3 } from "./helper/s3";

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(bodyParser.json());
  app.use(fileUpload());

  // Always 200 if the process is up — independent of DB, downstream services,
  // or auth. Target for Railway's healthcheckPath. See README "Health endpoint".
  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      ok:      true,
      version: process.env.npm_package_version ?? "unknown",
      gitSha:  process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.GIT_SHA ?? "unknown",
      env:     process.env.NODE_ENV ?? "development",
    });
  });

  app.use(
    "/graphql",
    expressMiddleware(await createGraphqlServer(), { context })
  );

  app.post("/api/upload", async (req: Request, res: Response) => {
    try {
      // @ts-ignore
      let file = req.files?.file;
      if (file) {
        const uploadedFile = file;

        if (Array.isArray(uploadedFile))
          return res.status(400).send({ error: "Send single file" });

        const fileName = `${uuidv4()}.${uploadedFile.mimetype.split("/")[1]}`;

        const data = await uploadToS3(
          uploadedFile.data,
          fileName,
          uploadedFile.mimetype
        );

        res.status(200).json({ data });
      } else {
        res.status(400).json({ error: "No file provided" });
      }
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error });
      }
    }
  });

  // Sentry error handler — must be registered AFTER all routes so it can
  // catch unhandled errors that bubble through the middleware chain. The
  // shouldHandleError override captures 4xx errors too — by default Sentry
  // only reports 5xx, but on an auth-gated admin API the 4xx signals
  // (malformed JSON, bad auth headers, body-parser SyntaxErrors) are the
  // ones you actually want to see. Gated on SENTRY_DSN so dev is unaffected.
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app, {
      shouldHandleError: () => true,
    });
  }

  const PORT = parseInt(process.env.PORT || "4000", 10);
  app.listen(PORT, () => console.log(`Server Started at PORT ${PORT}`));
}

startServer();
