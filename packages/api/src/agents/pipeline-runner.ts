import { prisma } from "@theme-editor/db";
import {
  AgentOutputsSchema,
  PIPELINE_JOB_ORDER,
  ThemeBlueprintSchema,
  progressMessageForStep,
  withRetry,
  type AgentOutputs,
  type AgentPipelineInput,
  type JobType,
  type ProjectProgressEvent,
} from "@theme-editor/shared";

import { runCompilerAgent } from "./compiler.agent.js";
import { runCopyAgent } from "./copy.agent.js";
import { runImageAgent } from "./image.agent.js";
import { runLayoutAgent } from "./layout.agent.js";
import { runValidationAgent } from "./validation.agent.js";
import { runVisionAgent } from "./vision.agent.js";
import { runUploadProcessor } from "../workers/upload.processor.js";
import type { ThemeCompilerService } from "../theme-compiler/theme-compiler.service.js";

export type ProgressPublisher = (
  event: ProjectProgressEvent,
) => Promise<void>;

const noopPublisher: ProgressPublisher = async () => {};

export class PipelineRunner {
  constructor(
    private readonly publish: ProgressPublisher = noopPublisher,
    private readonly themeCompilerService?: ThemeCompilerService,
  ) {}

  async executeFull(
    projectId: string,
    shop: string,
    products?: unknown[],
  ): Promise<{ status: string; validationPassed?: boolean }> {
    await prisma.designProject.update({
      where: { id: projectId },
      data: { status: "AGENTS_RUNNING" },
    });

    for (const step of PIPELINE_JOB_ORDER) {
      await this.executeStep(projectId, shop, step, products);
    }

    const project = await prisma.designProject.findUnique({
      where: { id: projectId },
    });

    const validationPassed =
      AgentOutputsSchema.partial()
        .parse(project?.agentOutputs ?? {})
        .validation?.passed === true;

    return {
      status: project?.status ?? "AGENTS_FAILED",
      validationPassed,
    };
  }

