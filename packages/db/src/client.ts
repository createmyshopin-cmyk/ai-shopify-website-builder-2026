import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __themeEditorPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}

export const prisma =
  globalThis.__themeEditorPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__themeEditorPrisma = prisma;
}

export { PrismaClient };
