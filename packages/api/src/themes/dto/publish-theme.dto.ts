import { IsOptional, IsString } from "class-validator";

export class PublishThemeDto {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  versionId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class PublishThemeResponseDto {
  jobId!: string;
  projectId!: string;
}
