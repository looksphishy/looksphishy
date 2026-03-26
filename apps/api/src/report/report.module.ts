import { Module } from "@nestjs/common"
import { BullModule } from "@nestjs/bullmq"
import { ReportService } from "./report.service.js"

@Module({
  imports: [BullModule.registerQueue({ name: "verification" })],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
