import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { prisma } from "@theme-editor/db";
import {
  AgentOutputsSchema,
  ApplyProjectRequestSchema,
  ApplyProjectResponseSchema,
  CreateVersionRequestSchema,
  CreateVersionResponseSchema,
  LiveThemeMetaSchema,
  RollbackRequestSchema,
  RollbackResponseSchema,
  ShopifyThemeClient,
  ThemeSnapshotSchema,
  VersionListResponseSchema,
  buildSnapshotFromCompiler,
  buildSnapshotFromPreviewState,
  compilerToThemeFiles,
  parseSnapshotFromThemeFiles,
  previewStateToCompilerOutput,
  type AgentOutputs,
  type ThemeBlueprint,
  type ThemeSnapshot,
} from "@theme-editor/shared";

import { PreviewEditService } from "./preview-edit.service.js";
import { resolveShopAccessToken } from "../common/shopify-session.js";

const LIVE_FILES = ["templates/index.json", "config/settings_data.json"];
const ROLLBACK_TIMEOUT_MS = 60_000;

function isMockApplyMode(): boolean {
  return (
    process.env.MOCK_SHOPIFY_UPLOAD === "true" ||
    process.env.MOCK_AI === "true"
  );
}

@Injectable()
export class ApplyService {
  constructor(private readonly previewEdit = new PreviewEditService()) {}

  private async loadApplyableProject(projectId: string, shop: string) {
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

    const validationJob = project.jobs.find((job) => job.type === "VALIDATION");
    const outputs = AgentOutputsSchema.partial().parse(project.agentOutputs ?? {});
    const validationPassed = outputs.validation?.passed === true;
    const applyable =
      (project.status === "AGENTS_COMPLETE" || project.status === "APPLIED") &&
      validationJob?.status === "COMPLETE" &&
      validationPassed &&
      Boolean(outputs.compiler);

    if (!applyable) {
      throw new BadRequestException({
        message: "Apply is only available after validation passes",
      });
    }

    const blueprint = project.blueprint as ThemeBlueprint | null;
    if (!blueprint) {
      throw new BadRequestException({ message: "Project blueprint missing" });
    }

    return { project, outputs, blueprint };
  }

  private async nextVersionNumber(projectId: string): Promise<number> {
    const latest = await prisma.themeVersion.findFirst({
      where: { projectId },
      orderBy: { versionNumber: "desc" },
    });
    return (latest?.versionNumber ?? 0) + 1;
  }

  private async resolveLiveSnapshot(
    shop: string,
    themeId: string | null,
    outputs: Partial<AgentOutputs>,
    mockMode: boolean,
  ): Promise<ThemeSnapshot | null> {
    if (outputs.liveTheme?.compiler) {
      return buildSnapshotFromCompiler(outputs.liveTheme.compiler, {
        themeId: outputs.liveTheme.themeId ?? themeId,
        source: "live",
      });
    }

    if (mockMode || !themeId) {
      return null;
    }

    const accessToken = await resolveShopAccessToken(shop);
    if (!accessToken) {
      return null;
    }

    const client = new ShopifyThemeClient({ shop, accessToken });
    const files = await client.readThemeFiles(themeId, LIVE_FILES);
    return parseSnapshotFromThemeFiles(themeId, files, "live");
  }

  private async pushSnapshotToTheme(
    shop: string,
    themeId: string,
    snapshot: ThemeSnapshot,
    mockMode: boolean,
  ): Promise<"mock" | "shopify"> {
    const files = compilerToThemeFiles(snapshot.compiler);

    if (mockMode) {
      return "mock";
    }

    const accessToken = await resolveShopAccessToken(shop);
    if (!accessToken) {
      return "mock";
    }

    const client = new ShopifyThemeClient({ shop, accessToken });
    await client.uploadThemeFiles(themeId, files);
    return "shopify";
  }

