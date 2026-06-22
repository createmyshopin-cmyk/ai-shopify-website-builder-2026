import type { NextFunction, Request, Response } from "express";

import { logger } from "./logger.js";

export function requestLoggingMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const started = Date.now();

  response.on("finish", () => {
    logger.info("http_request", {
      method: request.method,
      path: request.path,
      status: response.statusCode,
      durationMs: Date.now() - started,
    });
  });

  next();
}
