import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { RelayService } from "./relay.service.js";
import { RelayProcessor } from "./relay.processor.js";
import { GoogleProvider } from "./providers/google.provider.js";
import { NetcraftProvider } from "./providers/netcraft.provider.js";
import { CloudflareProvider } from "./providers/cloudflare.provider.js";
import { RegistrarProvider } from "./providers/registrar.provider.js";
import { HostingProvider } from "./providers/hosting.provider.js";

@Module({
	imports: [BullModule.registerQueue({ name: "relay" })],
	providers: [
		RelayService,
		RelayProcessor,
		GoogleProvider,
		NetcraftProvider,
		CloudflareProvider,
		RegistrarProvider,
		HostingProvider,
	],
	exports: [RelayService],
})
export class RelayModule {}
