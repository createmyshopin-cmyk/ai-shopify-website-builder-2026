import { useCallback, useMemo, useState } from "react";

import {
  buildSelectedLineItems,
  canSelectMore,
  getProductSelectionState,
  isItemSelected,
  isSelectionDisabled,
  selectedKeysFromLineItems,
  toggleProductSelection,
  toggleVariantSelection,
  toConfirmPayload,
} from "~/components/product-picker/selection";
import {
  MAX_PICKER_SELECTIONS,
  type PickerProduct,
  type ProductPickerConfirmPayload,
  type SelectedLineItem,
} from "~/components/product-picker/types";

interface UseProductSelectionOptions {
  initialSelection?: SelectedLineItem[];
  catalog?: PickerProduct[];
}

export function useProductSelection({
  initialSelection = [],
  catalog = [],
}: UseProductSelectionOptions = {}) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() =>
    selectedKeysFromLineItems(initialSelection),
  );

  const selectedCount = selectedKeys.size;
  const atLimit = !canSelectMore(selectedKeys);

  const selectedItems = useMemo(
    () => buildSelectedLineItems(catalog, selectedKeys),
    [catalog, selectedKeys],
  );

  const toggleProduct = useCallback((product: PickerProduct) => {
    setSelectedKeys((current) => toggleProductSelection(product, current));
  }, []);

  const toggleVariant = useCallback(
    (product: PickerProduct, variantId: string) => {
      setSelectedKeys((current) =>
        toggleVariantSelection(product, variantId, current),
      );
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  const setSelection = useCallback((items: SelectedLineItem[]) => {
    setSelectedKeys(selectedKeysFromLineItems(items));
  }, []);

  const getConfirmPayload = useCallback((): ProductPickerConfirmPayload => {
    return toConfirmPayload(catalog, selectedKeys);
  }, [catalog, selectedKeys]);

  return {
    selectedKeys,
    selectedCount,
    selectedItems,
    atLimit,
    maxSelections: MAX_PICKER_SELECTIONS,
    toggleProduct,
    toggleVariant,
    clearSelection,
    setSelection,
    getConfirmPayload,
    getProductState: (product: PickerProduct) =>
      getProductSelectionState(product, selectedKeys),
    isProductSelected: (productId: string) =>
      isItemSelected("product", productId, selectedKeys),
    isVariantSelected: (variantId: string) =>
      isItemSelected("variant", variantId, selectedKeys),
    isProductDisabled: (productId: string) =>
      isSelectionDisabled("product", productId, selectedKeys),
    isVariantDisabled: (variantId: string) =>
      isSelectionDisabled("variant", variantId, selectedKeys),
  };
}

export type ProductSelection = ReturnType<typeof useProductSelection>;
