import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userAccountId: bigint) {
    const customer = await this.prisma.customer.findUnique({
      where: {
        userAccountId,
      },
      include: {
        userAccount: {
          include: {
            person: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    return customer;
  }

  async findByExternalIdentity(
    provider: string,
    externalAuthId: string,
  ) {
    return this.prisma.authIdentity.findFirst({
      where: {
        provider,
        externalAuthId,
      },
      include: {
        userAccount: {
          include: {
            customer: true,
            person: true,
          },
        },
      },
    });
  }
}