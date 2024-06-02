import { StorageProvider } from "@prisma/client";
import { z } from "zod";

if (process.env.NODE_ENV === "development") require("dotenv").config();

export const config = z
  .object({
    NODE_ENV: z
      .enum(["development", "testing", "staging", "production"])
      .default("development"),
    PORT: z.coerce.number().int().default(3000),
    JWT_SECRET: z.string(),
    JWT_ALGORITHM: z
      .enum([
        "HS256",
        "HS384",
        "HS512",
        "RS256",
        "RS384",
        "RS512",
        "ES256",
        "ES384",
        "ES512",
        "PS256",
        "PS384",
        "PS512",
        "none",
      ])
      .default("HS256"),
    DATABASE_URL: z.string().url(),
    STORAGE_PROVIDER: z
      .nativeEnum(StorageProvider)
      .default(StorageProvider.FILESYSTEM),
    STORAGE_ROOTFOLDER: z.string().default("static"),
    MAX_UPLOAD_SIZE_MB: z
      .string()
      .regex(/[0-9]+mb/)
      .default("50mb"),
    THUMBNAIL_WIDTH: z.coerce.number().int().default(200),
    MAX_IMAGE_WIDTH: z.coerce.number().int().default(2500),
    MAX_UPLOAD_RETRIES: z.coerce.number().int().default(5),
    CENSOR_NSFW: z.boolean().default(true),
    ENCRYPTION_KEY: z.string().min(16),
    ENCRYPTION_ALG: z.string().default("aes-128-ecb"),
    ALLOW_FULLDELETE: z.boolean().default(true),
  })
  .parse(process.env);
