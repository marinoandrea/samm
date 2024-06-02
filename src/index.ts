import express, { ErrorRequestHandler, RequestHandler } from "express";
import { Request as JWTRequest, expressjwt as jwt } from "express-jwt";
import helmet from "helmet";
import morgan from "morgan";

import { config } from "./config";
import { ServiceError } from "./errors";
import { buildDocumentManager } from "./formats/document";
import { buildImageManager } from "./formats/image";
import { buildVideoManager } from "./formats/video";
import { CensorshipManager } from "./processing/censorship";
import { CryptoEncryptionManager } from "./processing/encryption";
import { PreviewManager } from "./processing/preview";
import { VirusScanner } from "./processing/virus";
import {
  CreateAssetRequestHandler,
  DeleteAssetRequestHandler,
  DownloadAssetRequestHandler,
} from "./service";
import { buildStorageManager } from "./storage";

const image = buildImageManager();
const document = buildDocumentManager();
const video = buildVideoManager();

const preview = new PreviewManager(image, document, video);
const storage = buildStorageManager(config.STORAGE_PROVIDER);
const censorship = new CensorshipManager(image, video);
const virus = new VirusScanner(image, video, document);
const encryption = new CryptoEncryptionManager(
  config.ENCRYPTION_ALG,
  config.ENCRYPTION_KEY
);

function createApp() {
  const app = express();
  applyMiddleware(app);
  createRoutes(app);
  app.use(errorHandler);
  return app;
}

const buildExpressController = (controller: RequestHandler) => {
  return (async (req, res, next) => {
    try {
      return await controller(req, res, next);
    } catch (e) {
      if (e instanceof ServiceError) {
        if (e.httpCode === 500) console.log(e);
        res.status(e.httpCode);
        res.json({ error: e.toJSON() });
        return;
      }
      console.error(e);
      res.status(500);
      res.json({ error: "Internal error" });
    }
  }) as RequestHandler;
};

const errorHandler: ErrorRequestHandler = async (err, req, res, next) => {
  console.log(err);
  res.status(500);
  res.json({ error: String(err) });
};

function applyMiddleware(app: express.Express) {
  app.use(helmet());
  app.use(morgan(config.NODE_ENV === "development" ? "dev" : "tiny"));
  app.use(express.json({ limit: config.MAX_UPLOAD_SIZE_MB }));
  app.use(
    jwt({
      secret: config.JWT_SECRET,
      algorithms: [config.JWT_ALGORITHM],
    })
  );
}

function createRoutes(app: express.Express) {
  app.post(
    "/assets",
    buildExpressController(async (req: JWTRequest, res) => {
      const handler = new CreateAssetRequestHandler(
        storage,
        preview,
        image,
        document,
        video,
        censorship,
        virus,
        encryption
      );
      const input = await handler.parse(req);
      const asset = await handler.execute(input);
      res.json(asset);
    })
  );

  app.get(
    "/assets/:assetId",
    buildExpressController(async (req: JWTRequest, res) => {
      const handler = new DownloadAssetRequestHandler(storage, encryption);
      const input = await handler.parse(req);
      const result = await handler.execute(input);
      res.contentType(result.asset.mimeType);
      res.send(result.buffer);
    })
  );

  app.put("/assets/:assetId", (req, res) => {
    res.send("Hello World!");
  });

  app.delete("/assets/:assetId", async (req: JWTRequest, res) => {
    const handler = new DeleteAssetRequestHandler(storage);
    const input = await handler.parse(req);
    const result = await handler.execute(input);
    res.json(result);
  });

  app.post("/assets/:assetId/shares", (req, res) => {
    res.send("Hello World!");
  });

  app.post("/assets/:assetId/shares", (req, res) => {
    res.send("Hello World!");
  });

  app.put("/assets/:assetId/shares/:sharerId", (req, res) => {
    res.send("Hello World!");
  });

  app.delete("/assets/:assetId/shares/:sharerId", (req, res) => {
    res.send("Hello World!");
  });
}

function main() {
  const app = createApp();
  app.listen(config.PORT, () => {
    console.info(`Service listening on port ${config.PORT}`);
  });
}

main();
