import { fileTypeFromBuffer } from "file-type";
import { InternalError } from "../errors";

export type AssetArtifact = {
  buffer: Buffer;
  mimeType: string;
};

export async function getFileType(buffer: Buffer) {
  const type = await fileTypeFromBuffer(buffer);
  if (!type) throw new TypeError("file type not supported");
  return type;
}

export async function parseBase64Data(data: string): Promise<AssetArtifact> {
  try {
    let buffer = Buffer.from(data, "base64");
    const type = await getFileType(buffer);
    return { buffer, mimeType: type.mime };
  } catch (e) {
    if (e instanceof TypeError) {
      throw new TypeError("file type not supported");
    } else {
      throw new InternalError(String(e));
    }
  }
}
