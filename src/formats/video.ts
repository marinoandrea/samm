import { AssetArtifact } from "~/service/utils";

export interface IVideoManager {
  supports(mimeType: string): boolean;
  register(mimeType: string): IVideoManager;
  screenshot(buffer: Buffer, width?: number): Promise<AssetArtifact>;
}

export function buildVideoManager(): IVideoManager {
  return new UnknownVideoManager()
    .register("video/mp4")
    .register("video/AV1")
    .register("video/H264");
}

class UnknownVideoManager implements IVideoManager {
  supported: string[] = [];

  register(mimeType: string) {
    this.supported.push(mimeType);
    return this;
  }

  supports(mimeType: string): boolean {
    return this.supported.includes(mimeType);
  }

  async screenshot(
    buffer: Buffer,
    width?: number | undefined
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    throw new Error("not implemented");
  }
}
