import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { JobService } from "../job/job.service.js";

const ORPHAN_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const RECOVERY_INTERVAL_MS = 5 * 60 * 1000;  // Every 5 minutes

/**
 * OrphanRecoveryService
 *
 * On startup and every 5 minutes, scans ProjectJob for records stuck in
 * PROCESSING status for longer than ORPHAN_THRESHOLD_MS. These are jobs
 * whose workers crashed without completing.
 *
 * Recovery action: mark the job FAILED with a diagnostic message.
 * Downstream operators can then manually re-trigger or auto-retry.
 */
@Injectable()
export class OrphanRecoveryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OrphanRecoveryService.name);
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(@Inject(JobService) private readonly jobService: JobService) {}

  onApplicationBootstrap(): void {
    // Run once on startup
    void this.recoverOrphans();

    // Schedule periodic recovery
    this.intervalHandle = setInterval(() => {
      void this.recoverOrphans();
    }, RECOVERY_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async recoverOrphans(): Promise<void> {
    try {
      const recovered = await this.jobService.recoverOrphanedJobs(ORPHAN_THRESHOLD_MS);
      if (recovered > 0) {
        this.logger.warn(`[OrphanRecovery] Recovered ${recovered} orphaned jobs`);
      }
    } catch (err) {
      this.logger.error(`[OrphanRecovery] Scan failed: ${String(err)}`);
    }
  }
}
