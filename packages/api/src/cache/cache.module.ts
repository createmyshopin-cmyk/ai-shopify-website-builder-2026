import { Global, Module } from "@nestjs/common";
import { CacheService } from "./cache.service.js";

/**
 * CacheModule
 *
 * Global module — CacheService is available throughout the application
 * without needing to import CacheModule in every feature module.
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
