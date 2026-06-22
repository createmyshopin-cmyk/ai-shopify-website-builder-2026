import type { SectionSchemaJson } from "./types.js";

const SCHEMA_REGEX = /\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/i;

export function extractSchemaJsonFromLiquid(
  liquidContent: string,
): SectionSchemaJson | null {
  const match = SCHEMA_REGEX.exec(liquidContent);
  if (!match?.[1]) {
    return null;
  }

  try {
    return JSON.parse(match[1].trim()) as SectionSchemaJson;
  } catch {
    return null;
  }
}

export function settingIdsFromSchema(
  schema: SectionSchemaJson | null,
): string[] {
  if (!schema?.settings) {
    return [];
  }

  return schema.settings
    .map((setting) => setting.id)
    .filter((id): id is string => Boolean(id));
}
