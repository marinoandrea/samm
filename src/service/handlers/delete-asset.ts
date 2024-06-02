import { z } from "zod";

import { Request as ExpressRequest } from "express-jwt";
import { config } from "~/config";
import { db } from "~/db";
import {
  BadRequestError,
  InternalError,
  NotFoundError,
  UnauthorizedError,
} from "~/errors";
import { IStorageManager } from "~/storage/storage-manager";
import { IRequestHandler, baseRequestSchema } from "../request-handler";
import { assetIdSchema } from "../validation";

export class DeleteAssetRequestHandler
  implements IRequestHandler<DeleteAssetRequest>
{
  storage: IStorageManager;

  constructor(storage: IStorageManager) {
    this.storage = storage;
  }

  async parse(req: ExpressRequest) {
    const result = await deleteAssetRequestSchema.safeParseAsync({
      ...req.body,
      ...req.params,
      userId: req.auth?.sub,
    });

    if (!result.success) {
      throw BadRequestError.fromZodError(result.error);
    }

    return result.data;
  }

  async execute(req: DeleteAssetRequest) {
    const asset = await db.asset.findUnique({
      where: { id: req.assetId },
      include: { shares: true, thumbnail: true, original: true },
    });

    if (!asset || asset.isDeleted) throw new NotFoundError();

    if (
      asset.visibility === "CENSORED" ||
      (req.userId !== asset?.ownerId &&
        !asset.shares.find(
          (s) => s.sharerId === req.userId && s.mode === "READ_WRITE_DELETE"
        ))
    )
      throw new UnauthorizedError();

    if (asset.original)
      throw new BadRequestError(
        "cannot delete thumbnail, delete original asset instead"
      );

    if (!asset.thumbnail)
      throw new InternalError("asset does not have a thumbnail");

    await db.asset.updateMany({
      where: { id: { in: [asset.id, asset.thumbnail.id] } },
      data: { isDeleted: true },
    });

    if (!config.ALLOW_FULLDELETE) {
      return;
    }

    await Promise.all([
      this.storage.delete(asset.path),
      this.storage.delete(asset.thumbnail!.path),
    ]);

    await db.asset.delete({ where: { id: asset.id } });
  }
}

const deleteAssetRequestSchema = baseRequestSchema.merge(
  z.object({ assetId: assetIdSchema })
);

export type DeleteAssetRequest = z.infer<typeof deleteAssetRequestSchema>;
