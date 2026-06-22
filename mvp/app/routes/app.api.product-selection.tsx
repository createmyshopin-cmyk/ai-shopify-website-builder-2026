import type { ActionFunctionArgs } from "react-router";

import {
  MAX_PICKER_SELECTIONS,
  type ProductPickerSubmitResponse,
} from "~/components/product-picker/types";
import { authenticate } from "~/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  if (request.method !== "POST") {
    return Response.json(
      { success: false, error: "Method not allowed" } satisfies ProductPickerSubmitResponse,
      { status: 405 },
    );
  }

  const formData = await request.formData();
  const selectedIds = formData
    .getAll("selectedIds")
    .map((value) => String(value))
    .filter(Boolean);

  console.log("[product-selection] Received selectedIds:", selectedIds);

  if (selectedIds.length === 0) {
    return Response.json(
      { success: false, error: "No items selected" } satisfies ProductPickerSubmitResponse,
      { status: 400 },
    );
  }

  if (selectedIds.length > MAX_PICKER_SELECTIONS) {
    return Response.json(
      {
        success: false,
        error: `Maximum ${MAX_PICKER_SELECTIONS} items allowed`,
      } satisfies ProductPickerSubmitResponse,
      { status: 400 },
    );
  }

  return Response.json({
    success: true,
    message: "IDs received",
  } satisfies ProductPickerSubmitResponse);
};
