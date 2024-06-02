import photon from "@silvia-odwyer/photon-node";

import { AssetArtifact } from "~/service/utils";

export interface IImageManager {
  resize(buffer: Buffer, maxRes: number): Promise<AssetArtifact>;
  supports(mimeType: string): boolean;
}

export function buildImageManager(): IImageManager {
  return new PhotonImageManager();
}

class PhotonImageManager implements IImageManager {
  supported: string[] = [];
  samplingFilter: number = 1; // Nearest = 1, Triangle = 2, CatmullRom = 3, Gaussian = 4, Lanczos3 = 5

  supports(mimeType: string): boolean {
    // see: https://silvia-odwyer.github.io/photon/guide/
    return [
      "image/png",
      "image/jpeg",
      "image/bmp",
      "image/vnd.microsoft.icon",
      "image/tiff",
    ].includes(mimeType);
  }

  async resize(buffer: Buffer, maxRes: number): Promise<AssetArtifact> {
    let img = photon.PhotonImage.new_from_byteslice(buffer);

    const originalWidth = img.get_width();
    const originalHeight = img.get_height();

    if (originalWidth > originalHeight) {
      let newWidth = Math.min(maxRes, originalWidth);
      let newHeight = (originalHeight / originalWidth) * newWidth;
      img = photon.resize(img, newWidth, newHeight, this.samplingFilter);
    } else if (originalHeight > originalWidth) {
      let newHeight = Math.min(maxRes, originalHeight);
      let newWidth = (originalWidth / originalHeight) * newHeight;
      img = photon.resize(img, newWidth, newHeight, this.samplingFilter);
    } else {
      let newWidth = Math.min(maxRes, originalWidth);
      let newHeight = Math.min(maxRes, originalHeight);
      img = photon.resize(img, newWidth, newHeight, this.samplingFilter);
    }

    return { buffer: Buffer.from(img.get_bytes()), mimeType: "image/jpeg" };
  }
}
