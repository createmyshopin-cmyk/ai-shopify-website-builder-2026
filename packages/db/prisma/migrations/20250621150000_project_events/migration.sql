-- CreateTable
CREATE TABLE "ProjectEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectEvent_projectId_idx" ON "ProjectEvent"("projectId");

-- CreateIndex
CREATE INDEX "ProjectEvent_createdAt_idx" ON "ProjectEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "ProjectEvent" ADD CONSTRAINT "ProjectEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DesignProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
