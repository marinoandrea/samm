import { fileTypeFromBuffer } from "file-type";

import { InternalError } from "~/errors";
import { IImageManager } from "~/formats/image";
import { IVideoManager } from "~/formats/video";

export interface ICensorshipManager {
  isNSFW(buffer: Buffer): Promise<boolean>;
  supports(mimeType: string): boolean;
}

export class CensorshipManager implements ICensorshipManager {
  image: IImageManager;
  video: IVideoManager;

  constructor(image: IImageManager, video: IVideoManager) {
    this.image = image;
    this.video = video;
  }

  supports(mimeType: string): boolean {
    return this.image.supports(mimeType) || this.video.supports(mimeType);
  }

  async isNSFW(buffer: Buffer): Promise<boolean> {
    const type = await fileTypeFromBuffer(buffer);
    if (!type) {
      throw new InternalError("cannot read buffer");
    } else if (this.image.supports(type.mime)) {
      return Promise.resolve(false); // TODO
    } else if (this.video.supports(type.mime)) {
      return Promise.resolve(false); // TODO
    } else {
      throw new InternalError(`'${type.mime}' not supported for censorship`);
    }
  }
}