  async executeStep(
    projectId: string,
    shop: string,
    step: JobType,
    products?: unknown[],
  ): Promise<void> {
    const input = await this.loadPipelineInput(projectId, shop, products);
    const outputs = await this.loadOutputs(projectId);

    await this.publish({
      projectId,
      step,
      message: progressMessageForStep(step),
      status: "RUNNING",
      timestamp: new Date().toISOString(),
    });

    if (step === "UPLOAD") {
      const started = Date.now();
      await this.setJobStatus(projectId, step, "RUNNING");

      try {
        if (!outputs.compiler || !outputs.image) {
          throw new Error("Compiler and image outputs required for upload");
        }

        const project = await prisma.designProject.findUnique({
          where: { id: projectId },
        });

        const manifest = await withRetry(() =>
          runUploadProcessor({
            projectId,
            shop,
            draftThemeId: project?.draftThemeId ?? null,
            compiler: outputs.compiler!,
            image: outputs.image!,
          }),
        );

        await prisma.designProject.update({
          where: { id: projectId },
          data: {
            agentOutputs: AgentOutputsSchema.partial().parse({
              ...outputs,
              upload: manifest,
            }) as object,
          },
        });

        await prisma.projectJob.updateMany({
          where: { projectId, type: step },
          data: {
            status: "COMPLETE",
            duration: Date.now() - started,
            errors: null,
          },
        });

        await this.publish({
          projectId,
          step,
          message: progressMessageForStep(step),
          status: "COMPLETE",
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload worker failed";
        await prisma.projectJob.updateMany({
          where: { projectId, type: step },
          data: {
            status: "FAILED",
            duration: Date.now() - started,
            errors: message.slice(0, 2000),
          },
        });
        await this.publish({
          projectId,
          step,
          message: progressMessageForStep(step),
          status: "FAILED",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
      return;
    }

    const started = Date.now();
    await this.setJobStatus(projectId, step, "RUNNING");

    try {
      await withRetry(async () => {
        switch (step) {
          case "VISION": {
            outputs.vision = await runVisionAgent(input);
            await this.persistBrandMemory(projectId, shop, outputs.vision);
            break;
          }
          case "COPY": {
            if (!outputs.vision) throw new Error("Vision output required");
            // Load preset copy_intelligence from catalog so the LLM generates
            // a distinct copy personality for each preset (HC vs Fashion vs Minimal).
            const copyIntelligence = this.themeCompilerService
              ? await this.themeCompilerService.getPresetCopyIntelligence(input.stylePreset)
              : null;
            outputs.copy = await runCopyAgent(input, outputs.vision, copyIntelligence);
            break;
          }
          case "IMAGE": {
            if (!outputs.vision || !outputs.copy) {
              throw new Error("Vision and copy outputs required");
            }
            outputs.image = await runImageAgent(
              input,
              outputs.vision,
              outputs.copy,
            );
            await this.persistGeneratedAssets(projectId, outputs.image);
            break;
          }
          case "LAYOUT": {
            if (!outputs.vision) throw new Error("Vision output required");
            outputs.layout = await runLayoutAgent(input, outputs.vision);
            break;
          }
          case "COMPILER": {
            if (
              !outputs.vision ||
              !outputs.copy ||
              !outputs.layout ||
              !outputs.image
            ) {
              throw new Error("Prior agent outputs required for compiler");
            }
            // Pass ThemeCompilerService to activate the full intelligence path
            outputs.compiler = await runCompilerAgent(
              input,
              outputs.vision,
              outputs.copy,
              outputs.layout,
              outputs.image,
              this.themeCompilerService,
            );
            break;
          }
          case "VALIDATION": {
            if (!outputs.layout || !outputs.compiler) {
              throw new Error("Layout and compiler outputs required");
            }
            outputs.validation = runValidationAgent(
              input,
              outputs.layout,
              outputs.compiler,
              outputs,
            );
            break;
          }
          default:
            throw new Error(`Unknown pipeline step: ${step}`);
        }

        await this.saveOutputs(projectId, outputs);

        if (step === "VALIDATION") {
          const finalStatus = outputs.validation?.passed
            ? "AGENTS_COMPLETE"
            : "AGENTS_FAILED";
          await prisma.designProject.update({
            where: { id: projectId },
            data: { status: finalStatus },
          });
        }
      });

      await prisma.projectJob.updateMany({
        where: { projectId, type: step },
        data: {
          status: "COMPLETE",
          duration: Date.now() - started,
          errors: null,
        },
      });

      await this.publish({
        projectId,
        step,
        message: progressMessageForStep(step),
        status: "COMPLETE",
        timestamp: new Date().toISOString(),
      });

      if (step === "VALIDATION") {
        const validationPassed = outputs.validation?.passed === true;
        await this.publish({
          projectId,
          step: "PREVIEW_READY",
          message: progressMessageForStep("PREVIEW_READY"),
          status: validationPassed ? "COMPLETE" : "FAILED",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown agent error";

      await prisma.projectJob.updateMany({
        where: { projectId, type: step },
        data: {
          status: "FAILED",
          duration: Date.now() - started,
          errors: message.slice(0, 2000),
        },
      });

      await prisma.designProject.update({
        where: { id: projectId },
        data: { status: "AGENTS_FAILED" },
      });

      await this.publish({
        projectId,
        step,
        message: progressMessageForStep(step),
        status: "FAILED",
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  private async loadPipelineInput(
    projectId: string,
    shop: string,
    products?: unknown[],
  ): Promise<AgentPipelineInput> {
    const project = await prisma.designProject.findUnique({
      where: { id: projectId },
    });

    if (!project?.blueprint) {
      throw new Error("Blueprint required before running agents");
    }

    return {
      projectId,
      shop,
      productIds: project.productIds,
      stylePreset: project.stylePreset as AgentPipelineInput["stylePreset"],
      blueprint: ThemeBlueprintSchema.parse(project.blueprint),
      products,
    };
  }

  private async loadOutputs(projectId: string): Promise<AgentOutputs> {
    const project = await prisma.designProject.findUnique({
      where: { id: projectId },
    });
    return AgentOutputsSchema.partial().parse(project?.agentOutputs ?? {});
  }

  private async saveOutputs(
    projectId: string,
    outputs: AgentOutputs,
  ): Promise<void> {
    await prisma.designProject.update({
      where: { id: projectId },
      data: {
        agentOutputs: AgentOutputsSchema.partial().parse(outputs) as object,
      },
    });
  }

  private async setJobStatus(
    projectId: string,
    type: JobType,
    status: string,
  ): Promise<void> {
    await prisma.projectJob.updateMany({
      where: { projectId, type },
      data: { status },
    });
  }

  private async persistBrandMemory(
    projectId: string,
    shop: string,
    vision: NonNullable<AgentOutputs["vision"]>,
  ): Promise<void> {
    await prisma.brandMemory.deleteMany({ where: { projectId } });
    await prisma.brandMemory.create({
      data: {
        projectId,
        shop,
        colors: { primary: vision.primaryColors },
        tone: vision.tone,
        typography: {
          niche: vision.niche,
          targetAudience: vision.targetAudience,
        },
      },
    });
  }

  private async persistGeneratedAssets(
    projectId: string,
    image: NonNullable<AgentOutputs["image"]>,
  ): Promise<void> {
    await prisma.generatedAsset.deleteMany({ where: { projectId } });

    for (const asset of image.assets) {
      await prisma.generatedAsset.create({
        data: {
          projectId,
          originalUrl: null,
          generatedUrl: asset.placeholderUrl ?? null,
          cdnUrl: asset.placeholderUrl ?? null,
        },
      });
    }
  }
}

export function getNextPipelineStep(
  current: JobType,
): JobType | null {
  const index = PIPELINE_JOB_ORDER.indexOf(current);
  if (index < 0 || index >= PIPELINE_JOB_ORDER.length - 1) {
    return null;
  }
  return PIPELINE_JOB_ORDER[index + 1]!;
}
