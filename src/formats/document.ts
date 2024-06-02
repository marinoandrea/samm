import { AssetArtifact } from "~/service/utils";

export interface IDocumentManager {
  supports(mimeType: string): boolean;
  register(mimeType: string): IDocumentManager;
  screenshot(buffer: Buffer, width?: number): Promise<AssetArtifact>;
}

export function buildDocumentManager(): IDocumentManager {
  return new UnknownDocumentManager()
    .register("application/pdf")
    .register("text/plain");
}

class UnknownDocumentManager implements IDocumentManager {
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
