import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AssetRepository, type CreateAssetDto } from "./asset.repository.js";
import type { GeneratedAsset } from "@prisma/client";

@Injectable()
export class AssetService {
  constructor(@Inject(AssetRepository) private readonly repo: AssetRepository) {}

  async getAssetsForProject(
    projectId: string,
    opts?: { sectionType?: string },
  ): Promise<GeneratedAsset[]> {
    return this.repo.findByProject(projectId, opts);
  }

  async getAsset(id: string): Promise<GeneratedAsset> {
    const asset = await this.repo.findById(id);
    if (!asset) throw new NotFoundException(`Asset ${id} not found`);
    return asset;
  }

  async createAsset(data: CreateAssetDto): Promise<GeneratedAsset> {
    return this.repo.create(data);
  }

  async updateAsset(
    id: string,
    data: Partial<CreateAssetDto>,
  ): Promise<GeneratedAsset> {
    return this.repo.update(id, data);
  }

  async deleteAsset(id: string): Promise<void> {
    return this.repo.softDelete(id);
  }

  async deleteProjectAssets(projectId: string): Promise<void> {
    return this.repo.softDeleteByProject(projectId);
  }
}
