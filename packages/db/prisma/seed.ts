import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the seed.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const permissions = [
  {
    code: "platform.settings.read",
    module: "platform",
    action: "read",
    description: "View platform settings",
  },
  {
    code: "platform.settings.write",
    module: "platform",
    action: "write",
    description: "Create and update platform settings",
  },

  {
    code: "users.read",
    module: "users",
    action: "read",
    description: "View user accounts",
  },
  {
    code: "users.create",
    module: "users",
    action: "create",
    description: "Create user accounts",
  },
  {
    code: "users.update",
    module: "users",
    action: "update",
    description: "Update user accounts",
  },
  {
    code: "users.disable",
    module: "users",
    action: "disable",
    description: "Disable user accounts",
  },

  {
    code: "roles.read",
    module: "roles",
    action: "read",
    description: "View roles",
  },
  {
    code: "roles.create",
    module: "roles",
    action: "create",
    description: "Create roles",
  },
  {
    code: "roles.update",
    module: "roles",
    action: "update",
    description: "Update roles",
  },
  {
    code: "roles.assign",
    module: "roles",
    action: "assign",
    description: "Assign roles to users",
  },

  {
    code: "permissions.read",
    module: "permissions",
    action: "read",
    description: "View permissions",
  },

  {
    code: "catalogue.read",
    module: "catalogue",
    action: "read",
    description: "View catalogue data",
  },
  {
    code: "catalogue.create",
    module: "catalogue",
    action: "create",
    description: "Create catalogue records",
  },
  {
    code: "catalogue.update",
    module: "catalogue",
    action: "update",
    description: "Update catalogue records",
  },
  {
    code: "catalogue.delete",
    module: "catalogue",
    action: "delete",
    description: "Delete catalogue records",
  },
  {
    code: "catalogue.publish",
    module: "catalogue",
    action: "publish",
    description: "Publish or unpublish catalogue products",
  },

  {
    code: "inventory.read",
    module: "inventory",
    action: "read",
    description: "View inventory",
  },
  {
    code: "inventory.update",
    module: "inventory",
    action: "update",
    description: "Update inventory",
  },
  {
    code: "inventory.adjust",
    module: "inventory",
    action: "adjust",
    description: "Adjust inventory quantities",
  },

  {
    code: "recommendations.read",
    module: "recommendations",
    action: "read",
    description: "View recommendation activity",
  },
  {
    code: "recommendations.manage",
    module: "recommendations",
    action: "manage",
    description: "Manage recommendation configuration and runs",
  },

  {
    code: "customers.read",
    module: "customers",
    action: "read",
    description: "View customer records",
  },
  {
    code: "customers.create",
    module: "customers",
    action: "create",
    description: "Create customer records",
  },
  {
    code: "customers.update",
    module: "customers",
    action: "update",
    description: "Update customer records",
  },
  {
    code: "customers.delete",
    module: "customers",
    action: "delete",
    description: "Delete customer records",
  },

    {
    code: "orders.read",
    module: "orders",
    action: "read",
    description: "View orders",
  },
  {
    code: "orders.create",
    module: "orders",
    action: "create",
    description: "Create orders and draft orders",
  },
  {
    code: "orders.update",
    module: "orders",
    action: "update",
    description: "Update order status and operational data",
  },
  {
    code: "orders.drafts.manage",
    module: "orders",
    action: "drafts.manage",
    description: "Manage draft orders — add/remove items, complete, cancel",
  },
  {
    code: "orders.cancel",
    module: "orders",
    action: "cancel",
    description: "Cancel orders",
  },

  {
    code: "payments.read",
    module: "payments",
    action: "read",
    description: "View payments and transactions",
  },
  {
    code: "payments.refund",
    module: "payments",
    action: "refund",
    description: "Process refunds",
  },

  {
    code: "reviews.read",
    module: "reviews",
    action: "read",
    description: "View product reviews",
  },
  {
    code: "reviews.moderate",
    module: "reviews",
    action: "moderate",
    description: "Moderate product reviews",
  },

  {
    code: "devices.read",
    module: "devices",
    action: "read",
    description: "View physical device assets",
  },
  {
    code: "devices.update",
    module: "devices",
    action: "update",
    description: "Update physical device assets",
  },

  {
    code: "warranty.read",
    module: "warranty",
    action: "read",
    description: "View warranty information",
  },
  {
    code: "warranty.manage",
    module: "warranty",
    action: "manage",
    description: "Manage warranty claims and warranty data",
  },

  {
    code: "support.read",
    module: "support",
    action: "read",
    description: "View support tickets and messages",
  },
  {
    code: "support.manage",
    module: "support",
    action: "manage",
    description: "Manage customer support",
  },

  {
    code: "service.read",
    module: "service",
    action: "read",
    description: "View service operations",
  },
  {
    code: "service.manage",
    module: "service",
    action: "manage",
    description: "Manage service requests, jobs, quotes, and appointments",
  },

  {
    code: "rentals.read",
    module: "rentals",
    action: "read",
    description: "View rental operations",
  },
  {
    code: "rentals.manage",
    module: "rentals",
    action: "manage",
    description: "Manage rental operations",
  },

  {
    code: "subscriptions.read",
    module: "subscriptions",
    action: "read",
    description: "View subscriptions",
  },
  {
    code: "subscriptions.manage",
    module: "subscriptions",
    action: "manage",
    description: "Manage subscription plans and subscriptions",
  },

  {
    code: "notifications.read",
    module: "notifications",
    action: "read",
    description: "View notifications",
  },
  {
    code: "notifications.manage",
    module: "notifications",
    action: "manage",
    description: "Manage notification templates and delivery",
  },

  {
    code: "audit.read",
    module: "audit",
    action: "read",
    description: "View audit logs",
  },

  {
    code: "security.read",
    module: "security",
    action: "read",
    description: "View security events",
  },

  {
    code: "webhooks.read",
    module: "webhooks",
    action: "read",
    description: "View webhook events",
  },
  {
    code: "webhooks.manage",
    module: "webhooks",
    action: "manage",
    description: "Manage webhook processing",
  },

  {
    code: "background-jobs.read",
    module: "background-jobs",
    action: "read",
    description: "View background jobs",
  },
  {
    code: "background-jobs.manage",
    module: "background-jobs",
    action: "manage",
    description: "Manage background jobs",
  },
];