  async listVersions(projectId: string, shop: string) {
    const project = await prisma.designProject.findUnique({
      where: { id: projectId },
      include: { versions: { orderBy: { versionNumber: "desc" } } },
    });

    if (!project) {
      throw new NotFoundException({ message: "Project not found" });
    }

    if (project.shop !== shop) {
      throw new ForbiddenException({ message: "Access denied" });
    }

    return VersionListResponseSchema.parse({
      projectId,
      versions: project.versions.map((version) => {
        const snapshot = ThemeSnapshotSchema.safeParse(version.snapshot);
        return {
          versionNumber: version.versionNumber,
          createdAt: version.createdAt.toISOString(),
          createdBy: version.createdBy,
          label: snapshot.success ? snapshot.data.label : undefined,
        };
      }),
    });
  }

  async applyToLiveTheme(shop: string, body: unknown) {
    const parsed = ApplyProjectRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: "Invalid apply request",
        errors: parsed.error.flatten(),
      });
    }

    const editable = await this.loadApplyableProject(
      parsed.data.projectId,
      shop,
    );
    const previewState = this.previewEdit.buildStateFromProject({
      project: editable.project,
      outputs: editable.outputs,
      blueprint: editable.blueprint,
    });
    const targetSnapshot = buildSnapshotFromPreviewState(
      previewState,
      editable.outputs.liveTheme?.themeId ?? null,
    );

    const mockMode = isMockApplyMode();
    let themeId = editable.outputs.liveTheme?.themeId ?? null;

    if (!themeId && !mockMode) {
      const accessToken = await resolveShopAccessToken(shop);
      if (accessToken) {
        const client = new ShopifyThemeClient({ shop, accessToken });
        themeId = await client.resolveMainThemeId();
      }
    }

    if (!themeId && !mockMode) {
      throw new BadRequestException({
        message: "No live theme available to apply changes",
      });
    }

    const backupSnapshot =
      (await this.resolveLiveSnapshot(
        shop,
        themeId,
        editable.outputs,
        mockMode,
      )) ??
      buildSnapshotFromCompiler(
        previewStateToCompilerOutput(previewState),
        { themeId, source: "backup" },
      );

    const backup = await prisma.themeBackup.create({
      data: {
        projectId: editable.project.id,
        snapshot: backupSnapshot as object,
      },
    });

    const started = Date.now();

    try {
      const mode = themeId
        ? await this.pushSnapshotToTheme(
            shop,
            themeId,
            { ...targetSnapshot, themeId },
            mockMode,
          )
        : "mock";

      const versionNumber = await this.nextVersionNumber(editable.project.id);
      await prisma.themeVersion.create({
        data: {
          projectId: editable.project.id,
          versionNumber,
          snapshot: targetSnapshot as object,
          createdBy: shop,
        },
      });

      const liveTheme = LiveThemeMetaSchema.parse({
        themeId,
        compiler: targetSnapshot.compiler,
        lastAppliedAt: new Date().toISOString(),
      });

      const updatedOutputs = AgentOutputsSchema.partial().parse({
        ...editable.outputs,
        liveTheme,
        approval: {
          approvedAt: new Date().toISOString(),
          approvedBy: shop,
        },
      });

      await prisma.designProject.update({
        where: { id: editable.project.id },
        data: {
          status: "APPLIED",
          agentOutputs: updatedOutputs as object,
        },
      });

      return ApplyProjectResponseSchema.parse({
        projectId: editable.project.id,
        status: "APPLIED",
        versionNumber,
        backupId: backup.id,
        themeId,
        mode,
        message:
          mode === "shopify"
            ? "Preview applied to your live theme"
            : "Preview applied (mock mode — live theme unchanged)",
      });
    } catch (error) {
      if (themeId && Date.now() - started < ROLLBACK_TIMEOUT_MS) {
        try {
          await this.pushSnapshotToTheme(shop, themeId, backupSnapshot, mockMode);
        } catch (rollbackError) {
          throw new InternalServerErrorException({
            message: "Apply failed and automatic rollback also failed",
            applyError: error instanceof Error ? error.message : String(error),
            rollbackError:
              rollbackError instanceof Error
                ? rollbackError.message
                : String(rollbackError),
          });
        }
      }

      throw new InternalServerErrorException({
        message: "Apply failed — previous live theme restored from backup",
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async createVersion(shop: string, body: unknown) {
    const parsed = CreateVersionRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: "Invalid version request",
        errors: parsed.error.flatten(),
      });
    }

    const editable = await this.loadApplyableProject(
      parsed.data.projectId,
      shop,
    );
    const previewState = this.previewEdit.buildStateFromProject({
      project: editable.project,
      outputs: editable.outputs,
      blueprint: editable.blueprint,
    });
    const snapshot = buildSnapshotFromPreviewState(
      previewState,
      editable.outputs.liveTheme?.themeId ?? null,
    );

    const versionNumber = await this.nextVersionNumber(editable.project.id);
    const versionSnapshot = {
      ...snapshot,
      label: parsed.data.label,
    };

    await prisma.themeVersion.create({
      data: {
        projectId: editable.project.id,
        versionNumber,
        snapshot: versionSnapshot as object,
        createdBy: shop,
      },
    });

    return CreateVersionResponseSchema.parse({
      projectId: editable.project.id,
      versionNumber,
      snapshot: ThemeSnapshotSchema.parse(versionSnapshot),
    });
  }

  async rollback(shop: string, body: unknown) {
    const parsed = RollbackRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: "Invalid rollback request",
        errors: parsed.error.flatten(),
      });
    }

    const project = await prisma.designProject.findUnique({
      where: { id: parsed.data.projectId },
      include: {
        versions: { orderBy: { versionNumber: "desc" } },
        backups: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!project) {
      throw new NotFoundException({ message: "Project not found" });
    }

    if (project.shop !== shop) {
      throw new ForbiddenException({ message: "Access denied" });
    }

    const outputs = AgentOutputsSchema.partial().parse(project.agentOutputs ?? {});
    const mockMode = isMockApplyMode();
    const themeId = outputs.liveTheme?.themeId ?? null;

    let snapshot: ThemeSnapshot | null = null;
    let restoredVersion: number | null = null;

    if (parsed.data.versionNumber) {
      const version = project.versions.find(
        (entry) => entry.versionNumber === parsed.data.versionNumber,
      );
      if (!version) {
        throw new NotFoundException({ message: "Version not found" });
      }
      snapshot = ThemeSnapshotSchema.parse(version.snapshot);
      restoredVersion = version.versionNumber;
    } else if (project.versions.length >= 2) {
      const previous = project.versions[1];
      snapshot = ThemeSnapshotSchema.parse(previous.snapshot);
      restoredVersion = previous.versionNumber;
    } else if (project.backups[0]) {
      snapshot = ThemeSnapshotSchema.parse(project.backups[0].snapshot);
    }

    if (!snapshot) {
      throw new BadRequestException({
        message: "No version or backup available to rollback",
      });
    }

    const effectiveThemeId = themeId ?? snapshot.themeId;
    if (!effectiveThemeId && !mockMode) {
      throw new BadRequestException({
        message: "No live theme id available for rollback",
      });
    }

    const mode =
      effectiveThemeId && !mockMode
        ? await this.pushSnapshotToTheme(
            shop,
            effectiveThemeId,
            snapshot,
            mockMode,
          )
        : "mock";

    const liveTheme = LiveThemeMetaSchema.parse({
      themeId: effectiveThemeId,
      compiler: snapshot.compiler,
      lastAppliedAt: new Date().toISOString(),
    });

    await prisma.designProject.update({
      where: { id: project.id },
      data: {
        agentOutputs: AgentOutputsSchema.partial().parse({
          ...outputs,
          liveTheme,
        }) as object,
      },
    });

    return RollbackResponseSchema.parse({
      projectId: project.id,
      restoredVersion,
      backupId: project.backups[0]?.id,
      themeId: effectiveThemeId,
      mode,
      message:
        restoredVersion !== null
          ? `Rolled back to version ${restoredVersion}`
          : "Rolled back to pre-apply backup",
    });
  }
}
