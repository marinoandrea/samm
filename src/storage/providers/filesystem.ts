import { existsSync, mkdir, type PathLike } from "fs";
import { readFile, rm, writeFile } from "fs/promises";
import { join as pathJoin } from "path";

import { StorageManager } from "~/storage/storage-manager";

export class FilesystemStorageManager extends StorageManager {
  rootFolder: PathLike;

  constructor(rootFolder: PathLike) {
    super("FILESYSTEM");
    this.rootFolder = rootFolder;
  }

  async upload(data: Buffer): Promise<PathLike> {
    const bucket = pathJoin(
      this.rootFolder.toString(),
      this.generateBucketPath().toString()
    );

    if (!existsSync(bucket)) {
      mkdir(bucket, { recursive: true }, () => {});
    }

    const fileName = this.generateFileName();
    const path = pathJoin(bucket, fileName);
    await writeFile(path, data);

    return path;
  }

  async replace(path: PathLike, data: Buffer): Promise<void> {
    await writeFile(path, data);
  }

  async download(path: PathLike): Promise<Buffer> {
    return await readFile(path);
  }

  async delete(path: PathLike): Promise<void> {
    await rm(path);
  }
}
