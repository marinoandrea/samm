import { config } from "~/config";
import { InternalError } from "~/errors";
import { IDocumentManager } from "~/formats/document";
import { IImageManager } from "~/formats/image";
import { IVideoManager } from "~/formats/video";
import { AssetArtifact } from "~/service/utils";

export interface IPreviewManager {
  createThumbnail(artifact: AssetArtifact): Promise<AssetArtifact>;
}

export class PreviewManager implements IPreviewManager {
  image: IImageManager;
  document: IDocumentManager;
  video: IVideoManager;

  constructor(
    image: IImageManager,
    document: IDocumentManager,
    video: IVideoManager
  ) {
    this.image = image;
    this.document = document;
    this.video = video;
  }

  async createThumbnail(artifact: AssetArtifact) {
    if (this.image.supports(artifact.mimeType)) {
      return await this.image.resize(artifact.buffer, config.THUMBNAIL_WIDTH);
    } else if (this.document.supports(artifact.mimeType)) {
      return await this.document.screenshot(
        artifact.buffer,
        config.THUMBNAIL_WIDTH
      );
    } else if (this.video.supports(artifact.mimeType)) {
      return await this.video.screenshot(
        artifact.buffer,
        config.THUMBNAIL_WIDTH
      );
    } else {
      throw new InternalError(
        `'${artifact.mimeType}' not supported for thumbnail`
      );
    }
  }
}
