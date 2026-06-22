import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
} from "@nestjs/common";

import { AgentPipelineService } from "./pipeline.service.js";

function requireShop(shop?: string): string {
  if (!shop) {
    throw new BadRequestException({
      message: "x-shop-domain header is required",
    });
  }
  return shop;
}

@Controller("api/projects")
export class AgentsController {
  constructor(
    @Inject(AgentPipelineService)
    private readonly pipelineService: AgentPipelineService,
  ) {}

  @Post("run/:id")
  @HttpCode(200)
  runPipeline(
    @Param("id") id: string,
    @Body() body: unknown,
    @Headers("x-shop-domain") shop?: string,
  ) {
    return this.pipelineService.runPipeline(id, {
      ...(typeof body === "object" && body !== null ? body : {}),
      shop: requireShop(shop),
    });
  }
}
