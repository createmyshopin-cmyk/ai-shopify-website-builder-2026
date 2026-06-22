import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { prisma } from "@theme-editor/db";
import {
  AgentOutputsSchema,
  ChatRequestSchema,
  ChatResponseSchema,
  PreviewPatchRequestSchema,
  PreviewPatchResponseSchema,
  PreviewStateResponseSchema,
  applyPreviewPatch,
  buildPreviewStateFromOutputs,
  disabledSectionIdsFromState,
  layoutSectionOrderFromState,
  previewStateToCompilerOutput,
  resolveChatIntent,
  sanitizeChatMessage,
  type ChatMessage,
  type ChatResponse,
  type AgentOutputs,
  type PreviewPatch,
  type PreviewState,
  type PreviewStateResponse,
  type ThemeBlueprint,
} from "@theme-editor/shared";

import { completeJson } from "../agents/openrouter.client.js";
import { runUploadProcessor } from "../workers/upload.processor.js";

interface EditableProject {
  project: {
    id: string;
    shop: string;
    draftThemeId: string | null;
    agentOutputs: unknown;
  };
  outputs: Partial<AgentOutputs>;
  blueprint: ThemeBlueprint;
}

@Injectable()
export class PreviewEditService {
  async loadEditableProject(
    projectId: string,
    shop: string,
  ): Promise<EditableProject> {
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
    const editable =
      project.status === "AGENTS_COMPLETE" &&
      validationJob?.status === "COMPLETE" &&
      validationPassed &&
      Boolean(outputs.compiler);

    if (!editable) {
      throw new BadRequestException({
        message: "Preview editing is only available after validation passes",
      });
    }

    const blueprint = project.blueprint as ThemeBlueprint | null;
    if (!blueprint) {
      throw new BadRequestException({ message: "Project blueprint missing" });
    }

    return { project, outputs, blueprint };
  }

  buildStateFromProject(editable: EditableProject): PreviewState {
    return buildPreviewStateFromOutputs(
      editable.project.id,
      editable.blueprint,
      editable.outputs,
      editable.outputs.previewEditor?.disabledSectionIds ?? [],
    );
  }

  async getPreviewState(
    projectId: string,
    shop: string,
  ): Promise<PreviewStateResponse> {
    const editable = await this.loadEditableProject(projectId, shop);
    const state = this.buildStateFromProject(editable);

    return PreviewStateResponseSchema.parse({
      projectId: editable.project.id,
      editable: true,
      state,
    });
  }

  private compilerFromState(state: PreviewState) {
    const compiler = previewStateToCompilerOutput(state);
    const fullSections = { ...compiler.indexJson.sections };
    for (const section of state.sections) {
      fullSections[section.id] = {
        type: section.type,
        settings: section.settings,
      };
    }
    return {
      ...compiler,
      indexJson: {
        sections: fullSections,
        order: compiler.indexJson.order,
      },
    };
  }

  async persistPreviewState(
    editable: EditableProject,
    next: PreviewState,
    options?: { chatHistory?: ChatMessage[] },
  ) {
    const compilerWithDisabled = this.compilerFromState(next);
    const chatHistory =
      options?.chatHistory ?? editable.outputs.previewEditor?.chatHistory ?? [];

    const updatedOutputs = AgentOutputsSchema.partial().parse({
      ...editable.outputs,
      compiler: compilerWithDisabled,
      layout: editable.outputs.layout
        ? {
            ...editable.outputs.layout,
            sectionOrder: layoutSectionOrderFromState(next),
          }
        : undefined,
      previewEditor: {
        disabledSectionIds: disabledSectionIdsFromState(next),
        sectionOrder: next.order,
        chatHistory,
      },
    });

    await prisma.designProject.update({
      where: { id: editable.project.id },
      data: { agentOutputs: updatedOutputs as object },
    });

    let uploaded = false;
    if (
      editable.project.draftThemeId &&
      updatedOutputs.compiler &&
      updatedOutputs.image
    ) {
      await runUploadProcessor({
        projectId: editable.project.id,
        shop: editable.project.shop,
        draftThemeId: editable.project.draftThemeId,
        compiler: updatedOutputs.compiler,
        image: updatedOutputs.image,
      });
      uploaded = true;
    }

    return { updatedOutputs, uploaded };
  }

  async applyPreviewPatches(
    projectId: string,
    shop: string,
    patches: PreviewPatch[],
    options?: { chatHistory?: ChatMessage[] },
  ) {
    const editable = await this.loadEditableProject(projectId, shop);
    let next = this.buildStateFromProject(editable);

    for (const patch of patches) {
      next = applyPreviewPatch(next, patch, editable.blueprint);
    }

    const { uploaded } = await this.persistPreviewState(editable, next, options);

    return PreviewPatchResponseSchema.parse({
      projectId: editable.project.id,
      state: next,
      uploaded,
    });
  }

  async patchPreviewState(projectId: string, shop: string, body: unknown) {
    const parsed = PreviewPatchRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: "Invalid preview patch",
        errors: parsed.error.flatten(),
      });
    }

    return this.applyPreviewPatches(projectId, shop, [parsed.data.patch]);
  }

  async handleChat(shop: string, body: unknown): Promise<ChatResponse> {
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: "Invalid chat request",
        errors: parsed.error.flatten(),
      });
    }

    const sanitized = sanitizeChatMessage(parsed.data.message);
    if (!sanitized.ok) {
      throw new BadRequestException({
        message: sanitized.reason,
        code: sanitized.code,
      });
    }

    const editable = await this.loadEditableProject(parsed.data.projectId, shop);
    const state = this.buildStateFromProject(editable);

    const useMockAi = process.env.MOCK_AI === "true";
    const intent = await resolveChatIntent(
      {
        message: sanitized.message,
        state,
        blueprint: editable.blueprint,
      },
      useMockAi
        ? { useMock: true }
        : { useMock: false, completeJson },
    );

    const now = new Date().toISOString();
    const priorHistory = editable.outputs.previewEditor?.chatHistory ?? [];
    const userEntry: ChatMessage = {
      role: "user",
      content: sanitized.message,
      createdAt: now,
    };

    if (intent.patches.length === 0) {
      const assistantEntry: ChatMessage = {
        role: "assistant",
        content: intent.reply,
        createdAt: new Date().toISOString(),
        patchCount: 0,
      };
      const history = [...priorHistory, userEntry, assistantEntry].slice(-100);

      await prisma.designProject.update({
        where: { id: editable.project.id },
        data: {
          agentOutputs: AgentOutputsSchema.partial().parse({
            ...editable.outputs,
            previewEditor: {
              ...editable.outputs.previewEditor,
              chatHistory: history,
            },
          }) as object,
        },
      });

      return ChatResponseSchema.parse({
        projectId: editable.project.id,
        reply: intent.reply,
        state,
        patchesApplied: [],
        uploaded: false,
        history,
      });
    }

    const assistantEntry: ChatMessage = {
      role: "assistant",
      content: intent.reply,
      createdAt: new Date().toISOString(),
      patchCount: intent.patches.length,
    };
    const history = [...priorHistory, userEntry, assistantEntry].slice(-100);

    const patchResult = await this.applyPreviewPatches(
      parsed.data.projectId,
      shop,
      intent.patches,
      { chatHistory: history },
    );

    return ChatResponseSchema.parse({
      projectId: patchResult.projectId,
      reply: intent.reply,
      state: patchResult.state,
      patchesApplied: intent.patches,
      uploaded: patchResult.uploaded,
      history,
    });
  }
}
