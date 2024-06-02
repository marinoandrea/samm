import { Request as ExpressRequest } from "express-jwt";
import { ZodSchema, z } from "zod";
import { BadRequestError } from "~/errors";

export abstract class RequestHandler<
  TRequest extends BaseRequest,
  TResponse = void,
> {
  schema: ZodSchema<TRequest>;

  constructor(schema: ZodSchema<TRequest>) {
    this.schema = schema;
  }

  public async parse(req: ExpressRequest): Promise<TRequest> {
    const result = await this.schema.safeParseAsync({
      ...req.body,
      ...req.params,
      userId: req.auth?.sub,
    });

    if (!result.success) {
      throw BadRequestError.fromZodError(result.error);
    }

    return result.data;
  }

  public abstract execute(req: TRequest): Promise<TResponse>;
}

export const baseRequestSchema = z.object({
  userId: z.string(),
});

export type BaseRequest = z.infer<typeof baseRequestSchema>;
