import { IsOptional, IsString } from "class-validator";

export class RollbackThemeDto {
  @IsString()
  projectId!: string;

  @IsString()
  versionId!: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class RollbackThemeResponseDto {
  jobId!: string;
  projectId!: string;
}
