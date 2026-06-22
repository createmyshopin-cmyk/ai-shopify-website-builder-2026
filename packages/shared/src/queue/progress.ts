import { z } from "zod";

export const ProjectProgressEventSchema = z.object({
  projectId: z.string().uuid(),
  step: z.string(),
  message: z.string(),
  status: z.enum(["RUNNING", "COMPLETE", "FAILED", "SKIPPED"]),
  timestamp: z.string().datetime().optional(),
});

export type ProjectProgressEvent = z.infer<typeof ProjectProgressEventSchema>;

export const EnqueuePipelineResponseSchema = z.object({
  projectId: z.string().uuid(),
  mode: z.enum(["queued", "sync", "pending"]),
  status: z.string().optional(),
  message: z.string().optional(),
  validationPassed: z.boolean().optional(),
});

export type EnqueuePipelineResponse = z.infer<
  typeof EnqueuePipelineResponseSchema
>;
