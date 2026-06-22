import { z } from "zod";

import { PreviewPatchSchema, PreviewStateSchema } from "../preview/types.js";

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.string().datetime(),
  patchCount: z.number().int().min(0).optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  projectId: z.string().uuid(),
  message: z.string().min(1).max(2000),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  projectId: z.string().uuid(),
  reply: z.string(),
  state: PreviewStateSchema,
  patchesApplied: z.array(PreviewPatchSchema),
  uploaded: z.boolean(),
  history: z.array(ChatMessageSchema),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const ChatIntentLlmSchema = z.object({
  reply: z.string().min(1).max(500),
  patches: z.array(PreviewPatchSchema).max(5),
});

export type ChatIntentLlm = z.infer<typeof ChatIntentLlmSchema>;