const platformSettings = [
  {
    settingKey: "platform.name",
    settingValue: "Klarone",
    description: "Platform display name",
  },
  {
    settingKey: "platform.defaultCurrency",
    settingValue: "INR",
    description: "Default platform currency",
  },
  {
    settingKey: "platform.defaultCountry",
    settingValue: "India",
    description: "Default platform country",
  },
  {
    settingKey: "platform.defaultTimezone",
    settingValue: "Asia/Kolkata",
    description: "Default platform timezone",
  },
  {
    settingKey: "platform.defaultLocale",
    settingValue: "en-IN",
    description: "Default platform locale",
  },
  {
    settingKey: "catalogue.defaultPageSize",
    settingValue: "24",
    description: "Default catalogue page size",
  },
  {
    settingKey: "recommendations.defaultResultCount",
    settingValue: "5",
    description: "Default number of recommendation results",
  },
  {
    settingKey: "support.defaultCountry",
    settingValue: "India",
    description: "Default country for support/service operations",
  },
];

async function main(): Promise<void> {
  console.log("Starting Klarone database seed...");

  const superAdminRole = await prisma.role.upsert({
    where: {
      name: "SUPER_ADMIN",
    },
    update: {
      description: "Full administrative access to the Klarone platform",
      isSystemRole: true,
      status: "ACTIVE",
    },
    create: {
      name: "SUPER_ADMIN",
      description: "Full administrative access to the Klarone platform",
      isSystemRole: true,
      status: "ACTIVE",
    },
  });

  console.log(`Role ready: ${superAdminRole.name}`);

  for (const permissionData of permissions) {
    const permission = await prisma.permission.upsert({
      where: {
        code: permissionData.code,
      },
      update: {
        module: permissionData.module,
        action: permissionData.action,
        description: permissionData.description,
      },
      create: permissionData,
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log(`Permissions ready: ${permissions.length}`);

  // Seed Predefined Specialized Staff Roles
  const specializedRoles = [
    {
      name: "PRODUCT_MANAGER",
      description: "Manage product catalogue, collections, brands, categories, inventory, and reviews",
      modules: ["catalogue", "inventory", "reviews"],
    },
    {
      name: "ORDER_SPECIALIST",
      description: "Process orders, draft orders, payments, shipments, and customer communication",
      modules: ["orders", "payments", "customers"],
    },
    {
      name: "SERVICE_TECHNICIAN",
      description: "Manage laptop diagnostics, service jobs, repairs, warranties, and device assets",
      modules: ["service", "warranty", "devices", "support"],
    },
    {
      name: "CUSTOMER_SUPPORT",
      description: "Handle support tickets, customer inquiries, and customer profile updates",
      modules: ["support", "customers", "notifications"],
    },
  ];

  const allDbPermissions = await prisma.permission.findMany();
  for (const r of specializedRoles) {
    const roleRecord = await prisma.role.upsert({
      where: { name: r.name },
      update: {
        description: r.description,
        isSystemRole: true,
        status: "ACTIVE",
      },
      create: {
        name: r.name,
        description: r.description,
        isSystemRole: true,
        status: "ACTIVE",
      },
    });

    const matchingPerms = allDbPermissions.filter((p) => r.modules.includes(p.module));
    for (const p of matchingPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roleRecord.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: roleRecord.id,
          permissionId: p.id,
        },
      });
    }
    console.log(`Specialized Role ready: ${roleRecord.name} (${matchingPerms.length} permissions)`);
  }

  for (const setting of platformSettings) {
    await prisma.platformSetting.upsert({
      where: {
        settingKey: setting.settingKey,
      },
      update: {
        settingValue: setting.settingValue,
        description: setting.description,
      },
      create: setting,
    });
  }

  console.log(`Platform settings ready: ${platformSettings.length}`);
  console.log("Klarone database seed completed successfully.");
}

main()
  .catch((error: unknown) => {
    console.error("Klarone database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });