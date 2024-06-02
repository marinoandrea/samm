import { createCipheriv, createDecipheriv } from "crypto";

export interface IEncryptionManager {
  encrypt(buffer: Buffer): Promise<Buffer>;
  decrypt(buffer: Buffer): Promise<Buffer>;
}

export class CryptoEncryptionManager implements IEncryptionManager {
  algorithm: string;
  key: string;
  iv: Uint8Array | null;

  constructor(algorithm: string, key: string, iv?: Uint8Array) {
    this.algorithm = algorithm;
    this.key = key;
    this.iv = iv ?? null;
  }

  async encrypt(buffer: Buffer): Promise<Buffer> {
    const cipher = createCipheriv(this.algorithm, this.key, this.iv);
    const firstPart = cipher.update(buffer).toString("base64");
    const finalPart = cipher.final("base64");
    return Buffer.from(`${firstPart}${finalPart}`, "base64");
  }

  async decrypt(buffer: Buffer): Promise<Buffer> {
    const decipher = createDecipheriv(this.algorithm, this.key, this.iv);
    const firstPart = decipher.update(buffer).toString("base64");
    const finalPart = decipher.final("base64");
    return Buffer.from(`${firstPart}${finalPart}`, "base64");
  }
}
