import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

import { PrismaService } from "../../../database/prisma.service";
import type {
  AuthenticatedCustomer,
  CustomerJwtPayload,
} from "../types/customer-session.types";

type CustomerRequest = Request & {
  customer?: AuthenticatedCustomer;
};

@Injectable()
export class CustomerAuthGuard
  implements CanActivate
{
  private readonly jwtService: JwtService;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.jwtService = new JwtService({
      secret:
        this.configService.getOrThrow<string>(
          "CUSTOMER_AUTH_JWT_SECRET",
        ),
    });
  }

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context
        .switchToHttp()
        .getRequest<CustomerRequest>();

    const authorization =
      request.headers.authorization;

    if (
      !authorization?.startsWith(
        "Bearer ",
      )
    ) {
      throw new UnauthorizedException(
        "Missing customer access token",
      );
    }

    const token =
      authorization
        .slice("Bearer ".length)
        .trim();

    if (!token) {
      throw new UnauthorizedException(
        "Missing customer access token",
      );
    }

    let payload: CustomerJwtPayload;

    try {
      payload =
        await this.jwtService.verifyAsync<CustomerJwtPayload>(
          token,
          {
            issuer:
              this.configService.get<string>(
                "CUSTOMER_AUTH_JWT_ISSUER",
                "klarone-api",
              ),
            audience:
              this.configService.get<string>(
                "CUSTOMER_AUTH_JWT_AUDIENCE",
                "klarone-customer",
              ),
          },
        );
    } catch {
      throw new UnauthorizedException(
        "Invalid or expired customer access token",
      );
    }

    if (
      payload.tokenType !==
        "customer-access" ||
      !payload.sub ||
      !payload.userAccountId ||
      !payload.customerId ||
      !payload.personId
    ) {
      throw new UnauthorizedException(
        "Invalid customer access token",
      );
    }

    let userAccountId: bigint;
    let customerId: bigint;
    let personId: bigint;

    try {
      userAccountId =
        BigInt(
          payload.userAccountId,
        );

      customerId =
        BigInt(
          payload.customerId,
        );

      personId =
        BigInt(
          payload.personId,
        );
    } catch {
      throw new UnauthorizedException(
        "Invalid customer identity",
      );
    }

    const userAccount =
      await this.prisma.userAccount.findUnique(
        {
          where: {
            id: userAccountId,
          },
          include: {
            person: true,
            customer: true,
          },
        },
      );

    if (!userAccount) {
      throw new UnauthorizedException(
        "Customer account not found",
      );
    }

    if (
      userAccount.accountType !==
      "CUSTOMER"
    ) {
      throw new UnauthorizedException(
        "Invalid customer account",
      );
    }

    if (
      userAccount.status !==
      "ACTIVE"
    ) {
      throw new UnauthorizedException(
        "Customer account is inactive",
      );
    }

    if (!userAccount.customer) {
      throw new UnauthorizedException(
        "Customer profile not found",
      );
    }

    if (
      userAccount.customer.status !==
      "ACTIVE"
    ) {
      throw new UnauthorizedException(
        "Customer profile is inactive",
      );
    }

    if (
      userAccount.person.status !==
      "ACTIVE"
    ) {
      throw new UnauthorizedException(
        "Customer person record is inactive",
      );
    }

    if (
      userAccount.customer.id !==
        customerId ||
      userAccount.customer.personId !==
        personId ||
      userAccount.person.id !==
        personId
    ) {
      throw new UnauthorizedException(
        "Customer identity mismatch",
      );
    }

    const authenticatedCustomer: AuthenticatedCustomer =
      {
        userAccountId:
          userAccount.id.toString(),

        customerId:
          userAccount.customer.id.toString(),

        personId:
          userAccount.person.id.toString(),

        customerCode:
          userAccount.customer
            .customerCode,

        customerType:
          userAccount.customer
            .customerType,

        customerStatus:
          userAccount.customer.status,

        person: {
          firstName:
            userAccount.person
              .firstName,

          middleName:
            userAccount.person
              .middleName,

          lastName:
            userAccount.person
              .lastName,

          phone:
            userAccount.person.phone,

          email:
            userAccount.person.email,

          status:
            userAccount.person.status,
        },
      };

    request.customer =
      authenticatedCustomer;

    return true;
  }
}