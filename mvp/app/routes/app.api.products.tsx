import type { LoaderFunctionArgs } from "react-router";

import type { ProductsApiResponse } from "~/components/product-picker/types";
import { fetchPickerProducts } from "~/services/products.server";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);

  const query = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "all";
  const inStockOnly = url.searchParams.get("inStock") === "true";

  try {
    const products = await fetchPickerProducts(admin, {
      query,
      status,
      inStockOnly,
    });

    return Response.json({ products } satisfies ProductsApiResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load products.";

    return Response.json(
      { products: [], error: message } satisfies ProductsApiResponse,
      { status: 500 },
    );
  }
};
