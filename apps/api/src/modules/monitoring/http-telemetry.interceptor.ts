import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import type { Request, Response } from "express";
import { MonitoringMetricsService } from "./monitoring-metrics.service";
import * as crypto from "node:crypto";

@Injectable()
export class HttpTelemetryInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MonitoringMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request & { requestId?: string; user?: { id?: string | bigint; userAccountId?: string | bigint } }>();
    const res = httpCtx.getResponse<Response>();

    // 1. Establish or propagate Request Correlation ID
    const incomingReqId = req.headers["x-request-id"] as string | undefined;
    const requestId = incomingReqId || `req-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);

    const startTime = performance.now();
    const timestamp = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Number((performance.now() - startTime).toFixed(1));
          const userId = req.user?.id || req.user?.userAccountId ? String(req.user?.id || req.user?.userAccountId) : undefined;
          this.metricsService.recordRequest({
            requestId,
            timestamp,
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode: res.statusCode || 200,
            durationMs,
            ipAddress: req.ip || (req.headers["x-forwarded-for"] as string) || undefined,
            userAgent: req.headers["user-agent"],
            userId,
          });
        },
        error: (err) => {
          const durationMs = Number((performance.now() - startTime).toFixed(1));
          const statusCode = err?.status || err?.statusCode || 500;
          const userId = req.user?.id || req.user?.userAccountId ? String(req.user?.id || req.user?.userAccountId) : undefined;
          this.metricsService.recordRequest({
            requestId,
            timestamp,
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode,
            durationMs,
            ipAddress: req.ip || (req.headers["x-forwarded-for"] as string) || undefined,
            userAgent: req.headers["user-agent"],
            userId,
            errorMessage: err instanceof Error ? err.message : String(err),
            stackTrace: err instanceof Error ? err.stack : undefined,
          });
        },
      }),
    );
  }
}
