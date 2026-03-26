import { Controller, Post, Body, Logger } from "@nestjs/common"
import { EmailParserService, type CloudflareEmailPayload } from "./email-parser.service.js"
import { ReportService } from "../report/report.service.js"

@Controller("api/webhooks")
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name)

  constructor(
    private emailParser: EmailParserService,
    private reportService: ReportService,
  ) {}

  @Post("inbound-email")
  async handleInboundEmail(@Body() body: CloudflareEmailPayload) {
    this.logger.log(`Inbound email from ${body.from}`)

    const urls = this.emailParser.extractUrls(body)

    if (urls.length === 0) {
      return { processed: 0 }
    }

    const results = await Promise.all(
      urls.map((url) =>
        this.reportService.submitReport({
          url,
          turnstileToken: "email-bypass",
        }),
      ),
    )

    return { processed: results.length }
  }
}
