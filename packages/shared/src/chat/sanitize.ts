const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /\{%/, code: "liquid_tag" },
  { pattern: /\{\{/, code: "liquid_output" },
  { pattern: /%\}/, code: "liquid_close" },
  { pattern: /\}\}/, code: "liquid_close" },
  { pattern: /\.liquid\b/i, code: "liquid_file" },
  { pattern: /\.\.\//, code: "path_traversal" },
  { pattern: /sections\//i, code: "theme_path" },
  { pattern: /templates\//i, code: "theme_path" },
  { pattern: /snippets\//i, code: "theme_path" },
  { pattern: /layout\//i, code: "theme_path" },
  { pattern: /<script\b/i, code: "script_tag" },
  { pattern: /javascript:/i, code: "javascript_uri" },
  { pattern: /on\w+\s*=/i, code: "html_event" },
  { pattern: /<\/?[a-z][\s\S]*>/i, code: "html_markup" },
];

export type SanitizeResult =
  | { ok: true; message: string }
  | { ok: false; code: string; reason: string };

export function sanitizeChatMessage(raw: string): SanitizeResult {
  const message = raw.trim().replace(/\s+/g, " ");

  if (!message) {
    return { ok: false, code: "empty", reason: "Message cannot be empty" };
  }

  if (message.length > 2000) {
    return { ok: false, code: "too_long", reason: "Message exceeds 2000 characters" };
  }

  for (const { pattern, code } of DANGEROUS_PATTERNS) {
    if (pattern.test(message)) {
      return {
        ok: false,
        code,
        reason: "Message contains disallowed theme or markup syntax",
      };
    }
  }

  return { ok: true, message };
}

const SAFE_SETTING_VALUE = /^[\w\s.,!?#'"()\-–—:;/&%+@$]*$/u;

export function sanitizePatchSettings(
  settings: Record<string, unknown>,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(settings)) {
    if (!/^[a-z][a-z0-9_]*$/i.test(key)) {
      continue;
    }

    if (typeof value === "string") {
      if (!SAFE_SETTING_VALUE.test(value) || value.length > 500) {
        continue;
      }
      safe[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      safe[key] = value;
    } else if (typeof value === "boolean") {
      safe[key] = value;
    }
  }

  return safe;
}

export function assertPatchesSafe(
  patches: Array<{ op: string; settings?: Record<string, unknown> }>,
): void {
  for (const patch of patches) {
    if (patch.op === "updateSection" && patch.settings) {
      const sanitized = sanitizePatchSettings(patch.settings);
      if (Object.keys(sanitized).length === 0 && Object.keys(patch.settings).length > 0) {
        throw new Error("Patch settings contained unsafe values");
      }
      patch.settings = sanitized;
    }
  }
}
