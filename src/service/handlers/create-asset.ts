import { AssetVisibility, SharingMode } from "@prisma/client";
import { PathLike } from "fs";
import { z } from "zod";

import { config } from "~/config";
import { db } from "~/db";
import { BadRequestError, InternalError } from "~/errors";
import { IDocumentManager } from "~/formats/document";
import { IImageManager } from "~/formats/image";
import { IVideoManager } from "~/formats/video";
import { ICensorshipManager } from "~/processing/censorship";
import { IEncryptionManager } from "~/processing/encryption";
import { StorageManager } from "~/storage/storage-manager";
import { RequestHandler, baseRequestSchema } from "../request-handler";
import { AssetArtifact, parseBase64Data } from "../utils";
import { stringBase64Schema, stringFileNameSchema } from "../validation";

export class CreateAssetRequestHandler extends RequestHandler<
  CreateAssetRequest,
  { id: string; thumbnailId: string }
> {
  storage: StorageManager;
  image: IImageManager;
  document: IDocumentManager;
  video: IVideoManager;
  censorship: ICensorshipManager;
  encryption: IEncryptionManager;

  constructor(
    storage: StorageManager,
    image: IImageManager,
    document: IDocumentManager,
    video: IVideoManager,
    censorship: ICensorshipManager,
    encryption: IEncryptionManager
  ) {
    super(createAssetRequestSchema);
    this.storage = storage;
    this.image = image;
    this.document = document;
    this.video = video;
    this.censorship = censorship;
    this.encryption = encryption;
  }

  async execute(req: CreateAssetRequest) {
    let assetArtifact: AssetArtifact;
    let thumbArtifact: AssetArtifact;

    try {
      assetArtifact = await parseBase64Data(req.asset.data);
    } catch (e) {
      if (e instanceof TypeError)
        throw BadRequestError.fromMessage("asset.data", e.message);
      throw e;
    }

    if (
      config.CENSOR_NSFW &&
      this.censorship.supports(assetArtifact.mimeType) &&
      (await this.censorship.isNSFW(assetArtifact.buffer))
    ) {
      throw BadRequestError.fromMessage(
        "asset.data",
        "NSFW content is not allowed"
      );
    }

    if (this.image.supports(assetArtifact.mimeType)) {
      assetArtifact = await this.image.resize(
        assetArtifact.buffer,
        config.MAX_IMAGE_WIDTH
      );
      thumbArtifact = await this.image.resize(
        assetArtifact.buffer,
        config.THUMBNAIL_WIDTH
      );
    } else if (this.document.supports(assetArtifact.mimeType)) {
      thumbArtifact = await this.document.screenshot(
        assetArtifact.buffer,
        config.THUMBNAIL_WIDTH
      );
    } else if (this.video.supports(assetArtifact.mimeType)) {
      thumbArtifact = await this.video.screenshot(
        assetArtifact.buffer,
        config.THUMBNAIL_WIDTH
      );
    } else {
      throw BadRequestError.fromMessage("asset.data", "unsupported file type");
    }

    const [path, thumbnailPath] = await Promise.all([
      this.uploadAsset(assetArtifact.buffer),
      this.uploadAsset(thumbArtifact.buffer),
    ]);

    const asset = await db.asset.create({
      data: {
        name: req.asset.name,
        ownerId: req.userId,
        size: assetArtifact.buffer.byteLength,
        mimeType: assetArtifact.mimeType,
        visibility: req.asset.visibility,
        path: path.toString(),
        provider: this.storage.provider,
        shares: req.asset.shares
          ? { createMany: { data: req.asset.shares } }
          : undefined,
        thumbnail: {
          create: {
            ownerId: req.userId,
            mimeType: thumbArtifact.mimeType,
            path: thumbnailPath.toString(),
            size: thumbArtifact.buffer.byteLength,
            visibility: req.asset.visibility,
            provider: this.storage.provider,
            shares: req.asset.shares
              ? { createMany: { data: req.asset.shares } }
              : undefined,
          },
        },
      },
    });

    return { id: asset.id, thumbnailId: asset.thumbnailId! };
  }

  private async uploadAsset(asset: Buffer): Promise<PathLike> {
    const encrypted = await this.encryption.encrypt(asset);

    let retryCount = config.MAX_UPLOAD_RETRIES;
    while (retryCount-- > 0) {
      try {
        return await this.storage.upload(encrypted);
      } catch (e) {
        console.error(e);
        continue;
      }
    }

    throw new InternalError("cannot upload to external storage provider");
  }
}

const createAssetRequestSchema = baseRequestSchema.merge(
  z.object({
    asset: z.object({
      name: stringFileNameSchema.optional(),
      data: stringBase64Schema,
      visibility: z
        .nativeEnum(AssetVisibility)
        .default(AssetVisibility.PRIVATE),
      shares: z
        .array(
          z.object({
            sharerId: z.string(),
            mode: z.nativeEnum(SharingMode).default(SharingMode.READ),
          })
        )
        .optional(),
    }),
  })
);

export type CreateAssetRequest = z.infer<typeof createAssetRequestSchema>;
