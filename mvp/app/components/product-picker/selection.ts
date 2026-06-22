import {
  MAX_PICKER_SELECTIONS,
  type PickerProduct,
  type ProductPickerConfirmPayload,
  type ProductSelectionState,
  type SelectedLineItem,
  type SelectionItemType,
} from "./types";

export function selectionKey(type: SelectionItemType, id: string): string {
  return `${type}:${id}`;
}

export function parseSelectionKey(
  key: string,
): { type: SelectionItemType; id: string } | null {
  const [type, ...rest] = key.split(":");
  if ((type !== "product" && type !== "variant") || rest.length === 0) {
    return null;
  }
  return { type, id: rest.join(":") };
}

export function getProductSelectionState(
  product: PickerProduct,
  selectedKeys: Set<string>,
): ProductSelectionState {
  if (selectedKeys.has(selectionKey("product", product.id))) {
    return "full";
  }

  const selectedVariantCount = product.variants.filter((variant) =>
    selectedKeys.has(selectionKey("variant", variant.id)),
  ).length;

  if (selectedVariantCount === 0) return "none";
  if (selectedVariantCount === product.variants.length) return "full";
  return "partial";
}

export function buildSelectedLineItems(
  products: PickerProduct[],
  selectedKeys: Set<string>,
): SelectedLineItem[] {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const items: SelectedLineItem[] = [];

  for (const key of selectedKeys) {
    const parsed = parseSelectionKey(key);
    if (!parsed) continue;

    if (parsed.type === "product") {
      const product = productMap.get(parsed.id);
      if (!product) continue;
      items.push({
        type: "product",
        id: product.id,
        productId: product.id,
        label: product.title,
        productTitle: product.title,
      });
      continue;
    }

    for (const product of products) {
      const variant = product.variants.find((v) => v.id === parsed.id);
      if (!variant) continue;
      items.push({
        type: "variant",
        id: variant.id,
        productId: product.id,
        label: variant.title,
        productTitle: product.title,
      });
      break;
    }
  }

  return items;
}

export function toggleProductSelection(
  product: PickerProduct,
  selectedKeys: Set<string>,
): Set<string> {
  const next = new Set(selectedKeys);
  const productKey = selectionKey("product", product.id);

  if (next.has(productKey)) {
    next.delete(productKey);
    return next;
  }

  for (const variant of product.variants) {
    next.delete(selectionKey("variant", variant.id));
  }

  if (next.size >= MAX_PICKER_SELECTIONS) {
    return selectedKeys;
  }

  next.add(productKey);
  return next;
}

export function toggleVariantSelection(
  product: PickerProduct,
  variantId: string,
  selectedKeys: Set<string>,
): Set<string> {
  const next = new Set(selectedKeys);
  const variantKey = selectionKey("variant", variantId);
  const productKey = selectionKey("product", product.id);

  next.delete(productKey);

  if (next.has(variantKey)) {
    next.delete(variantKey);
    return next;
  }

  if (next.size >= MAX_PICKER_SELECTIONS) {
    return selectedKeys;
  }

  next.add(variantKey);
  return next;
}

export function canSelectMore(selectedKeys: Set<string>): boolean {
  return selectedKeys.size < MAX_PICKER_SELECTIONS;
}

export function isItemSelected(
  type: SelectionItemType,
  id: string,
  selectedKeys: Set<string>,
): boolean {
  return selectedKeys.has(selectionKey(type, id));
}

export function isSelectionDisabled(
  type: SelectionItemType,
  id: string,
  selectedKeys: Set<string>,
): boolean {
  if (isItemSelected(type, id, selectedKeys)) {
    return false;
  }
  return !canSelectMore(selectedKeys);
}

export function toConfirmPayload(
  products: PickerProduct[],
  selectedKeys: Set<string>,
) {
  const items = buildSelectedLineItems(products, selectedKeys);
  return {
    items,
    productIds: items
      .filter((item) => item.type === "product")
      .map((item) => item.id),
    variantIds: items
      .filter((item) => item.type === "variant")
      .map((item) => item.id),
    selectedIds: items.map((item) => item.id),
  };
}

export function selectedIdsFromPayload(
  payload: ProductPickerConfirmPayload,
): string[] {
  return payload.selectedIds ?? payload.items.map((item) => item.id);
}

export function selectedKeysFromLineItems(
  items: SelectedLineItem[],
): Set<string> {
  return new Set(items.map((item) => selectionKey(item.type, item.id)));
}

export function formatVariantLabel(
  variant: PickerProduct["variants"][number],
): string {
  if (variant.selectedOptions.length === 0) {
    return variant.title;
  }
  return variant.selectedOptions.map((option) => option.value).join(" / ");
}
