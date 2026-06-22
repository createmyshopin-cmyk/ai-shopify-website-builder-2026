import { inferSettingRole, shouldIncludeSetting } from "./infer-roles.js";
import type { SettingDef, ShopifySettingJson } from "./types.js";

export function parseSettingDef(raw: ShopifySettingJson): SettingDef | null {
  const type = raw.type ?? "";
  const id = raw.id;

  if (!id || !shouldIncludeSetting(type)) {
    return null;
  }

  const def: SettingDef = {
    id,
    type,
    role: inferSettingRole(id, type),
  };

  if (raw.label) {
    def.label = raw.label;
  }
  if (raw.default !== undefined) {
    def.default = raw.default;
  }
  if (raw.min !== undefined) {
    def.min = raw.min;
  }
  if (raw.max !== undefined) {
    def.max = raw.max;
  }
  if (raw.step !== undefined) {
    def.step = raw.step;
  }
  if (raw.unit) {
    def.unit = raw.unit;
  }
  if (raw.info) {
    def.info = raw.info;
  }
  if (raw.options?.length) {
    def.options = raw.options
      .filter((o) => o.value !== undefined)
      .map((o) => ({
        value: String(o.value),
        label: o.label,
      }));
  }

  return def;
}

export function parseSettingsList(
  settings: ShopifySettingJson[] | undefined,
): SettingDef[] {
  if (!settings?.length) {
    return [];
  }

  return settings
    .map((s) => parseSettingDef(s))
    .filter((s): s is SettingDef => s !== null);
}
