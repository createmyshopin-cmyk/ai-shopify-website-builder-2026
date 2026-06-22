// ─── Theme Compiler Error Types ───────────────────────────────────────────────

export type CompilerErrorCode =
  | "INVALID_SECTION_TYPE"
  | "INVALID_BLOCK_SCHEMA"
  | "INVALID_SETTINGS_SCHEMA"
  | "INVALID_SECTION_ORDER"
  | "PRESET_INCOMPATIBLE_SECTION"
  | "UNSUPPORTED_VARIANT"
  | "MISSING_TOKEN_REF"
  | "DUPLICATE_SECTION_ID"
  | "INVALID_IMAGE_SETTING"
  | "BLOCK_LIMIT_EXCEEDED"
  | "MISSING_REQUIRED_FIELD"
  | "INVALID_OS20_STRUCTURE"
  | "INSUFFICIENT_SECTIONS"
  | "SECTION_COUNT_EXCEEDED"
  | "UNKNOWN_PRESET"
  | "CATALOG_NOT_FOUND";

export interface CompilerErrorDetail {
  code: CompilerErrorCode;
  message: string;
  field?: string;
  sectionId?: string;
  sectionType?: string;
  severity: "error" | "warning";
}

export class CompilerError extends Error {
  constructor(
    public readonly details: CompilerErrorDetail[],
    message?: string,
  ) {
    super(message ?? details.map((d) => `[${d.code}] ${d.message}`).join("; "));
    this.name = "CompilerError";
  }

  get errorDetails(): CompilerErrorDetail[] {
    return this.details.filter((d) => d.severity === "error");
  }

  get warningDetails(): CompilerErrorDetail[] {
    return this.details.filter((d) => d.severity === "warning");
  }

  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      details: this.details,
    };
  }
}

export function compilerError(
  code: CompilerErrorCode,
  message: string,
  opts?: { field?: string; sectionId?: string; sectionType?: string },
): CompilerError {
  return new CompilerError([
    {
      code,
      message,
      severity: "error",
      ...opts,
    },
  ]);
}

// ─── MissingSectionCatalogError ───────────────────────────────────────────────
// Thrown when a section type required by the pipeline has no catalog entry.
// This means the catalog was not generated from base-theme-truth.json or
// the section was referenced using an invented/phantom handle.
export class MissingSectionCatalogError extends Error {
  public readonly sectionType: string;

  constructor(sectionType: string) {
    super(
      `Section catalog not found for type "${sectionType}". ` +
      `Every section type must have a corresponding catalog entry derived from base-theme-truth.json. ` +
      `Run 'npm run generate:intelligence' to regenerate catalogs.`,
    );
    this.name = "MissingSectionCatalogError";
    this.sectionType = sectionType;
  }
}
