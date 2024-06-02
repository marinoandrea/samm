import { StorageProvider } from "@prisma/client";

import { config } from "~/config";
import { FilesystemStorageManager } from "./providers/filesystem";
import { StorageManager } from "./storage-manager";

export function buildStorageManager(provider: StorageProvider): StorageManager {
  switch (provider) {
    case StorageProvider.AWS_S3:
    case StorageProvider.FIREBASE:
    case StorageProvider.SUPABASE:
      // TODO
      throw new Error("not implemented");
    case StorageProvider.FILESYSTEM:
      return new FilesystemStorageManager(config.STORAGE_ROOTFOLDER);
  }
}
