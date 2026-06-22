import { Module } from "@nestjs/common";
import { JobRepository } from "./job.repository.js";
import { JobService } from "./job.service.js";

@Module({
  providers: [JobRepository, JobService],
  exports: [JobService, JobRepository],
})
export class JobModule {}
