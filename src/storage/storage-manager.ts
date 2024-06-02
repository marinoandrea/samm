import { StorageProvider } from "@prisma/client";
import { randomUUID } from "crypto";
import { type PathLike } from "fs";
import path from "path";

/** Represents an external service that handles file uploads (e.g. AWS S3) */
export abstract class StorageManager {
  /** External provider name */
  public readonly provider: StorageProvider;

  constructor(provider: StorageProvider) {
    this.provider = provider;
  }

  /**
   * Upload the given buffer
   * @param data binary asset
   * @returns the path of the uploaded asset on the provider
   */
  public abstract upload(data: Buffer): Promise<PathLike>;

  /**
   * Replace the asset at given path with buffer
   * @param path path to replace
   * @param data new binary asset
   */
  public abstract replace(path: PathLike, data: Buffer): Promise<void>;

  /**
   * Download binary data at given path
   * @param path path to download
   * @returns binary asset
   */
  public abstract download(path: PathLike): Promise<Buffer>;

  /**
   * Delete the asset at given path
   * @param path path to delete
   */
  public abstract delete(path: PathLike): Promise<void>;

  generateBucketPath(): PathLike {
    const date = new Date();
    const y = date.getFullYear().toString();
    const m = (date.getMonth() + 1).toString();
    const d = date.getDate().toString();
    return path.join(y, m, d);
  }

  generateFileName(): string {
    return randomUUID();
  }
}
