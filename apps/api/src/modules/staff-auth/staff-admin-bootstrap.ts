import path from "node:path";
import dotenv from "dotenv";
import * as argon2 from "argon2";
import { PrismaClient, PrismaPg } from "@klarone/db";

dotenv.config({
  path: path.resolve(process.cwd(), "../../.env"),
});

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

const connectionString = requiredEnv("DATABASE_URL");

const email = requiredEnv("STAFF_BOOTSTRAP_EMAIL").toLowerCase();
const password = requiredEnv("STAFF_BOOTSTRAP_PASSWORD");

const firstName =
  process.env.STAFF_BOOTSTRAP_FIRST_NAME?.trim() || "Klarone";

const lastName =
  process.env.STAFF_BOOTSTRAP_LAST_NAME?.trim() || "Admin";

const employeeCode =
  process.env.STAFF_BOOTSTRAP_EMPLOYEE_CODE?.trim() || "KLN-ADM-001";

if (password.length < 12) {
  throw new Error(
    "STAFF_BOOTSTRAP_PASSWORD must be at least 12 characters.",
  );
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main(): Promise<void> {
  console.log("Starting Klarone SUPER_ADMIN bootstrap...");

  const superAdminRole = await prisma.role.findUnique({
    where: {
      name: "SUPER_ADMIN",
    },
  });

  if (!superAdminRole) {
    throw new Error(
      "SUPER_ADMIN role was not found. Run the normal database seed first.",
    );
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  await prisma.$transaction(async (tx) => {
    const existingCredential = await tx.staffCredential.findUnique({
      where: {
        loginEmail: email,
      },
    });

    let userAccountId: bigint;

    if (existingCredential) {
      const userAccount = await tx.userAccount.update({
        where: {
          id: existingCredential.userAccountId,
        },
        data: {
          accountType: "STAFF",
          status: "ACTIVE",
          person: {
            update: {
              email,
              firstName,
              lastName,
              status: "ACTIVE",
            },
          },
          staffProfile: {
            update: {
              employeeCode,
              status: "ACTIVE",
              department: "Administration",
              jobTitle: "Administrator",
            },
          },
          staffCredentials: {
            update: {
              passwordHash,
              passwordAlgorithm: "ARGON2ID",
              passwordUpdatedAt: new Date(),
              mfaRequired: false,
            },
          },
        },
      });

      userAccountId = userAccount.id;
    } else {
      const userAccount = await tx.userAccount.create({
        data: {
          accountType: "STAFF",
          status: "ACTIVE",

          person: {
            create: {
              firstName,
              lastName,
              email,
              status: "ACTIVE",
            },
          },

          staffProfile: {
            create: {
              employeeCode,
              department: "Administration",
              jobTitle: "Administrator",
              status: "ACTIVE",
            },
          },

          staffCredentials: {
            create: {
              loginEmail: email,
              passwordHash,
              passwordAlgorithm: "ARGON2ID",
              passwordUpdatedAt: new Date(),
              mfaRequired: false,
            },
          },
        },
      });

      userAccountId = userAccount.id;
    }

    await tx.userRole.upsert({
      where: {
        userAccountId_roleId: {
          userAccountId,
          roleId: superAdminRole.id,
        },
      },
      update: {
        status: "ACTIVE",
        expiresAt: null,
      },
      create: {
        userAccountId,
        roleId: superAdminRole.id,
        status: "ACTIVE",
      },
    });
  });

  console.log("SUPER_ADMIN bootstrap completed.");
  console.log(`Admin login: ${email}`);
  console.log("Role: SUPER_ADMIN");
  console.log("MFA: disabled for initial development bootstrap.");
}

main()
  .catch((error: unknown) => {
    console.error("SUPER_ADMIN bootstrap failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });