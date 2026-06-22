import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { prisma } from "@theme-editor/db";
import {
  JOB_TYPES,
  InitiateProjectRequestSchema,
  AgentOutputsSchema,
  ProjectPreviewResponseSchema,
  type InitiateProjectResponse,
  type ProjectEventsResponse,
  type ProjectListResponse,
  type ProjectPreviewResponse,
  type ProjectStatusResponse,
  type ThemeBlueprint,
  buildAdminThemeEditorUrl,
  buildStorefrontPreviewUrl,
} from "@theme-editor/shared";

import { BlueprintService } from "../blueprint/blueprint.service.js";
import { QueueService } from "../queue/queue.service.js";
import { RealtimeService } from "../realtime/realtime.service.js";
import { runUploadProcessor } from "../workers/upload.processor.js";

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(BlueprintService) private readonly blueprintService: BlueprintService,
    @Inject(QueueService) private readonly queueService: QueueService,
    @Inject(RealtimeService) private readonly realtime: RealtimeService,
  ) {}

  async initiate(body: unknown): Promise<InitiateProjectResponse> {
    const parsed = InitiateProjectRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        message: "Invalid initiate request",
        errors: parsed.error.flatten(),
      });
    }

    const { productIds, stylePreset, shop, accessToken } = parsed.data;

    const account = await prisma.userAccount.upsert({
      where: { shop },
      create: { shop },
      update: {},
    });

    const project = await prisma.designProject.create({
      data: {
        shop,
        merchantId: shop,
        productIds,
        stylePreset,
        status: "PENDING",
        userAccountId: account.id,
        jobs: {
          create: JOB_TYPES.map((type) => ({
            type,
            status: "PENDING",
          })),
        },
      },
      include: { jobs: true },
    });

    const { blueprint, draftThemeId } =
      await this.blueprintService.buildAndPersistForProject({
        projectId: project.id,
        shop,
        accessToken,
      });

    const enqueueResult = await this.queueService.enqueuePipeline(
      {
        projectId: project.id,
        shop,
      },
      { allowSyncFallback: false },
    );

    const blueprintMessage = draftThemeId
      ? `Blueprint built from base theme; draft theme ${draftThemeId}`
      : `Blueprint built from local base theme (${blueprint.sections.length} sections)`;

    const pipelineMessage =
      enqueueResult.mode === "queued"
        ? " Agent pipeline enqueued."
        : enqueueResult.mode === "pending"
          ? " Run pipeline when workers are ready."
          : "";

    return {
      projectId: project.id,
      status: "BLUEPRINT_READY",
      message: `${blueprintMessage}${pipelineMessage}`,
      draftThemeId,
      blueprintSectionCount: blueprint.sections.length,
      pipelineMode:
        enqueueResult.mode === "pending" ? undefined : enqueueResult.mode,
    };
  }

  async getStatus(
    projectId: string,
    shop: string,
  ): Promise<ProjectStatusResponse> {
    const project = await prisma.designProject.findUnique({
      where: { id: projectId },
      include: { jobs: { orderBy: { createdAt: "asc" } } },
    });

    if (!project) {
      throw new NotFoundException({ message: "Project not found" });
    }

    if (project.shop !== shop) {
      throw new ForbiddenException({ message: "Access denied" });
    }

    const latestEvent = await prisma.projectEvent.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return {
      projectId: project.id,
      status: project.status,
      jobs: project.jobs.map((job) => ({
        type: job.type,
        status: job.status,
      })),
      latestProgress: latestEvent
        ? {
            step: latestEvent.step,
            message: latestEvent.message,
            status: latestEvent.status,
          }
        : undefined,
    };
  }

  async getEvents(
    projectId: string,
    shop: string,
  ): Promise<ProjectEventsResponse> {
    const project = await prisma.designProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException({ message: "Project not found" });
    }

    if (project.shop !== shop) {
      throw new ForbiddenException({ message: "Access denied" });
    }

    const events = await this.realtime.listEvents(projectId);

    return {
      projectId,
      events: events.map((event) => ({
        id: event.id,
        step: event.step,
        message: event.message,
        status: event.status,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }

  async getPreview(
    projectId: string,
    shop: string,
  ): Promise<ProjectPreviewResponse> {
    const project = await prisma.designProject.findUnique({
      where: { id: projectId },
      include: { jobs: true },
    });

    if (!project) {
      throw new NotFoundException({ message: "Project not found" });
    }

    if (project.shop !== shop) {
      throw new ForbiddenException({ message: "Access denied" });
    }

    const validationJob = project.jobs.find((j) => j.type === "VALIDATION");
    const blueprint = project.blueprint as ThemeBlueprint | null;
    const outputs = AgentOutputsSchema.partial().parse(project.agentOutputs ?? {});
    const validationPassed = outputs.validation?.passed === true;
    const validationComplete =
      project.status === "AGENTS_COMPLETE" &&
      validationJob?.status === "COMPLETE";
    const ready = validationComplete && validationPassed;

    // Compiler output is the authoritative section order source of truth.
    // Fall back to layout.sectionOrder only when compilation has not yet run.
    const sectionTypes = outputs.compiler
      ? outputs.compiler.indexJson.order
          .map(
            (id) =>
              (outputs.compiler!.indexJson.sections[id] as { type?: string })
                ?.type ?? "",
          )
          .filter(Boolean)
      : (outputs.layout?.sectionOrder ?? []);

    const draftThemeId = project.draftThemeId;
    const previewUrl =
      ready && draftThemeId
        ? buildStorefrontPreviewUrl(shop, draftThemeId)
        : null;
    const adminEditorUrl =
      ready && draftThemeId
        ? buildAdminThemeEditorUrl(shop, draftThemeId, "/")
        : null;

    // Determine preview mode:
    //   "storefront" — draft theme uploaded and storefront URL available
    //   "mock"       — pipeline ran in mock mode (MOCK_AI / MOCK_SHOPIFY_UPLOAD)
    //   "editor"     — real upload but no storefront URL yet
    const isMock =
      process.env.MOCK_AI === "true" ||
      process.env.MOCK_SHOPIFY_UPLOAD === "true" ||
      outputs.upload?.mode === "mock";
    const previewMode = previewUrl
      ? "storefront"
      : isMock && ready
        ? "mock"
        : "editor";

    return ProjectPreviewResponseSchema.parse({
      projectId: project.id,
      ready,
      draftThemeId,
      previewUrl,
      adminEditorUrl,
      blueprintSectionCount: blueprint?.sections?.length ?? 0,
      previewMode,
      message: ready
        ? previewUrl
          ? "Preview ready — open draft theme homepage"
          : "Preview ready — editor loaded (draft theme not provisioned)"
        : validationComplete && !validationPassed
          ? "Validation failed — preview blocked until issues are resolved"
          : "Preview not ready — pipeline running or pending",
      metadata: {
        stylePreset: project.stylePreset,
        headline: outputs.copy?.headline,
        sectionTypes: sectionTypes.filter(Boolean),
        validationPassed,
        productCount: project.productIds.length,
      },
    });
  }

  async provisionDraftTheme(
    projectId: string,
    shop: string,
    accessToken?: string,
  ): Promise<ProjectPreviewResponse> {
    const project = await prisma.designProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException({ message: "Project not found" });
    }

    if (project.shop !== shop) {
      throw new ForbiddenException({ message: "Access denied" });
    }

    if (!project.draftThemeId) {
      const provisioned = await this.blueprintService.provisionDraftThemeForShop({
        projectId,
        shop,
        accessToken,
      });

      if (!provisioned.draftThemeId) {
        throw new BadRequestException({
          message:
            provisioned.error ??
            "Draft theme could not be created. Request Theme API exemption from Shopify.",
        });
      }
    }

    const refreshed = await prisma.designProject.findUnique({
      where: { id: projectId },
    });
    const draftThemeId = refreshed?.draftThemeId ?? null;

    const outputs = AgentOutputsSchema.partial().parse(project.agentOutputs ?? {});
    if (outputs.compiler && outputs.image && draftThemeId) {
      try {
        const manifest = await runUploadProcessor({
          projectId,
          shop,
          draftThemeId,
          compiler: outputs.compiler,
          image: outputs.image,
        });

        await prisma.designProject.update({
          where: { id: projectId },
          data: {
            agentOutputs: AgentOutputsSchema.partial().parse({
              ...outputs,
              upload: manifest,
            }) as object,
          },
        });
      } catch (error) {
        console.warn(
          "[ProjectsService] Theme file upload failed after draft provision:",
          error instanceof Error ? error.message : error,
        );
      }
    }

    return this.getPreview(projectId, shop);
  }

  async listProjects(shop: string): Promise<ProjectListResponse> {
    const projects = await prisma.designProject.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { jobs: true },
    });

    return {
      shop,
      projects: projects.map((project) => {
        const validationJob = project.jobs.find((j) => j.type === "VALIDATION");
        const outputs = AgentOutputsSchema.partial().parse(
          project.agentOutputs ?? {},
        );
        const validationPassed = outputs.validation?.passed === true;
        const ready =
          project.status === "AGENTS_COMPLETE" &&
          validationJob?.status === "COMPLETE" &&
          validationPassed;

        return {
          projectId: project.id,
          status: project.status,
          stylePreset: project.stylePreset,
          productCount: project.productIds.length,
          draftThemeId: project.draftThemeId,
          ready,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
        };
      }),
    };
  }
}
