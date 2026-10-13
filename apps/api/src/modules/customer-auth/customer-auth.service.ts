import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../database/prisma.service";
import type {
  CustomerIdentityResult,
  VerifiedCustomerIdentity,
} from "./types/customer-identity.types";
import type { CustomerJwtPayload } from "./types/customer-session.types";
import {
  CUSTOMER_AUTH_PROVIDER,
  type CustomerAuthProvider,
  type CustomerOtpRequestResult,
  type CustomerOtpVerificationInput,
} from "./providers/customer-auth-provider";

export interface CustomerAuthSessionResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  isNewUser: boolean;
  customer: {
    userAccountId: string;
    customerId: string;
    personId: string;
  };
}

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(CUSTOMER_AUTH_PROVIDER)
    private readonly authProvider: CustomerAuthProvider,
  ) {}

  async requestOtp(
    phone: string,
  ): Promise<CustomerOtpRequestResult> {
    return this.authProvider.requestOtp(phone);
  }

  async verifyOtp(
    input: CustomerOtpVerificationInput,
  ): Promise<CustomerAuthSessionResponse> {
    const identity =
      await this.authProvider.verifyOtp(input);

    const customerIdentity =
      await this.resolveVerifiedIdentity(identity);

    const payload: CustomerJwtPayload = {
      sub: customerIdentity.userAccountId,
      userAccountId:
        customerIdentity.userAccountId,
      customerId: customerIdentity.customerId,
      personId: customerIdentity.personId,
      tokenType: "customer-access",
    };

    const accessToken =
      await this.jwtService.signAsync(payload, {
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
      });

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn: 1800,
      isNewUser: customerIdentity.isNew,
      customer: {
        userAccountId:
          customerIdentity.userAccountId,
        customerId:
          customerIdentity.customerId,
        personId:
          customerIdentity.personId,
      },
    };
  }

  async resolveVerifiedIdentity(
    identity: VerifiedCustomerIdentity,
  ): Promise<CustomerIdentityResult> {
    const provider = identity.provider.trim();
    const externalAuthId =
      identity.externalAuthId.trim();

    if (!provider) {
      throw new ConflictException(
        "Identity provider is required",
      );
    }

    if (!externalAuthId) {
      throw new ConflictException(
        "External authentication ID is required",
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const existingIdentity =
          await tx.authIdentity.findUnique({
            where: {
              provider_externalAuthId: {
                provider,
                externalAuthId,
              },
            },
            include: {
              userAccount: {
                include: {
                  person: true,
                  customer: true,
                },
              },
            },
          });

        if (existingIdentity) {
          if (
            existingIdentity.status !== "ACTIVE"
          ) {
            throw new ConflictException(
              "Customer identity is inactive",
            );
          }

          const userAccount =
            existingIdentity.userAccount;

          if (
            userAccount.accountType !== "CUSTOMER"
          ) {
            throw new ConflictException(
              "Authentication identity belongs to a non-customer account",
            );
          }

          if (
            userAccount.status !== "ACTIVE"
          ) {
            throw new ConflictException(
              "Customer account is inactive",
            );
          }

          let customer = userAccount.customer;

          if (!customer) {
            customer = await tx.customer.create({
              data: {
                personId: userAccount.personId,
                userAccountId: userAccount.id,
                customerCode:
                  this.generateCustomerCode(),
              },
            });
          }

          await tx.person.update({
            where: {
              id: userAccount.personId,
            },
            data: {
              firstName:
                identity.firstName ??
                userAccount.person.firstName,
              lastName:
                identity.lastName ??
                userAccount.person.lastName,
              email:
                identity.email ??
                userAccount.person.email,
              phone:
                identity.phone ??
                userAccount.person.phone,
            },
          });

          const authIdentityUpdate: {
            identifierType?: string | null;
            identifierValue?: string | null;
            metadata?: NonNullable<
              Parameters<
                typeof tx.authIdentity.update
              >[0]
            >["data"]["metadata"];
            verifiedAt: Date;
            status: string;
          } = {
            identifierType:
              identity.identifierType,
            identifierValue:
              identity.identifierValue ??
              existingIdentity.identifierValue,
            verifiedAt: new Date(),
            status: "ACTIVE",
          };

          if (
            identity.metadata !== undefined
          ) {
            authIdentityUpdate.metadata =
              identity.metadata;
          }

          await tx.authIdentity.update({
            where: {
              id: existingIdentity.id,
            },
            data: authIdentityUpdate,
          });

          return {
            userAccountId:
              userAccount.id.toString(),
            customerId:
              customer.id.toString(),
            personId:
              userAccount.personId.toString(),
            provider,
            externalAuthId,
            isNew: false,
          };
        }

        const person = await tx.person.create({
          data: {
            firstName:
              identity.firstName?.trim() ||
              "",
            lastName:
              identity.lastName?.trim() ||
              null,
            email:
              identity.email?.trim() ||
              null,
            phone:
              identity.phone?.trim() ||
              null,
            status: "ACTIVE",
          },
        });

        const userAccount =
          await tx.userAccount.create({
            data: {
              personId: person.id,
              accountType: "CUSTOMER",
              status: "ACTIVE",
            },
          });

        const customer =
          await tx.customer.create({
            data: {
              personId: person.id,
              userAccountId: userAccount.id,
              customerCode:
                this.generateCustomerCode(),
              status: "ACTIVE",
            },
          });

        await tx.authIdentity.create({
          data: {
            userAccountId: userAccount.id,
            provider,
            externalAuthId,
            identifierType:
              identity.identifierType,
            identifierValue:
              identity.identifierValue ?? null,
            metadata:
              identity.metadata ?? undefined,
            verifiedAt: new Date(),
            status: "ACTIVE",
          },
        });

        return {
          userAccountId:
            userAccount.id.toString(),
          customerId:
            customer.id.toString(),
          personId:
            person.id.toString(),
          provider,
          externalAuthId,
          isNew: true,
        };
      },
      {
        maxWait: 15000,
        timeout: 30000,
      },
    );
  }

  private generateCustomerCode(): string {
    const suffix = randomUUID()
      .replaceAll("-", "")
      .slice(0, 12)
      .toUpperCase();

    if (!suffix) {
      throw new InternalServerErrorException(
        "Unable to generate customer code",
      );
    }

    return `KLN-CUS-${suffix}`;
  }

  async updateProfile(
    personIdStr: string,
    data: { firstName?: string; lastName?: string; phone?: string; email?: string },
  ) {
    const personId = BigInt(personIdStr);
    return this.prisma.person.update({
      where: { id: personId },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
      },
    });
  }
}