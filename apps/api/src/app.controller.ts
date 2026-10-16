import { Controller, Get, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(@Query("error") error?: string, @Res() res?: Response): void {
    if (error && res) {
      const frontendOrigin =
        process.env.WEB_ORIGINS?.split(",")[0]?.trim() || "https://klarone-web.onrender.com";
      res.redirect(`${frontendOrigin}/login?error=${encodeURIComponent(error)}`);
      return;
    }
    if (res) {
      res.send(this.appService.getHello());
      return;
    }
  }

  @Get(["api/health", "health"])
  getHealth(): { status: string; message: string; timestamp: string } {
    return {
      status: "OK",
      message: "Your API is running",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("health/db")
  async getDatabaseHealth(): Promise<{ database: string }> {
    return this.appService.getDatabaseHealth();
  }
}