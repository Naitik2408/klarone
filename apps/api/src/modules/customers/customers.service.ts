import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

import type {
  CreateStaffCustomerInput,
  UpdateStaffCustomerInput,
} from "./dto-create-staff-customer";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) { }

  async findById(userAccountId: bigint) {
    const customer = await this.prisma.customer.findUnique({
      where: { userAccountId },
      include: {
        userAccount: {
          include: { person: true },
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
      where: { provider, externalAuthId },
      include: {
        userAccount: {
          include: { customer: true, person: true },
        },
      },
    });
  }

  // ---------------------------------------------------------------
  // Staff: list
  // ---------------------------------------------------------------
  async listStaffCustomers(params: {
    search?: string;
    status?: string;
    customerType?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(
      1,
      Number.isFinite(params.page) ? Number(params.page) : 1,
    );

    const pageSize = Math.min(
      100,
      Math.max(
        1,
        Number.isFinite(params.pageSize)
          ? Number(params.pageSize)
          : 20,
      ),
    );

    const search =
      typeof params.search === "string" &&
        params.search.trim().length > 0
        ? params.search.trim()
        : undefined;

    const where: any = {
      ...(params.status
        ? { status: params.status.trim() }
        : {}),
      ...(params.customerType
        ? { customerType: params.customerType.trim() }
        : {}),
      ...(search
        ? {
          OR: [
            {
              customerCode: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              person: {
                firstName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              person: {
                lastName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              person: {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              person: {
                phone: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
        : {}),
    };

    const [customers, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          customerCode: true,
          customerType: true,
          status: true,
          marketingConsent: true,
          emailMarketing: true,
          smsMarketing: true,
          whatsappMarketing: true,
          termsAcceptedAt: true,
          createdAt: true,
          updatedAt: true,
          person: {
            select: {
              firstName: true,
              middleName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
            },
          },
          userAccount: {
            select: {
              id: true,
              status: true,
              lastLoginAt: true,
            },
          },
          addresses: {
            where: { isDefault: true },
            take: 1,
            select: { country: true, city: true, state: true },
          },
          _count: {
            select: { orders: true },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    // totalSpent per customer — group by customerId on PAID orders
    const customerIds = customers.map((c) => c.id);

    const spentRows = customerIds.length
      ? await this.prisma.order.groupBy({
        by: ["customerId"],
        where: {
          customerId: { in: customerIds },
          paymentStatus: "PAID",
        },
        _sum: { totalAmount: true },
      })
      : [];

    const spentByCustomer = new Map<string, string>();

    for (const row of spentRows) {
      spentByCustomer.set(
        row.customerId.toString(),
        String(row._sum.totalAmount ?? 0),
      );
    }

    return {
      customers: customers.map((customer) => {
        const defaultAddress = customer.addresses[0] ?? null;

        return {
          id: customer.id.toString(),
          customerCode: customer.customerCode,
          customerType: customer.customerType,
          status: customer.status,
          marketingConsent: customer.marketingConsent,
          emailMarketing: customer.emailMarketing,
          smsMarketing: customer.smsMarketing,
          whatsappMarketing: customer.whatsappMarketing,
          termsAcceptedAt:
            customer.termsAcceptedAt?.toISOString() ?? null,
          createdAt: customer.createdAt.toISOString(),
          updatedAt: customer.updatedAt.toISOString(),
          person: customer.person,
          userAccount: {
            id: customer.userAccount.id.toString(),
            status: customer.userAccount.status,
            lastLoginAt:
              customer.userAccount.lastLoginAt?.toISOString() ??
              null,
          },
          location: defaultAddress
            ? {
              country: defaultAddress.country,
              city: defaultAddress.city,
              state: defaultAddress.state,
            }
            : null,
          orderCount: customer._count.orders,
          totalSpent:
            spentByCustomer.get(customer.id.toString()) ?? "0",
        };
      }),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // ---------------------------------------------------------------
  // Staff: detail
  // ---------------------------------------------------------------
  async getStaffCustomer(customerCode: string) {
    const normalizedCode = customerCode.trim();

    if (!normalizedCode) {
      throw new BadRequestException(
        "Customer code is required.",
      );
    }

    const customer = await this.prisma.customer.findUnique({
      where: { customerCode: normalizedCode },
      select: {
        id: true,
        customerCode: true,
        customerType: true,
        marketingConsent: true,
        marketingConsentAt: true,
        termsAcceptedAt: true,
        notes: true,
        tags: true,
        emailMarketing: true,
        smsMarketing: true,
        whatsappMarketing: true,
        status: true,
        createdAt: true,
        updatedAt: true,

        person: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            phone: true,
            email: true,
            dateOfBirth: true,
            gender: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },

        userAccount: {
          select: {
            id: true,
            accountType: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },

        addresses: {
          orderBy: [
            { isDefault: "desc" },
            { createdAt: "desc" },
          ],
          select: {
            id: true,
            addressType: true,
            recipientName: true,
            phone: true,
            addressLine1: true,
            addressLine2: true,
            landmark: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
            isDefault: true,
            createdAt: true,
            updatedAt: true,
          },
        },

        orders: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            fulfillmentStatus: true,
            subtotal: true,
            discountAmount: true,
            shippingAmount: true,
            taxAmount: true,
            totalAmount: true,
            currency: true,
            placedAt: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { items: true } },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException("Customer not found.");
    }

    const totalSpent = customer.orders
      .filter((o) => o.paymentStatus === "PAID")
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    return {
      id: customer.id.toString(),
      customerCode: customer.customerCode,
      customerType: customer.customerType,
      marketingConsent: customer.marketingConsent,
      marketingConsentAt:
        customer.marketingConsentAt?.toISOString() ?? null,
      termsAcceptedAt:
        customer.termsAcceptedAt?.toISOString() ?? null,
      notes: customer.notes,
      tags: customer.tags,
      emailMarketing: customer.emailMarketing,
      smsMarketing: customer.smsMarketing,
      whatsappMarketing: customer.whatsappMarketing,
      status: customer.status,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),

      totalSpent: String(totalSpent),

      person: {
        id: customer.person.id.toString(),
        firstName: customer.person.firstName,
        middleName: customer.person.middleName,
        lastName: customer.person.lastName,
        phone: customer.person.phone,
        email: customer.person.email,
        dateOfBirth:
          customer.person.dateOfBirth?.toISOString() ?? null,
        gender: customer.person.gender,
        status: customer.person.status,
        createdAt: customer.person.createdAt.toISOString(),
        updatedAt: customer.person.updatedAt.toISOString(),
      },

      userAccount: {
        id: customer.userAccount.id.toString(),
        accountType: customer.userAccount.accountType,
        status: customer.userAccount.status,
        lastLoginAt:
          customer.userAccount.lastLoginAt?.toISOString() ?? null,
        createdAt: customer.userAccount.createdAt.toISOString(),
        updatedAt: customer.userAccount.updatedAt.toISOString(),
      },

      addresses: customer.addresses.map((address) => ({
        id: address.id.toString(),
        addressType: address.addressType,
        recipientName: address.recipientName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        landmark: address.landmark,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        isDefault: address.isDefault,
        createdAt: address.createdAt.toISOString(),
        updatedAt: address.updatedAt.toISOString(),
      })),

      orders: customer.orders.map((order) => ({
        id: order.id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        subtotal: String(order.subtotal),
        discountAmount: String(order.discountAmount),
        shippingAmount: String(order.shippingAmount),
        taxAmount: String(order.taxAmount),
        totalAmount: String(order.totalAmount),
        currency: order.currency,
        placedAt: order.placedAt?.toISOString() ?? null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        itemCount: order._count.items,
      })),
    };
  }

  // ---------------------------------------------------------------
  // Staff: create
  // ---------------------------------------------------------------
  async createStaffCustomer(
    input: CreateStaffCustomerInput,
  ) {
    const firstName = input.firstName?.trim();

    if (!firstName) {
      throw new BadRequestException("First name is required.");
    }

    const email = input.email?.trim() || null;
    const phone = input.phone?.trim() || null;

    // Duplicate guards (best-effort: Person email/phone are not unique at DB level,
    // but we want predictable 409s from staff UI).
    if (email) {
      const existing = await this.prisma.person.findFirst({
        where: { email },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(
          "A customer with this email already exists.",
        );
      }
    }

    if (phone) {
      const existing = await this.prisma.person.findFirst({
        where: { phone },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(
          "A customer with this phone already exists.",
        );
      }
    }

    const customerCode = await this.generateCustomerCode();

    const result = await this.prisma.$transaction(
      async (tx) => {
        const person = await tx.person.create({
          data: {
            firstName,
            middleName: input.middleName?.trim() || null,
            lastName: input.lastName?.trim() || null,
            email,
            phone,
            status: "ACTIVE",
          },
        });

        const userAccount = await tx.userAccount.create({
          data: {
            personId: person.id,
            accountType: "CUSTOMER",
            status: "ACTIVE",
          },
        });

        const customer = await tx.customer.create({
          data: {
            personId: person.id,
            userAccountId: userAccount.id,
            customerCode,
            customerType: input.customerType?.trim() || "INDIVIDUAL",
            emailMarketing: input.emailMarketing ?? false,
            smsMarketing: input.smsMarketing ?? false,
            whatsappMarketing: input.whatsappMarketing ?? false,
            notes: input.notes ?? null,
            tags: input.tags ?? [],
            status: "ACTIVE",
          },
        });

        if (input.defaultAddress) {
          const a = input.defaultAddress;

          await tx.customerAddress.create({
            data: {
              customerId: customer.id,
              addressType: "SHIPPING",
              recipientName:
                a.recipientName?.trim() || `${firstName} ${input.lastName ?? ""}`.trim(),
              phone: a.phone?.trim() || phone,
              addressLine1: a.addressLine1.trim(),
              addressLine2: a.addressLine2?.trim() || null,
              landmark: a.landmark?.trim() || null,
              city: a.city.trim(),
              state: a.state.trim(),
              postalCode: a.postalCode.trim(),
              country: a.country?.trim() || "India",
              isDefault: true,
            },
          });
        }

        return customer;
      },
    );

    return {
      id: result.id.toString(),
      customerCode: result.customerCode,
    };
  }

  // ---------------------------------------------------------------
  // Staff: update
  // ---------------------------------------------------------------
  async updateStaffCustomer(
    customerCode: string,
    input: UpdateStaffCustomerInput,
  ) {
    const normalizedCode = customerCode.trim();

    if (!normalizedCode) {
      throw new BadRequestException(
        "Customer code is required.",
      );
    }

    const existing = await this.prisma.customer.findUnique({
      where: { customerCode: normalizedCode },
      select: { id: true, personId: true },
    });

    if (!existing) {
      throw new NotFoundException("Customer not found.");
    }

    await this.prisma.$transaction(async (tx) => {
      const personData: Record<string, unknown> = {};
      if (input.firstName !== undefined)
        personData.firstName = input.firstName.trim();
      if (input.middleName !== undefined)
        personData.middleName =
          input.middleName?.trim() || null;
      if (input.lastName !== undefined)
        personData.lastName =
          input.lastName?.trim() || null;
      if (input.email !== undefined)
        personData.email = input.email?.trim() || null;
      if (input.phone !== undefined)
        personData.phone = input.phone?.trim() || null;

      if (Object.keys(personData).length > 0) {
        await tx.person.update({
          where: { id: existing.personId },
          data: personData,
        });
      }

      const customerData: Record<string, unknown> = {};
      if (input.notes !== undefined)
        customerData.notes = input.notes ?? null;
      if (input.tags !== undefined)
        customerData.tags = input.tags ?? [];
      if (input.emailMarketing !== undefined)
        customerData.emailMarketing = input.emailMarketing;
      if (input.smsMarketing !== undefined)
        customerData.smsMarketing = input.smsMarketing;
      if (input.whatsappMarketing !== undefined)
        customerData.whatsappMarketing =
          input.whatsappMarketing;
      if (input.status !== undefined)
        customerData.status = input.status;

      if (Object.keys(customerData).length > 0) {
        await tx.customer.update({
          where: { id: existing.id },
          data: customerData,
        });
      }
    });

    return this.getStaffCustomer(normalizedCode);
  }

  // ---------------------------------------------------------------
  // Staff: delete
  // ---------------------------------------------------------------
  async deleteStaffCustomer(customerCode: string) {
    const normalizedCode = customerCode.trim().toUpperCase();

    const customer = await this.prisma.customer.findUnique({
      where: { customerCode: normalizedCode },
      select: { id: true, personId: true, userAccountId: true },
    });

    if (!customer) {
      throw new NotFoundException("Customer not found.");
    }

    await this.prisma.$transaction(async (tx) => {
      // Soft-delete or remove customer relationship
      await tx.customer.delete({
        where: { id: customer.id },
      });

      if (customer.userAccountId) {
        await tx.authIdentity.deleteMany({
          where: { userAccountId: customer.userAccountId },
        });
        await tx.userAccount.delete({
          where: { id: customer.userAccountId },
        });
      }

      await tx.person.delete({
        where: { id: customer.personId },
      });
    });

    return { success: true, customerCode: normalizedCode };
  }

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------
  private async generateCustomerCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const suffix = Math.random()
        .toString(36)
        .slice(2, 10)
        .toUpperCase();

      const code = `CUST-${suffix}`;

      const clash = await this.prisma.customer.findUnique({
        where: { customerCode: code },
        select: { id: true },
      });

      if (!clash) return code;
    }

    throw new ConflictException(
      "Unable to generate a unique customer code. Try again.",
    );
  }
}