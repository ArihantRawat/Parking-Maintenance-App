import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function sendData<T>(res: Response, data: T, meta?: Record<string, unknown>) {
  res.json(meta ? { data, meta } : { data });
}

export function errorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Unexpected server error";
  if (status >= 500) {
    console.error(error);
  }
  res.status(status).json({ error: { message, status } });
}
