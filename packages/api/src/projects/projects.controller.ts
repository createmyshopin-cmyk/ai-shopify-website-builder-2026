import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
} from "@nestjs/common";

import { PreviewEditService } from "./preview-edit.service.js";
import { ApplyService } from "./apply.service.js";
import { ProjectsService } from "./projects.service.js";

function requireShop(shop?: string): string {
  if (!shop) {
    throw new BadRequestException({
      message: "x-shop-domain header is required",
    });
  }
  return shop;
}

@Controller("api/projects")
export class ProjectsController {
  constructor(
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(PreviewEditService)
    private readonly previewEditService: PreviewEditService,
    @Inject(ApplyService)
    private readonly applyService: ApplyService,
  ) {}

  @Post("initiate")
  @HttpCode(202)
  initiate(@Body() body: unknown) {
    return this.projectsService.initiate(body);
  }

  @Get("status/:id")
  getStatus(
    @Param("id") id: string,
    @Headers("x-shop-domain") shop?: string,
  ) {
    return this.projectsService.getStatus(id, requireShop(shop));
  }

  @Get("events/:id")
  getEvents(
    @Param("id") id: string,
    @Headers("x-shop-domain") shop?: string,
  ) {
    return this.projectsService.getEvents(id, requireShop(shop));
  }

  @Get()
  listProjects(@Headers("x-shop-domain") shop?: string) {
    return this.projectsService.listProjects(requireShop(shop));
  }

  @Get("preview/:id/state")
  getPreviewState(
    @Param("id") id: string,
    @Headers("x-shop-domain") shop?: string,
  ) {
    return this.previewEditService.getPreviewState(id, requireShop(shop));
  }

  @Patch("preview/:id")
  patchPreview(
    @Param("id") id: string,
    @Headers("x-shop-domain") shop?: string,
    @Body() body?: unknown,
  ) {
    return this.previewEditService.patchPreviewState(id, requireShop(shop), body);
  }

  @Post("chat")
  @HttpCode(200)
  chat(
    @Headers("x-shop-domain") shop?: string,
    @Body() body?: unknown,
  ) {
    return this.previewEditService.handleChat(requireShop(shop), body);
  }

  @Post("apply")
  @HttpCode(200)
  apply(
    @Headers("x-shop-domain") shop?: string,
    @Body() body?: unknown,
  ) {
    return this.applyService.applyToLiveTheme(requireShop(shop), body);
  }

  @Post("version")
  @HttpCode(200)
  createVersion(
    @Headers("x-shop-domain") shop?: string,
    @Body() body?: unknown,
  ) {
    return this.applyService.createVersion(requireShop(shop), body);
  }

  @Post("rollback")
  @HttpCode(200)
  rollback(
    @Headers("x-shop-domain") shop?: string,
    @Body() body?: unknown,
  ) {
    return this.applyService.rollback(requireShop(shop), body);
  }

  @Get("versions/:id")
  listVersions(
    @Param("id") id: string,
    @Headers("x-shop-domain") shop?: string,
  ) {
    return this.applyService.listVersions(id, requireShop(shop));
  }

  @Post("provision-draft/:id")
  @HttpCode(200)
  provisionDraft(
    @Param("id") id: string,
    @Headers("x-shop-domain") shop?: string,
    @Body() body?: unknown,
  ) {
    const accessToken =
      typeof body === "object" &&
      body !== null &&
      "accessToken" in body &&
      typeof (body as { accessToken?: unknown }).accessToken === "string"
        ? (body as { accessToken: string }).accessToken
        : undefined;

    return this.projectsService.provisionDraftTheme(
      id,
      requireShop(shop),
      accessToken,
    );
  }

  @Get("preview/:id")
  getPreview(
    @Param("id") id: string,
    @Headers("x-shop-domain") shop?: string,
  ) {
    return this.projectsService.getPreview(id, requireShop(shop));
  }
}
