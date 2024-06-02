import { z } from "zod";

export const assetIdSchema = z.string().uuid();

export const stringBase64Schema = z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/);

export const stringFileNameSchema = z.string().min(1);
