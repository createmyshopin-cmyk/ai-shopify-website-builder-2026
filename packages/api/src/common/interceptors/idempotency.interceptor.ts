import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import type { Request } from "express";

/**
 * IdempotencyInterceptor
 *
 * Extracts the X-Idempotency-Key header and injects it into request.body
 * so downstream services can use it for idempotency checks.
 *
 * Idempotency is enforced in each service by looking up an existing
 * ProjectJob with the matching idempotencyKey. Duplicate requests
 * return the existing job immediately without re-running the operation.
 *
 * This interceptor is applied globally on mutation endpoints.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const idempotencyKey = request.headers["x-idempotency-key"] as string | undefined;

    if (idempotencyKey) {
      // Merge into request body so DTOs can pick it up
      const body = (request.body as Record<string, unknown>) ?? {};
      if (!body["idempotencyKey"]) {
        body["idempotencyKey"] = idempotencyKey;
        request.body = body;
      }

      this.logger.debug(
        `[Idempotency] Key: ${idempotencyKey} (${request.method} ${request.path})`,
      );
    }

    return next.handle().pipe(
      tap(() => {
        // Log idempotency usage for monitoring
        if (idempotencyKey) {
          this.logger.debug(
            `[Idempotency] Request ${idempotencyKey} processed`,
          );
        }
      }),
    );
  }
}
