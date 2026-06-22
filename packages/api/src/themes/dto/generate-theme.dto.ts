import { IsArray, IsEnum, IsOptional, IsString, ArrayMinSize } from "class-validator";

const VALID_PRESETS = ["high-converting", "fashion", "minimal-modern"] as const;
type StylePreset = (typeof VALID_PRESETS)[number];

export class GenerateThemeDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  productIds!: string[];

  @IsEnum(VALID_PRESETS)
  stylePreset!: StylePreset;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class GenerateThemeResponseDto {
  jobId!: string;
  projectId!: string;
  mode!: string;
}
