import { ZodError } from "zod";

export abstract class ServiceError extends Error {
  public readonly httpCode: number;

  constructor(httpCode: number, message?: string) {
    super(message);
    this.httpCode = httpCode;
  }

  public abstract toJSON(): Record<
    string,
    number | string | boolean | undefined
  >;
}

export class BadRequestError extends ServiceError {
  fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    super(400, JSON.stringify(fieldErrors));
    this.fieldErrors = fieldErrors;
  }

  public static fromZodError({ errors }: ZodError) {
    let fieldErrors: Record<string, string> = {};
    for (let error of errors) {
      fieldErrors[error.path.join(".")] = error.message;
    }
    return new BadRequestError(fieldErrors);
  }

  public static fromMessage(field: string, message: string) {
    return new BadRequestError({ [field]: message });
  }

  toJSON() {
    return this.fieldErrors;
  }
}

export class NotFoundError extends ServiceError {
  id: string;
  resource: string;

  constructor(resource: string, id: string) {
    super(404, `'${resource}' not found`);
    this.id = id;
    this.resource = resource;
  }

  public toJSON() {
    return { message: `<${this.resource}> with ID <${this.id}> not found` };
  }
}

export class UnauthorizedError extends ServiceError {
  constructor(message?: string) {
    super(403, message);
  }

  toJSON() {
    return { message: this.message };
  }
}

export class InternalError extends ServiceError {
  constructor(message: string) {
    super(500, message);
  }

  toJSON() {
    return { message: this.message };
  }
}
