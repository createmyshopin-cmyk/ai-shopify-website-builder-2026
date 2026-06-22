export const MAX_PICKER_SELECTIONS = 5;

export type SelectionItemType = "product" | "variant";

export interface PickerVariant {
  id: string;
  title: string;
  sku: string | null;
  price: string;
  available: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
}

export interface PickerProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  featuredImageUrl: string | null;
  totalVariants: number;
  variants: PickerVariant[];
}

export interface SelectedLineItem {
  type: SelectionItemType;
  id: string;
  productId: string;
  label: string;
  productTitle: string;
}

export type ProductSelectionState = "none" | "partial" | "full";

export interface ProductPickerFilters {
  query: string;
  status: "all" | "active" | "draft" | "archived";
  inStockOnly: boolean;
}

export interface ProductPickerConfirmPayload {
  items: SelectedLineItem[];
  productIds: string[];
  variantIds: string[];
  selectedIds: string[];
}

export interface ProductsApiResponse {
  products: PickerProduct[];
  error?: string;
}

export interface ProductPickerSubmitResponse {
  success: boolean;
  message?: string;
  selectedIds?: string[];
  error?: string;
}
