import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useDebounce } from "~/hooks/use-debounce";
import { useProductSelection } from "~/hooks/use-product-selection";
import { cn } from "~/lib/utils";

import { ProductPickerList } from "./ProductPickerList";
import type {
  ProductPickerConfirmPayload,
  ProductPickerFilters,
  ProductPickerSubmitResponse,
  ProductsApiResponse,
  SelectedLineItem,
} from "./types";

export interface ProductPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the server confirms `{ success: true }`. */
  onConfirm?: (payload: ProductPickerConfirmPayload) => void;
  initialSelection?: SelectedLineItem[];
  title?: string;
  description?: string;
  productsEndpoint?: string;
  submitEndpoint?: string;
  name?: string;
}

const DEFAULT_FILTERS: ProductPickerFilters = {
  query: "",
  status: "all",
  inStockOnly: false,
};

const EMPTY_SELECTION: SelectedLineItem[] = [];

export function ProductPickerModal({
  open,
  onOpenChange,
  onConfirm,
  initialSelection = EMPTY_SELECTION,
  title = "Select products",
  description = "Choose up to 5 products or variants.",
  productsEndpoint = "/app/api/products",
  submitEndpoint = "/app/api/product-selection",
  name = "selectedItems",
}: ProductPickerModalProps) {
  const productsFetcher = useFetcher<ProductsApiResponse>();
  const submitFetcher = useFetcher<ProductPickerSubmitResponse>();
  const pendingPayloadRef = useRef<ProductPickerConfirmPayload | null>(null);

  const [filters, setFilters] = useState<ProductPickerFilters>(DEFAULT_FILTERS);
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(
    new Set(),
  );

  const debouncedQuery = useDebounce(filters.query, 300);
  const products = productsFetcher.data?.products ?? [];
  const isLoading = productsFetcher.state === "loading";
  const error = productsFetcher.data?.error ?? null;
  const isEmpty = !isLoading && !error && products.length === 0;
  const isSubmitting = submitFetcher.state === "submitting";

  const selection = useProductSelection({
    initialSelection,
    catalog: products,
  });
  const { setSelection } = selection;

  useEffect(() => {
    if (!open) return;

    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.inStockOnly) params.set("inStock", "true");

    const query = params.toString();
    productsFetcher.load(`${productsEndpoint}${query ? `?${query}` : ""}`);
    // productsFetcher.load is stable; omit fetcher object from deps to avoid reload loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, debouncedQuery, filters.status, filters.inStockOnly, productsEndpoint]);

  const initialSelectionRef = useRef(initialSelection);
  initialSelectionRef.current = initialSelection;

  useEffect(() => {
    if (!open) return;
    setSelection(initialSelectionRef.current);
  }, [open, setSelection]);

  useEffect(() => {
    if (!submitFetcher.data?.success) return;

    if (pendingPayloadRef.current) {
      onConfirm?.(pendingPayloadRef.current);
      pendingPayloadRef.current = null;
    }

    onOpenChange(false);
  }, [submitFetcher.data, onConfirm, onOpenChange]);

  const handleFiltersChange = useCallback(
    (patch: Partial<ProductPickerFilters>) => {
      setFilters((current) => ({ ...current, ...patch }));
    },
    [],
  );

  const handleExpandedChange = useCallback(
    (productId: string, isExpanded: boolean) => {
      setExpandedProductIds((current) => {
        const next = new Set(current);
        if (isExpanded) {
          next.add(productId);
        } else {
          next.delete(productId);
        }
        return next;
      });
    },
    [],
  );

  const handleCancel = () => {
    if (isSubmitting) return;
    selection.setSelection(initialSelection);
    onOpenChange(false);
  };

  const handleConfirm = () => {
    const payload = selection.getConfirmPayload();
    pendingPayloadRef.current = payload;

    const formData = new FormData();
    for (const id of payload.selectedIds) {
      formData.append("selectedIds", id);
    }

    submitFetcher.submit(formData, {
      method: "POST",
      action: submitEndpoint,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isSubmitting) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className={cn(
          "flex h-[min(92vh,720px)] max-w-2xl flex-col gap-0 overflow-hidden p-0",
        )}
      >
        <DialogHeader className="space-y-1 border-b px-4 py-4 pr-12 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ProductPickerList
          products={products}
          isLoading={isLoading}
          isEmpty={isEmpty}
          error={error}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          selection={selection}
          expandedProductIds={expandedProductIds}
          onExpandedChange={handleExpandedChange}
          atLimit={selection.atLimit}
        />

        {submitFetcher.data?.error ? (
          <p className="border-t px-4 py-2 text-sm text-destructive">
            {submitFetcher.data.error}
          </p>
        ) : null}

        <div className="sticky bottom-0 border-t bg-background px-4 py-3">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            {selection.selectedItems.map((item, index) => (
              <input
                key={`type-${item.type}:${item.id}`}
                type="hidden"
                name={`${name}[${index}][type]`}
                value={item.type}
              />
            ))}
            {selection.selectedItems.map((item, index) => (
              <input
                key={`id-${item.type}:${item.id}`}
                type="hidden"
                name={`${name}[${index}][id]`}
                value={item.id}
              />
            ))}
            {selection.selectedItems.map((item, index) => (
              <input
                key={`productId-${item.type}:${item.id}`}
                type="hidden"
                name={`${name}[${index}][productId]`}
                value={item.productId}
              />
            ))}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {selection.selectedCount}
                </span>{" "}
                of {selection.maxSelections} selected
              </p>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={selection.selectedCount === 0 || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Confirm"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
