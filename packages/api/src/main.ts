import "reflect-metadata";

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import { logger } from "./common/logger.js";
import { rateLimitMiddleware } from "./common/rate-limit.middleware.js";
import { requestLoggingMiddleware } from "./common/request-logging.middleware.js";

// #region agent log
const _dbg = (msg: string, data?: Record<string, unknown>) => {
  const payload = { sessionId: 'b30191', location: 'main.ts', message: msg, data, timestamp: Date.now() };
  console.error('[BOOT]', JSON.stringify(payload));
  fetch('http://127.0.0.1:7878/ingest/a6f9f79d-cac3-4f6b-90f4-920071a3798e', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b30191' }, body: JSON.stringify(payload) }).catch(() => {});
};
_dbg('H-A/B: main.ts loaded — before dotenv', { cwd: process.cwd(), nodeVersion: process.version });
// #endregion

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv({ path: resolve(process.cwd(), ".env") });

function normalizeRepoPaths(): void {
  const cwd = process.cwd();
  const candidates = [
    process.env.BASE_THEME_PATH
      ? resolve(cwd, process.env.BASE_THEME_PATH)
      : null,
    resolve(cwd, "base-theme"),
    resolve(cwd, "base theme"),
    resolve(cwd, "../..", "base-theme"),
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

// #region agent log
_dbg('H-D: env vars snapshot', {
  PORT: process.env.PORT ?? '(not set)',
  NODE_ENV: process.env.NODE_ENV ?? '(not set)',
  DATABASE_URL_SET: Boolean(process.env.DATABASE_URL),
  BASE_THEME_PATH: process.env.BASE_THEME_PATH ?? '(not set)',
  hypothesisId: 'H-D',
});
// #endregion

async function bootstrap() {
  // #region agent log
  _dbg('H-A: before NestFactory.create', { hypothesisId: 'H-A' });
  // #endregion

  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  // #region agent log
  _dbg('H-A: NestFactory.create completed — app module initialized', { hypothesisId: 'H-A' });
  // #endregion

  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.use(requestLoggingMiddleware);
  app.use(rateLimitMiddleware);
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);

  // Fix H-C: bind to 0.0.0.0 so Railway's internal health probe can reach the app
  await app.listen(port, '0.0.0.0');

  // #region agent log
  _dbg('H-C: app.listen completed', { port, host: '0.0.0.0', hypothesisId: 'H-C' });
  // #endregion

  logger.info("api_started", {
    port,
    nodeEnv: process.env.NODE_ENV ?? "development",
    rateLimitMax: process.env.API_RATE_LIMIT_MAX ?? 120,
  });
}

// Hard timeout — if NestJS hangs during bootstrap, exit with a clear message
const startupTimeout = setTimeout(() => {
  // #region agent log
  _dbg('H-A: TIMEOUT — bootstrap exceeded 60s', { hypothesisId: 'H-A' });
  // #endregion
  logger.error("api_start_timeout", { message: "Bootstrap exceeded 60s — force exiting" });
  process.exit(1);
}, 60_000);
startupTimeout.unref();

bootstrap()
  .then(() => clearTimeout(startupTimeout))
  .catch((error) => {
    clearTimeout(startupTimeout);
    // #region agent log
    _dbg('H-B: bootstrap catch triggered', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      hypothesisId: 'H-B',
    });
    // #endregion
    logger.error("api_start_failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  });
