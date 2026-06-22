import { Module } from "@nestjs/common";
import { AssetRepository } from "./asset.repository.js";
import { AssetService } from "./asset.service.js";

@Module({
  providers: [AssetRepository, AssetService],
  exports: [AssetService, AssetRepository],
})
export class AssetModule {}
