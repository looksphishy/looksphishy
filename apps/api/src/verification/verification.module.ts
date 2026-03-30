import { Module, forwardRef } from "@nestjs/common";
import { VerificationService } from "./verification.service.js";
import { VerificationProcessor } from "./verification.processor.js";
import { RelayModule } from "../relay/relay.module.js";

@Module({
	imports: [forwardRef(() => RelayModule)],
	providers: [VerificationService, VerificationProcessor],
	exports: [VerificationService],
})
export class VerificationModule {}
