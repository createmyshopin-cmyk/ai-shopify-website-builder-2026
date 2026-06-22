/**
 * cache-keys.ts
 *
 * Typed key builders for all Redis cache keys used by the Platform Layer.
 * Key format: {namespace}:{scope}:{...identifiers}
 *
 * TTL constants are in seconds.
 */

export const TTL = {
  GENERATION_CONTEXT: 2 * 60 * 60,    // 2 hours
  COMPILED_THEME:     4 * 60 * 60,    // 4 hours
  PREVIEW_THEME:      30 * 60,        // 30 minutes
  CATALOG_VERSION:    24 * 60 * 60,   // 24 hours
  COPY_OUTPUT:        2 * 60 * 60,    // 2 hours
  ASSET_INTENT:       2 * 60 * 60,    // 2 hours
} as const;

export function generationContextKey(projectId: string, preset: string): string {
  return `gen:ctx:${projectId}:${preset}`;
}

export function compiledThemeKey(
  projectId: string,
  preset: string,
  catalogVersion: string,
): string {
  return `compiled:${projectId}:${preset}:${catalogVersion}`;
}

export function previewThemeKey(projectId: string, sessionToken: string): string {
  return `preview:${projectId}:${sessionToken}`;
}

export function catalogVersionKey(): string {
  return "catalog:version";
}

export function copyOutputKey(projectId: string, preset: string): string {
  return `copy:${projectId}:${preset}`;
}

export function assetIntentKey(projectId: string, sectionType: string): string {
  return `asset:${projectId}:${sectionType}`;
}

export function projectCachePattern(projectId: string): string {
  return `*:${projectId}:*`;
}
