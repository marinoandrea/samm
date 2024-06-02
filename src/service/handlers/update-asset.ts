import { Asset, AssetVisibility } from "@prisma/client";
import { z } from "zod";

import { PathLike } from "fs";
import { config } from "~/config";
import { db } from "~/db";
import {
  BadRequestError,
  InternalError,
  NotFoundError,
  UnauthorizedError,
} from "~/errors";
import { IImageManager } from "~/formats/image";
import { ICensorshipManager } from "~/processing/censorship";
import { IEncryptionManager } from "~/processing/encryption";
import { IPreviewManager } from "~/processing/preview";
import { IVirusScanner } from "~/processing/virus";
import { IStorageManager } from "~/storage/storage-manager";
import { IRequestHandler, baseRequestSchema } from "../request-handler";
import { parseBase64Data, validateArtifact } from "../utils";
import { stringBase64Schema, stringFileNameSchema } from "../validation";

export class UpdateAssetRequestHandler
  implements IRequestHandler<UpdateAssetRequest, Asset>
{
  storage: IStorageManager;
  preview: IPreviewManager;
  image: IImageManager;
  censorship: ICensorshipManager;
  virus: IVirusScanner;
  encryption: IEncryptionManager;

  constructor(
    storage: IStorageManager,
    preview: IPreviewManager,
    image: IImageManager,
    censorship: ICensorshipManager,
    virus: IVirusScanner,
    encryption: IEncryptionManager
  ) {
    this.storage = storage;
    this.preview = preview;
    this.image = image;
    this.censorship = censorship;
    this.virus = virus;
    this.encryption = encryption;
  }
  async parse(req: unknown) {
    const result = await updateAssetRequestSchema.safeParseAsync(req);
    if (!result.success) throw new BadRequestError(result.error.message);
    return result.data;
  }

  async execute(req: UpdateAssetRequest) {
    const asset = await db.asset.findUnique({
      where: { id: req.assetId },
      include: { shares: true, thumbnail: true, original: true },
    });

    if (!asset || asset.isDeleted) throw new NotFoundError();

    if (
      asset.visibility === "CENSORED" ||
      (req.userId !== asset?.ownerId &&
        !asset.shares.find(
          (s) => s.sharerId === req.userId && s.mode === "READ_WRITE"
        ))
    )
      throw new UnauthorizedError();

    if (asset.original)
      throw new BadRequestError(
        "cannot update thumbnail, delete original asset instead"
      );

    if (!asset.thumbnail)
      throw new InternalError("asset does not have a thumbnail");

    let assetMimeType = asset.mimeType;
    let assetSize = asset.size;
    let thumbMimeType = asset.thumbnail.mimeType;
    let thumbSize = asset.thumbnail.size;
    if (req.asset.data) {
      let assetArtifact = await parseBase64Data(req.asset.data);

      await validateArtifact(this.virus, this.censorship, assetArtifact);

      if (this.image.supports(assetArtifact.mimeType)) {
        assetArtifact = await this.image.resize(
          assetArtifact.buffer,
          config.MAX_IMAGE_WIDTH
        );
      }

      const thumbArtifact = await this.preview.createThumbnail(
        assetArtifact.buffer
      );

      assetMimeType = assetArtifact.mimeType;
      assetSize = assetArtifact.buffer.byteLength;
      thumbMimeType = thumbArtifact.mimeType;
      thumbSize = thumbArtifact.buffer.byteLength;

      await Promise.all([
        this.replaceAsset(asset.path, assetArtifact.buffer),
        this.replaceAsset(asset.thumbnail.path, thumbArtifact.buffer),
      ]);
    }

    return await db.asset.update({
      where: { id: asset.id },
      data: {
        version: asset.version + 1,
        mimeType: assetMimeType,
        size: assetSize,
        visibility: req.asset.visibility ?? asset.visibility,
        name: req.asset.name ?? asset.name,
        thumbnail: {
          update: {
            mimeType: thumbMimeType,
            size: thumbSize,
          },
        },
      },
    });
  }

  private async replaceAsset(path: PathLike, asset: Buffer): Promise<void> {
    const encrypted = await this.encryption.encrypt(asset);

    let retryCount = config.MAX_UPLOAD_RETRIES;
    while (retryCount-- > 0) {
      try {
        await this.storage.replace(path, encrypted);
      } catch (e) {
        console.error(e);
        continue;
      }
    }

    throw new InternalError("cannot upload to external storage provider");
  }
}

const updateAssetRequestSchema = baseRequestSchema.merge(
  z.object({
    assetId: z.string().uuid(),
    asset: z.object({
      name: stringFileNameSchema.optional(),
      data: stringBase64Schema.optional(),
      visibility: z.nativeEnum(AssetVisibility).optional(),
    }),
  })
);

export type UpdateAssetRequest = z.infer<typeof updateAssetRequestSchema>;
