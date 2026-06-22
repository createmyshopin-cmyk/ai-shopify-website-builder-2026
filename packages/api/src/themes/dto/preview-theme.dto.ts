import { IsObject, IsOptional, IsString } from "class-validator";

export class PreviewThemeDto {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsObject()
  previewState?: Record<string, unknown>;
}

export class PreviewThemeResponseDto {
  jobId!: string;
  sessionToken!: string;
  expiresAt!: string;
}
