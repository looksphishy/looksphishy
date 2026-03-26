import { Injectable, Logger } from "@nestjs/common"
import { BaseRelayProvider, type RelaySubmissionResult } from "./base.provider.js"
import { maskUrl } from "../../common/url-safety.js"

@Injectable()
export class GoogleProvider extends BaseRelayProvider {
  readonly name = "google"
  private readonly logger = new Logger(GoogleProvider.name)

  async submitReport(url: string): Promise<RelaySubmissionResult> {
    this.logger.log(`[stub] Submitting ${maskUrl(url)} to Google Safe Browsing`)
    // TODO: implement Google Safe Browsing submission API
    return { success: true }
  }
}
