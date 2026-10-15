import {
  All,
  Controller,
  Inject,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { BETTER_AUTH_INSTANCE } from "./better-auth.constants";
import type { BetterAuthInstance } from "./better-auth.config";

@Controller("api/auth")
export class BetterAuthController {
  private readonly handler: (req: Request, res: Response) => Promise<void>;

  constructor(
    @Inject(BETTER_AUTH_INSTANCE)
    private readonly auth: BetterAuthInstance,
  ) {
    this.handler = toNodeHandler(auth);
  }

  @All("*")
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    return this.handler(req, res);
  }
}
