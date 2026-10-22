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

@Injectable()
export class HttpTelemetryInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MonitoringMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const res = httpCtx.getResponse<Response>();

    const startTime = performance.now();
    const timestamp = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Number((performance.now() - startTime).toFixed(1));
          this.metricsService.recordRequest({
            timestamp,
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode: res.statusCode || 200,
            durationMs,
            ipAddress: req.ip || (req.headers["x-forwarded-for"] as string) || undefined,
            userAgent: req.headers["user-agent"],
          });
        },
        error: (err) => {
          const durationMs = Number((performance.now() - startTime).toFixed(1));
          const statusCode = err?.status || err?.statusCode || 500;
          this.metricsService.recordRequest({
            timestamp,
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode,
            durationMs,
            ipAddress: req.ip || (req.headers["x-forwarded-for"] as string) || undefined,
            userAgent: req.headers["user-agent"],
            errorMessage: err instanceof Error ? err.message : String(err),
          });
        },
      }),
    );
  }
}
