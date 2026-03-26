import { Injectable, Logger } from "@nestjs/common"
import { BaseRelayProvider, type RelaySubmissionResult } from "./base.provider.js"
import { maskUrl } from "../../common/url-safety.js"

@Injectable()
export class CloudflareProvider extends BaseRelayProvider {
  readonly name = "cloudflare"
  private readonly logger = new Logger(CloudflareProvider.name)

  async submitReport(url: string): Promise<RelaySubmissionResult> {
    this.logger.log(`[stub] Submitting ${maskUrl(url)} to Cloudflare Radar`)
    // TODO: implement Cloudflare Radar submission API
    return { success: true }
  }
}
