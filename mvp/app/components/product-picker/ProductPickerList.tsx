import { AlertCircle, Loader2, Search, ShoppingBag } from "lucide-react";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { ProductSelection } from "~/hooks/use-product-selection";

import { ProductPickerRow } from "./ProductPickerRow";
import type { PickerProduct, ProductPickerFilters } from "./types";

interface ProductPickerListProps {
  products: PickerProduct[];
  isLoading: boolean;
  isEmpty: boolean;
  error: string | null;
  filters: ProductPickerFilters;
  onFiltersChange: (patch: Partial<ProductPickerFilters>) => void;
  selection: ProductSelection;
  expandedProductIds: Set<string>;
  onExpandedChange: (productId: string, open: boolean) => void;
  atLimit: boolean;
}

export function ProductPickerList({
  products,
  isLoading,
  isEmpty,
  error,
  filters,
  onFiltersChange,
  selection,
  expandedProductIds,
  onExpandedChange,
  atLimit,
}: ProductPickerListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 border-b bg-background p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={(event) =>
              onFiltersChange({ query: event.target.value })
            }
            placeholder="Search products by title..."
            className="pl-9"
            aria-label="Search products"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="product-status-filter">Status</Label>
            <select
              id="product-status-filter"
              value={filters.status}
              onChange={(event) =>
                onFiltersChange({
                  status: event.target.value as ProductPickerFilters["status"],
                })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={(event) =>
                onFiltersChange({ inStockOnly: event.target.checked })
              }
              className="h-4 w-4 rounded border-input"
            />
            In stock only
          </label>
        </div>

        {atLimit ? (
          <p className="text-sm font-medium text-amber-700">
            Maximum 5 items selected
          </p>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Loading products...</p>
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-12 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          ) : null}

          {!isLoading && !error && isEmpty ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <ShoppingBag className="h-6 w-6" />
              <p className="text-sm">No products match your search.</p>
            </div>
          ) : null}

          {!isLoading && !error
            ? products.map((product) => (
                <ProductPickerRow
                  key={product.id}
                  product={product}
                  expanded={expandedProductIds.has(product.id)}
                  selectionState={selection.getProductState(product)}
                  productChecked={selection.isProductSelected(product.id)}
                  productDisabled={selection.isProductDisabled(product.id)}
                  onExpandChange={(open) =>
                    onExpandedChange(product.id, open)
                  }
                  onProductToggle={() => selection.toggleProduct(product)}
                  isVariantSelected={selection.isVariantSelected}
                  isVariantDisabled={selection.isVariantDisabled}
                  onVariantToggle={(variantId) =>
                    selection.toggleVariant(product, variantId)
                  }
                />
              ))
            : null}
        </div>
      </ScrollArea>
    </div>
  );
}
