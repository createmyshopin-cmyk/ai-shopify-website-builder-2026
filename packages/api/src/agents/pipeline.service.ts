import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { prisma } from "@theme-editor/db";
import {
  AgentOutputsSchema,
  RunPipelineRequestSchema,
  ThemeBlueprintSchema,
  type RunPipelineResponse,
} from "@theme-editor/shared";

import { QueueService } from "../queue/queue.service.js";

@Injectable()
export class AgentPipelineService {
  constructor(
    @Inject(QueueService) private readonly queueService: QueueService,
  ) {}

  async runPipeline(
    projectId: string,
    body: unknown,
  ): Promise<RunPipelineResponse> {
    const parsed = RunPipelineRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ message: "Invalid run pipeline request" });
    }

    const { shop, products } = parsed.data;

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

    if (!project.blueprint) {
      throw new ForbiddenException({
        message: "Blueprint required before running agents",
      });
    }

    ThemeBlueprintSchema.parse(project.blueprint);

    const enqueueResult = await this.queueService.enqueuePipeline({
      projectId,
      shop,
      products,
    });

    if (enqueueResult.mode === "sync") {
      // Pipeline ran synchronously (no Redis). Fetch the final DB state so the
      // HTTP response includes completed job list and validation result.
      const finalProject = await prisma.designProject.findUnique({
        where: { id: projectId },
        include: { jobs: { orderBy: { createdAt: "asc" } } },
      });

      const validationPassed =
        enqueueResult.validationPassed ??
        AgentOutputsSchema.partial()
          .parse(finalProject?.agentOutputs ?? {})
          .validation?.passed === true;

      return {
        projectId,
        status: finalProject?.status ?? enqueueResult.status ?? "AGENTS_FAILED",
        mode: "sync",
        message:
          enqueueResult.message ??
          "Agent pipeline completed — preview is ready.",
        jobs:
          finalProject?.jobs.map((j) => ({
            type: j.type,
            status: j.status,
          })) ?? [],
        validationPassed,
      };
    }

    return {
      projectId,
      status: enqueueResult.status ?? "AGENTS_RUNNING",
      mode: "queued",
      message: enqueueResult.message,
    };
  }
}
