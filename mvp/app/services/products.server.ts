import type { PickerProduct } from "~/components/product-picker/types";

interface ShopifyVariantNode {
  id: string;
  title: string;
  sku: string | null;
  price: string;
  availableForSale: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
}

interface ShopifyProductNode {
  id: string;
  title: string;
  handle: string;
  status: string;
  featuredImage: { url: string } | null;
  variantsCount: { count: number };
  variants: {
    edges: Array<{ node: ShopifyVariantNode }>;
  };
}

function buildProductSearchQuery(
  search: string,
  status: string,
  inStockOnly: boolean,
): string {
  const clauses: string[] = [];

  if (search.trim()) {
    clauses.push(`title:*${search.trim()}*`);
  }

  if (status !== "all") {
    clauses.push(`status:${status.toUpperCase()}`);
  }

  if (inStockOnly) {
    clauses.push("inventory_total:>0");
  }

  return clauses.join(" AND ");
}

export async function fetchPickerProducts(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
  options: {
    query?: string;
    status?: string;
    inStockOnly?: boolean;
    first?: number;
  } = {},
): Promise<PickerProduct[]> {
  const {
    query = "",
    status = "all",
    inStockOnly = false,
    first = 25,
  } = options;

  const searchQuery = buildProductSearchQuery(query, status, inStockOnly);

  const response = await admin.graphql(
    `#graphql
      query ProductPickerSearch($first: Int!, $query: String) {
        products(first: $first, query: $query, sortKey: TITLE) {
          edges {
            node {
              id
              title
              handle
              status
              featuredImage {
                url(transform: { maxWidth: 120, maxHeight: 120 })
              }
              variantsCount {
                count
              }
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    availableForSale
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        first,
        query: searchQuery || null,
      },
    },
  );

  const json = (await response.json()) as {
    data?: {
      products?: {
        edges: Array<{ node: ShopifyProductNode }>;
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors.map((entry) => entry.message).join(", "));
  }

  const edges = json.data?.products?.edges ?? [];

  return edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    handle: node.handle,
    status: node.status.toLowerCase(),
    featuredImageUrl: node.featuredImage?.url ?? null,
    totalVariants: node.variantsCount.count,
    variants: node.variants.edges.map(({ node: variant }) => ({
      id: variant.id,
      title: variant.title,
      sku: variant.sku,
      price: variant.price,
      available: variant.availableForSale,
      selectedOptions: variant.selectedOptions,
    })),
  }));
}
