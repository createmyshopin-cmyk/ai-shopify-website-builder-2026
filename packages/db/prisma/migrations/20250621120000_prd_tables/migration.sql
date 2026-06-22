-- CreateTable
CREATE TABLE "UserAccount" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignProject" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "draftThemeId" TEXT,
    "productIds" TEXT[],
    "stylePreset" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userAccountId" TEXT,

    CONSTRAINT "DesignProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retries" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "originalUrl" TEXT,
    "generatedUrl" TEXT,
    "shopifyFileId" TEXT,
    "cdnUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThemeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeBackup" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThemeBackup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandMemory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "typography" JSONB,
    "colors" JSONB,
    "spacing" JSONB,
    "tone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_shop_key" ON "UserAccount"("shop");

-- CreateIndex
CREATE INDEX "DesignProject_shop_idx" ON "DesignProject"("shop");

-- CreateIndex
CREATE INDEX "ProjectJob_projectId_idx" ON "ProjectJob"("projectId");

-- CreateIndex
CREATE INDEX "ProjectJob_type_idx" ON "ProjectJob"("type");

-- CreateIndex
CREATE INDEX "GeneratedAsset_projectId_idx" ON "GeneratedAsset"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ThemeVersion_projectId_versionNumber_key" ON "ThemeVersion"("projectId", "versionNumber");

-- CreateIndex
CREATE INDEX "ThemeBackup_projectId_idx" ON "ThemeBackup"("projectId");

-- CreateIndex
CREATE INDEX "BrandMemory_shop_idx" ON "BrandMemory"("shop");

-- AddForeignKey
ALTER TABLE "DesignProject" ADD CONSTRAINT "DesignProject_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectJob" ADD CONSTRAINT "ProjectJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DesignProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedAsset" ADD CONSTRAINT "GeneratedAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DesignProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemeVersion" ADD CONSTRAINT "ThemeVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DesignProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemeBackup" ADD CONSTRAINT "ThemeBackup_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DesignProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMemory" ADD CONSTRAINT "BrandMemory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DesignProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
