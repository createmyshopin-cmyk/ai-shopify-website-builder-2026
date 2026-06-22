import {
  CompilerOutputSchema,
  ImageOutputSchema,
  ShopifyThemeClient,
  UploadManifestSchema,
  pipelineFlowJobId,
  shopifyUploadJobId,
  type CompilerOutput,
  type ImageOutput,
  type UploadManifest,
} from "@theme-editor/shared";

import { resolveShopAccessToken } from "../common/shopify-session.js";

export interface UploadProcessorInput {
  projectId: string;
  shop: string;
  draftThemeId: string | null;
  compiler: CompilerOutput;
  image: ImageOutput;
}

function isMockUploadMode(): boolean {
  return (
    process.env.MOCK_SHOPIFY_UPLOAD === "true" ||
    process.env.MOCK_AI === "true"
  );
}

export async function runUploadProcessor(
  input: UploadProcessorInput,
): Promise<UploadManifest> {
  const compiler = CompilerOutputSchema.parse(input.compiler);
  const image = ImageOutputSchema.parse(input.image);
  const idempotentKey = pipelineFlowJobId(input.projectId);

  const files = [
    {
      filename: "templates/index.json",
      content: JSON.stringify(compiler.indexJson, null, 2),
    },
    {
      filename: "config/settings_data.json",
      content: JSON.stringify({ current: compiler.settingsPatch }, null, 2),
    },
  ];

  const mockMode = isMockUploadMode() || !input.draftThemeId;

  if (mockMode) {
    for (const asset of image.assets) {
      shopifyUploadJobId(input.projectId, asset.role);
    }

    return UploadManifestSchema.parse({
      mode: "mock",
      draftThemeId: input.draftThemeId,
      filesUploaded: files.map((file) => file.filename),
      idempotentKey,
    });
  }

  const accessToken = await resolveShopAccessToken(input.shop);
  if (!accessToken) {
    return UploadManifestSchema.parse({
      mode: "mock",
      draftThemeId: input.draftThemeId,
      filesUploaded: files.map((file) => file.filename),
      idempotentKey,
    });
  }

  const draftThemeId = input.draftThemeId;
  if (!draftThemeId) {
    return UploadManifestSchema.parse({
      mode: "mock",
      draftThemeId: null,
      filesUploaded: files.map((file) => file.filename),
      idempotentKey,
    });
  }

  const client = new ShopifyThemeClient({
    shop: input.shop,
    accessToken,
  });

  const uploaded = await client.uploadThemeFiles(draftThemeId, files);

  return UploadManifestSchema.parse({
    mode: "shopify",
    draftThemeId: input.draftThemeId,
    filesUploaded: uploaded,
    idempotentKey,
  });
}
