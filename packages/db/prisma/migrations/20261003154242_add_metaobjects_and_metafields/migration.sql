-- AlterTable
ALTER TABLE "ProductOptionValue" ADD COLUMN     "metaobjectEntryId" BIGINT;

-- CreateTable
CREATE TABLE "MetaobjectDefinition" (
    "id" SERIAL NOT NULL,
    "namespace" TEXT NOT NULL DEFAULT 'kis',
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fieldSchema" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaobjectDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaobjectEntry" (
    "id" BIGSERIAL NOT NULL,
    "definitionId" INTEGER NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "fields" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaobjectEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetafieldDefinition" (
    "id" SERIAL NOT NULL,
    "namespace" TEXT NOT NULL DEFAULT 'kis',
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metaobjectType" TEXT,
    "multiple" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "categoryId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetafieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetafieldValue" (
    "id" BIGSERIAL NOT NULL,
    "definitionId" INTEGER NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metaobjectEntryId" BIGINT,

    CONSTRAINT "MetafieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MetaobjectDefinition_type_key" ON "MetaobjectDefinition"("type");

-- CreateIndex
CREATE UNIQUE INDEX "MetaobjectDefinition_namespace_type_key" ON "MetaobjectDefinition"("namespace", "type");

-- CreateIndex
CREATE INDEX "MetaobjectEntry_definitionId_idx" ON "MetaobjectEntry"("definitionId");

-- CreateIndex
CREATE INDEX "MetaobjectEntry_displayName_idx" ON "MetaobjectEntry"("displayName");

-- CreateIndex
CREATE UNIQUE INDEX "MetaobjectEntry_definitionId_handle_key" ON "MetaobjectEntry"("definitionId", "handle");

-- CreateIndex
CREATE INDEX "MetafieldDefinition_categoryId_idx" ON "MetafieldDefinition"("categoryId");

-- CreateIndex
CREATE INDEX "MetafieldDefinition_ownerType_idx" ON "MetafieldDefinition"("ownerType");

-- CreateIndex
CREATE UNIQUE INDEX "MetafieldDefinition_namespace_key_categoryId_ownerType_key" ON "MetafieldDefinition"("namespace", "key", "categoryId", "ownerType");

-- CreateIndex
CREATE INDEX "MetafieldValue_ownerType_ownerId_idx" ON "MetafieldValue"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "MetafieldValue_metaobjectEntryId_idx" ON "MetafieldValue"("metaobjectEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "MetafieldValue_definitionId_ownerType_ownerId_key" ON "MetafieldValue"("definitionId", "ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "ProductOptionValue_metaobjectEntryId_idx" ON "ProductOptionValue"("metaobjectEntryId");

-- AddForeignKey
ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "ProductOptionValue_metaobjectEntryId_fkey" FOREIGN KEY ("metaobjectEntryId") REFERENCES "MetaobjectEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaobjectEntry" ADD CONSTRAINT "MetaobjectEntry_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "MetaobjectDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetafieldDefinition" ADD CONSTRAINT "MetafieldDefinition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetafieldValue" ADD CONSTRAINT "MetafieldValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "MetafieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetafieldValue" ADD CONSTRAINT "MetafieldValue_metaobjectEntryId_fkey" FOREIGN KEY ("metaobjectEntryId") REFERENCES "MetaobjectEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
