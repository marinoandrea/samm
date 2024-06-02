import { z } from "zod";

import { Asset } from "@prisma/client";
import { Request as ExpressRequest } from "express-jwt";
import { PathLike } from "fs";
import { db } from "~/db";
import {
  BadRequestError,
  InternalError,
  NotFoundError,
  UnauthorizedError,
} from "~/errors";
import { IEncryptionManager } from "~/processing/encryption";
import { IStorageManager } from "~/storage/storage-manager";
import { IRequestHandler, baseRequestSchema } from "../request-handler";
import { assetIdSchema } from "../validation";

export class DownloadAssetRequestHandler
  implements
    IRequestHandler<DownloadAssetRequest, { buffer: Buffer; asset: Asset }>
{
  storage: IStorageManager;
  encryption: IEncryptionManager;

  constructor(storage: IStorageManager, encryption: IEncryptionManager) {
    this.storage = storage;
    this.encryption = encryption;
  }

  async parse(req: ExpressRequest) {
    const result = await downloadAssetRequestSchema.safeParseAsync({
      ...req.body,
      ...req.params,
      userId: req.auth?.sub,
    });

    if (!result.success) {
      throw BadRequestError.fromZodError(result.error);
    }

    return result.data;
  }

  async execute(req: DownloadAssetRequest) {
    const asset = await db.asset.findUnique({
      where: { id: req.assetId },
      include: { shares: true },
    });

    if (!asset || asset.isDeleted) {
      throw new NotFoundError("asset", req.assetId);
    }

    if (
      asset.visibility === "CENSORED" ||
      (req.userId !== asset?.ownerId &&
        !asset.shares.find(
          (s) => s.sharerId === req.userId && s.mode === "READ"
        ))
    ) {
      throw new UnauthorizedError();
    }

    const buffer = await this.downloadAsset(asset.path);

    return { buffer, asset };
  }

  private async downloadAsset(path: PathLike): Promise<Buffer> {
    try {
      const asset = await this.storage.download(path);
      return await this.encryption.decrypt(asset);
    } catch (e) {
      console.error(e);
      throw new InternalError("cannot download from external storage provider");
    }
  }
}

const downloadAssetRequestSchema = baseRequestSchema.merge(
  z.object({ assetId: assetIdSchema })
);

export type DownloadAssetRequest = z.infer<typeof downloadAssetRequestSchema>;
