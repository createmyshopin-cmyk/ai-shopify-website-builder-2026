import type { SelectedSection } from "../selection/section-selection.service.js";
import type { PresetCatalog } from "../types/preset-types.js";
import type { SectionFamily } from "../types/index-types.js";

// ─── Ordering Engine ──────────────────────────────────────────────────────────
// Enforces hard and soft ordering rules. Never randomizes section order.
//
// Hard rules (throw on violation):
//   - hero family must be slot 1
//   - footer family must be last slot
//
// Soft rules (warn only):
//   - recommended_before / recommended_after from flow rules

export interface OrderedSection extends SelectedSection {
  final_slot: number;
  ordering_notes: string[];
}

export class InvalidSectionOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSectionOrderError";
  }
}

export class OrderingEngine {
  orderSections(
    sections: SelectedSection[],
    preset: PresetCatalog,
  ): OrderedSection[] {
    if (sections.length === 0) {
      throw new InvalidSectionOrderError("No sections provided to OrderingEngine.");
    }

    // Build slot-ordered list from preset flow, then fill in selected sections
    const slotOrder = preset.section_flow
      .filter((slot) =>
        sections.some(
          (s) => s.section_type === slot.preferred_section_type || s.section_family === slot.section_family,
        ),
      )
      .map((slot) => slot.slot);

    // Map selected sections to their preset slots
    const sectionsBySlot = new Map<number, SelectedSection>();
    const unassigned: SelectedSection[] = [];

    for (const section of sections) {
      const matchingSlot = preset.section_flow.find(
        (slot) =>
          slot.preferred_section_type === section.section_type ||
          slot.section_family === section.section_family,
      );

      if (matchingSlot && !sectionsBySlot.has(matchingSlot.slot)) {
        sectionsBySlot.set(matchingSlot.slot, section);
      } else {
        unassigned.push(section);
      }
    }

    // Fill unassigned sections into next available slot
    let nextSlot = (Math.max(...sectionsBySlot.keys(), 0)) + 1;
    for (const section of unassigned) {
      while (sectionsBySlot.has(nextSlot)) nextSlot++;
      sectionsBySlot.set(nextSlot, section);
      nextSlot++;
    }

    // Build ordered array from slot map
    const orderedSlots = [...sectionsBySlot.entries()].sort(([a], [b]) => a - b);
    const ordered: OrderedSection[] = orderedSlots.map(([slot, section], index) => ({
      ...section,
      final_slot: index + 1,
      ordering_notes: [],
    }));

    // Hard rule: hero must be first
    const heroIndex = ordered.findIndex((s) => s.section_family === "hero");
    if (heroIndex === -1) {
      throw new InvalidSectionOrderError(
        `Preset "${preset.id}" requires a hero section at slot 1 but none was found.`,
      );
    }
    if (heroIndex !== 0) {
      const hero = ordered.splice(heroIndex, 1)[0]!;
      ordered.unshift(hero);
    }

    // Hard rule: footer must be last
    const footerIndex = ordered.findIndex((s) => s.section_family === "footer");
    if (footerIndex !== -1 && footerIndex !== ordered.length - 1) {
      const footer = ordered.splice(footerIndex, 1)[0]!;
      ordered.push(footer);
    }

    // Renumber final slots and run soft constraint checks
    const warnings: string[] = [];
    const result: OrderedSection[] = ordered.map((section, index) => {
      const notes: string[] = [];
      const currentFamily = section.section_family as SectionFamily;
      const prevFamily = index > 0 ? (ordered[index - 1]!.section_family as SectionFamily) : null;
      const nextFamily = index < ordered.length - 1 ? (ordered[index + 1]!.section_family as SectionFamily) : null;

      // Soft: urgency only after products or social_proof
      if (currentFamily === "urgency" && prevFamily && !["products", "social_proof", "trust"].includes(prevFamily)) {
        const warning = `Soft constraint: "${section.section_type}" (urgency) appears after "${prevFamily}" — recommended after products or social_proof`;
        notes.push(warning);
        warnings.push(warning);
      }

      // Soft: lead_capture in last 2 slots
      if (currentFamily === "lead_capture" && index < ordered.length - 3) {
        const warning = `Soft constraint: "${section.section_type}" (lead_capture) at slot ${index + 1} — recommended in last 2 slots`;
        notes.push(warning);
        warnings.push(warning);
      }

      // Soft: trust after products
      if (currentFamily === "trust" && prevFamily && !["hero", "products", "content", "promotion"].includes(prevFamily)) {
        const warning = `Soft constraint: "${section.section_type}" (trust) appears after "${prevFamily}" — recommended after products`;
        notes.push(warning);
        warnings.push(warning);
      }

      return {
        ...section,
        final_slot: index + 1,
        ordering_notes: notes,
      };
    });

    // Validate final: hero still at slot 1
    if (result[0]?.section_family !== "hero") {
      throw new InvalidSectionOrderError(
        `Hero section must be at slot 1. Got: "${result[0]?.section_type}" (${result[0]?.section_family})`,
      );
    }

    // Validate final: footer still last (if present)
    const lastSection = result[result.length - 1];
    if (lastSection && result.some((s) => s.section_family === "footer") && lastSection.section_family !== "footer") {
      throw new InvalidSectionOrderError(
        `Footer section must be last. Got: "${lastSection.section_type}" (${lastSection.section_family})`,
      );
    }

    return result;
  }
}
