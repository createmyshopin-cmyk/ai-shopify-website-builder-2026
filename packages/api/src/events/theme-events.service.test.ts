import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ThemeEventsService } from "./theme-events.service.js";
import { THEME_EVENT_TYPES } from "@theme-editor/shared";

// Mock BullMQ Queue
const mockAdd = vi.fn().mockResolvedValue({ id: "test-job-id" });
vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: mockAdd,
    close: vi.fn(),
  })),
}));

describe("ThemeEventsService", () => {
  let service: ThemeEventsService;
  const originalRedisUrl = process.env.REDIS_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REDIS_URL = "redis://localhost:6379";
    service = new ThemeEventsService();
  });

  afterEach(() => {
    process.env.REDIS_URL = originalRedisUrl;
  });

  it("emits preset.selected event", async () => {
    await service.emitPresetSelected("proj-1", "high-converting");
    expect(mockAdd).toHaveBeenCalledWith(
      THEME_EVENT_TYPES.PRESET_SELECTED,
      expect.objectContaining({ projectId: "proj-1", presetId: "high-converting" }),
      expect.any(Object),
    );
  });

  it("emits section.ordered event with section types", async () => {
    const sections = ["editorial-hero", "benefits", "editorial-newsletter"];
    await service.emitSectionOrdered("proj-1", sections);
    expect(mockAdd).toHaveBeenCalledWith(
      THEME_EVENT_TYPES.SECTION_ORDERED,
      expect.objectContaining({ projectId: "proj-1", sectionTypes: sections }),
      expect.any(Object),
    );
  });

  it("emits variant.selected event with selections", async () => {
    const selections = { "slot_1": "editorial-hero", "slot_2": "benefits" };
    await service.emitVariantSelected("proj-1", selections);
    expect(mockAdd).toHaveBeenCalledWith(
      THEME_EVENT_TYPES.VARIANT_SELECTED,
      expect.objectContaining({ projectId: "proj-1", variantSelections: selections }),
      expect.any(Object),
    );
  });

  it("emits theme.compiled event with duration", async () => {
    await service.emitThemeCompiled("proj-1", "fashion", 250);
    expect(mockAdd).toHaveBeenCalledWith(
      THEME_EVENT_TYPES.THEME_COMPILED,
      expect.objectContaining({
        projectId: "proj-1",
        presetId: "fashion",
        durationMs: 250,
      }),
      expect.any(Object),
    );
  });

  it("emits validation.failed event with errors", async () => {
    const errors = ["Missing footer section", "Invalid token ID"];
    await service.emitValidationFailed("proj-1", errors);
    expect(mockAdd).toHaveBeenCalledWith(
      THEME_EVENT_TYPES.VALIDATION_FAILED,
      expect.objectContaining({ projectId: "proj-1", validationErrors: errors }),
      expect.any(Object),
    );
  });

  it("skips emission when Redis is disabled", async () => {
    delete process.env.REDIS_URL;
    const noRedisService = new ThemeEventsService();
    await noRedisService.emitPresetSelected("proj-1", "high-converting");
    // Queue.add should NOT be called when Redis is disabled
    expect(mockAdd).not.toHaveBeenCalled();
  });
});
