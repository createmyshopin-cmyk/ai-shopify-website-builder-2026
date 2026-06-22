import { Controller, Get } from "@nestjs/common";

const startedAt = Date.now();

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: "ok",
      service: "@theme-editor/api",
      phase: 10,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      nodeVersion: process.version,
    };
  }
}
