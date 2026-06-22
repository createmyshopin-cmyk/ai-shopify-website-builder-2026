import "reflect-metadata";

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import { logger } from "./common/logger.js";
import { rateLimitMiddleware } from "./common/rate-limit.middleware.js";
import { requestLoggingMiddleware } from "./common/request-logging.middleware.js";

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv({ path: resolve(process.cwd(), ".env") });

function normalizeRepoPaths(): void {
  const cwd = process.cwd();
  const candidates = [
    process.env.BASE_THEME_PATH
      ? resolve(cwd, process.env.BASE_THEME_PATH)
      : null,
    resolve(cwd, "base theme"),
    resolve(cwd, "../..", "base theme"),
  ].filter((value): value is string => Boolean(value));

  const themeRoot = candidates.find((candidate) =>
    existsSync(resolve(candidate, "config", "settings_data.json")),
  );

  if (themeRoot) {
    process.env.BASE_THEME_PATH = themeRoot;
    process.env.REPO_ROOT = resolve(themeRoot, "..");
  }
}

normalizeRepoPaths();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.use(requestLoggingMiddleware);
  app.use(rateLimitMiddleware);
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
  await app.listen(port);
  logger.info("api_started", {
    port,
    nodeEnv: process.env.NODE_ENV ?? "development",
    rateLimitMax: process.env.API_RATE_LIMIT_MAX ?? 120,
  });
}

bootstrap().catch((error) => {
  logger.error("api_start_failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
