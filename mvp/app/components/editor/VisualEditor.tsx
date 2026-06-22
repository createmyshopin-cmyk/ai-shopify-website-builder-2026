import { useMemo, useState } from "react";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PreviewSection, PreviewState } from "@theme-editor/shared";

import { Input } from "~/components/ui/input";
import { usePreviewEditor } from "~/hooks/use-preview-editor";

interface VisualEditorProps {
  projectId: string;
  shop: string;
  apiBase: string;
  initialState: PreviewState;
}

function SortableSectionRow({
  section,
  selected,
  onSelect,
  onToggle,
}: {
  section: PreviewSection;
  selected: boolean;
  onSelect: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border p-3 ${
        selected ? "border-primary bg-primary/5" : "border-border bg-card"
      } ${section.enabled ? "" : "opacity-50"}`}
    >
      <button
        type="button"
        className="cursor-grab px-1 text-muted-foreground"
        aria-label={`Drag ${section.type}`}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <button
        type="button"
        className="flex-1 text-left text-sm"
        onClick={onSelect}
      >
        <span className="font-medium">{section.type}</span>
        <span className="ml-2 text-muted-foreground">{section.id}</span>
      </button>
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={section.enabled}
          onChange={(event) => onToggle(event.target.checked)}
          aria-label={`Enable ${section.type}`}
        />
        On
      </label>
    </div>
  );
}

export function VisualEditor({
  projectId,
  shop,
  apiBase,
  initialState,
}: VisualEditorProps) {
  const { state, applyPatch, undo, canUndo, saving, error } = usePreviewEditor({
    projectId,
    shop,
    apiBase,
    initialState,
  });
  const [selectedId, setSelectedId] = useState(state.order[0] ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const selectedSection = useMemo(
    () => state.sections.find((section) => section.id === selectedId),
    [selectedId, state.sections],
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = state.order.indexOf(String(active.id));
    const newIndex = state.order.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    void applyPatch({
      op: "reorder",
      order: arrayMove(state.order, oldIndex, newIndex),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <s-button
          variant="secondary"
          disabled={!canUndo || saving}
          onClick={undo}
        >
          Undo
        </s-button>
        <s-button
          variant="secondary"
          disabled={saving}
          onClick={() => setPickerOpen((open) => !open)}
        >
          Add section
        </s-button>
        {saving ? (
          <span className="text-sm text-muted-foreground">Saving…</span>
        ) : null}
      </div>

      {error ? <s-banner tone="critical">{error}</s-banner> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Sections (drag to reorder)</p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={state.order}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {state.order.map((id) => {
                  const section = state.sections.find((entry) => entry.id === id);
                  if (!section) {
                    return null;
                  }
                  return (
                    <SortableSectionRow
                      key={section.id}
                      section={section}
                      selected={selectedId === section.id}
                      onSelect={() => setSelectedId(section.id)}
                      onToggle={(enabled) =>
                        void applyPatch({
                          op: "toggleSection",
                          sectionId: section.id,
                          enabled,
                        })
                      }
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          {pickerOpen ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="mb-2 text-sm font-medium">Blueprint sections</p>
              <div className="flex flex-wrap gap-2">
                {state.availableSectionTypes.map((sectionType) => (
                  <button
                    key={sectionType}
                    type="button"
                    className="rounded-md border border-border bg-card px-3 py-1 text-sm hover:bg-muted"
                    onClick={() => {
                      void applyPatch({
                        op: "addSection",
                        sectionType,
                        afterSectionId: selectedId || undefined,
                      });
                      setPickerOpen(false);
                    }}
                  >
                    {sectionType}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">Section inspector</p>
          {selectedSection ? (
            <div className="mt-3 space-y-3">
              <div className="block text-sm">
                <label
                  htmlFor="editor-headline"
                  className="text-muted-foreground"
                >
                  Headline
                </label>
                <Input
                  id="editor-headline"
                  className="mt-1"
                  value={String(selectedSection.settings.heading ?? "")}
                  onChange={(event) =>
                    void applyPatch({
                      op: "updateSection",
                      sectionId: selectedSection.id,
                      settings: { heading: event.target.value },
                    })
                  }
                />
              </div>
              <div className="block text-sm">
                <label
                  htmlFor="editor-subheading"
                  className="text-muted-foreground"
                >
                  Subheading
                </label>
                <Input
                  id="editor-subheading"
                  className="mt-1"
                  value={String(selectedSection.settings.subheading ?? "")}
                  onChange={(event) =>
                    void applyPatch({
                      op: "updateSection",
                      sectionId: selectedSection.id,
                      settings: { subheading: event.target.value },
                    })
                  }
                />
              </div>
              <div className="block text-sm">
                <label htmlFor="editor-image" className="text-muted-foreground">
                  Image URL
                </label>
                <Input
                  id="editor-image"
                  className="mt-1"
                  value={String(selectedSection.settings.image ?? "")}
                  onChange={(event) =>
                    void applyPatch({
                      op: "updateSection",
                      sectionId: selectedSection.id,
                      settings: { image: event.target.value },
                    })
                  }
                />
              </div>
              <div className="block text-sm">
                <label htmlFor="editor-color" className="text-muted-foreground">
                  Primary color
                </label>
                <Input
                  id="editor-color"
                  className="mt-1"
                  type="color"
                  value={String(state.settingsPatch.color_primary ?? "#1a1a1a")}
                  onChange={(event) =>
                    void applyPatch({
                      op: "updateTheme",
                      settingsPatch: { color_primary: event.target.value },
                    })
                  }
                />
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Select a section to edit text, image, and colors.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
