import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(__dirname, "../../../.env") });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the backfill.");
}

const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

/**
 * Backfill ProductOption, ProductOptionValue, and ProductVariantOptionValue
 * rows from the legacy variant columns (color / ramGb / storageGb /
 * operatingSystem).
 *
 * Idempotent: safe to run multiple times.
 * Legacy columns are NOT removed — they remain the source of truth for any
 * code path that hasn't been migrated yet, and are still returned by the
 * public catalogue reads.
 */
async function main() {
  console.log("Backfilling product options from legacy variant columns…");

  const variants = await prisma.productVariant.findMany({
    select: {
      id: true,
      productId: true,
      color: true,
      ramGb: true,
      storageGb: true,
      operatingSystem: true,
    },
  });

  console.log(`Found ${variants.length} variants.`);

  const perProduct = new Map<
    string,
    {
      color: Set<string>;
      ramGb: Set<string>;
      storageGb: Set<string>;
      operatingSystem: Set<string>;
    }
  >();

  for (const v of variants) {
    const key = v.productId.toString();
    const bucket =
      perProduct.get(key) ?? {
        color: new Set<string>(),
        ramGb: new Set<string>(),
        storageGb: new Set<string>(),
        operatingSystem: new Set<string>(),
      };

    if (v.color) bucket.color.add(v.color);
    if (v.ramGb != null) bucket.ramGb.add(String(v.ramGb));
    if (v.storageGb != null) bucket.storageGb.add(String(v.storageGb));
    if (v.operatingSystem) bucket.operatingSystem.add(v.operatingSystem);

    perProduct.set(key, bucket);
  }

  let optionCount = 0;
  let valueCount = 0;
  let linkCount = 0;

  for (const [productIdStr, bucket] of perProduct) {
    const productId = BigInt(productIdStr);

    async function ensureOption(name: string, values: string[]) {
      if (values.length === 0) return null;

      const option = await prisma.productOption.upsert({
        where: { productId_name: { productId, name } },
        create: { productId, name, displayOrder: optionCount },
        update: {},
      });
      optionCount += 1;

      const valueRows = await Promise.all(
        values.map((value, index) =>
          prisma.productOptionValue.upsert({
            where: {
              productOptionId_value: {
                productOptionId: option.id,
                value,
              },
            },
            create: {
              productOptionId: option.id,
              value,
              displayOrder: index,
            },
            update: {},
          }),
        ),
      );
      valueCount += valueRows.length;

      return { option, values: valueRows };
    }

    const colorOpt = await ensureOption("Color", [...bucket.color]);
    const ramOpt = await ensureOption("RAM", [...bucket.ramGb]);
    const storageOpt = await ensureOption("Storage", [...bucket.storageGb]);
    const osOpt = await ensureOption("Operating system", [
      ...bucket.operatingSystem,
    ]);

    const productVariants = variants.filter(
      (v) => v.productId === productId,
    );

    for (const v of productVariants) {
      async function link(
        opt: {
          option: { id: bigint };
          values: Array<{ id: bigint; value: string }>;
        } | null,
        rawValue: string | number | null,
      ) {
        if (!opt || rawValue == null) return;
        const matched = opt.values.find(
          (row) => row.value === String(rawValue),
        );
        if (!matched) return;

        await prisma.productVariantOptionValue.upsert({
          where: {
            productVariantId_productOptionId: {
              productVariantId: v.id,
              productOptionId: opt.option.id,
            },
          },
          create: {
            productVariantId: v.id,
            productOptionId: opt.option.id,
            productOptionValueId: matched.id,
          },
          update: { productOptionValueId: matched.id },
        });
        linkCount += 1;
      }

      await link(colorOpt, v.color);
      await link(ramOpt, v.ramGb);
      await link(storageOpt, v.storageGb);
      await link(osOpt, v.operatingSystem);
    }
  }

  console.log(
    `Backfill complete. Options: ${optionCount}, values: ${valueCount}, variant links: ${linkCount}.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });