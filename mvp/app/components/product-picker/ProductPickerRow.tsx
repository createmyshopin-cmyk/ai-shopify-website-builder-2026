import { ChevronDown, ChevronRight, Package } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { cn } from "~/lib/utils";

import { formatVariantLabel } from "./selection";
import type { PickerProduct, ProductSelectionState } from "./types";

interface VariantRowProps {
  variant: PickerProduct["variants"][number];
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export function VariantRow({
  variant,
  checked,
  disabled,
  onToggle,
}: VariantRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 pl-11 transition-colors hover:bg-muted/60",
        disabled && !checked && "opacity-50",
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={onToggle}
        aria-label={`Select variant ${variant.title}`}
      />
      <button
        type="button"
        disabled={disabled && !checked}
        onClick={onToggle}
        className={cn(
          "min-w-0 flex-1 text-left",
          disabled && !checked ? "cursor-not-allowed" : "cursor-pointer",
        )}
      >
        <p className="truncate text-sm font-medium">
          {formatVariantLabel(variant)}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>${variant.price}</span>
          {variant.sku ? <span>SKU: {variant.sku}</span> : null}
          {!variant.available ? (
            <Badge variant="warning" className="text-[10px]">
              Out of stock
            </Badge>
          ) : null}
        </div>
      </button>
    </div>
  );
}

interface ProductPickerRowProps {
  product: PickerProduct;
  expanded: boolean;
  selectionState: ProductSelectionState;
  productChecked: boolean;
  productDisabled: boolean;
  onExpandChange: (open: boolean) => void;
  onProductToggle: () => void;
  isVariantSelected: (variantId: string) => boolean;
  isVariantDisabled: (variantId: string) => boolean;
  onVariantToggle: (variantId: string) => void;
}

export function ProductPickerRow({
  product,
  expanded,
  selectionState,
  productChecked,
  productDisabled,
  onExpandChange,
  onProductToggle,
  isVariantSelected,
  isVariantDisabled,
  onVariantToggle,
}: ProductPickerRowProps) {
  const hasVariants = product.variants.length > 0;

  return (
    <Collapsible open={expanded} onOpenChange={onExpandChange}>
      <div
        className={cn(
          "rounded-lg border bg-card transition-colors",
          selectionState === "full" && "border-emerald-300 bg-emerald-50/40",
          selectionState === "partial" && "border-amber-300 bg-amber-50/40",
        )}
      >
        <div className="flex items-center gap-2 p-3">
          {hasVariants ? (
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label={
                  expanded ? `Collapse ${product.title}` : `Expand ${product.title}`
                }
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </CollapsibleTrigger>
          ) : (
            <div className="h-8 w-8 shrink-0" />
          )}

          <Checkbox
            checked={productChecked}
            indeterminate={selectionState === "partial"}
            disabled={productDisabled}
            onCheckedChange={onProductToggle}
            aria-label={`Select product ${product.title}`}
          />

          <button
            type="button"
            disabled={productDisabled && !productChecked}
            onClick={onProductToggle}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 text-left",
              productDisabled && !productChecked
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer",
            )}
          >
            {product.featuredImageUrl ? (
              <img
                src={product.featuredImageUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted">
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold">{product.title}</p>
                {selectionState === "partial" ? (
                  <Badge variant="warning">Partial</Badge>
                ) : null}
                {selectionState === "full" ? (
                  <Badge variant="success">Selected</Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {product.totalVariants} variant
                {product.totalVariants === 1 ? "" : "s"} · {product.status}
              </p>
            </div>
          </button>
        </div>

        {hasVariants ? (
          <CollapsibleContent>
            <div className="border-t bg-background/60 pb-1">
              {product.variants.map((variant) => (
                <VariantRow
                  key={variant.id}
                  variant={variant}
                  checked={isVariantSelected(variant.id)}
                  disabled={isVariantDisabled(variant.id)}
                  onToggle={() => onVariantToggle(variant.id)}
                />
              ))}
            </div>
          </CollapsibleContent>
        ) : null}
      </div>
    </Collapsible>
  );
}
