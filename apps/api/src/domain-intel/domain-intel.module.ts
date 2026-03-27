import { Module, Global } from "@nestjs/common";
import { DomainIntelService } from "./domain-intel.service.js";

@Global()
@Module({
	providers: [DomainIntelService],
	exports: [DomainIntelService],
})
export class DomainIntelModule {}
